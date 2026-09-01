const express   = require('express');
const Mentor    = require('../models/Mentor');
const User      = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/mentors ── (protected)
// Query params: search, rating, availability (online)
// Searches both User mentors (userRole: 'mentor') and static Mentor collection
router.get('/', protect, async (req, res) => {
  try {
    const { search = '', rating = '', availability = '' } = req.query;
    const trimmed = search.trim();

    const mentorQuery = {};
    const userMentorQuery = {
      _id: { $ne: req.user._id }, // Exclude current logged in user
      userRole: 'mentor',
      'mentorVerification.status': { $in: ['verified', 'test_bypass'] },
    };

    // Text search across name and skills
    if (trimmed) {
      mentorQuery.$or = [
        { name:   { $regex: trimmed, $options: 'i' } },
        { skills: { $elemMatch: { $regex: trimmed, $options: 'i' } } },
      ];

      userMentorQuery.$or = [
        { name: { $regex: trimmed, $options: 'i' } },
        { 'teachingSkills.name': { $regex: trimmed, $options: 'i' } },
      ];
    }

    // Rating filter
    if (rating === '4.5+ Stars') {
      mentorQuery.rating = { $gte: 4.5 };
      userMentorQuery.rating = { $gte: 4.5 };
    }
    if (rating === '4.0+ Stars') {
      mentorQuery.rating = { $gte: 4.0 };
      userMentorQuery.rating = { $gte: 4.0 };
    }

    // Availability filter
    if (availability === 'Immediate') {
      mentorQuery.online = true;
      userMentorQuery.availableForExchange = true;
    }

    const SkillExchangeRequest = require('../models/SkillExchangeRequest');
    const MentorClass          = require('../models/MentorClass');

    const [staticMentors, userMentors, userRequests, enrolledClasses] = await Promise.all([
      Mentor.find(mentorQuery).sort({ rating: -1 }),
      User.find(userMentorQuery)
        .select('name role rating reviewCount teachingSkills initials avatar')
        .sort({ rating: -1 }),
      SkillExchangeRequest.find({
        $or: [{ from: req.user._id }, { to: req.user._id }],
        status: { $in: ['pending', 'accepted'] },
      }),
      MentorClass.find({
        status: 'active',
      }),
    ]);

    // Format user mentors who have active courses created
    const mentorsWithCourses = userMentors.filter((u) =>
      enrolledClasses.some((c) => String(c.mentorId) === String(u._id))
    );

    const formattedUserMentors = mentorsWithCourses.map((u) => {
      const uClasses = enrolledClasses.filter(
        (c) => String(c.mentorId) === String(u._id)
      );

      const primaryClass = uClasses[0];
      const totalMax = uClasses.reduce((acc, c) => acc + c.maxStudents, 0);
      const totalEnrolled = uClasses.reduce((acc, c) => acc + (c.enrolledStudents?.length || 0), 0);
      const spotsLeft = Math.max(0, totalMax - totalEnrolled);

      const isEnrolled = uClasses.some((c) =>
        c.enrolledStudents?.some((id) => String(id) === String(req.user._id))
      );

      const reqObj = userRequests.find(
        (r) => String(r.to) === String(u._id) || String(r.from) === String(u._id)
      );

      const requestStatus = isEnrolled
        ? 'accepted'
        : (reqObj ? reqObj.status : 'none');

      // Combine profile teachingSkills and skills filled inside Mentor Classes
      const classSkills = uClasses.flatMap((c) => c.skills || []);
      const profileSkills = (u.teachingSkills || []).map((s) => s.name);
      const allSkills = Array.from(new Set([...classSkills, ...profileSkills]));

      return {
        _id:              u._id,
        name:             u.name,
        role:             `Mentor • ${primaryClass.title}`,
        classTitle:       primaryClass.title,
        classDescription: primaryClass.description || '',
        rating:           u.rating > 0 ? u.rating : 5.0,
        reviews:          u.reviewCount || 0,
        accent:           'primary',
        online:           true,
        skills:           allSkills.length > 0 ? allSkills : primaryClass.skills,
        initials:         u.initials,
        avatar:           u.avatar || '',
        isUserMentor:     true,
        requestStatus,
        isEnrolled,
        totalEnrolled:    primaryClass.enrolledStudents?.length || 0,
        totalMax:         primaryClass.maxStudents,
        spotsLeft:        Math.max(0, primaryClass.maxStudents - (primaryClass.enrolledStudents?.length || 0)),
        classesCount:     uClasses.length,
        classes:          uClasses.map((c) => ({
          _id:              c._id,
          title:            c.title,
          description:      c.description,
          skills:           c.skills,
          maxStudents:      c.maxStudents,
          enrolledStudents: c.enrolledStudents,
        })),
      };
    });

    // Format static mentors with request status check
    const formattedStaticMentors = staticMentors.map((sm) => {
      const reqObj = userRequests.find(
        (r) => String(r.to) === String(sm._id) || String(r.from) === String(sm._id)
      );
      return {
        ...sm.toObject(),
        requestStatus: reqObj ? reqObj.status : 'none',
        spotsLeft:     sm.spotsLeft !== undefined ? sm.spotsLeft : 5,
        totalEnrolled: sm.students || 0,
        totalMax:      (sm.students || 0) + (sm.spotsLeft || 5),
      };
    });

    // Combine all mentors
    const combined = [...formattedUserMentors, ...formattedStaticMentors];

    // Total stats (for header)
    const [totalStatic, totalUserMentors] = await Promise.all([
      Mentor.countDocuments(),
      User.countDocuments({
        userRole: 'mentor',
        'mentorVerification.status': { $in: ['verified', 'test_bypass'] },
      }),
    ]);
    const totalMentors = totalStatic + totalUserMentors;

    const [allSkillsStatic, allSkillsUser] = await Promise.all([
      Mentor.distinct('skills'),
      User.find({
        userRole: 'mentor',
        'mentorVerification.status': { $in: ['verified', 'test_bypass'] },
      }).distinct('teachingSkills.name'),
    ]);

    const uniqueSkills = new Set([...allSkillsStatic, ...allSkillsUser]);
    const totalSkills  = uniqueSkills.size;

    res.json({ mentors: combined, totalMentors, totalSkills });
  } catch (err) {
    console.error('Mentors route error:', err);
    res.status(500).json({ error: 'Server error loading mentors.' });
  }
});

// ── GET /api/mentors/trending ── (protected)
// Returns trending skills for the sidebar widget
router.get('/trending', protect, async (_req, res) => {
  try {
    // Aggregate most common skills across all mentors
    const result = await Mentor.aggregate([
      { $unwind: '$skills' },
      { $group: { _id: '$skills', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 4 },
    ]);

    const trending = result.map((r, i) => ({
      name: r._id,
      pct:  `+${(4 - i) * 3 + i}%`,
    }));

    res.json({ trending });
  } catch (err) {
    console.error('Trending skills error:', err);
    res.status(500).json({ error: 'Server error loading trending skills.' });
  }
});

module.exports = router;


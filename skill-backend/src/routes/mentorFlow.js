// ── Mentor Flow Routes — /api/mentor ──
const express     = require('express');
const { protect } = require('../middleware/auth');
const User        = require('../models/User');
const MentorClass = require('../models/MentorClass');

const router = express.Router();

// ── Helper: check if test-bypass is enabled ──
const bypassEnabled = () =>
  process.env.ENABLE_MENTOR_TEST_BYPASS === 'true' ||
  process.env.NODE_ENV !== 'production';

// ─────────────────────────────────────────────
// POST /api/mentor/become
// Marks the user as initiating the mentor flow (role stays 'user' until verified)
// ─────────────────────────────────────────────
router.post('/become', protect, async (req, res) => {
  try {
    if (req.user.userRole === 'mentor') {
      return res.status(400).json({ error: 'You are already a mentor.' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          'mentorVerification.status': 'none',
          'mentorVerification.method': undefined,
        },
      },
      { new: true }
    ).select('-password');

    res.json({ user, message: 'Mentor flow initiated.' });
  } catch (err) {
    console.error('Mentor become error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/mentor/verify/document
// Stub — stores documentUrl placeholder, sets status 'pending'
// Real implementation: accept base64 or multipart and upload to CDN
// ─────────────────────────────────────────────
router.post('/verify/document', protect, async (req, res) => {
  try {
    const { documentUrl } = req.body; // stub: client sends base64 dataURI

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          'mentorVerification.status':      'pending',
          'mentorVerification.method':      'document',
          'mentorVerification.documentUrl': documentUrl || 'stub_uploaded',
        },
      },
      { new: true }
    ).select('-password');

    res.json({ user, message: 'Document submitted. Verification pending review.' });
  } catch (err) {
    console.error('Document verify error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/mentor/verify/email
// Stub — accepts an institutional email, sets status 'pending'
// Real implementation: domain allowlist check or OAuth
// ─────────────────────────────────────────────
router.post('/verify/email', protect, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid email is required.' });
    }

    // Stub: accept any email for now; real impl checks domain allowlist
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          'mentorVerification.status':        'pending',
          'mentorVerification.method':        'email',
          'mentorVerification.verifiedEmail': email,
        },
      },
      { new: true }
    ).select('-password');

    res.json({ user, message: 'Institutional email submitted. Verification pending.' });
  } catch (err) {
    console.error('Email verify error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/mentor/verify/test-bypass
// Dev-only: body { code: 'yes' } → grants mentor status immediately
// Gated behind ENABLE_MENTOR_TEST_BYPASS env flag
// ─────────────────────────────────────────────
router.post('/verify/test-bypass', protect, async (req, res) => {
  if (!bypassEnabled()) {
    return res.status(403).json({ error: 'Test bypass is disabled in this environment.' });
  }

  const { code } = req.body;
  if (code !== 'yes') {
    return res.status(400).json({ error: 'Invalid bypass code.' });
  }

  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          userRole:                          'mentor',
          'mentorVerification.status':       'test_bypass',
          'mentorVerification.method':       'test_bypass',
          'mentorVerification.verifiedAt':   new Date(),
        },
      },
      { new: true }
    ).select('-password');

    res.json({ user, message: 'Test bypass: mentor status granted.' });
  } catch (err) {
    console.error('Test bypass error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/mentor/quit
// Reverts mentor to normal user ONLY IF there are no active classes remaining
// ─────────────────────────────────────────────
router.post('/quit', protect, async (req, res) => {
  try {
    if (req.user.userRole !== 'mentor') {
      return res.status(400).json({ error: 'You are not a mentor.' });
    }

    // Check if mentor has any active/running classes
    const activeClassesCount = await MentorClass.countDocuments({
      mentorId: req.user._id,
      status:   'active',
    });

    if (activeClassesCount > 0) {
      return res.status(400).json({
        error: `Cannot quit mentoring while you have ${activeClassesCount} active class${activeClassesCount > 1 ? 'es' : ''}. Please conclude or archive all your classes before quitting.`,
        activeClassesCount,
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          userRole:                           'user',
          'mentorVerification.status':        'none',
          'mentorVerification.method':        undefined,
          'mentorVerification.verifiedAt':    undefined,
          'mentorVerification.documentUrl':   undefined,
          'mentorVerification.verifiedEmail': undefined,
        },
      },
      { new: true }
    ).select('-password');

    res.json({ user, message: 'You have quit mentoring and reverted to standard member status.' });
  } catch (err) {
    console.error('Mentor quit error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────────
// GET /api/mentor/classes
// List the current mentor's classes
// ─────────────────────────────────────────────
router.get('/classes', protect, async (req, res) => {
  try {
    if (req.user.userRole !== 'mentor') {
      return res.status(403).json({ error: 'Only mentors can access this.' });
    }

    const query = { mentorId: req.user._id };
    if (req.query.status) {
      query.status = req.query.status;
    }

    const classes = await MentorClass.find(query)
      .populate('enrolledStudents', 'name initials')
      .sort({ createdAt: -1 });

    res.json({ classes });
  } catch (err) {
    console.error('List classes error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/mentor/classes
// Create a new class (mentor-only, must be verified)
// ─────────────────────────────────────────────
router.post('/classes', protect, async (req, res) => {
  try {
    if (req.user.userRole !== 'mentor') {
      return res.status(403).json({ error: 'Only mentors can create classes.' });
    }

    const verifiedStatuses = ['verified', 'test_bypass'];
    if (!verifiedStatuses.includes(req.user.mentorVerification?.status)) {
      return res.status(403).json({ error: 'Mentor verification required before creating classes.' });
    }

    const { title, description, skills, maxStudents, minReputationRequired } = req.body;

    if (!title || !maxStudents) {
      return res.status(400).json({ error: 'title and maxStudents are required.' });
    }

    const cls = await MentorClass.create({
      mentorId:             req.user._id,
      title,
      description:          description || '',
      skills:               skills || [],
      maxStudents:          Number(maxStudents),
      minReputationRequired: Number(minReputationRequired) || 0,
    });

    res.status(201).json({ class: cls });
  } catch (err) {
    console.error('Create class error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────────
// PATCH /api/mentor/classes/:id
// Edit an existing class
// ─────────────────────────────────────────────
router.patch('/classes/:id', protect, async (req, res) => {
  try {
    const cls = await MentorClass.findOne({ _id: req.params.id, mentorId: req.user._id });
    if (!cls) return res.status(404).json({ error: 'Class not found.' });

    const allowed = ['title', 'description', 'skills', 'maxStudents', 'minReputationRequired'];
    allowed.forEach((f) => { if (req.body[f] !== undefined) cls[f] = req.body[f]; });

    await cls.save();
    res.json({ class: cls });
  } catch (err) {
    console.error('Update class error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/mentor/classes/:id  →  archive
// ─────────────────────────────────────────────
router.delete('/classes/:id', protect, async (req, res) => {
  try {
    const cls = await MentorClass.findOne({ _id: req.params.id, mentorId: req.user._id });
    if (!cls) return res.status(404).json({ error: 'Class not found.' });

    cls.status = 'archived';
    await cls.save();
    res.json({ message: 'Class archived.' });
  } catch (err) {
    console.error('Archive class error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/mentor/classes/:id/complete  →  complete course
// ─────────────────────────────────────────────
router.post('/classes/:id/complete', protect, async (req, res) => {
  try {
    const cls = await MentorClass.findOne({ _id: req.params.id, mentorId: req.user._id });
    if (!cls) return res.status(404).json({ error: 'Class not found or unauthorized.' });

    cls.status = 'completed';
    await cls.save();

    // Broadcast congratulations in cohort chat
    const Message = require('../models/Message');
    await Message.create({
      from: req.user._id,
      classId: cls._id,
      text: `🎓 Course Completed! Mentor ${req.user.name} has concluded the course "${cls.title}". Congratulations to all enrolled students on graduating!`,
    });

    res.json({ message: `Course "${cls.title}" marked as complete! 🎓`, class: cls });
  } catch (err) {
    console.error('Complete class error:', err);
    res.status(500).json({ error: 'Server error completing class.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/mentor/classes/:id/enroll
// Student enrolls in a class (capacity check; minReputation is a stub)
// ─────────────────────────────────────────────
router.post('/classes/:id/enroll', protect, async (req, res) => {
  try {
    const cls = await MentorClass.findById(req.params.id);
    if (!cls || cls.status !== 'active') {
      return res.status(404).json({ error: 'Class not found or no longer active.' });
    }

    const alreadyEnrolled = cls.enrolledStudents.some(
      (id) => String(id) === String(req.user._id)
    );
    if (alreadyEnrolled) {
      return res.status(409).json({ error: 'You are already enrolled in this class.' });
    }

    if (cls.enrolledStudents.length >= cls.maxStudents) {
      return res.status(409).json({ error: 'This class is full.' });
    }

    // Stub: minReputationRequired check — always passes for now
    // TODO: compare req.user.points >= cls.minReputationRequired

    cls.enrolledStudents.push(req.user._id);
    await cls.save();

    res.json({ message: 'Successfully enrolled!', class: cls });
  } catch (err) {
    console.error('Enroll error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────────
// GET /api/mentor/browse
// Browse active mentor-users and their classes (student-facing)
// ─────────────────────────────────────────────
router.get('/browse', protect, async (req, res) => {
  try {
    const { search = '' } = req.query;

    const userQuery = { userRole: 'mentor', 'mentorVerification.status': { $in: ['verified', 'test_bypass'] } };
    if (search.trim()) {
      userQuery.$or = [
        { name:  { $regex: search, $options: 'i' } },
        { 'teachingSkills.name': { $regex: search, $options: 'i' } },
      ];
    }

    const mentors = await User.find(userQuery)
      .select('name initials role rating teachingSkills mentorVerification')
      .lean();

    const mentorIds = mentors.map((m) => m._id);
    const classes   = await MentorClass.find({ mentorId: { $in: mentorIds }, status: 'active' })
      .select('mentorId title description skills maxStudents enrolledStudents minReputationRequired')
      .lean();

    // Group classes by mentorId
    const classByMentor = {};
    classes.forEach((c) => {
      const key = String(c.mentorId);
      if (!classByMentor[key]) classByMentor[key] = [];
      classByMentor[key].push({ ...c, spotsLeft: c.maxStudents - c.enrolledStudents.length });
    });

    const result = mentors.map((m) => ({
      ...m,
      classes: classByMentor[String(m._id)] || [],
    }));

    res.json({ mentors: result });
  } catch (err) {
    console.error('Browse mentors error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/mentor/request
// Student requests to join a mentor's class cohort
// ─────────────────────────────────────────────
router.post('/request', protect, async (req, res) => {
  try {
    const { mentorId, classId, note } = req.body;
    if (!mentorId) {
      return res.status(400).json({ error: 'mentorId is required.' });
    }

    const mentorUser = await User.findById(mentorId);
    if (!mentorUser || mentorUser.userRole !== 'mentor') {
      return res.status(404).json({ error: 'Mentor not found.' });
    }

    if (String(mentorId) === String(req.user._id)) {
      return res.status(400).json({ error: 'You cannot request yourself.' });
    }

    // Find target class
    let targetClass = null;
    if (classId) {
      targetClass = await MentorClass.findById(classId);
    }
    if (!targetClass) {
      targetClass = await MentorClass.findOne({ mentorId, status: 'active' });
    }

    // If mentor has no active class created yet, do not allow request
    if (!targetClass) {
      return res.status(400).json({
        error: 'This mentor does not currently have any active courses available for enrollment. Please check back when they publish a course.',
      });
    }

    // Check if already enrolled
    const isAlreadyEnrolled = targetClass.enrolledStudents.some(
      (id) => String(id) === String(req.user._id)
    );
    if (isAlreadyEnrolled) {
      return res.status(200).json({
        message: `You are already enrolled in ${targetClass.title}! 🎉`,
        alreadyEnrolled: true,
        class: targetClass,
      });
    }

    // Check capacity
    if (targetClass.enrolledStudents.length >= targetClass.maxStudents) {
      return res.status(409).json({ error: 'This mentor class is currently full.' });
    }

    // Enroll student
    targetClass.enrolledStudents.push(req.user._id);
    await targetClass.save();

    // Post introductory group message to the class cohort chat
    const Message = require('../models/Message');
    await Message.create({
      from: req.user._id,
      classId: targetClass._id,
      text: note && note.trim() ? note.trim() : `Joined ${targetClass.title} mentorship cohort! 👋`,
    });

    res.status(200).json({
      message: `Successfully joined ${targetClass.title}! 🎉`,
      class: targetClass,
    });
  } catch (err) {
    console.error('Mentor request error:', err);
    res.status(500).json({ error: 'Server error processing mentorship request.' });
  }
});

module.exports = router;

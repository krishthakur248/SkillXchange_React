const express              = require('express');
const { protect }          = require('../middleware/auth');
const SkillExchangeRequest = require('../models/SkillExchangeRequest');
const Message              = require('../models/Message');
const User                 = require('../models/User');

const router = express.Router();

// ── GET /api/learn-teach/incoming ── (protected)
// Requests where the current user is the recipient (to)
router.get('/incoming', protect, async (req, res) => {
  try {
    const requests = await SkillExchangeRequest.find({ to: req.user._id, status: 'pending' })
      .populate('from', 'name role initials avatar')
      .sort({ createdAt: -1 });

    const formatted = requests.map((r) => ({
      _id:          r._id,
      name:         r.from.name,
      role:         r.from.role,
      initials:     r.from.initials,
      avatar:       r.from.avatar || '',
      wantsToLearn: r.toSkill,
      offers:       r.fromSkill,
    }));

    res.json({ requests: formatted });
  } catch (err) {
    console.error('Incoming requests error:', err);
    res.status(500).json({ error: 'Server error loading incoming requests.' });
  }
});

// ── GET /api/learn-teach/sent ── (protected)
// Requests sent by the current user (from)
router.get('/sent', protect, async (req, res) => {
  try {
    const requests = await SkillExchangeRequest.find({ from: req.user._id })
      .populate('to', 'name initials avatar')
      .sort({ createdAt: -1 });

    const statusColors = { pending: 'blue', accepted: 'green', completed: 'green', declined: 'gray', reschedule: 'gray' };

    const formatted = requests.map((r) => {
      const myVote = (r.completedBy || []).some((id) => String(id) === String(req.user._id));
      const peerVote = (r.completedBy || []).some((id) => String(id) !== String(req.user._id));
      return {
        _id:         r._id,
        toUserId:    r.to._id,
        initials:    r.to.initials,
        name:        r.to.name,
        skill:       r.toSkill,
        status:      r.status,
        avatarColor: statusColors[r.status] || 'gray',
        completedBy: r.completedBy || [],
        myVote,
        peerVote,
        completedAt: r.completedAt,
      };
    });

    res.json({ requests: formatted });
  } catch (err) {
    console.error('Sent requests error:', err);
    res.status(500).json({ error: 'Server error loading sent requests.' });
  }
});

// ── GET /api/learn-teach/connections ── (protected)
// Active accepted connections involving the current user (removed once completed)
router.get('/connections', protect, async (req, res) => {
  try {
    const accepted = await SkillExchangeRequest.find({
      $or: [
        { from: req.user._id, status: 'accepted' },
        { to:   req.user._id, status: 'accepted' },
      ],
    })
      .populate('from', 'name initials avatar role teachingSkills learningSkills')
      .populate('to',   'name initials avatar role teachingSkills learningSkills')
      .sort({ updatedAt: -1 });

    const formatted = accepted.map((r) => {
      const other = String(r.from._id) === String(req.user._id) ? r.to : r.from;
      const myVote = (r.completedBy || []).some((id) => String(id) === String(req.user._id));
      const peerVote = (r.completedBy || []).some((id) => String(id) !== String(req.user._id));
      return {
        _id:         r._id, // request id
        userId:      other._id,
        name:        other.name,
        initials:    other.initials,
        avatar:      other.avatar || '',
        role:        other.role,
        teaches:     other.teachingSkills.map((s) => s.name),
        wants:       other.learningSkills.map((s) => s.name),
        fromSkill:   r.fromSkill,
        toSkill:     r.toSkill,
        status:      r.status,
        completedBy: r.completedBy || [],
        myVote,
        peerVote,
      };
    });

    res.json({ connections: formatted });
  } catch (err) {
    console.error('Connections error:', err);
    res.status(500).json({ error: 'Server error loading connections.' });
  }
});

// ── GET /api/learn-teach/recommended ── (protected)
// Users whose teachingSkills match things the current user wants to learn (excludes already connected/pending peers)
router.get('/recommended', protect, async (req, res) => {
  try {
    const me = req.user;
    const myLearnNames = me.learningSkills.map((s) => s.name);
    const myTeachNames = me.teachingSkills.map((s) => s.name);

    // Find all users who already have active (pending or accepted) requests with 'me' to exclude from recommendations
    const activeRequests = await SkillExchangeRequest.find({
      $or: [{ from: me._id }, { to: me._id }],
      status: { $in: ['pending', 'accepted'] },
    }).select('from to');

    const excludedIds = [
      me._id,
      ...activeRequests.map((r) => String(r.from) === String(me._id) ? r.to : r.from),
    ];

    let matches = await User.find({
      _id:      { $nin: excludedIds },
      userRole: { $ne: 'mentor' },         // exclude mentors from P2P pool
      $or: [
        { 'teachingSkills.name': { $in: myLearnNames } },
        { 'learningSkills.name': { $in: myTeachNames } },
      ],
    })
      .select('name role initials avatar teachingSkills learningSkills rating')
      .limit(3);

    if (matches.length === 0) {
      matches = await User.find({ _id: { $nin: excludedIds }, userRole: { $ne: 'mentor' } })
        .select('name role initials avatar teachingSkills learningSkills rating')
        .limit(3);
    }

    const accents = ['green', 'blue', 'green'];
    const pcts    = ['98% Match', '95% Match', '92% Match'];

    const formatted = matches.map((u, i) => {
      const needs  = u.learningSkills[0]?.name  || '—';
      const offers = u.teachingSkills[0]?.name  || '—';
      return {
        _id:           u._id,
        name:          u.name,
        role:          u.role,
        initials:      u.initials,
        avatar:        u.avatar || '',
        needs,
        offers,
        desc:          `Needs ${needs} · Offers ${offers}`,
        pct:           pcts[i]    || '90% Match',
        pctColor:      accents[i] || 'green',
        accent:        accents[i] || 'green',
        skills: [
          { label: offers.slice(0, 3).toUpperCase(), color: 'green' },
          { label: needs.slice(0, 3).toUpperCase(),  color: 'blue'  },
        ],
        teaches:       u.teachingSkills.map((s) => s.name),
        wants:         u.learningSkills.map((s)  => s.name),
        rating:        u.rating,
        requestStatus: 'none',
        requestId:     null,
      };
    });

    res.json({ matches: formatted });
  } catch (err) {
    console.error('Recommended matches error:', err);
    res.status(500).json({ error: 'Server error loading recommended matches.' });
  }
});

// ── POST /api/learn-teach/request ── (protected)
// Send a skill exchange request
router.post('/request', protect, async (req, res) => {
  try {
    const { toUserId, fromSkill, toSkill } = req.body;

    if (!toUserId || !fromSkill || !toSkill) {
      return res.status(400).json({ error: 'toUserId, fromSkill, and toSkill are required.' });
    }

    if (String(toUserId) === String(req.user._id)) {
      return res.status(400).json({ error: 'You cannot request a skill exchange with yourself.' });
    }

    const existing = await SkillExchangeRequest.findOne({
      $or: [
        { from: req.user._id, to: toUserId },
        { from: toUserId, to: req.user._id },
      ],
      status: { $in: ['pending', 'accepted'] },
    });

    if (existing) {
      if (existing.status === 'accepted') {
        return res.status(409).json({ error: 'This request is already accepted. You can chat with this person instead of sending a new request.' });
      }
      return res.status(409).json({ error: 'A request already exists between you and this user.' });
    }

    const request = await SkillExchangeRequest.create({
      from:      req.user._id,
      to:        toUserId,
      fromSkill,
      toSkill,
    });

    res.status(201).json({ request });
  } catch (err) {
    console.error('Create request error:', err);
    res.status(500).json({ error: 'Server error sending request.' });
  }
});

// ── PATCH /api/learn-teach/request/:id ── (protected)
// Accept or decline an incoming request
router.patch('/request/:id', protect, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['accepted', 'declined', 'reschedule'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value.' });
    }

    const request = await SkillExchangeRequest.findOne({
      _id: req.params.id,
      to: req.user._id,
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found or unauthorized.' });
    }

    if (status === 'accepted') {
      const MentorClass = require('../models/MentorClass');

      await SkillExchangeRequest.updateMany(
        {
          $or: [
            { from: request.from, to: request.to },
            { from: request.to, to: request.from },
          ],
          _id: { $ne: request._id },
          status: { $in: ['pending', 'accepted'] },
        },
        { $set: { status: 'declined' } }
      );

      // If acceptor is a mentor (or recipient was a mentor), auto-enroll student in mentor's active class
      const mentorId = req.user.userRole === 'mentor' ? req.user._id : request.to;
      const studentId = String(mentorId) === String(request.to) ? request.from : request.to;

      let mentorClass = await MentorClass.findOne({
        mentorId,
        status: 'active',
        skills: request.toSkill,
      });

      if (!mentorClass) {
        mentorClass = await MentorClass.findOne({
          mentorId,
          status: 'active',
        });
      }

      if (mentorClass && !mentorClass.enrolledStudents.some((id) => String(id) === String(studentId))) {
        if (mentorClass.enrolledStudents.length < mentorClass.maxStudents) {
          mentorClass.enrolledStudents.push(studentId);
          await mentorClass.save();
        }
      }
    }

    request.status = status;
    await request.save();

    res.json({ request });
  } catch (err) {
    console.error('Update request error:', err);
    res.status(500).json({ error: 'Server error updating request.' });
  }
});

// ── POST /api/learn-teach/request/:id/complete ── (protected)
// Request or confirm finishing the skill exchange (both users must accept)
// Once both accept, mastery progress is increased, rewards granted, and chat/connection removed!
router.post('/request/:id/complete', protect, async (req, res) => {
  try {
    const request = await SkillExchangeRequest.findOne({
      _id: req.params.id,
      $or: [
        { from: req.user._id },
        { to:   req.user._id },
      ],
      status: 'accepted',
    });

    if (!request) {
      return res.status(404).json({ error: 'Active accepted request not found or already completed.' });
    }

    if (!request.completedBy) {
      request.completedBy = [];
    }

    const currentUserIdStr = String(req.user._id);
    const otherUserId = String(request.from) === currentUserIdStr ? request.to : request.from;
    const hasVoted = request.completedBy.some((id) => String(id) === currentUserIdStr);

    if (!hasVoted) {
      request.completedBy.push(req.user._id);
    }

    const fromIdStr = String(request.from);
    const toIdStr   = String(request.to);

    const fromAgreed = request.completedBy.some((id) => String(id) === fromIdStr);
    const toAgreed   = request.completedBy.some((id) => String(id) === toIdStr);

    if (fromAgreed && toAgreed) {
      // Both users agreed to finish!
      request.status = 'completed';
      request.completedAt = new Date();
      await request.save();

      // Automatically increase Skill Mastery Progress on both users' matching learning skills!
      const fromUser = await User.findById(request.from);
      if (fromUser) {
        const learnSkill = (fromUser.learningSkills || []).find(
          (s) => s.name.toLowerCase() === request.toSkill.toLowerCase()
        );
        if (learnSkill) {
          learnSkill.pct = Math.min(100, (learnSkill.pct || 0) + 30);
          if (learnSkill.pct >= 75) { learnSkill.bars = 3; learnSkill.level = 'Expert Level'; }
          else if (learnSkill.pct >= 40) { learnSkill.bars = 2; learnSkill.level = 'Intermediate Level'; }
          learnSkill.next = learnSkill.pct >= 100 ? 'Mastery Achieved! 🏆' : `Next milestone: ${Math.round(100 - learnSkill.pct)}% to Master`;
        }
        fromUser.points = (fromUser.points || 0) + 100;
        fromUser.hoursLogged = (fromUser.hoursLogged || 0) + 2;
        fromUser.liveSessions = (fromUser.liveSessions || 0) + 1;
        if (fromUser.dailyGoals) {
          fromUser.dailyGoals.achieved = Math.min(fromUser.dailyGoals.total || 4, (fromUser.dailyGoals.achieved || 0) + 1);
        }
        await fromUser.save();
      }

      const toUser = await User.findById(request.to);
      if (toUser) {
        const learnSkill = (toUser.learningSkills || []).find(
          (s) => s.name.toLowerCase() === request.fromSkill.toLowerCase()
        );
        if (learnSkill) {
          learnSkill.pct = Math.min(100, (learnSkill.pct || 0) + 30);
          if (learnSkill.pct >= 75) { learnSkill.bars = 3; learnSkill.level = 'Expert Level'; }
          else if (learnSkill.pct >= 40) { learnSkill.bars = 2; learnSkill.level = 'Intermediate Level'; }
          learnSkill.next = learnSkill.pct >= 100 ? 'Mastery Achieved! 🏆' : `Next milestone: ${Math.round(100 - learnSkill.pct)}% to Master`;
        }
        toUser.points = (toUser.points || 0) + 100;
        toUser.hoursLogged = (toUser.hoursLogged || 0) + 2;
        toUser.liveSessions = (toUser.liveSessions || 0) + 1;
        if (toUser.dailyGoals) {
          toUser.dailyGoals.achieved = Math.min(toUser.dailyGoals.total || 4, (toUser.dailyGoals.achieved || 0) + 1);
        }
        await toUser.save();
      }

      // Remove chat messages between the two users so the connection and chat are cleanly ended
      await Message.deleteMany({
        $or: [
          { from: request.from, to: request.to },
          { from: request.to,   to: request.from },
        ],
      });

      return res.json({
        request,
        isFullyCompleted: true,
        message: '🎉 Skill exchange course concluded! Mastery progress increased and chat removed.',
      });
    }

    // First user has initiated completion: save vote and post a finish request card to the chat thread
    await request.save();

    const existingMsg = await Message.findOne({
      requestId: request._id,
      type: 'finish_request',
    });

    if (!existingMsg) {
      await Message.create({
        from:      req.user._id,
        to:        otherUserId,
        text:      '🎓 Requested to finish and conclude this skill exchange course.',
        type:      'finish_request',
        requestId: request._id,
      });
    }

    return res.json({
      request,
      isFullyCompleted: false,
      message: 'Finish request sent in chat! Awaiting your peer\'s confirmation.',
    });
  } catch (err) {
    console.error('Complete request error:', err);
    res.status(500).json({ error: 'Server error processing exchange completion.' });
  }
});

// ── POST /api/learn-teach/request/:id/cancel-complete ── (protected)
// Withdraw finish request
router.post('/request/:id/cancel-complete', protect, async (req, res) => {
  try {
    const request = await SkillExchangeRequest.findOne({
      _id: req.params.id,
      $or: [
        { from: req.user._id },
        { to:   req.user._id },
      ],
      status: 'accepted',
    });

    if (!request) {
      return res.status(404).json({ error: 'Accepted request not found.' });
    }

    const currentUserIdStr = String(req.user._id);
    request.completedBy = (request.completedBy || []).filter((id) => String(id) !== currentUserIdStr);
    await request.save();

    // Remove the finish_request message card from the chat
    await Message.deleteMany({
      requestId: request._id,
      type:      'finish_request',
    });

    res.json({ request, message: 'Finish request cancelled.' });
  } catch (err) {
    console.error('Cancel complete error:', err);
    res.status(500).json({ error: 'Server error cancelling completion.' });
  }
});

module.exports = router;

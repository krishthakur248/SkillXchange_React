const express              = require('express');
const { protect }          = require('../middleware/auth');
const VideoSession         = require('../models/VideoSession');
const SkillExchangeRequest = require('../models/SkillExchangeRequest');
const MentorClass          = require('../models/MentorClass');

const router = express.Router();

// ── Helper: verify two users have an accepted connection ──
async function hasAcceptedConnection(userId1, userId2) {
  const req = await SkillExchangeRequest.findOne({
    $or: [
      { from: userId1, to: userId2 },
      { from: userId2, to: userId1 },
    ],
    status: 'accepted',
  });
  return !!req;
}

// ── GET /api/video-sessions ── (protected)
// Returns all sessions for current user (1-on-1 peer sessions + mentor class cohort live sessions)
router.get('/', protect, async (req, res) => {
  try {
    // 1. Direct 1-on-1 sessions
    const directSessions = await VideoSession.find({
      classId: null,
      $or: [
        { host: req.user._id },
        { participant: req.user._id },
      ],
    })
      .populate('host',        'name initials avatar')
      .populate('participant', 'name initials avatar')
      .sort({ scheduledAt: 1 });

    const formattedDirect = directSessions.map((s) => {
      const isHost = String(s.host._id) === String(req.user._id);
      const other  = isHost ? (s.participant || s.host) : s.host;
      return {
        _id:            s._id,
        topic:          s.topic,
        scheduledAt:    s.scheduledAt,
        durationMins:   s.durationMins,
        status:         s.status,
        notes:          s.notes,
        isHost,
        isClassSession: false,
        other: {
          userId:   other?._id || '',
          name:     other?.name || 'Partner',
          initials: other?.initials || 'P',
          avatar:   other?.avatar || '',
        },
      };
    });

    // 2. Mentor Class live sessions
    const userClasses = await MentorClass.find({
      $or: [
        { mentorId: req.user._id },
        { 'enrolledStudents.studentId': req.user._id },
      ],
    }).select('_id');

    const classIds = userClasses.map((c) => c._id);

    const classSessions = await VideoSession.find({
      classId: { $in: classIds },
    })
      .populate('host',    'name initials avatar role')
      .populate('classId', 'title description skills enrolledStudents')
      .sort({ scheduledAt: 1 });

    const formattedClass = classSessions.map((s) => {
      const isHost = String(s.host._id) === String(req.user._id);
      const cls = s.classId || {};
      const studentCount = cls.enrolledStudents ? cls.enrolledStudents.length : 0;

      return {
        _id:            s._id,
        topic:          s.topic,
        scheduledAt:    s.scheduledAt,
        durationMins:   s.durationMins,
        status:         s.status,
        notes:          s.notes,
        isHost,
        isClassSession: true,
        classId:        cls._id,
        className:      cls.title || 'Mentor Class',
        studentCount,
        other: {
          userId:   `class_${cls._id}`,
          name:     cls.title || 'Class Cohort',
          initials: (cls.title || 'MC').slice(0, 2).toUpperCase(),
          avatar:   '',
          role:     isHost ? `Mentor Class • ${studentCount} Enrolled` : `Led by ${s.host?.name || 'Mentor'}`,
        },
      };
    });

    const allSessions = [...formattedClass, ...formattedDirect];
    allSessions.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));

    res.json({ sessions: allSessions });
  } catch (err) {
    console.error('Video sessions error:', err);
    res.status(500).json({ error: 'Server error loading video sessions.' });
  }
});

// ── POST /api/video-sessions ── (protected)
// Schedule a new session (either for a Class / Course or with a Skill Partner)
router.post('/', protect, async (req, res) => {
  try {
    const { participantId, classId, topic, scheduledAt, durationMins, notes } = req.body;

    if (!topic || !scheduledAt) {
      return res.status(400).json({ error: 'Topic and scheduledAt are required.' });
    }

    // Schedule for Mentor Class / Course
    if (classId) {
      const cls = await MentorClass.findOne({
        _id: classId,
        mentorId: req.user._id,
      });

      if (!cls) {
        return res.status(403).json({ error: 'You can only schedule live sessions for classes you mentor.' });
      }

      const session = await VideoSession.create({
        host:         req.user._id,
        classId:      cls._id,
        topic:        topic.trim(),
        scheduledAt:  new Date(scheduledAt),
        durationMins: durationMins || 60,
        notes:        notes ? notes.trim() : '',
      });

      await session.populate('host',    'name initials avatar role');
      await session.populate('classId', 'title description skills enrolledStudents');

      return res.status(201).json({ session });
    }

    // Schedule 1-on-1 Peer Session
    if (!participantId) {
      return res.status(400).json({ error: 'Please select a participant or class for the session.' });
    }

    if (String(participantId) === String(req.user._id)) {
      return res.status(400).json({ error: 'You cannot schedule a session with yourself.' });
    }

    const connected = await hasAcceptedConnection(req.user._id, participantId);
    if (!connected) {
      return res.status(403).json({ error: 'You can only schedule sessions with accepted connections.' });
    }

    const session = await VideoSession.create({
      host:         req.user._id,
      participant:  participantId,
      topic:        topic.trim(),
      scheduledAt:  new Date(scheduledAt),
      durationMins: durationMins || 60,
      notes:        notes ? notes.trim() : '',
    });

    await session.populate('host',        'name initials avatar');
    await session.populate('participant', 'name initials avatar');

    res.status(201).json({ session });
  } catch (err) {
    console.error('Create session error:', err);
    res.status(500).json({ error: 'Server error creating session.' });
  }
});

// ── PATCH /api/video-sessions/:id ── (protected)
// Update or cancel a session
router.patch('/:id', protect, async (req, res) => {
  try {
    const { status, topic, scheduledAt, durationMins, notes } = req.body;

    const session = await VideoSession.findOne({
      _id: req.params.id,
      $or: [
        { host: req.user._id },
        { participant: req.user._id },
      ],
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found or unauthorized.' });
    }

    if (status && ['scheduled', 'completed', 'cancelled'].includes(status)) {
      session.status = status;
    }
    if (topic)        session.topic        = topic.trim();
    if (scheduledAt)  session.scheduledAt  = new Date(scheduledAt);
    if (durationMins) session.durationMins = durationMins;
    if (notes !== undefined) session.notes = notes.trim();

    await session.save();
    res.json({ session });
  } catch (err) {
    console.error('Update session error:', err);
    res.status(500).json({ error: 'Server error updating session.' });
  }
});

// ── DELETE /api/video-sessions/:id ── (protected)
// Delete a session
router.delete('/:id', protect, async (req, res) => {
  try {
    const session = await VideoSession.findOneAndDelete({
      _id: req.params.id,
      $or: [
        { host: req.user._id },
        { participant: req.user._id },
      ],
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found or unauthorized.' });
    }

    res.json({ message: 'Session deleted successfully.' });
  } catch (err) {
    console.error('Delete session error:', err);
    res.status(500).json({ error: 'Server error deleting session.' });
  }
});

module.exports = router;

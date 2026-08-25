const express              = require('express');
const { protect }          = require('../middleware/auth');
const VideoSession         = require('../models/VideoSession');
const SkillExchangeRequest = require('../models/SkillExchangeRequest');

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
// Returns all sessions for the current user (as host or participant)
router.get('/', protect, async (req, res) => {
  try {
    const sessions = await VideoSession.find({
      $or: [
        { host: req.user._id },
        { participant: req.user._id },
      ],
    })
      .populate('host',        'name initials avatar')
      .populate('participant', 'name initials avatar')
      .sort({ scheduledAt: 1 });

    const formatted = sessions.map((s) => {
      const isHost = String(s.host._id) === String(req.user._id);
      const other  = isHost ? s.participant : s.host;
      return {
        _id:          s._id,
        topic:        s.topic,
        scheduledAt:  s.scheduledAt,
        durationMins: s.durationMins,
        status:       s.status,
        notes:        s.notes,
        isHost,
        other: {
          userId:   other._id,
          name:     other.name,
          initials: other.initials,
          avatar:   other.avatar || '',
        },
      };
    });

    res.json({ sessions: formatted });
  } catch (err) {
    console.error('Video sessions error:', err);
    res.status(500).json({ error: 'Server error loading video sessions.' });
  }
});

// ── POST /api/video-sessions ── (protected)
// Schedule a new session
router.post('/', protect, async (req, res) => {
  try {
    const { participantId, topic, scheduledAt, durationMins, notes } = req.body;

    if (!participantId || !topic || !scheduledAt) {
      return res.status(400).json({ error: 'participantId, topic, and scheduledAt are required.' });
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

module.exports = router;

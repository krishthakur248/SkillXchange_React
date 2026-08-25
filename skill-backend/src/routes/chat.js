const express              = require('express');
const { protect }          = require('../middleware/auth');
const Message              = require('../models/Message');
const SkillExchangeRequest = require('../models/SkillExchangeRequest');
const User                 = require('../models/User');

const router = express.Router();

// ── Helper: verify two users have an active accepted connection ──
async function hasAcceptedConnection(userId1, userId2) {
  const req = await SkillExchangeRequest.findOne({
    $or: [
      { from: userId1, to: userId2 },
      { from: userId2, to: userId1 },
    ],
    status: 'accepted',
  });
  return req;
}

// ── GET /api/chat/conversations ── (protected)
// Returns list of active accepted connections with last message preview
router.get('/conversations', protect, async (req, res) => {
  try {
    const activeExchanges = await SkillExchangeRequest.find({
      $or: [
        { from: req.user._id, status: 'accepted' },
        { to:   req.user._id, status: 'accepted' },
      ],
    })
      .populate('from', 'name initials avatar role')
      .populate('to',   'name initials avatar role')
      .sort({ updatedAt: -1 });

    const conversations = await Promise.all(activeExchanges.map(async (r) => {
      const other = String(r.from._id) === String(req.user._id) ? r.to : r.from;

      const lastMsg = await Message.findOne({
        $or: [
          { from: req.user._id, to: other._id },
          { from: other._id,    to: req.user._id },
        ],
      }).sort({ createdAt: -1 });

      const unreadCount = await Message.countDocuments({
        from: other._id,
        to:   req.user._id,
        read: false,
      });

      const myVote = (r.completedBy || []).some((id) => String(id) === String(req.user._id));
      const peerVote = (r.completedBy || []).some((id) => String(id) !== String(req.user._id));

      return {
        userId:        other._id,
        name:          other.name,
        initials:      other.initials,
        avatar:        other.avatar || '',
        role:          other.role,
        lastMessage:   lastMsg ? (lastMsg.type === 'finish_request' ? '🎓 Course Finish Requested' : lastMsg.text) : null,
        lastMessageAt: lastMsg ? lastMsg.createdAt : r.updatedAt,
        unreadCount,
        requestId:     r._id,
        status:        r.status,
        fromSkill:     r.fromSkill,
        toSkill:       r.toSkill,
        completedBy:   r.completedBy || [],
        myVote,
        peerVote,
      };
    }));

    conversations.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));

    res.json({ conversations });
  } catch (err) {
    console.error('Conversations error:', err);
    res.status(500).json({ error: 'Server error loading conversations.' });
  }
});

// ── GET /api/chat/messages/:userId ── (protected)
// Returns messages between current user and :userId
router.get('/messages/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const exchange = await hasAcceptedConnection(req.user._id, userId);
    if (!exchange) {
      return res.status(403).json({ error: 'No active connection found with this user.' });
    }

    const messages = await Message.find({
      $or: [
        { from: req.user._id, to: userId },
        { from: userId, to: req.user._id },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Mark messages from them as read
    await Message.updateMany(
      { from: userId, to: req.user._id, read: false },
      { $set: { read: true } }
    );

    res.json({ messages: messages.reverse(), exchange });
  } catch (err) {
    console.error('Messages error:', err);
    res.status(500).json({ error: 'Server error loading messages.' });
  }
});

// ── POST /api/chat/messages/:userId ── (protected)
// Send a message to :userId
router.post('/messages/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Message text is required.' });
    }

    const exchange = await hasAcceptedConnection(req.user._id, userId);
    if (!exchange) {
      return res.status(403).json({ error: 'You can only message active connected partners.' });
    }

    const message = await Message.create({
      from: req.user._id,
      to:   userId,
      text: text.trim(),
    });

    res.status(201).json({ message });
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: 'Server error sending message.' });
  }
});

module.exports = router;

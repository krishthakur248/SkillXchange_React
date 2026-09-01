const express              = require('express');
const { protect }          = require('../middleware/auth');
const Message              = require('../models/Message');
const SkillExchangeRequest = require('../models/SkillExchangeRequest');
const MentorClass          = require('../models/MentorClass');
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
// Returns list of active peer connections AND mentor class cohort groups
router.get('/conversations', protect, async (req, res) => {
  try {
    // 1. Peer-to-peer 1:1 exchanges (for normal users and direct connections)
    const activeExchanges = await SkillExchangeRequest.find({
      $or: [
        { from: req.user._id, status: 'accepted' },
        { to:   req.user._id, status: 'accepted' },
      ],
    })
      .populate('from', 'name initials avatar role')
      .populate('to',   'name initials avatar role')
      .sort({ updatedAt: -1 });

    const p2pConversations = await Promise.all(activeExchanges.map(async (r) => {
      const other = String(r.from._id) === String(req.user._id) ? r.to : r.from;

      const lastMsg = await Message.findOne({
        classId: null,
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
        isGroup:       false,
        isClass:       false,
      };
    }));

    // 2. Mentor Class cohort group chats (where user is either Mentor or Enrolled Student)
    const myClasses = await MentorClass.find({
      $or: [
        { mentorId: req.user._id },
        { enrolledStudents: req.user._id },
      ],
      status: 'active',
    })
      .populate('mentorId', 'name initials avatar role')
      .sort({ updatedAt: -1 });

    const classConversations = await Promise.all(myClasses.map(async (cls) => {
      const lastClassMsg = await Message.findOne({ classId: cls._id })
        .sort({ createdAt: -1 })
        .populate('from', 'name initials avatar');

      const isMentor = String(cls.mentorId._id || cls.mentorId) === String(req.user._id);
      const studentCount = cls.enrolledStudents ? cls.enrolledStudents.length : 0;

      return {
        userId:        `class_${cls._id}`,
        classId:       cls._id,
        name:          cls.title,
        classTitle:    cls.title,
        description:   cls.description,
        skills:        cls.skills || [],
        role:          isMentor ? `Mentor • ${studentCount} Student${studentCount !== 1 ? 's' : ''}` : `Class Cohort • Led by ${cls.mentorId?.name || 'Mentor'}`,
        initials:      cls.title.slice(0, 2).toUpperCase(),
        avatar:        '',
        lastMessage:   lastClassMsg
          ? `${String(lastClassMsg.from._id) === String(req.user._id) ? 'You' : lastClassMsg.from?.name?.split(' ')[0] || 'Member'}: ${lastClassMsg.text}`
          : 'Class cohort created 🎓',
        lastMessageAt: lastClassMsg ? lastClassMsg.createdAt : cls.createdAt,
        unreadCount:   0,
        isGroup:       true,
        isClass:       true,
        isMentor,
        memberCount:   studentCount + 1,
        status:        cls.status,
      };
    }));

    // Combine both and sort by most recent message
    const allConversations = [...classConversations, ...p2pConversations];
    allConversations.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));

    res.json({ conversations: allConversations });
  } catch (err) {
    console.error('Conversations error:', err);
    res.status(500).json({ error: 'Server error loading conversations.' });
  }
});

// ── GET /api/chat/messages/:targetId ── (protected)
// Returns messages for either a peer :userId or a mentor class :classId (prefixed with class_)
router.get('/messages/:targetId', protect, async (req, res) => {
  try {
    const { targetId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    // Handle Mentor Class group messages
    if (targetId.startsWith('class_')) {
      const classId = targetId.replace('class_', '');
      const cls = await MentorClass.findOne({
        _id: classId,
        $or: [
          { mentorId: req.user._id },
          { enrolledStudents: req.user._id },
        ],
      }).populate('mentorId', 'name initials avatar role');

      if (!cls) {
        return res.status(403).json({ error: 'You are not enrolled in or managing this class.' });
      }

      const messages = await Message.find({ classId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('from', 'name initials avatar role')
        .lean();

      const formatted = messages.map((m) => ({
        _id:            m._id,
        from:           m.from._id,
        senderName:     m.from.name,
        senderInitials: m.from.initials,
        senderAvatar:   m.from.avatar || '',
        senderRole:     m.from.role,
        isMentorMsg:    String(m.from._id) === String(cls.mentorId._id || cls.mentorId),
        text:           m.text,
        type:           m.type,
        createdAt:      m.createdAt,
        isClass:        true,
        classId:        m.classId,
      }));

      return res.json({
        messages: formatted.reverse(),
        isClass: true,
        classInfo: cls,
      });
    }

    // Handle standard 1-on-1 peer exchange messages
    const userId = targetId;
    const exchange = await hasAcceptedConnection(req.user._id, userId);
    if (!exchange) {
      return res.status(403).json({ error: 'No active connection found with this user.' });
    }

    const messages = await Message.find({
      classId: null,
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
      { classId: null, from: userId, to: req.user._id, read: false },
      { $set: { read: true } }
    );

    res.json({ messages: messages.reverse(), exchange, isClass: false });
  } catch (err) {
    console.error('Messages error:', err);
    res.status(500).json({ error: 'Server error loading messages.' });
  }
});

// ── POST /api/chat/messages/:targetId ── (protected)
// Send a message to :userId or to mentor class :classId
router.post('/messages/:targetId', protect, async (req, res) => {
  try {
    const { targetId } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Message text is required.' });
    }

    // Handle Mentor Class group messages
    if (targetId.startsWith('class_')) {
      const classId = targetId.replace('class_', '');
      const cls = await MentorClass.findOne({
        _id: classId,
        $or: [
          { mentorId: req.user._id },
          { enrolledStudents: req.user._id },
        ],
      });

      if (!cls) {
        return res.status(403).json({ error: 'You are not enrolled in or managing this class.' });
      }

      const message = await Message.create({
        from:    req.user._id,
        classId: cls._id,
        text:    text.trim(),
      });

      await message.populate('from', 'name initials avatar role');

      return res.status(201).json({
        message: {
          _id:            message._id,
          from:           message.from._id,
          senderName:     message.from.name,
          senderInitials: message.from.initials,
          senderAvatar:   message.from.avatar || '',
          senderRole:     message.from.role,
          isMentorMsg:    String(message.from._id) === String(cls.mentorId),
          text:           message.text,
          type:           message.type,
          createdAt:      message.createdAt,
          isClass:        true,
          classId:        message.classId,
        },
      });
    }

    // Handle standard 1-on-1 peer exchange messages
    const userId = targetId;
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

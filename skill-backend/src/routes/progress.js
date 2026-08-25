const express              = require('express');
const { protect }          = require('../middleware/auth');
const Session              = require('../models/Session');
const VideoSession         = require('../models/VideoSession');
const User                 = require('../models/User');
const SkillExchangeRequest = require('../models/SkillExchangeRequest');

const router = express.Router();

// ── GET /api/progress ── (protected)
router.get('/', protect, async (req, res) => {
  try {
    const me = req.user;
    const now = new Date();

    // ── 1. Query upcoming & scheduled VideoSession instances ──
    const rawVideoSessions = await VideoSession.find({
      $or: [{ host: me._id }, { participant: me._id }],
      status: 'scheduled',
    })
      .populate('host', 'name initials avatar')
      .populate('participant', 'name initials avatar')
      .sort({ scheduledAt: 1 });

    const videoSessionsFormatted = rawVideoSessions
      .filter((vs) => vs.host && vs.participant)
      .map((vs) => {
        const isHost = String(vs.host._id) === String(me._id);
        const partner = isHost ? vs.participant : vs.host;
        const dt = new Date(vs.scheduledAt);
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const isToday = dt.toDateString() === now.toDateString();
        const isTomorrow = dt.toDateString() === tomorrow.toDateString();
        const tag = isToday
          ? 'TODAY'
          : isTomorrow
            ? 'TOMORROW'
            : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();

        const timeStr = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        return {
          _id:         vs._id,
          tag,
          tagColor:    isToday ? 'primary' : 'secondary',
          time:        timeStr,
          title:       vs.topic || 'Skill Exchange Call',
          mentor:      partner.name,
          partnerId:   partner._id,
          initials:    partner.initials,
          duration:    `${vs.durationMins || 60}m`,
          action:      'join',
          isVideoCall: true,
          dateObj:     dt,
        };
      });

    // ── 2. Query mentor sessions from Session collection ──
    const rawMentorSessions = await Session.find({
      participant: me._id,
    }).sort({ dateTime: 1 });

    const mentorSessionsFormatted = rawMentorSessions.map((s) => {
      const dt = new Date(s.dateTime);
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const isToday = dt.toDateString() === now.toDateString();
      const isTomorrow = dt.toDateString() === tomorrow.toDateString();
      const tag = isToday
        ? 'TODAY'
        : isTomorrow
          ? 'TOMORROW'
          : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();

      const timeStr = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

      return {
        _id:         s._id,
        tag,
        tagColor:    s.tagColor || 'primary',
        time:        timeStr,
        title:       s.title,
        mentor:      s.mentor,
        action:      s.action || 'join',
        isVideoCall: true,
        duration:    '45m',
        dateObj:     dt,
      };
    });

    // Combine both and sort chronologically
    let sessions = [...videoSessionsFormatted, ...mentorSessionsFormatted]
      .sort((a, b) => a.dateObj - b.dateObj)
      .slice(0, 4);

    // ── Find all users who already have active (pending or accepted) requests with 'me' to exclude from matches ──
    const activeRequests = await SkillExchangeRequest.find({
      $or: [{ from: me._id }, { to: me._id }],
      status: { $in: ['pending', 'accepted'] },
    }).select('from to');

    const excludedIds = [
      me._id,
      ...activeRequests.map((r) => String(r.from) === String(me._id) ? r.to : r.from),
    ];

    // ── Perfect Reciprocal Matches (Excluding connected/pending users) ──
    const myTeachNames = me.teachingSkills.map((s) => s.name);
    const myLearnNames = me.learningSkills.map((s) => s.name);

    let matchUsers = await User.find({
      _id: { $nin: excludedIds },
      $or: [
        { 'learningSkills.name': { $in: myTeachNames } },
        { 'teachingSkills.name': { $in: myLearnNames } },
      ],
    })
      .select('name role initials teachingSkills learningSkills')
      .limit(3);

    if (matchUsers.length === 0) {
      matchUsers = await User.find({ _id: { $nin: excludedIds } })
        .select('name role initials teachingSkills learningSkills')
        .limit(3);
    }

    const accents = ['primary', 'secondary', 'tertiary'];
    const matches = matchUsers.map((u, i) => ({
      _id:      u._id,
      name:     u.name,
      role:     u.role,
      initials: u.initials,
      accent:   accents[i] || 'primary',
      offers:   u.teachingSkills.map((s) => s.name),
      wants:    u.learningSkills.map((s)  => s.name),
    }));

    // ── Pending incoming request count ──
    const pendingCount = await SkillExchangeRequest.countDocuments({
      to:     me._id,
      status: 'pending',
    });

    // ── Velocity stats ──
    const hoursShared  = me.hoursLogged   || 0;
    const hoursLearned = me.hoursLogged ? Math.round(me.hoursLogged * 2) : 0;
    const sharedPct    = Math.min(Math.round((hoursShared  / 30) * 100), 100);
    const learnedPct   = Math.min(Math.round((hoursLearned / 30) * 100), 100);

    const activeTeach  = me.teachingSkills.slice(0, 2).map((s) => s.name).join(', ') || 'None yet';
    const activeLearn  = me.learningSkills.slice(0, 2).map((s) => s.name).join(', ') || 'None yet';

    res.json({
      user: {
        name:     me.name,
        initials: me.initials,
        level:    me.level,
        rating:   me.rating,
        badge:    me.badge,
      },
      pendingCount,
      velocity: {
        hoursShared,
        hoursLearned,
        sharedPct,
        learnedPct,
        activeTeach,
        activeLearn,
      },
      sessions,
      matches,
    });
  } catch (err) {
    console.error('Progress route error:', err);
    res.status(500).json({ error: 'Server error loading progress data.' });
  }
});

module.exports = router;

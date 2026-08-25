const express              = require('express');
const { protect }          = require('../middleware/auth');
const User                 = require('../models/User');
const CommunitySpotlight   = require('../models/CommunitySpotlight');
const SkillExchangeRequest = require('../models/SkillExchangeRequest');

const router = express.Router();

// ── GET /api/home ── (protected)
// Returns everything the HomePage needs in one request
router.get('/', protect, async (req, res) => {
  try {
    const me = req.user;

    // Find all users with active (pending or accepted) requests with 'me' to exclude from recommendations
    const activeRequests = await SkillExchangeRequest.find({
      $or: [{ from: me._id }, { to: me._id }],
      status: { $in: ['pending', 'accepted'] },
    }).select('from to');

    const excludedIds = [
      me._id,
      ...activeRequests.map((r) => String(r.from) === String(me._id) ? r.to : r.from),
    ];

    // ── Match Cards: find other users whose learningSkills match my teachingSkills (excluding already connected)
    const myTeachNames = me.teachingSkills.map((s) => s.name);
    const myLearnNames = me.learningSkills.map((s) => s.name);

    let matchUsers = await User.find({
      _id: { $nin: excludedIds },
      $or: [
        { 'learningSkills.name': { $in: myTeachNames } },
        { 'teachingSkills.name': { $in: myLearnNames } },
      ],
    })
      .select('name role initials teachingSkills learningSkills avatar rating')
      .limit(4);

    if (matchUsers.length === 0) {
      matchUsers = await User.find({ _id: { $nin: excludedIds } })
        .select('name role initials teachingSkills learningSkills avatar rating')
        .limit(4);
    }

    const matchCards = matchUsers.map((u) => ({
      _id:      u._id,
      name:     u.name,
      role:     u.role,
      initials: u.initials,
      avatar:   u.avatar || '',
      accent:   'primary',
      teaches:  u.teachingSkills[0]?.name || '—',
      wants:    u.learningSkills[0]?.name  || '—',
    }));

    // ── Active Conversations: recent accepted requests
    const acceptedRequests = await SkillExchangeRequest.find({
      $or: [{ from: me._id }, { to: me._id }],
      status: 'accepted',
    })
      .populate('from', 'name initials avatar')
      .populate('to',   'name initials avatar')
      .sort({ updatedAt: -1 })
      .limit(3);

    const chats = acceptedRequests.map((r) => {
      const peer = String(r.from._id) === String(me._id) ? r.to : r.from;
      const minsAgo = Math.floor((Date.now() - r.updatedAt) / 60000);
      const timeStr = minsAgo < 60
        ? `${minsAgo}m ago`
        : minsAgo < 1440
          ? `${Math.floor(minsAgo / 60)}h ago`
          : `${Math.floor(minsAgo / 1440)}d ago`;
      return {
        _id:      r._id,
        peerId:   peer._id,
        name:     peer.name,
        initials: peer.initials,
        avatar:   peer.avatar || '',
        time:     timeStr,
        preview:  `Exchange: ${r.fromSkill} ↔ ${r.toSkill}`,
        active:   minsAgo < 60,
      };
    });

    // ── Community Spotlight (Guaranteed rich fallback if DB entry missing) ──
    let spotlight = await CommunitySpotlight.findOne().sort({ updatedAt: -1 });
    if (!spotlight || !spotlight.trendingSkills || spotlight.trendingSkills.length === 0) {
      spotlight = {
        trendingSkills: [
          { name: 'Rust & Systems Design', pct: '+48%' },
          { name: 'Figma Design Tokens',   pct: '+34%' },
          { name: 'Python Data Pipelines', pct: '+26%' },
          { name: 'Full-Stack Next.js 15', pct: '+21%' },
        ],
        upcomingWebinar: {
          title: 'Reciprocal Learning: Scaling Skills Faster with Peer Swaps',
          date:  'Thursday, 6:00 PM (IST)',
        },
        successStory: {
          quote: '"I traded React tips for deep-dives into Rust & Distributed Systems. We launched our open-source project within 3 weeks!"',
          author: 'David Chen',
          role:   'Full Stack Architect',
        },
      };
    }

    // ── Stats ──
    const stats = {
      hoursLogged:  me.hoursLogged  || 0,
      liveSessions: me.liveSessions || 0,
      points:       me.points       || 0,
    };

    // ── Daily Progress ──
    const dailyProgress = {
      pct:      Math.round((me.dailyGoals.achieved / Math.max(me.dailyGoals.total, 1)) * 100),
      achieved: me.dailyGoals.achieved,
      total:    me.dailyGoals.total,
    };

    // Format learningSkills with calculated progress percentage based on level & hours/sessions
    const formattedSkills = (me.learningSkills || []).map((s) => {
      let pct = s.pct;
      if (pct === undefined || pct === null || pct === 0) {
        if (s.level?.includes('Expert') || s.bars === 3) pct = 85;
        else if (s.level?.includes('Intermediate') || s.bars === 2) pct = 50;
        else pct = 25; // Beginner base progress
      }
      return {
        name:  s.name,
        level: s.level || 'Beginner Level',
        bars:  s.bars  || 1,
        pct:   Math.min(100, pct),
        color: s.color || 'primary',
        next:  s.next  || `Milestone: Complete session in ${s.name}`,
      };
    });

    res.json({
      user:           { name: me.name, initials: me.initials, badge: me.badge },
      matchCards,
      skills:         formattedSkills,
      stats,
      dailyProgress,
      chats,
      spotlight,
    });
  } catch (err) {
    console.error('Home route error:', err);
    res.status(500).json({ error: 'Server error loading home data.' });
  }
});

module.exports = router;

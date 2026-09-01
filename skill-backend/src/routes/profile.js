const express              = require('express');
const { protect }          = require('../middleware/auth');
const User                 = require('../models/User');
const SkillExchangeRequest = require('../models/SkillExchangeRequest');

const router = express.Router();

// ── GET /api/profile ── (protected)
router.get('/', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({ user });
  } catch (err) {
    console.error('Profile get error:', err);
    res.status(500).json({ error: 'Server error loading profile.' });
  }
});

// ── PATCH /api/profile ── (protected)
// Update settings: timezone, availableForExchange, preferredMethod, bio, name, etc.
router.patch('/', protect, async (req, res) => {
  try {
    const allowed = [
      'timezone', 'availableForExchange', 'preferredMethod',
      'bio', 'name', 'role', 'location',
      'teachingSkills', 'learningSkills',
      'userRole', 'mentorVerification',
    ];

    const updates = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true },
    ).select('-password');

    res.json({ user });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Server error updating profile.' });
  }
});

// ── GET /api/profile/matches ── (protected)
// Top potential matches for this user's profile page (excluding already connected/pending peers)
router.get('/matches', protect, async (req, res) => {
  try {
    const me = req.user;

    const activeRequests = await SkillExchangeRequest.find({
      $or: [{ from: me._id }, { to: me._id }],
      status: { $in: ['pending', 'accepted'] },
    }).select('from to');

    const excludedIds = [
      me._id,
      ...activeRequests.map((r) => String(r.from) === String(me._id) ? r.to : r.from),
    ];

    const myTeachNames = me.teachingSkills.map((s) => s.name);
    const myLearnNames = me.learningSkills.map((s) => s.name);

    let potentialMatches = await User.find({
      _id:      { $nin: excludedIds },
      userRole: { $ne: 'mentor' },           // exclude mentors from P2P pool
      $or: [
        { 'learningSkills.name': { $in: myTeachNames } },
        { 'teachingSkills.name': { $in: myLearnNames } },
      ],
    })
      .select('name initials role teachingSkills learningSkills rating')
      .limit(2);

    // Fallback to any 2 non-connected, non-mentor users
    if (potentialMatches.length === 0) {
      potentialMatches = await User.find({ _id: { $nin: excludedIds }, userRole: { $ne: 'mentor' } })
        .select('name initials role teachingSkills learningSkills rating')
        .limit(2);
    }

    const pcts = ['98% Match', '92% Match'];
    const formatted = potentialMatches.map((u, i) => ({
      _id:      u._id,
      name:     u.name,
      initials: u.initials,
      sub:      `${u.role} • ${pcts[i] || '90% Match'}`,
      teaches:  u.teachingSkills.map((s) => s.name),
      wants:    u.learningSkills.map((s) => s.name),
      verified: i === 0,
    }));

    res.json({ matches: formatted });
  } catch (err) {
    console.error('Profile matches error:', err);
    res.status(500).json({ error: 'Server error loading matches.' });
  }
});

module.exports = router;

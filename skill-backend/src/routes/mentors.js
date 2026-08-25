const express   = require('express');
const Mentor    = require('../models/Mentor');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/mentors ── (protected)
// Query params: search, rating, availability (online)
router.get('/', protect, async (req, res) => {
  try {
    const { search = '', rating = '', availability = '' } = req.query;

    const query = {};

    // Text search across name and skills
    if (search.trim()) {
      query.$or = [
        { name:   { $regex: search, $options: 'i' } },
        { skills: { $elemMatch: { $regex: search, $options: 'i' } } },
      ];
    }

    // Rating filter
    if (rating === '4.5+ Stars') query.rating = { $gte: 4.5 };
    if (rating === '4.0+ Stars') query.rating = { $gte: 4.0 };

    // Availability filter
    if (availability === 'Immediate') query.online = true;

    const mentors = await Mentor.find(query).sort({ rating: -1 });

    // Total stats (for header)
    const totalMentors = await Mentor.countDocuments();
    const totalSkills  = await Mentor.distinct('skills').then((s) => s.length);

    res.json({ mentors, totalMentors, totalSkills });
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

const mongoose = require('mongoose');

const communitySpotlightSchema = new mongoose.Schema({
  trendingSkills: [{
    name: { type: String, required: true },
    pct:  { type: String, required: true }, // e.g. "+42%"
    _id: false,
  }],
  upcomingWebinar: {
    title: { type: String, default: '' },
    date:  { type: String, default: '' }, // human-readable e.g. "Tomorrow, 10:00 AM"
  },
  successStory: {
    quote:  { type: String, default: '' },
    author: { type: String, default: '' },
    role:   { type: String, default: '' },
  },
}, { timestamps: true });

module.exports = mongoose.model('CommunitySpotlight', communitySpotlightSchema);

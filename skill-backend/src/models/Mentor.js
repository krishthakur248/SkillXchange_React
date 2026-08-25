const mongoose = require('mongoose');

const mentorSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  role:     { type: String, required: true },
  rating:   { type: Number, default: 4.5, min: 0, max: 5 },
  reviews:  { type: Number, default: 0 },
  accent:   { type: String, default: 'primary', enum: ['primary', 'secondary'] },
  online:   { type: Boolean, default: false },
  skills:   [{ type: String }],
  initials: { type: String, default: '' },
  avatar:   { type: String, default: '' }, // URL or empty
}, { timestamps: true });

// Auto-generate initials
mentorSchema.pre('save', function (next) {
  if (!this.initials) {
    this.initials = this.name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');
  }
  next();
});

module.exports = mongoose.model('Mentor', mentorSchema);

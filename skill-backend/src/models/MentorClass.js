const mongoose = require('mongoose');

const mentorClassSchema = new mongoose.Schema({
  mentorId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
  },
  title:       { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  skills:      [{ type: String }],

  // Capacity
  maxStudents:           { type: Number, required: true, min: 1 },
  enrolledStudents:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // Stub for future credit/reputation gate — not enforced in enrollment yet
  minReputationRequired: { type: Number, default: 0 },

  status: { type: String, enum: ['active', 'archived', 'completed'], default: 'active' },
}, { timestamps: true });

module.exports = mongoose.model('MentorClass', mentorClassSchema);

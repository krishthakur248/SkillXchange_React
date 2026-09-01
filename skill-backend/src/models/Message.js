const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  from:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to:          { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // optional for class group chat
  classId:     { type: mongoose.Schema.Types.ObjectId, ref: 'MentorClass' }, // for class cohort chat
  text:        { type: String, required: true, trim: true, maxlength: 2000 },
  type:        { type: String, enum: ['text', 'finish_request'], default: 'text' },
  requestId:   { type: mongoose.Schema.Types.ObjectId, ref: 'SkillExchangeRequest' },
  read:        { type: Boolean, default: false },
}, { timestamps: true });

// Index for fast conversation and class lookups
messageSchema.index({ from: 1, to: 1, createdAt: -1 });
messageSchema.index({ classId: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);

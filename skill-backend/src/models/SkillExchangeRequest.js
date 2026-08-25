const mongoose = require('mongoose');

const skillExchangeRequestSchema = new mongoose.Schema({
  from:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fromSkill:   { type: String, required: true }, // skill 'from' user offers
  toSkill:     { type: String, required: true }, // skill 'from' user wants
  status: {
    type: String,
    default: 'pending',
    enum: ['pending', 'accepted', 'declined', 'reschedule', 'completed'],
  },
  // Tracks user IDs of both participants who have approved finishing the exchange
  completedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  completedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('SkillExchangeRequest', skillExchangeRequestSchema);

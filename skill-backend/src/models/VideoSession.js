const mongoose = require('mongoose');

const videoSessionSchema = new mongoose.Schema({
  host:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  participant: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // optional for class live sessions
  classId:     { type: mongoose.Schema.Types.ObjectId, ref: 'MentorClass' }, // for class cohort live sessions
  topic:       { type: String, required: true, trim: true, maxlength: 200 },
  scheduledAt: { type: Date, required: true },
  durationMins: { type: Number, default: 60, min: 15, max: 240 },
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled'],
    default: 'scheduled',
  },
  notes: { type: String, default: '', maxlength: 1000 },
}, { timestamps: true });

videoSessionSchema.index({ host: 1, scheduledAt: 1 });
videoSessionSchema.index({ participant: 1, scheduledAt: 1 });
videoSessionSchema.index({ classId: 1, scheduledAt: 1 });

module.exports = mongoose.model('VideoSession', videoSessionSchema);

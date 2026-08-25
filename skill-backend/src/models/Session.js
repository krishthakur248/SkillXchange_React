const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  participant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:       { type: String, required: true },
  mentor:      { type: String, required: true }, // mentor display name
  dateTime:    { type: Date, required: true },
  tag:         { type: String, default: '' },      // e.g. "TOMORROW", "OCT 24"
  tagColor:    { type: String, default: 'primary', enum: ['primary', 'secondary', 'tertiary'] },
  action:      { type: String, default: 'manage', enum: ['join', 'manage'] },
}, { timestamps: true });

module.exports = mongoose.model('Session', sessionSchema);

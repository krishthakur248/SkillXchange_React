const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const teachingSkillSchema = new mongoose.Schema({
  name:       { type: String, required: true },
  level:      { type: String, default: 'Beginner Level' },
  levelColor: { type: String, default: 'muted' }, // 'primary' | 'secondary' | 'muted'
  bars:       { type: Number, default: 1, min: 1, max: 3 }, // 1-3 dots
}, { _id: false });

const learningSkillSchema = new mongoose.Schema({
  name:  { type: String, required: true },
  level: { type: String, default: 'Beginner Level' },
  bars:  { type: Number, default: 1, min: 1, max: 3 },
  pct:   { type: Number, default: 0, min: 0, max: 100 }, // progress %
  color: { type: String, default: 'primary' },
  next:  { type: String, default: '' }, // milestone text
}, { _id: false });

const userSchema = new mongoose.Schema({
  // Auth
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },

  // Identity
  name:        { type: String, required: true, trim: true },
  initials:    { type: String, default: '' },
  role:        { type: String, default: 'SkillXchange Member' },
  bio:         { type: String, default: '' },
  location:    { type: String, default: '' },
  badge:       { type: String, default: 'LEARNER' }, // LEARNER | EXPERT | MENTOR

  // Stats
  rating:       { type: Number, default: 0, min: 0, max: 5 },
  reviewCount:  { type: Number, default: 0 },
  level:        { type: Number, default: 1 },
  points:       { type: Number, default: 0 },
  hoursLogged:  { type: Number, default: 0 },
  liveSessions: { type: Number, default: 0 },

  // Daily progress widget
  dailyGoals: {
    total:    { type: Number, default: 4 },
    achieved: { type: Number, default: 0 },
  },

  // Skills
  teachingSkills: [teachingSkillSchema],
  learningSkills: [learningSkillSchema],

  // Settings
  availableForExchange: { type: Boolean, default: true },
  timezone:             { type: String, default: 'IST (UTC+5:30)' },
  preferredMethod:      { type: String, default: 'Video Call', enum: ['Video Call', 'Chat Only', 'In Person'] },

  memberSince: { type: Date, default: Date.now },

  // ── Mentor feature ──
  userRole: { type: String, enum: ['user', 'mentor'], default: 'user' },
  mentorVerification: {
    status:        { type: String, enum: ['none', 'pending', 'verified', 'test_bypass'], default: 'none' },
    method:        { type: String, enum: ['document', 'email', 'test_bypass'], default: undefined },
    documentUrl:   { type: String },     // stub — populated by real upload later
    verifiedEmail: { type: String },     // stub — populated by email check later
    verifiedAt:    { type: Date },
  },
}, { timestamps: true });

// ── Auto-generate initials ──
userSchema.pre('save', function (next) {
  if (this.isModified('name') || !this.initials) {
    this.initials = this.name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');
  }
  next();
});

// ── Hash password on save ──
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Compare password ──
userSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

// ── Strip password from JSON output ──
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);

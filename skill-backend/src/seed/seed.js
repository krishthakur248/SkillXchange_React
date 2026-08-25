/**
 * SkillXchange — Database Seed Script
 * Run with: npm run seed
 *
 * Seeds: Users, Mentors, Sessions, Community Spotlight, and Skill Exchange Requests
 */

const mongoose           = require('mongoose');
const dotenv             = require('dotenv');
const bcrypt             = require('bcryptjs');

dotenv.config({ path: require('path').join(__dirname, '../../.env') });

const User                 = require('../models/User');
const Mentor               = require('../models/Mentor');
const Session              = require('../models/Session');
const CommunitySpotlight   = require('../models/CommunitySpotlight');
const SkillExchangeRequest = require('../models/SkillExchangeRequest');

// ── Demo Users ──
const users = [
  {
    name: 'Alex Rivera',
    email: 'alex@skillxchange.io',
    password: 'password123',
    role: 'Senior Product Designer & Frontend Enthusiast',
    bio: 'Passionate about creating accessible interfaces and mentoring the next generation of UX practitioners. Always looking to trade React tips for deep-dives into Behavioral Psychology.',
    location: 'San Francisco, CA',
    badge: 'EXPERT',
    rating: 4.9,
    reviewCount: 42,
    level: 12,
    points: 1560,
    hoursLogged: 14,
    liveSessions: 4,
    dailyGoals: { total: 4, achieved: 3 },
    teachingSkills: [
      { name: 'UX Strategy',         level: 'Expert Level',       levelColor: 'secondary', bars: 3 },
      { name: 'Figma Advanced',      level: 'Expert Level',       levelColor: 'secondary', bars: 3 },
      { name: 'Webflow Development', level: 'Intermediate Level', levelColor: 'muted',     bars: 2 },
    ],
    learningSkills: [
      { name: 'Visual Design Foundations', level: 'Intermediate Level', bars: 2, pct: 82, color: 'primary',   next: 'Next milestone: Component Architecture' },
      { name: 'Functional Programming',    level: 'Beginner Level',     bars: 1, pct: 45, color: 'secondary', next: 'Recently completed: Immutable Patterns' },
      { name: 'Public Speaking',           level: 'Intermediate Level', bars: 2, pct: 60, color: 'primary',   next: 'Goal: Complete 3 mock presentations' },
    ],
    availableForExchange: true,
    timezone: 'PST (UTC-8)',
    preferredMethod: 'Video Call',
  },
  {
    name: 'Dr. Sarah Chen',
    email: 'sarah.chen@skillxchange.io',
    password: 'password123',
    role: 'Senior Data Architect',
    bio: 'Rust enthusiast and data infrastructure expert. Looking to explore the creative side of UI design.',
    location: 'New York, NY',
    badge: 'EXPERT',
    rating: 4.8,
    reviewCount: 67,
    level: 15,
    points: 2100,
    hoursLogged: 22,
    liveSessions: 8,
    dailyGoals: { total: 4, achieved: 4 },
    teachingSkills: [
      { name: 'Advanced Rust Systems', level: 'Expert Level', levelColor: 'secondary', bars: 3 },
      { name: 'Data Pipelines',        level: 'Expert Level', levelColor: 'secondary', bars: 3 },
    ],
    learningSkills: [
      { name: 'UI Design Fundamentals', level: 'Beginner Level', bars: 1, pct: 25, color: 'primary', next: 'Goal: Complete first Figma prototype' },
    ],
    availableForExchange: true,
    timezone: 'EST (UTC-5)',
    preferredMethod: 'Video Call',
  },
  {
    name: 'Jameson Miller',
    email: 'jameson@skillxchange.io',
    password: 'password123',
    role: 'Creative Strategist',
    bio: 'Brand storytelling expert with 10 years in creative agencies. Looking to level up my technical writing skills.',
    location: 'Chicago, IL',
    badge: 'LEARNER',
    rating: 4.7,
    reviewCount: 31,
    level: 8,
    points: 890,
    hoursLogged: 9,
    liveSessions: 3,
    dailyGoals: { total: 4, achieved: 2 },
    teachingSkills: [
      { name: 'Brand Storytelling',  level: 'Expert Level',       levelColor: 'secondary', bars: 3 },
      { name: 'Creative Direction',  level: 'Intermediate Level', levelColor: 'muted',     bars: 2 },
    ],
    learningSkills: [
      { name: 'Technical Writing', level: 'Beginner Level', bars: 1, pct: 35, color: 'secondary', next: 'Goal: Publish first technical blog post' },
      { name: 'Python Basics',     level: 'Beginner Level', bars: 1, pct: 15, color: 'primary',   next: 'Next: Complete variables & data types module' },
    ],
    availableForExchange: true,
    timezone: 'CST (UTC-6)',
    preferredMethod: 'Chat Only',
  },
  {
    name: 'Elena Rodriguez',
    email: 'elena@skillxchange.io',
    password: 'password123',
    role: 'Linguistics Professor & Product Manager',
    bio: 'Linguistics researcher turned digital growth director. I help developers and design founders optimize strategy in exchange for interactive prototyping guidance.',
    location: 'Austin, TX',
    badge: 'MENTOR',
    rating: 4.9,
    reviewCount: 88,
    level: 14,
    points: 1980,
    hoursLogged: 18,
    liveSessions: 7,
    dailyGoals: { total: 4, achieved: 3 },
    teachingSkills: [
      { name: 'Phonetic Evolution',  level: 'Expert Level',       levelColor: 'secondary', bars: 3 },
      { name: 'SEO Strategy',        level: 'Intermediate Level', levelColor: 'muted',     bars: 2 },
      { name: 'Content Analytics',   level: 'Intermediate Level', levelColor: 'muted',     bars: 2 },
    ],
    learningSkills: [
      { name: 'Product Management',   level: 'Intermediate Level', bars: 2, pct: 58, color: 'primary',   next: 'Next: Complete Sprint Planning module' },
      { name: 'Figma Prototyping',    level: 'Beginner Level',     bars: 1, pct: 20, color: 'secondary', next: 'Goal: Build first clickable prototype' },
    ],
    availableForExchange: true,
    timezone: 'CST (UTC-6)',
    preferredMethod: 'Video Call',
  },
  {
    name: 'David Chen',
    email: 'david.chen@skillxchange.io',
    password: 'password123',
    role: 'Full Stack Architect & Cloud Specialist',
    bio: 'Full-stack software architect with 7+ years of experience building high-performance Node APIs. Passionate about design systems.',
    location: 'Seattle, WA',
    badge: 'EXPERT',
    rating: 5.0,
    reviewCount: 89,
    level: 18,
    points: 2800,
    hoursLogged: 28,
    liveSessions: 12,
    dailyGoals: { total: 5, achieved: 4 },
    teachingSkills: [
      { name: 'Node.js',          level: 'Expert Level', levelColor: 'secondary', bars: 3 },
      { name: 'AWS',              level: 'Expert Level', levelColor: 'secondary', bars: 3 },
      { name: 'Microservices',    level: 'Expert Level', levelColor: 'secondary', bars: 3 },
    ],
    learningSkills: [
      { name: 'UI/UX Design',   level: 'Beginner Level',     bars: 1, pct: 20, color: 'primary',   next: 'Goal: Design first responsive layout' },
      { name: 'Figma Tokens',   level: 'Beginner Level',     bars: 1, pct: 10, color: 'secondary', next: 'Next: Learn component variants' },
    ],
    availableForExchange: true,
    timezone: 'PST (UTC-8)',
    preferredMethod: 'Video Call',
  },
];

// ── Demo Mentors ──
const mentors = [
  {
    name: 'Sarah Jenkins',
    role: 'Senior UX Lead at FinTech Global',
    rating: 4.9, reviews: 124, accent: 'primary', online: true,
    skills: ['Product Strategy', 'Figma', 'User Research'],
  },
  {
    name: 'David Chen',
    role: 'Full Stack Architect & Cloud Specialist',
    rating: 5.0, reviews: 89, accent: 'secondary', online: true,
    skills: ['Node.js', 'AWS', 'Microservices'],
  },
  {
    name: 'Elena Rodriguez',
    role: 'Digital Marketing Director',
    rating: 4.8, reviews: 56, accent: 'primary', online: false,
    skills: ['SEO Strategy', 'Content Ops', 'Brand Growth'],
  },
  {
    name: 'Marcus Webb',
    role: 'Principal Design Researcher',
    rating: 4.7, reviews: 43, accent: 'secondary', online: true,
    skills: ['Usability', 'A/B Testing', 'Figma'],
  },
  {
    name: 'Aisha Patel',
    role: 'AI/ML Engineer at TechCorp',
    rating: 4.9, reviews: 78, accent: 'primary', online: true,
    skills: ['Python ML', 'TensorFlow', 'Data Viz'],
  },
  {
    name: 'Jordan Li',
    role: 'Senior Product Designer',
    rating: 4.6, reviews: 31, accent: 'secondary', online: false,
    skills: ['Design Systems', 'Prototyping', 'Motion'],
  },
  {
    name: 'Marcus Thorne',
    role: 'Backend Engineer & Open Source Contributor',
    rating: 4.8, reviews: 52, accent: 'primary', online: true,
    skills: ['Python', 'FastAPI', 'PostgreSQL'],
  },
  {
    name: 'Priya Nair',
    role: 'Growth Hacker & Startup Advisor',
    rating: 4.7, reviews: 61, accent: 'secondary', online: false,
    skills: ['Growth Marketing', 'Analytics', 'Fundraising'],
  },
];

// ── Community Spotlight ──
const spotlight = {
  trendingSkills: [
    { name: 'Rust Development',   pct: '+42%' },
    { name: 'Ethnobotany',        pct: '+18%' },
    { name: 'Generative Art AI',  pct: '+12%' },
  ],
  upcomingWebinar: {
    title: 'Sustainable AI Infrastructure',
    date:  'Tomorrow, 10:00 AM',
  },
  successStory: {
    quote:  '"I swapped Python tips for Brazilian Jiu-Jitsu strategy. The crossover in logic was mind-blowing!"',
    author: 'David B.',
    role:   'Lead Engineer',
  },
};

// ── Seed Function ──
async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅  MongoDB connected');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Mentor.deleteMany({}),
      Session.deleteMany({}),
      CommunitySpotlight.deleteMany({}),
      SkillExchangeRequest.deleteMany({}),
    ]);
    console.log('🗑️   Cleared existing data');

    // Create users (password hashing handled by pre-save hook)
    const createdUsers = await User.insertMany(
      await Promise.all(
        users.map(async (u) => {
          const salt = await bcrypt.genSalt(10);
          const hashed = await bcrypt.hash(u.password, salt);
          const initials = u.name.split(' ').slice(0, 2).map((w) => w[0].toUpperCase()).join('');
          return { ...u, password: hashed, initials };
        })
      )
    );
    console.log(`👤  Created ${createdUsers.length} users`);

    // Create mentors
    const createdMentors = await Mentor.insertMany(
      mentors.map((m) => ({
        ...m,
        initials: m.name.split(' ').slice(0, 2).map((w) => w[0].toUpperCase()).join(''),
      }))
    );
    console.log(`🧑‍🏫  Created ${createdMentors.length} mentors`);

    // Create community spotlight
    await CommunitySpotlight.create(spotlight);
    console.log('✨  Created community spotlight');

    // Create sessions for the first user (Alex Rivera)
    const alex = createdUsers.find((u) => u.email === 'alex@skillxchange.io');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);

    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 8);
    nextWeek.setHours(9, 30, 0, 0);

    await Session.insertMany([
      {
        participant: alex._id,
        title: 'Advanced React Patterns',
        mentor: 'Sarah Jenkins',
        dateTime: tomorrow,
        tagColor: 'primary',
        action: 'join',
      },
      {
        participant: alex._id,
        title: 'Intro to Python Backend',
        mentor: 'Marcus Thorne',
        dateTime: nextWeek,
        tagColor: 'secondary',
        action: 'manage',
      },
    ]);
    console.log('📅  Created sessions for Alex Rivera');

    // Create sample skill exchange requests
    const [alexUser, sarahUser, jamesonUser, elenaUser, davidUser] = createdUsers;

    await SkillExchangeRequest.insertMany([
      {
        from: sarahUser._id,
        to:   alexUser._id,
        fromSkill: 'Advanced Rust Systems',
        toSkill:   'UI Design Fundamentals',
        status: 'pending',
      },
      {
        from: jamesonUser._id,
        to:   alexUser._id,
        fromSkill: 'Brand Storytelling',
        toSkill:   'Functional Programming',
        status: 'pending',
      },
      {
        from: alexUser._id,
        to:   davidUser._id,
        fromSkill: 'UX Strategy',
        toSkill:   'Node.js',
        status: 'accepted',
        createdAt: new Date(Date.now() - 2 * 60 * 1000), // 2 min ago
      },
      {
        from: alexUser._id,
        to:   elenaUser._id,
        fromSkill: 'Figma Advanced',
        toSkill:   'SEO Strategy',
        status: 'pending',
      },
    ]);
    console.log('🔄  Created skill exchange requests');

    const VideoSession = require('../models/VideoSession');
    await VideoSession.insertMany([
      {
        host: alexUser._id,
        participant: davidUser._id,
        topic: 'UX Strategy ↔ Node.js Architecture Exchange',
        scheduledAt: tomorrow,
        durationMins: 60,
        status: 'scheduled',
        notes: 'Deep dive into reciprocal skill swap & project architecture',
      },
    ]);
    console.log('📹  Created sample video call');

    console.log('\n🎉  Seed complete!');
    console.log('\n📧  Demo login credentials:');
    console.log('   Email:    alex@skillxchange.io');
    console.log('   Password: password123');

    process.exit(0);
  } catch (err) {
    console.error('❌  Seed error:', err);
    process.exit(1);
  }
}

seed();

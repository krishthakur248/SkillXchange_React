// ── SkillXchange Backend — server.js ──
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const dotenv   = require('dotenv');

dotenv.config();

const app = express();

// ── Middleware ──
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());

// ── Routes ──
app.use('/api/auth',           require('./src/routes/auth'));
app.use('/api/home',           require('./src/routes/home'));
app.use('/api/mentors',        require('./src/routes/mentors'));
app.use('/api/learn-teach',    require('./src/routes/learnTeach'));
app.use('/api/profile',        require('./src/routes/profile'));
app.use('/api/progress',       require('./src/routes/progress'));
app.use('/api/chat',           require('./src/routes/chat'));
app.use('/api/video-sessions', require('./src/routes/videoSessions'));

// ── Health Check ──
app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ── 404 Fallback ──
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Connect DB + Start ──
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    let mongoUri = process.env.MONGODB_URI || '';

    // If no real URI is configured, use in-memory MongoDB (great for local dev/demo)
    const isPlaceholder =
      !mongoUri ||
      mongoUri.includes('YOUR_USER') ||
      mongoUri.includes('YOUR_PASSWORD');

    if (isPlaceholder) {
      console.log('⚡  No MongoDB URI configured — starting in-memory MongoDB...');
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      mongoUri = mongod.getUri();
      console.log('🧠  In-memory MongoDB started');

      // Seed demo data automatically on first boot
      await mongoose.connect(mongoUri);
      console.log('✅  MongoDB connected (in-memory)');
      await require('./src/seed/seed-memory')();
    } else {
      await mongoose.connect(mongoUri);
      console.log('✅  MongoDB connected');
    }

    app.listen(PORT, () => console.log(`🚀  Server running on port ${PORT}`));
  } catch (err) {
    console.error('❌  Startup error:', err.message);
    process.exit(1);
  }
}

startServer();

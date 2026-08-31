// ── SkillXchange — WebRTC Video Signaling Handler ──
//
// Each video session gets its own isolated Socket.IO room: `session:<sessionId>`
// Only the two matched users for that session are admitted. All others are rejected.

const jwt          = require('jsonwebtoken');
const VideoSession = require('../models/VideoSession');

// Track room members per session: sessionId → Map(userId → socketId)
const roomMembers = new Map();

function registerVideoSignaling(io) {
  io.on('connection', (socket) => {
    let joinedSessionId = null;
    let currentUserId = null;

    // ── join-session ────────────────────────────────────────────────────────
    socket.on('join-session', async ({ sessionId, token } = {}) => {
      try {
        if (!sessionId || !token) {
          return socket.emit('session-error', { message: 'sessionId and token are required.' });
        }

        // 1. Verify JWT
        let decoded;
        try {
          decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch {
          return socket.emit('session-error', { message: 'Invalid or expired token.' });
        }

        const userId = String(decoded.id);
        currentUserId = userId;

        // 2. Load session from DB
        const session = await VideoSession.findById(sessionId)
          .populate('host',        'name initials avatar')
          .populate('participant', 'name initials avatar');

        if (!session) {
          return socket.emit('session-error', { message: 'Session not found.' });
        }

        // 3. Verify this user is host or participant
        const hostId        = String(session.host._id);
        const participantId = String(session.participant._id);

        if (userId !== hostId && userId !== participantId) {
          return socket.emit('session-error', { message: 'You are not authorised for this session.' });
        }

        const roomId = `session:${sessionId}`;
        if (!roomMembers.has(sessionId)) {
          roomMembers.set(sessionId, new Map());
        }
        const members = roomMembers.get(sessionId);

        // If this user already has an active socket in this room, replace it
        const oldSocketId = members.get(userId);
        if (oldSocketId && oldSocketId !== socket.id) {
          const oldSocket = io.sockets.sockets.get(oldSocketId);
          if (oldSocket) {
            oldSocket.leave(roomId);
            console.log(`[signaling] Replaced previous socket ${oldSocketId} for user ${userId}`);
          }
        }

        // Check room capacity (at most 2 distinct users: host and participant)
        if (members.size >= 2 && !members.has(userId)) {
          return socket.emit('session-error', { message: 'Session room is full (max 2 participants).' });
        }

        // Join room and register socket
        socket.join(roomId);
        members.set(userId, socket.id);
        joinedSessionId = sessionId;

        const isHost = userId === hostId;
        const self   = isHost ? session.host        : session.participant;
        const other  = isHost ? session.participant : session.host;

        // Tell the joining socket it succeeded
        socket.emit('session-joined', {
          sessionId,
          scheduledAt: session.scheduledAt,
          self:  { userId, name: self.name, initials: self.initials, avatar: self.avatar || '' },
          other: { userId: other._id, name: other.name, initials: other.initials, avatar: other.avatar || '' },
          membersInRoom: members.size,
        });

        // Tell the other peer in the room
        socket.to(roomId).emit('peer-joined', {
          userId,
          name: self.name,
          initials: self.initials,
          avatar: self.avatar || '',
        });

        console.log(`[signaling] ${self.name} (${userId}) joined session:${sessionId} (active users: ${members.size})`);
      } catch (err) {
        console.error('[signaling] join-session error:', err);
        socket.emit('session-error', { message: 'Server error during join.' });
      }
    });

    // ── WebRTC relay events ──────────────────────────────────────────────────
    socket.on('webrtc-offer', ({ sessionId, offer } = {}) => {
      if (!sessionId || !offer) return;
      socket.to(`session:${sessionId}`).emit('webrtc-offer', { offer });
    });

    socket.on('webrtc-answer', ({ sessionId, answer } = {}) => {
      if (!sessionId || !answer) return;
      socket.to(`session:${sessionId}`).emit('webrtc-answer', { answer });
    });

    socket.on('webrtc-ice-candidate', ({ sessionId, candidate } = {}) => {
      if (!sessionId || !candidate) return;
      socket.to(`session:${sessionId}`).emit('webrtc-ice-candidate', { candidate });
    });

    // ── leave-session ────────────────────────────────────────────────────────
    socket.on('leave-session', ({ sessionId } = {}) => {
      cleanupSocket(socket, sessionId || joinedSessionId, currentUserId);
    });

    // ── disconnect ───────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      cleanupSocket(socket, joinedSessionId, currentUserId);
    });
  });
}

function cleanupSocket(socket, sessionId, userId) {
  if (!sessionId) return;

  const roomId = `session:${sessionId}`;
  socket.leave(roomId);

  const members = roomMembers.get(sessionId);
  if (members) {
    if (userId && members.get(userId) === socket.id) {
      members.delete(userId);
    } else {
      for (const [uid, sId] of members.entries()) {
        if (sId === socket.id) {
          members.delete(uid);
          break;
        }
      }
    }
    if (members.size === 0) roomMembers.delete(sessionId);
  }

  socket.to(roomId).emit('peer-left', { sessionId });
  console.log(`[signaling] socket ${socket.id} (user: ${userId || 'unknown'}) left session:${sessionId}`);
}

module.exports = { registerVideoSignaling };

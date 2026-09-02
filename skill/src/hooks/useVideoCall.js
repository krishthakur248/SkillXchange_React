/**
 * useVideoCall — Custom React hook
 *
 * Manages the full lifecycle of a 1:1 WebRTC video call for a SkillXchange session:
 *   - Socket.IO connection to the signaling server
 *   - RTCPeerConnection negotiation (offer/answer/ICE)
 *   - Local media (camera + mic) acquisition
 *   - Reconnect handling when the remote peer disconnects/refreshes
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../api/index';

const ICE_SERVERS = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
];

const RECONNECT_TIMEOUT_MS = 30_000;

export function useVideoCall({ sessionId, token, enabled = false }) {
  // ── Refs ──────────────────────────────────────────────────────────────────
  const localVideoRef     = useRef(null);
  const remoteVideoRef    = useRef(null);
  const pcRef             = useRef(null);
  const socketRef         = useRef(null);
  const localStreamRef    = useRef(null);
  const remoteStreamRef   = useRef(null);
  const candidateQueueRef = useRef([]);
  const hasJoinedRef      = useRef(false);
  const reconnectTimer    = useRef(null);

  // ── State ─────────────────────────────────────────────────────────────────
  const [callStatus,   setCallStatus]   = useState('idle');
  const [isMuted,      setIsMuted]      = useState(false);
  const [isCamOff,     setIsCamOff]     = useState(false);
  const [errorMsg,     setErrorMsg]     = useState('');
  const [peerInfo,     setPeerInfo]     = useState(null);
  const [scheduledAt,  setScheduledAt]  = useState(null);

  // ── Cleanup helper ────────────────────────────────────────────────────────
  const cleanup = useCallback((leaveSilently = false) => {
    hasJoinedRef.current = false;

    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }

    if (pcRef.current) {
      try {
        pcRef.current.onicecandidate = null;
        pcRef.current.ontrack = null;
        pcRef.current.onconnectionstatechange = null;
        pcRef.current.close();
      } catch (e) {
        console.warn('Error closing PC:', e);
      }
      pcRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    remoteStreamRef.current = null;
    candidateQueueRef.current = [];

    if (localVideoRef.current)  localVideoRef.current.srcObject  = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    if (socketRef.current) {
      if (!leaveSilently) {
        socketRef.current.emit('leave-session', { sessionId });
      }
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, [sessionId]);

  // ── Flush queued ICE candidates ───────────────────────────────────────────
  const flushCandidateQueue = useCallback(async (pc) => {
    while (candidateQueueRef.current.length > 0) {
      const cand = candidateQueueRef.current.shift();
      try {
        await pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch (err) {
        console.warn('[webrtc] Error adding queued ICE candidate:', err);
      }
    }
  }, []);

  // ── Create RTCPeerConnection ──────────────────────────────────────────────
  const createPeerConnection = useCallback((stream) => {
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch (_) {}
    }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    // Add local media tracks
    if (stream) {
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    }

    pc.onicecandidate = (evt) => {
      if (evt.candidate && socketRef.current) {
        socketRef.current.emit('webrtc-ice-candidate', {
          sessionId,
          candidate: evt.candidate.toJSON ? evt.candidate.toJSON() : evt.candidate,
        });
      }
    };

    pc.ontrack = (evt) => {
      console.log('[webrtc] Remote track received:', evt.track.kind);
      const stream = evt.streams[0] || new MediaStream([evt.track]);
      remoteStreamRef.current = stream;
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
      setCallStatus('connected');
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log('[webrtc] Connection state change:', state);
      if (state === 'connected') {
        setCallStatus('connected');
        if (reconnectTimer.current) {
          clearTimeout(reconnectTimer.current);
          reconnectTimer.current = null;
        }
      } else if (state === 'disconnected' || state === 'failed') {
        setCallStatus('reconnecting');
      }
    };

    return pc;
  }, [sessionId]);

  // ── Main: join the call ───────────────────────────────────────────────────
  const joinCall = useCallback(async () => {
    if (!sessionId || !token || hasJoinedRef.current) return;
    hasJoinedRef.current = true;
    setCallStatus('connecting');
    setErrorMsg('');

    // 1. Acquire local camera and mic
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
    } catch (err) {
      const denied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
      setErrorMsg(denied
        ? 'Camera/microphone access was denied. Please allow permissions and try again.'
        : `Could not access media devices: ${err.message}`);
      setCallStatus('error');
      hasJoinedRef.current = false;
      return;
    }

    localStreamRef.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    // 2. Connect Socket.IO
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
    }

    const socket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    // 3. Register signaling handlers
    socket.on('session-error', ({ message }) => {
      console.warn('[signaling] session-error:', message);
      setErrorMsg(message);
      setCallStatus('error');
    });

    socket.on('session-joined', async ({ other, membersInRoom, scheduledAt: sAt }) => {
      console.log(`[signaling] session-joined. Total members in room: ${membersInRoom}`);
      setPeerInfo(other);
      if (sAt) setScheduledAt(new Date(sAt));

      if (membersInRoom === 2) {
        // Second user to join: create peer connection and send offer
        const pc = createPeerConnection(stream);
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          console.log('[signaling] Emitting webrtc-offer...');
          socket.emit('webrtc-offer', { sessionId, offer: pc.localDescription });
        } catch (err) {
          console.error('[webrtc] Offer creation error:', err);
          setErrorMsg('Failed to initiate call negotiation.');
          setCallStatus('error');
        }
      } else {
        // First user to join: prepare peer connection and wait
        setCallStatus('waiting');
        createPeerConnection(stream);
      }
    });

    socket.on('peer-joined', (peer) => {
      console.log('[signaling] Remote peer joined room:', peer.name);
      setPeerInfo(peer);
      setCallStatus('connecting');
    });

    socket.on('webrtc-offer', async ({ offer }) => {
      console.log('[signaling] Received webrtc-offer');
      try {
        let pc = pcRef.current;
        if (!pc || pc.signalingState === 'closed') {
          pc = createPeerConnection(localStreamRef.current);
        }
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        await flushCandidateQueue(pc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        console.log('[signaling] Emitting webrtc-answer...');
        socket.emit('webrtc-answer', { sessionId, answer: pc.localDescription });
      } catch (err) {
        console.error('[webrtc] Answer handling error:', err);
        setErrorMsg('Failed to process call answer.');
        setCallStatus('error');
      }
    });

    socket.on('webrtc-answer', async ({ answer }) => {
      console.log('[signaling] Received webrtc-answer');
      try {
        const pc = pcRef.current;
        if (pc && pc.signalingState !== 'closed') {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          await flushCandidateQueue(pc);
        }
      } catch (err) {
        console.error('[webrtc] Error setting remote answer:', err);
      }
    });

    socket.on('webrtc-ice-candidate', async ({ candidate }) => {
      if (!candidate) return;
      try {
        const pc = pcRef.current;
        if (pc && pc.remoteDescription && pc.remoteDescription.type) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          candidateQueueRef.current.push(candidate);
        }
      } catch (err) {
        console.warn('[webrtc] Error adding ICE candidate:', err);
      }
    });

    socket.on('peer-left', () => {
      console.log('[signaling] Peer left session');
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      setCallStatus('reconnecting');

      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      reconnectTimer.current = setTimeout(() => {
        setCallStatus('idle');
        cleanup();
      }, RECONNECT_TIMEOUT_MS);
    });

    socket.on('disconnect', () => {
      console.log('[signaling] Socket disconnected');
      if (callStatus !== 'idle') setCallStatus('reconnecting');
    });

    // 4. Emit join-session
    socket.emit('join-session', { sessionId, token });
  }, [sessionId, token, callStatus, cleanup, createPeerConnection, flushCandidateQueue]);

  // ── Controls ──────────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsMuted((v) => !v);
  }, []);

  const toggleCam = useCallback(() => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsCamOff((v) => !v);
  }, []);

  const endCall = useCallback(() => {
    cleanup();
    setCallStatus('idle');
    setIsMuted(false);
    setIsCamOff(false);
    setPeerInfo(null);
    setErrorMsg('');
    setScheduledAt(null);
  }, [cleanup]);

  // ── Auto-join when enabled ────────────────────────────────────────────────
  useEffect(() => {
    if (enabled && !hasJoinedRef.current) {
      joinCall();
    }
  }, [enabled, joinCall]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return {
    localVideoRef,
    remoteVideoRef,
    callStatus,
    isMuted,
    isCamOff,
    errorMsg,
    peerInfo,
    scheduledAt,
    joinCall,
    toggleMute,
    toggleCam,
    endCall,
  };
}

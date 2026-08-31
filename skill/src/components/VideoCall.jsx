import { useEffect, useState, useRef } from 'react';
import { useVideoCall } from '../hooks/useVideoCall';
import './VideoCall.css';

/**
 * VideoCall — Full-screen overlay 1:1 video call component
 *
 * Props:
 *   sessionId   — The VideoSession._id
 *   token       — JWT from localStorage (passed from parent)
 *   partnerName — Display name of the other person (optimistic, before socket responds)
 *   onEnd       — Callback when the call ends (to unmount this component)
 */
export default function VideoCall({ sessionId, token, partnerName, onEnd }) {
  const {
    localVideoRef,
    remoteVideoRef,
    callStatus,
    isMuted,
    isCamOff,
    errorMsg,
    peerInfo,
    scheduledAt,
    toggleMute,
    toggleCam,
    endCall,
  } = useVideoCall({ sessionId, token, enabled: true });

  const displayName = peerInfo?.name || partnerName || 'Partner';

  // ── Countdown timer ──────────────────────────────────────────────────────
  // Shows when: we're the only one in the room AND session hasn't started yet.
  // Disappears automatically when: partner joins (status changes) OR time passes.
  const [countdown, setCountdown] = useState(null); // null = not counting, or seconds remaining
  const countdownRef = useRef(null);

  useEffect(() => {
    // Only show countdown when waiting (alone in room) and session is in the future
    if (callStatus !== 'waiting' || !scheduledAt) {
      setCountdown(null);
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      return;
    }

    const tick = () => {
      const secsLeft = Math.ceil((scheduledAt.getTime() - Date.now()) / 1000);
      if (secsLeft <= 0) {
        // Time has arrived — stop counting, keep "waiting for partner" state
        setCountdown(null);
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      } else {
        setCountdown(secsLeft);
      }
    };

    tick(); // immediate tick
    countdownRef.current = setInterval(tick, 1000);

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [callStatus, scheduledAt]);

  // ── Format countdown as MM:SS ────────────────────────────────────────────
  function formatCountdown(secs) {
    if (secs == null || secs <= 0) return null;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  const countdownDisplay = formatCountdown(countdown);

  // When call ends from inside the hook (e.g. timeout), propagate up
  useEffect(() => {
    if (callStatus === 'idle' && onEnd) {
      const t = setTimeout(() => onEnd(), 200);
      return () => clearTimeout(t);
    }
  }, [callStatus, onEnd]);

  const handleEnd = () => {
    endCall();
    if (onEnd) onEnd();
  };

  // ── Status banner content ────────────────────────────────────────────────
  let statusBanner = null;

  if (callStatus === 'connecting') {
    statusBanner = (
      <div className="vc-status-banner connecting">
        <span className="vc-status-dot pulse" />
        Connecting…
      </div>
    );
  } else if (callStatus === 'waiting') {
    if (countdownDisplay) {
      // Early joiner — show countdown + explain partner hasn't joined yet
      statusBanner = (
        <div className="vc-status-banner waiting countdown-mode">
          <div className="vc-countdown-block">
            <span className="vc-countdown-timer">{countdownDisplay}</span>
            <span className="vc-countdown-label">until session starts</span>
          </div>
          <div className="vc-countdown-subtext">
            <span className="material-symbols-outlined" style={{ fontSize: '1rem', verticalAlign: 'middle' }}>
              hourglass_top
            </span>
            {' '}Waiting for <strong>{displayName}</strong> — call will begin as soon as they join
          </div>
        </div>
      );
    } else {
      // Time has arrived — just waiting for the partner
      statusBanner = (
        <div className="vc-status-banner waiting">
          <span className="material-symbols-outlined vc-status-icon">hourglass_top</span>
          Waiting for <strong>{displayName}</strong> to join…
        </div>
      );
    }
  } else if (callStatus === 'reconnecting') {
    statusBanner = (
      <div className="vc-status-banner reconnecting">
        <span className="vc-status-dot pulse orange" />
        <strong>{displayName}</strong> disconnected — waiting for reconnect…
      </div>
    );
  } else if (callStatus === 'error') {
    statusBanner = (
      <div className="vc-status-banner error">
        <span className="material-symbols-outlined vc-status-icon">error</span>
        {errorMsg || 'An error occurred.'}
      </div>
    );
  }

  return (
    <div className="vc-overlay" role="dialog" aria-label="Video call">
      {/* ── Remote video (main tile) ── */}
      <div className="vc-remote-wrap">
        <video
          ref={remoteVideoRef}
          className="vc-remote-video"
          autoPlay
          playsInline
          id="vc-remote-video"
        />
        {/* Placeholder when remote stream not yet available */}
        {callStatus !== 'connected' && (
          <div className="vc-remote-placeholder">
            <div className="vc-avatar-circle">
              {peerInfo?.initials || displayName?.[0]?.toUpperCase() || '?'}
            </div>
            <p className="vc-remote-name">{displayName}</p>
          </div>
        )}
      </div>

      {/* ── Local video (PiP) ── */}
      <div className="vc-local-wrap" id="vc-local-pip">
        <video
          ref={localVideoRef}
          className="vc-local-video"
          autoPlay
          playsInline
          muted
          id="vc-local-video"
        />
        {isCamOff && (
          <div className="vc-cam-off-overlay">
            <span className="material-symbols-outlined">videocam_off</span>
          </div>
        )}
        <span className="vc-local-label">You</span>
      </div>

      {/* ── Header bar ── */}
      <div className="vc-header">
        <div className="vc-header-info">
          <span className="material-symbols-outlined vc-header-icon">videocam</span>
          <div>
            <p className="vc-header-name">{displayName}</p>
            <p className="vc-header-status">
              {callStatus === 'connected'    ? 'Connected'      :
               callStatus === 'waiting'      && countdownDisplay ? `Starts in ${countdownDisplay}` :
               callStatus === 'waiting'      ? 'Waiting…'       :
               callStatus === 'reconnecting' ? 'Reconnecting…'  :
               callStatus === 'connecting'   ? 'Connecting…'    :
               callStatus === 'error'        ? 'Error'          : ''}
            </p>
          </div>
        </div>
        {/* Connection indicator */}
        <div className={`vc-conn-indicator ${callStatus}`} title={`Status: ${callStatus}`}>
          <span className="vc-conn-dot" />
          <span className="vc-conn-text">
            {callStatus === 'connected' ? 'Live' :
             callStatus === 'waiting' && countdownDisplay ? countdownDisplay :
             callStatus}
          </span>
        </div>
      </div>

      {/* ── Status banner ── */}
      {statusBanner && <div className="vc-banner-wrap">{statusBanner}</div>}

      {/* ── Controls ── */}
      <div className="vc-controls" id="vc-controls">
        {/* Mic */}
        <button
          className={`vc-ctrl-btn ${isMuted ? 'off' : ''}`}
          onClick={toggleMute}
          title={isMuted ? 'Unmute mic' : 'Mute mic'}
          id="vc-btn-mic"
          aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          <span className="material-symbols-outlined">
            {isMuted ? 'mic_off' : 'mic'}
          </span>
          <span className="vc-ctrl-label">{isMuted ? 'Unmute' : 'Mute'}</span>
        </button>

        {/* Camera */}
        <button
          className={`vc-ctrl-btn ${isCamOff ? 'off' : ''}`}
          onClick={toggleCam}
          title={isCamOff ? 'Turn camera on' : 'Turn camera off'}
          id="vc-btn-cam"
          aria-label={isCamOff ? 'Turn camera on' : 'Turn camera off'}
        >
          <span className="material-symbols-outlined">
            {isCamOff ? 'videocam_off' : 'videocam'}
          </span>
          <span className="vc-ctrl-label">{isCamOff ? 'Start cam' : 'Stop cam'}</span>
        </button>

        {/* End call */}
        <button
          className="vc-ctrl-btn end"
          onClick={handleEnd}
          title="End call"
          id="vc-btn-end"
          aria-label="End call"
        >
          <span className="material-symbols-outlined">call_end</span>
          <span className="vc-ctrl-label">End Call</span>
        </button>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import MobileNav from '../components/MobileNav';
import Footer from '../components/Footer';
import RequestDialog from '../components/RequestDialog';
import Toast from '../components/Toast';
import VideoCall from '../components/VideoCall';
import { useAnimeStagger, animateProgressRing } from '../hooks/useAnime';
import { progressApi } from '../api';
import { useAuth } from '../context/AuthContext';
import './ProgressPage.css';

function CircularProgress({ pct, color, hours, label, active }) {
  const circleRef = useRef(null);
  const C = 251.2;

  useEffect(() => {
    if (circleRef.current) {
      animateProgressRing(circleRef.current, pct, C);
    }
  }, [pct]);

  return (
    <div className="circ-progress-wrap">
      <div className="circ-progress-ring">
        <svg viewBox="0 0 100 100" className="circ-svg">
          <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--surface-container-highest)" strokeWidth="10" />
          <circle
            ref={circleRef}
            cx="50" cy="50" r="40" fill="transparent"
            stroke={`var(--${color})`}
            strokeWidth="10"
            strokeLinecap="round"
            style={{ strokeDasharray: C, strokeDashoffset: C, transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
          />
        </svg>
        <div className="circ-label">
          <span className="circ-hours" style={{ color: `var(--${color})` }}>{hours}</span>
          <span className="circ-unit">{label}</span>
        </div>
      </div>
      <div className="circ-active-label" style={{ color: `var(--${color})` }}>{active}</div>
    </div>
  );
}

function MatchCard({ m, onRequest }) {
  return (
    <div className={`prog-match-card border-top-${m.accent}`}>
      <div className="prog-match-header">
        <div className="prog-match-avatar">{m.initials}</div>
        <div>
          <h4 className="prog-match-name">{m.name}</h4>
          <p className="prog-match-role">{m.role}</p>
        </div>
      </div>
      <div className="prog-match-skills">
        <div className="prog-skill-box offers">
          <p className="psk-label offer-label">Offers You</p>
          <div className="psk-chips">
            {(m.offers || []).map((o) => <span key={o} className="psk-chip chip-primary">{o}</span>)}
          </div>
        </div>
        <div className="prog-skill-box wants">
          <p className="psk-label want-label">Wants From You</p>
          <div className="psk-chips">
            {(m.wants || []).map((w) => <span key={w} className="psk-chip chip-secondary">{w}</span>)}
          </div>
        </div>
      </div>
      <div className="prog-match-actions">
        <Link to="/profile" className="prog-view-btn">View Profile</Link>
        <button className="prog-connect-btn" onClick={() => onRequest(m)}>Request</button>
      </div>
    </div>
  );
}

export default function ProgressPage() {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const [dialogTarget, setDialogTarget] = useState(null);
  const [toast, setToast] = useState(null);
  const [activeCall, setActiveCall] = useState(null); // { sessionId, partnerName }

  const [showAllSessions, setShowAllSessions] = useState(false);

  const matchRef = useAnimeStagger('.prog-match-card');

  const loadData = useCallback(() => {
    setLoading(true);
    progressApi.get()
      .then((d) => setData(d))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showToast = useCallback((message, type = 'success') => setToast({ message, type }), []);

  const handleRequest = useCallback((match) => {
    setDialogTarget({
      _id:      match._id,
      name:     match.name,
      initials: match.initials,
      teaches:  match.offers || [],
      wants:    match.wants  || [],
    });
  }, []);

  const displayUser  = data?.user || authUser;
  const velocity     = data?.velocity || {};
  const sessions     = data?.sessions || [];
  const matches      = data?.matches  || [];
  const pendingCount = data?.pendingCount || 0;

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        {/* Page Header */}
        <header className="prog-header">
          <div className="prog-header-inner">
            <div>
              <h2 className="prog-page-title">Welcome back, {displayUser?.name?.split(' ')[0] || 'there'}</h2>
              <p className="prog-page-sub">
                {pendingCount > 0
                  ? `You have ${pendingCount} reciprocal match${pendingCount > 1 ? 'es' : ''} waiting for approval.`
                  : 'Your learning journey is progressing well!'}
              </p>
            </div>
            <div className="prog-user">
              <div className="prog-user-info">
                <p className="prog-user-title">{displayUser?.badge === 'EXPERT' ? 'Master Mentor' : 'Active Learner'}</p>
                <p className="prog-user-sub">Level {displayUser?.level || 1} • {displayUser?.rating?.toFixed(1) || '—'} ★</p>
              </div>
              <div className="prog-user-avatar">{displayUser?.initials || '??'}</div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="prog-content">
          {/* Bento top row */}
          <div className="prog-top-grid">
            {/* Learning Velocity */}
            <section className="glass-card prog-velocity">
              <div className="velocity-header">
                <h3 className="prog-card-title">Learning Velocity</h3>
                <div className="velocity-legend">
                  <span className="legend-item"><span className="legend-dot primary-dot" />Hours Learn</span>
                  <span className="legend-item"><span className="legend-dot secondary-dot" />Total Hours</span>
                </div>
              </div>
              <div className="velocity-circles">
                {loading
                  ? <p style={{ color: 'var(--on-surface-variant)', fontSize: 14 }}>Loading stats…</p>
                  : <>
                    <CircularProgress
                      pct={velocity.sharedPct ?? 0}
                      color="primary"
                      hours={velocity.hoursShared ?? 0}
                      label="Hours Learn"
                      active={`Active: ${velocity.activeTeach || 'None yet'}`}
                    />
                    <CircularProgress
                      pct={velocity.learnedPct ?? 0}
                      color="secondary"
                      hours={velocity.hoursLearned ?? 0}
                      label="Total Hours"
                      active={`Active: ${velocity.activeLearn || 'None yet'}`}
                    />
                  </>
                }
              </div>
            </section>

            {/* Next Closest Video Call & Session */}
            <section className="glass-card prog-sessions">
              <div className="sessions-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 className="prog-card-title" style={{ margin: 0 }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--secondary)', verticalAlign: 'middle', marginRight: 6 }}>videocam</span>
                  Next Video Call
                </h3>
                <button
                  type="button"
                  className="view-all-link"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', padding: 0 }}
                  onClick={() => setShowAllSessions(true)}
                  id="prog-all-sessions-btn"
                >
                  All Sessions ({sessions.length}) →
                </button>
              </div>

              <div className="sessions-list">
                {loading
                  ? <p style={{ color: 'var(--on-surface-variant)', fontSize: 14 }}>Loading session…</p>
                  : sessions.length === 0
                    ? (
                      <div style={{ textAlign: 'center', padding: '18px 8px' }}>
                        <p style={{ color: 'var(--on-surface-variant)', fontSize: 14, marginBottom: 12 }}>No upcoming video sessions scheduled yet.</p>
                        <button
                          className="session-join-btn"
                          style={{ margin: '0 auto', maxWidth: 220 }}
                          onClick={() => navigate('/video-sessions')}
                        >
                          <span className="material-symbols-outlined">add_alarm</span>
                          Schedule Video Call
                        </button>
                      </div>
                    )
                    : (
                      <div key={sessions[0]._id} className="session-card">
                        <div className="session-card-top">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span className={`session-tag tag-${sessions[0].tagColor}`}>{sessions[0].tag}</span>
                            {sessions[0].isClassSession && (
                              <span className="tab-mentor-badge" style={{ fontSize: 10, padding: '2px 6px' }}>CLASS COHORT</span>
                            )}
                          </div>
                          <span className="session-time">{sessions[0].time} {sessions[0].duration ? `(${sessions[0].duration})` : ''}</span>
                        </div>
                        <h4 className="session-title">{sessions[0].title}</h4>
                        <p className="session-mentor">
                          {sessions[0].isClassSession
                            ? `Cohort: ${sessions[0].className} • Hosted by ${sessions[0].hostName}`
                            : `with ${sessions[0].mentor}`}
                        </p>
                        <button
                          className="session-join-btn"
                          onClick={() => setActiveCall({ sessionId: sessions[0]._id, partnerName: sessions[0].mentor })}
                        >
                          <span className="material-symbols-outlined">videocam</span>
                          Join Video Call
                        </button>
                      </div>
                    )
                }
              </div>
            </section>
          </div>

          {/* Perfect Matches */}
          <section className="prog-matches-section">
            <div className="prog-matches-header">
              <h3 className="prog-card-title">Perfect Reciprocal Matches</h3>
              <a href="/learn-teach" className="view-all-link">View All Matches</a>
            </div>
            <div className="prog-matches-grid" ref={matchRef}>
              {loading
                ? <p style={{ color: 'var(--on-surface-variant)', fontSize: 14 }}>Loading matches…</p>
                : matches.length === 0
                  ? <p style={{ color: 'var(--on-surface-variant)', fontSize: 14 }}>Add skills to your profile to see matching peers!</p>
                  : matches.map((m) => <MatchCard key={m._id} m={m} onRequest={handleRequest} />)
              }
            </div>
          </section>

          {error && <p style={{ color: 'var(--error)', padding: 16 }}>⚠ {error}</p>}
        </div>

        <Footer />
      </div>
      <MobileNav />

      {/* ── All Upcoming Sessions Modal (On the same page) ── */}
      {showAllSessions && (
        <div className="add-skill-backdrop" onClick={() => setShowAllSessions(false)}>
          <div className="quit-modal-card" style={{ maxWidth: 560, maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
            <div className="quit-modal-header">
              <div className="quit-modal-header-left">
                <div className="quit-modal-icon-wrap" style={{ background: 'var(--primary-fixed)', color: 'var(--primary)' }}>
                  <span className="material-symbols-outlined">event_upcoming</span>
                </div>
                <div>
                  <h3 className="quit-modal-title">All Upcoming Sessions</h3>
                  <p className="quit-modal-sub">{sessions.length} scheduled live call{sessions.length !== 1 ? 's' : ''} & workshops</p>
                </div>
              </div>
              <button className="quit-modal-close" onClick={() => setShowAllSessions(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {sessions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--outline-variant)', marginBottom: 8 }}>event_busy</span>
                  <p style={{ fontWeight: 600, color: 'var(--on-surface)' }}>No upcoming sessions scheduled</p>
                  <p style={{ color: 'var(--on-surface-variant)', fontSize: 13, marginTop: 4 }}>Schedule a 1-on-1 call or join a mentor class live workshop.</p>
                </div>
              ) : (
                sessions.map((s) => (
                  <div key={s._id} className="session-card" style={{ background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)', borderRadius: 12, padding: 14 }}>
                    <div className="session-card-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span className={`session-tag tag-${s.tagColor}`}>{s.tag}</span>
                        {s.isClassSession && (
                          <span className="tab-mentor-badge" style={{ fontSize: 10, padding: '2px 6px' }}>CLASS COHORT</span>
                        )}
                      </div>
                      <span className="session-time" style={{ fontWeight: 600, fontSize: 12, color: 'var(--on-surface-variant)' }}>
                        {s.time} {s.duration ? `(${s.duration})` : ''}
                      </span>
                    </div>
                    <h4 className="session-title" style={{ fontSize: 15, fontWeight: 700, margin: '4px 0', color: 'var(--on-surface)' }}>{s.title}</h4>
                    <p className="session-mentor" style={{ fontSize: 13, color: 'var(--on-surface-variant)', margin: '0 0 10px 0' }}>
                      {s.isClassSession ? `Cohort: ${s.className} • Hosted by ${s.hostName}` : `with ${s.mentor}`}
                    </p>
                    {s.notes && (
                      <p style={{ fontSize: 12, color: 'var(--outline)', fontStyle: 'italic', marginBottom: 10 }}>
                        "{s.notes}"
                      </p>
                    )}
                    <button
                      className="session-join-btn"
                      style={{ width: '100%', padding: '9px 16px', fontSize: 13, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                      onClick={() => {
                        setShowAllSessions(false);
                        setActiveCall({ sessionId: s._id, partnerName: s.mentor });
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>videocam</span>
                      Join Video Call
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="quit-modal-actions" style={{ padding: '12px 20px', borderTop: '1px solid var(--outline-variant)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                className="vs-empty-cta"
                style={{ padding: '8px 16px', fontSize: 13 }}
                onClick={() => {
                  setShowAllSessions(false);
                  navigate('/video-sessions');
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                Schedule New Session
              </button>
              <button
                type="button"
                className="quit-modal-btn cancel"
                onClick={() => setShowAllSessions(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Dialog */}
      {dialogTarget && (
        <RequestDialog
          targetUser={dialogTarget}
          onClose={() => setDialogTarget(null)}
          onSuccess={(msg) => {
            showToast(msg, 'success');
            loadData();
          }}
          onError={(msg) => showToast(msg, 'error')}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}

      {/* ── Video Call Overlay ── */}
      {activeCall && (
        <VideoCall
          sessionId={activeCall.sessionId}
          token={localStorage.getItem('sx_token')}
          partnerName={activeCall.partnerName}
          onEnd={() => setActiveCall(null)}
        />
      )}
    </div>
  );
}

import { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import MobileNav from '../components/MobileNav';
import Footer from '../components/Footer';
import RequestDialog from '../components/RequestDialog';
import Toast from '../components/Toast';
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

            {/* Next Closest Video Calls & Sessions */}
            <section className="glass-card prog-sessions">
              <div className="sessions-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 className="prog-card-title" style={{ margin: 0 }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--secondary)', verticalAlign: 'middle', marginRight: 6 }}>videocam</span>
                  Next Video Calls & Sessions
                </h3>
                <Link to="/video-sessions" className="view-all-link" style={{ fontSize: 13, fontWeight: 700 }}>
                  Schedule +
                </Link>
              </div>

              <div className="sessions-list">
                {loading
                  ? <p style={{ color: 'var(--on-surface-variant)', fontSize: 14 }}>Loading sessions…</p>
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
                    : sessions.map((s) => (
                      <div key={s._id} className="session-card">
                        <div className="session-card-top">
                          <span className={`session-tag tag-${s.tagColor}`}>{s.tag}</span>
                          <span className="session-time">{s.time} {s.duration ? `(${s.duration})` : ''}</span>
                        </div>
                        <h4 className="session-title">{s.title}</h4>
                        <p className="session-mentor">with {s.mentor}</p>
                        <button
                          className="session-join-btn"
                          onClick={() => navigate(s.partnerId ? `/video-sessions?with=${s.partnerId}` : '/video-sessions')}
                        >
                          <span className="material-symbols-outlined">videocam</span>
                          Join Video Call
                        </button>
                      </div>
                    ))
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
    </div>
  );
}

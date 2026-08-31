import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import MobileNav from '../components/MobileNav';
import Footer from '../components/Footer';
import Toast from '../components/Toast';
import VideoCall from '../components/VideoCall';
import { videoApi, learnTeachApi } from '../api';
import './VideoSessionsPage.css';

const DURATION_OPTIONS = [
  { value: 30,  label: '30 min' },
  { value: 45,  label: '45 min' },
  { value: 60,  label: '1 hour' },
  { value: 90,  label: '1.5 hours' },
  { value: 120, label: '2 hours' },
];

function formatDateTime(date) {
  const d = new Date(date);
  return d.toLocaleString([], {
    weekday: 'short',
    month:   'short',
    day:     'numeric',
    hour:    '2-digit',
    minute:  '2-digit',
  });
}

function formatDate(date) {
  return new Date(date).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function sessionStatusColor(status) {
  return { scheduled: 'blue', completed: 'green', cancelled: 'gray' }[status] || 'gray';
}

// Local datetime input value helper
function toLocalInputValue(date) {
  if (!date) return '';
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function VideoSessionsPage() {
  const [searchParams] = useSearchParams();
  const preselectedId = searchParams.get('with');
  const joinSessionId = searchParams.get('join');
  const partnerParam  = searchParams.get('partner');

  const [sessions,     setSessions]     = useState([]);
  const [connections,  setConnections]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showForm,     setShowForm]     = useState(!!preselectedId);
  const [toast,        setToast]        = useState(null);
  const [cancelling,   setCancelling]   = useState(null);
  const [deleting,     setDeleting]     = useState(null);
  const [activeTab,    setActiveTab]    = useState('upcoming');
  const [activeCall,   setActiveCall]   = useState(
    joinSessionId ? { sessionId: joinSessionId, partnerName: partnerParam || 'Partner' } : null
  );

  // Form state
  const [formParticipant, setFormParticipant] = useState(preselectedId || '');
  const [formTopic,       setFormTopic]       = useState('');
  const [formDate,        setFormDate]        = useState('');
  const [formDuration,    setFormDuration]    = useState(60);
  const [formNotes,       setFormNotes]       = useState('');
  const [submitting,      setSubmitting]      = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ sessions: sess }, { connections: conns }] = await Promise.all([
        videoApi.list(),
        learnTeachApi.connections(),
      ]);
      setSessions(sess);
      setConnections(conns);
    } catch (err) {
      console.error('Load video sessions error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Is call joinable? ── within ±15 min of scheduled time
  function isCallActive(session) {
    if (session.status !== 'scheduled') return false;
    const scheduled = new Date(session.scheduledAt);
    const windowStart = new Date(scheduled.getTime() - 15 * 60 * 1000);
    const windowEnd   = new Date(scheduled.getTime() + (session.durationMins + 15) * 60 * 1000);
    return now >= windowStart && now <= windowEnd;
  }

  // Filter sessions into accurate buckets
  const now = new Date();
  
  // Ongoing: scheduled and currently in active call window
  const ongoing   = sessions.filter((s) => s.status === 'scheduled' && isCallActive(s));

  // Upcoming: scheduled and strictly in the future (window hasn't opened yet)
  const upcoming  = sessions.filter((s) => s.status === 'scheduled' && !isCallActive(s) && new Date(s.scheduledAt).getTime() - 15 * 60 * 1000 > now.getTime());

  // Past: completed, or scheduled but call window has fully passed
  const past      = sessions.filter((s) => s.status === 'completed' || (s.status === 'scheduled' && !isCallActive(s) && new Date(s.scheduledAt).getTime() + (s.durationMins + 15) * 60 * 1000 < now.getTime()));

  // Cancelled: status cancelled
  const cancelled = sessions.filter((s) => s.status === 'cancelled');

  const displayedSessions =
    activeTab === 'ongoing'   ? ongoing   :
    activeTab === 'upcoming'  ? upcoming  :
    activeTab === 'past'      ? past      :
    cancelled;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formParticipant || !formTopic.trim() || !formDate) return;

    setSubmitting(true);
    try {
      await videoApi.create({
        participantId: formParticipant,
        topic:         formTopic.trim(),
        scheduledAt:   new Date(formDate).toISOString(),
        durationMins:  formDuration,
        notes:         formNotes.trim(),
      });
      setToast({ message: 'Session scheduled! 🎉', type: 'success' });
      setShowForm(false);
      setFormParticipant('');
      setFormTopic('');
      setFormDate('');
      setFormDuration(60);
      setFormNotes('');
      loadData();
    } catch (err) {
      setToast({ message: err.message || 'Failed to schedule session', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (sessionId) => {
    setCancelling(sessionId);
    try {
      await videoApi.update(sessionId, { status: 'cancelled' });
      setSessions((prev) => prev.map((s) => s._id === sessionId ? { ...s, status: 'cancelled' } : s));
      setToast({ message: 'Session cancelled', type: 'info' });
    } catch (err) {
      setToast({ message: err.message || 'Failed to cancel', type: 'error' });
    } finally {
      setCancelling(null);
    }
  };

  const handleMarkComplete = async (sessionId) => {
    try {
      await videoApi.update(sessionId, { status: 'completed' });
      setSessions((prev) => prev.map((s) => s._id === sessionId ? { ...s, status: 'completed' } : s));
      setToast({ message: 'Session marked as completed ✅', type: 'success' });
    } catch (err) {
      setToast({ message: err.message || 'Failed to update', type: 'error' });
    }
  };

  const handleDelete = async (sessionId) => {
    setDeleting(sessionId);
    try {
      await videoApi.delete(sessionId);
      setSessions((prev) => prev.filter((s) => s._id !== sessionId));
      setToast({ message: 'Session deleted 🗑️', type: 'info' });
    } catch (err) {
      setToast({ message: err.message || 'Failed to delete session', type: 'error' });
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">

        {/* ── Hero ── */}
        <section className="vs-hero">
          <div className="vs-hero-inner">
            <div className="vs-hero-text">
              <h2 className="vs-title">Video Sessions</h2>
              <p className="vs-subtitle">Schedule and manage video calls with your skill exchange partners.</p>
            </div>
            <button
              className={`vs-schedule-btn ${showForm ? 'active' : ''}`}
              onClick={() => setShowForm((v) => !v)}
              id="schedule-session-btn"
            >
              <span className="material-symbols-outlined">{showForm ? 'close' : 'add'}</span>
              {showForm ? 'Cancel' : 'Schedule Session'}
            </button>
          </div>
        </section>

        <div className="vs-content">

          {/* ── Schedule Form ── */}
          {showForm && (
            <div className="vs-form-card">
              <h3 className="vs-form-title">
                <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>event</span>
                New Video Session
              </h3>
              <form className="vs-form" onSubmit={handleSubmit} id="schedule-session-form">

                {/* Participant */}
                <div className="vs-field">
                  <label className="vs-label" htmlFor="vs-participant">
                    <span className="material-symbols-outlined vs-label-icon">person</span>
                    Skill Partner
                  </label>
                  {connections.length === 0 ? (
                    <p className="vs-no-connections">No accepted connections yet. Accept a skill exchange request first.</p>
                  ) : (
                    <div className="vs-select-wrap">
                      <select
                        id="vs-participant"
                        className="vs-select"
                        value={formParticipant}
                        onChange={(e) => setFormParticipant(e.target.value)}
                        required
                      >
                        <option value="">— Choose a partner —</option>
                        {connections.map((c) => (
                          <option key={c.userId} value={c.userId}>{c.name}</option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined vs-select-arrow">expand_more</span>
                    </div>
                  )}
                </div>

                {/* Topic */}
                <div className="vs-field">
                  <label className="vs-label" htmlFor="vs-topic">
                    <span className="material-symbols-outlined vs-label-icon">topic</span>
                    Session Topic
                  </label>
                  <input
                    id="vs-topic"
                    className="vs-input"
                    type="text"
                    placeholder="e.g. React Hooks Introduction, Python basics Q&A"
                    value={formTopic}
                    onChange={(e) => setFormTopic(e.target.value)}
                    required
                    maxLength={200}
                  />
                </div>

                {/* Date & Time */}
                <div className="vs-field-row">
                  <div className="vs-field">
                    <label className="vs-label" htmlFor="vs-datetime">
                      <span className="material-symbols-outlined vs-label-icon">schedule</span>
                      Date & Time
                    </label>
                    <input
                      id="vs-datetime"
                      className="vs-input"
                      type="datetime-local"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      min={toLocalInputValue(new Date())}
                      required
                    />
                  </div>

                  {/* Duration */}
                  <div className="vs-field">
                    <label className="vs-label" htmlFor="vs-duration">
                      <span className="material-symbols-outlined vs-label-icon">timer</span>
                      Duration
                    </label>
                    <div className="vs-select-wrap">
                      <select
                        id="vs-duration"
                        className="vs-select"
                        value={formDuration}
                        onChange={(e) => setFormDuration(Number(e.target.value))}
                      >
                        {DURATION_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined vs-select-arrow">expand_more</span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="vs-field">
                  <label className="vs-label" htmlFor="vs-notes">
                    <span className="material-symbols-outlined vs-label-icon">notes</span>
                    Notes <span style={{ fontWeight: 400, color: 'var(--outline)', fontSize: 12 }}>(optional)</span>
                  </label>
                  <textarea
                    id="vs-notes"
                    className="vs-textarea"
                    placeholder="Topics to cover, preparation notes, links…"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    rows={3}
                    maxLength={1000}
                  />
                </div>

                <div className="vs-form-actions">
                  <button type="button" className="vs-cancel-btn" onClick={() => setShowForm(false)}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="vs-submit-btn"
                    disabled={submitting || connections.length === 0}
                    id="vs-submit-btn"
                  >
                    {submitting
                      ? <><span className="vs-spinner" /> Scheduling…</>
                      : <><span className="material-symbols-outlined" style={{ fontSize: 18 }}>videocam</span> Schedule Session</>
                    }
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── Stats strip ── */}
          <div className="vs-stats-strip">
            <div className="vs-stat-item" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('ongoing')}>
              <span className="material-symbols-outlined vs-stat-icon" style={{ color: '#ef4444' }}>sensors</span>
              <div>
                <div className="vs-stat-val">{ongoing.length}</div>
                <div className="vs-stat-lbl">Live / Ongoing</div>
              </div>
            </div>
            <div className="vs-stat-sep" />
            <div className="vs-stat-item" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('upcoming')}>
              <span className="material-symbols-outlined vs-stat-icon" style={{ color: 'var(--primary)' }}>event_upcoming</span>
              <div>
                <div className="vs-stat-val">{upcoming.length}</div>
                <div className="vs-stat-lbl">Upcoming</div>
              </div>
            </div>
            <div className="vs-stat-sep" />
            <div className="vs-stat-item" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('past')}>
              <span className="material-symbols-outlined vs-stat-icon" style={{ color: 'var(--secondary)' }}>history</span>
              <div>
                <div className="vs-stat-val">{past.length}</div>
                <div className="vs-stat-lbl">Past</div>
              </div>
            </div>
            <div className="vs-stat-sep" />
            <div className="vs-stat-item">
              <span className="material-symbols-outlined vs-stat-icon" style={{ color: 'var(--tertiary)' }}>people</span>
              <div>
                <div className="vs-stat-val">{connections.length}</div>
                <div className="vs-stat-lbl">Partners</div>
              </div>
            </div>
          </div>

          {/* ── Tab bar ── */}
          <div className="vs-tabs">
            {[
              { key: 'ongoing',   label: `Live / Ongoing (${ongoing.length})`,  icon: 'sensors' },
              { key: 'upcoming',  label: `Upcoming (${upcoming.length})`,        icon: 'event_upcoming' },
              { key: 'past',      label: `Past (${past.length})`,                icon: 'history' },
              { key: 'cancelled', label: `Cancelled (${cancelled.length})`,      icon: 'cancel' },
            ].map((tab) => (
              <button
                key={tab.key}
                className={`vs-tab ${activeTab === tab.key ? 'active' : ''} ${tab.key === 'ongoing' && ongoing.length > 0 ? 'tab-live' : ''}`}
                onClick={() => setActiveTab(tab.key)}
                id={`vs-tab-${tab.key}`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Sessions list ── */}
          <div className="vs-sessions">
            {loading ? (
              <div className="vs-loading">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="vs-skeleton-card" />
                ))}
              </div>
            ) : displayedSessions.length === 0 ? (
              <div className="vs-empty">
                <span className="material-symbols-outlined vs-empty-icon">
                  {activeTab === 'ongoing' ? 'sensors_off' : activeTab === 'upcoming' ? 'event_upcoming' : activeTab === 'past' ? 'history' : 'cancel'}
                </span>
                <p className="vs-empty-title">
                  {activeTab === 'ongoing'
                    ? 'No ongoing video calls right now'
                    : activeTab === 'upcoming'
                    ? 'No upcoming sessions scheduled'
                    : activeTab === 'past'
                    ? 'No past sessions'
                    : 'No cancelled sessions'}
                </p>
                {(activeTab === 'upcoming' || activeTab === 'ongoing') && (
                  <button className="vs-empty-cta" onClick={() => setShowForm(true)}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                    Schedule a session
                  </button>
                )}
              </div>
            ) : (
              <div className="vs-session-list">
                {displayedSessions.map((session) => {
                  const isActive = isCallActive(session);
                  const isPast = session.status === 'completed' || (session.status === 'scheduled' && !isActive && new Date(session.scheduledAt).getTime() + (session.durationMins + 15) * 60 * 1000 < now.getTime());
                  const isCancelled = session.status === 'cancelled';

                  return (
                    <div key={session._id} className={`vs-session-card ${session.status} ${isActive ? 'is-live' : ''}`}>
                      {/* Left accent */}
                      <div className={`vs-session-accent ${isActive ? 'live' : sessionStatusColor(session.status)}`} />

                      <div className="vs-session-body">
                        {/* Top row */}
                        <div className="vs-session-top">
                          <div className="vs-session-partner">
                            {session.other.avatar
                              ? <img src={session.other.avatar} alt={session.other.name} className="vs-partner-avatar" />
                              : <div className="vs-partner-avatar vs-partner-avatar-initials">{session.other.initials}</div>
                            }
                            <div>
                              <p className="vs-partner-name">{session.other.name}</p>
                              <p className="vs-partner-role">{session.isHost ? 'You are hosting' : 'Hosted by partner'}</p>
                            </div>
                          </div>
                          <span className={`vs-status-chip ${isActive ? 'live' : sessionStatusColor(session.status)}`}>
                            {isActive ? 'Live Now' : session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                          </span>
                        </div>

                        {/* Topic */}
                        <h4 className="vs-session-topic">{session.topic}</h4>

                        {/* Meta row */}
                        <div className="vs-session-meta">
                          <span className="vs-meta-item">
                            <span className="material-symbols-outlined vs-meta-icon">schedule</span>
                            {formatDateTime(session.scheduledAt)}
                          </span>
                          <span className="vs-meta-item">
                            <span className="material-symbols-outlined vs-meta-icon">timer</span>
                            {session.durationMins} min
                          </span>
                        </div>

                        {/* Footer row: Message/notes on left, action buttons on right */}
                        <div className="vs-session-footer">
                          {session.notes ? (
                            <div className="vs-session-notes-box">
                              <span className="material-symbols-outlined vs-notes-icon">notes</span>
                              <p className="vs-session-notes">{session.notes}</p>
                            </div>
                          ) : (
                            <div className="vs-session-notes-placeholder" />
                          )}

                          <div className="vs-session-actions">
                            {/* Live / Ongoing Call Actions */}
                            {isActive && (
                              <>
                                <button
                                  className="vs-action-btn join-call active"
                                  onClick={() => setActiveCall({ sessionId: session._id, partnerName: session.other.name })}
                                  id={`vs-join-${session._id}`}
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>videocam</span>
                                  Join Call
                                </button>
                                <button
                                  className="vs-action-btn complete"
                                  onClick={() => handleMarkComplete(session._id)}
                                  id={`vs-complete-${session._id}`}
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                                  Mark Complete
                                </button>
                                <button
                                  className="vs-action-btn cancel"
                                  onClick={() => handleCancel(session._id)}
                                  disabled={cancelling === session._id}
                                  id={`vs-cancel-${session._id}`}
                                >
                                  {cancelling === session._id ? 'Cancelling…' : 'Cancel'}
                                </button>
                              </>
                            )}

                            {/* Upcoming (Future) Actions */}
                            {!isActive && session.status === 'scheduled' && !isPast && (
                              <>
                                <button
                                  className="vs-action-btn join-call inactive"
                                  disabled
                                  title="Available 15 min before scheduled time"
                                  id={`vs-join-${session._id}`}
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>videocam</span>
                                  Join (soon)
                                </button>
                                <button
                                  className="vs-action-btn cancel"
                                  onClick={() => handleCancel(session._id)}
                                  disabled={cancelling === session._id}
                                  id={`vs-cancel-${session._id}`}
                                >
                                  {cancelling === session._id ? 'Cancelling…' : 'Cancel'}
                                </button>
                              </>
                            )}

                            {/* Past Call Actions */}
                            {isPast && (
                              <>
                                {session.status === 'scheduled' && (
                                  <button
                                    className="vs-action-btn complete"
                                    onClick={() => handleMarkComplete(session._id)}
                                    id={`vs-complete-${session._id}`}
                                  >
                                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                                    Mark Complete
                                  </button>
                                )}
                                <button
                                  className="vs-action-btn delete"
                                  onClick={() => handleDelete(session._id)}
                                  disabled={deleting === session._id}
                                  id={`vs-delete-${session._id}`}
                                  title="Delete session"
                                >
                                  {deleting === session._id
                                    ? 'Deleting…'
                                    : <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span> Delete</>
                                  }
                                </button>
                              </>
                            )}

                            {/* Cancelled Call Actions */}
                            {isCancelled && (
                              <button
                                className="vs-action-btn delete"
                                onClick={() => handleDelete(session._id)}
                                disabled={deleting === session._id}
                                id={`vs-delete-${session._id}`}
                                title="Delete session"
                              >
                                {deleting === session._id
                                  ? 'Deleting…'
                                  : <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span> Delete</>
                                }
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <Footer />
      </div>
      <MobileNav />

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

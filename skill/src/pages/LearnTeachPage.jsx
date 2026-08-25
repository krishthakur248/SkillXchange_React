import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import MobileNav from '../components/MobileNav';
import Footer from '../components/Footer';
import RequestDialog from '../components/RequestDialog';
import Toast from '../components/Toast';
import { learnTeachApi } from '../api';
import { useAuth } from '../context/AuthContext';
import './LearnTeachPage.css';

const skillTags = [
  { label: 'UI Design',        variant: 'primary' },
  { label: 'Python',           variant: 'secondary' },
  { label: 'Growth Marketing', variant: 'neutral' },
  { label: 'Public Speaking',  variant: 'neutral' },
  { label: 'Data Science',     variant: 'neutral' },
];

export default function LearnTeachPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [search,      setSearch]      = useState('');
  const [isFocused,   setIsFocused]   = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);

  const [incoming,      setIncoming]      = useState([]);
  const [sent,          setSent]          = useState([]);
  const [connections,   setConnections]   = useState([]);
  const [recommended,   setRecommended]   = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  // Request dialog + toast
  const [dialogTarget, setDialogTarget] = useState(null);
  const [toast, setToast] = useState(null);

  const isOverlayActive = isFocused || search.trim().length > 0;

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([
      learnTeachApi.incoming(),
      learnTeachApi.sent(),
      learnTeachApi.connections(),
      learnTeachApi.recommended(),
    ])
      .then(([{ requests: inc }, { requests: snt }, { connections: conns }, { matches: rec }]) => {
        setIncoming(inc);
        setSent(snt);
        setConnections(conns);
        setRecommended(rec);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredRequests = incoming.filter((req) =>
    req.name.toLowerCase().includes(search.toLowerCase()) ||
    (req.role || '').toLowerCase().includes(search.toLowerCase()) ||
    req.wantsToLearn.toLowerCase().includes(search.toLowerCase()) ||
    req.offers.toLowerCase().includes(search.toLowerCase())
  );

  const filteredMatches = recommended.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.needs || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.offers || '').toLowerCase().includes(search.toLowerCase())
  );

  const pendingSent = sent.filter((s) => s.status === 'pending');

  const handleClear = () => { setSearch(''); setIsFocused(false); };

  const handleOpenProfile = (person) => setSelectedPerson(person);

  const handleRequestAction = async (requestId, status) => {
    setActionLoading(requestId);
    try {
      await learnTeachApi.updateRequest(requestId, { status });
      setIncoming((prev) => prev.filter((r) => r._id !== requestId));
      const label = status === 'accepted' ? 'accepted ✅' : 'declined';
      setToast({ message: `Request ${label}`, type: status === 'accepted' ? 'success' : 'info' });
      loadData();
    } catch (err) {
      setToast({ message: err.message || 'Action failed', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelPending = async (requestId) => {
    setActionLoading(requestId);
    try {
      await learnTeachApi.updateRequest(requestId, { status: 'declined' });
      setToast({ message: 'Request cancelled.', type: 'info' });
      loadData();
    } catch (err) {
      setToast({ message: err.message || 'Failed to cancel request', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const showToast = useCallback((message, type = 'success') => setToast({ message, type }), []);

  // Opens the request dialog for a match
  const handleOpenRequest = useCallback((match) => {
    setSelectedPerson(null);
    setDialogTarget({
      _id:      match._id,
      name:     match.name,
      initials: match.initials,
      teaches:  match.teaches || (match.offers ? [match.offers] : []),
      wants:    match.wants   || (match.needs  ? [match.needs]  : []),
    });
  }, []);

  // Navigate to chat with a specific user
  const handleOpenChat = useCallback((userId) => {
    navigate(`/chat?with=${userId}`);
  }, [navigate]);

  // Navigate to schedule video with a specific user
  const handleScheduleVideo = useCallback((userId) => {
    navigate(`/video-sessions?with=${userId}`);
  }, [navigate]);

  // After sending a request from the profile modal
  const handleModalRequest = () => {
    if (selectedPerson) {
      handleOpenRequest(selectedPerson);
    }
  };

  return (
    <div className="app-shell">
      {/* Backdrop */}
      {isOverlayActive && (
        <div className="search-backdrop" onClick={() => setIsFocused(false)} />
      )}

      {/* Profile Modal */}
      {selectedPerson && (
        <div className="profile-card-modal-backdrop" onClick={() => setSelectedPerson(null)}>
          <div className="profile-card-modal" onClick={(e) => e.stopPropagation()}>
            <button className="profile-modal-close" onClick={() => setSelectedPerson(null)}>
              <span className="material-symbols-outlined">close</span>
            </button>
            <div className="profile-modal-header">
              {selectedPerson.avatar
                ? <img src={selectedPerson.avatar} alt={selectedPerson.name} className="profile-modal-avatar" />
                : <div className="profile-modal-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary)', color: '#fff', borderRadius: '50%', width: 80, height: 80, fontSize: 28, fontWeight: 700 }}>{selectedPerson.initials}</div>
              }
              <div className="profile-modal-title-group">
                <span className="profile-modal-badge">{selectedPerson.pct || 'Peer Match'}</span>
                <h3 className="profile-modal-name">{selectedPerson.name}</h3>
                <p className="profile-modal-role">{selectedPerson.role || selectedPerson.wantsToLearn}</p>
                {selectedPerson.rating && (
                  <div className="profile-modal-rating">
                    <span className="material-symbols-outlined star-icon">star</span>
                    <span>{selectedPerson.rating}</span>
                    {selectedPerson.location && <>
                      <span className="rating-dot">•</span>
                      <span>{selectedPerson.location}</span>
                    </>}
                  </div>
                )}
              </div>
            </div>

            {selectedPerson.bio && (
              <div className="profile-modal-bio"><p>{selectedPerson.bio}</p></div>
            )}

            <div className="profile-modal-skills">
              {selectedPerson.teaches && (
                <div className="modal-skill-block teaches">
                  <span className="modal-skill-label">Teaches</span>
                  <div className="modal-skill-chips">
                    {selectedPerson.teaches.map((t) => <span key={t} className="modal-chip teach">{t}</span>)}
                  </div>
                </div>
              )}
              {selectedPerson.wants && (
                <div className="modal-skill-block wants">
                  <span className="modal-skill-label">Wants to Learn</span>
                  <div className="modal-skill-chips">
                    {selectedPerson.wants.map((w) => <span key={w} className="modal-chip want">{w}</span>)}
                  </div>
                </div>
              )}
            </div>

            <div className="profile-modal-footer">
              <button className="modal-request-btn" onClick={handleModalRequest}>
                Request Skill Exchange
              </button>
            </div>
          </div>
        </div>
      )}

      <Sidebar />
      <div className="main-content">
        {/* ── Hero ── */}
        <section className="lt-hero">
          <div className="lt-hero-inner">
            <h2 className="lt-title">Learn and Teach</h2>
            <p className="lt-subtitle">Manage your skill exchanges, connect with peers, and accelerate reciprocal growth.</p>
            <div className="lt-tags">
              {skillTags.map((t) => (
                <button
                  key={t.label}
                  className={`lt-tag lt-tag-${t.variant}`}
                  onClick={() => { setSearch(t.label === search ? '' : t.label); setIsFocused(true); }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Main Content Grid ── */}
        <div className="lt-content">
          <div className="lt-grid">
            {/* Left Column: Search & Incoming Requests */}
            <div>
              {/* Search Bar */}
              <div className={`search-bar-wrapper ${isOverlayActive ? 'overlay-active' : ''}`}>
                <div className="search-bar">
                  <span className="material-symbols-outlined search-icon">search</span>
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search by skill (e.g. Python, UX Design, React)"
                    value={search}
                    onFocus={() => setIsFocused(true)}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search && (
                    <button className="search-clear-btn" onClick={handleClear}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                    </button>
                  )}
                </div>

                {/* Floating search results */}
                {isOverlayActive && (
                  <div className="search-results-dropdown">
                    <div className="search-dropdown-header">
                      <span>Search Results</span>
                      <button className="search-close-link" onClick={() => setIsFocused(false)}>Esc to close</button>
                    </div>

                    {filteredRequests.length > 0 && (
                      <div className="search-result-group">
                        <div className="search-result-heading">
                          <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--primary)' }}>inbox</span>
                          Incoming Requests ({filteredRequests.length})
                        </div>
                        {filteredRequests.map((req) => (
                          <div key={req._id} className="search-result-item">
                            <div className="search-result-user">
                              {req.avatar
                                ? <img src={req.avatar} alt={req.name} className="search-result-avatar" />
                                : <div className="search-result-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary)', color: '#fff', fontWeight: 700 }}>{req.initials}</div>
                              }
                              <div className="search-result-info">
                                <span className="search-result-name">{req.name}</span>
                                <span className="search-result-detail">
                                  Wants: <span className="highlight-needs">{req.wantsToLearn}</span> · Offers: <span className="highlight-offers">{req.offers}</span>
                                </span>
                              </div>
                            </div>
                            <div className="search-result-actions">
                              <button className="search-result-view-btn" onClick={() => handleOpenProfile(req)}>View</button>
                              <button className="search-result-action-btn" onClick={() => handleRequestAction(req._id, 'accepted')}>Accept</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {filteredMatches.length > 0 && (
                      <div className="search-result-group">
                        <div className="search-result-heading">
                          <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--secondary)' }}>star</span>
                          Recommended Matches ({filteredMatches.length})
                        </div>
                        {filteredMatches.map((m) => (
                          <div key={m._id} className="search-result-item">
                            <div className="search-result-user">
                              {m.avatar
                                ? <img src={m.avatar} alt={m.name} className="search-result-avatar" />
                                : <div className="search-result-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--secondary)', color: '#fff', fontWeight: 700 }}>{m.initials}</div>
                              }
                              <div className="search-result-info">
                                <span className="search-result-name">{m.name}</span>
                                <span className="search-result-detail">
                                  Needs <span className="highlight-needs">{m.needs}</span> · Offers <span className="highlight-offers">{m.offers}</span>
                                </span>
                              </div>
                            </div>
                            <div className="search-result-actions">
                              <button className="search-result-view-btn" onClick={() => handleOpenProfile(m)}>View</button>
                              <button className="search-result-request-btn" onClick={() => handleOpenRequest(m)}>Request</button>
                              <span className="search-result-tag">{m.pct}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {filteredRequests.length === 0 && filteredMatches.length === 0 && (
                      <div className="search-empty-state">
                        <span className="material-symbols-outlined search-empty-icon">search_off</span>
                        <p className="search-empty-title">No matching peers found</p>
                        <p className="search-empty-sub">Try searching for "UI Design", "Python", or "React"</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Incoming Requests */}
              <div className="lt-incoming-header">
                <h3 className="lt-incoming-title">
                  <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>inbox</span>
                  Incoming Requests
                </h3>
                <span className="lt-badge">{incoming.length} New</span>
              </div>

              <div className="lt-request-grid">
                {loading
                  ? <p style={{ color: 'var(--on-surface-variant)', fontSize: 14 }}>Loading requests…</p>
                  : incoming.length === 0
                    ? <div className="lt-empty-card">
                        <span className="material-symbols-outlined lt-empty-icon">mail</span>
                        <p className="lt-empty-title">No incoming requests</p>
                        <p className="lt-empty-sub">When peers request a skill exchange with you, they'll appear here for your review.</p>
                      </div>
                    : incoming.map((req) => (
                      <div key={req._id} className="lt-request-card">
                        <div className="lt-request-person">
                          {req.avatar
                            ? <img src={req.avatar} alt={req.name} className="lt-request-avatar" />
                            : <div className="lt-request-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary)', color: '#fff', fontWeight: 700 }}>{req.initials}</div>
                          }
                          <div>
                            <h4 className="lt-request-name">{req.name}</h4>
                            <p className="lt-request-role">{req.role}</p>
                          </div>
                        </div>
                        <div className="lt-request-skills">
                          <div className="lt-skill-block learn">
                            <p className="lt-skill-label">Wants to learn</p>
                            <p className="lt-skill-value primary">{req.wantsToLearn}</p>
                          </div>
                          <div className="lt-skill-block offer">
                            <p className="lt-skill-label">Offers in exchange</p>
                            <p className="lt-skill-value secondary">{req.offers}</p>
                          </div>
                        </div>
                        <div className="lt-request-actions">
                          <button
                            className="lt-btn-accept"
                            disabled={actionLoading === req._id}
                            onClick={() => handleRequestAction(req._id, 'accepted')}
                          >
                            {actionLoading === req._id ? '…' : 'Accept'}
                          </button>
                          <button
                            className="lt-btn-decline"
                            disabled={actionLoading === req._id}
                            onClick={() => handleRequestAction(req._id, 'declined')}
                          >
                            Decline
                          </button>
                          <button className="lt-btn-view" onClick={() => handleOpenProfile(req)}>View</button>
                        </div>
                      </div>
                    ))
                }
              </div>
            </div>

            {/* Right Column: Replaced with dynamic Learning Exchange Hub */}
            <div className="lt-hub-column">
              <h3 className="lt-sent-title">
                <span className="material-symbols-outlined" style={{ color: 'var(--secondary)' }}>hub</span>
                Exchange Hub & Live Activity
              </h3>

              {/* Hub Quick Stats Card */}
              <div className="lt-hub-card">
                <div className="lt-hub-header">
                  <div className="lt-hub-avatar-wrap">
                    <span className="material-symbols-outlined lt-hub-icon">school</span>
                  </div>
                  <div>
                    <h4 className="lt-hub-title">{user?.name || 'Your Exchange Journey'}</h4>
                    <p className="lt-hub-sub">{user?.badge || 'LEARNER'} • Level {user?.level || 1} • {user?.points || 0} XP</p>
                  </div>
                </div>

                <div className="lt-hub-stats-row">
                  <div className="lt-hub-stat">
                    <span className="lt-hub-stat-num">{connections.length}</span>
                    <span className="lt-hub-stat-lbl">Active Partners</span>
                  </div>
                  <div className="lt-hub-stat-divider" />
                  <div className="lt-hub-stat">
                    <span className="lt-hub-stat-num">{user?.hoursLogged || 0}h</span>
                    <span className="lt-hub-stat-lbl">Hours Shared</span>
                  </div>
                  <div className="lt-hub-stat-divider" />
                  <div className="lt-hub-stat">
                    <span className="lt-hub-stat-num">{user?.liveSessions || 0}</span>
                    <span className="lt-hub-stat-lbl">Live Sessions</span>
                  </div>
                </div>

                <div className="lt-hub-quick-actions">
                  <button className="lt-hub-act-btn primary" onClick={() => navigate('/chat')}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chat</span>
                    Open Chat ({connections.length})
                  </button>
                  <button className="lt-hub-act-btn secondary" onClick={() => navigate('/video-sessions')}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>videocam</span>
                    Video Sessions
                  </button>
                </div>
              </div>

              {/* Pending Requests Waiting for Response (if any) */}
              {pendingSent.length > 0 && (
                <div className="lt-pending-box">
                  <div className="lt-pending-box-header">
                    <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: 18 }}>hourglass_top</span>
                    <span>Pending Requests ({pendingSent.length})</span>
                  </div>
                  <div className="lt-pending-items">
                    {pendingSent.map((ps) => (
                      <div key={ps._id} className="lt-pending-item">
                        <div className="lt-pending-info">
                          <span className="lt-pending-name">{ps.name}</span>
                          <span className="lt-pending-skill">Skill: {ps.skill}</span>
                        </div>
                        <button
                          className="lt-pending-cancel-btn"
                          onClick={() => handleCancelPending(ps._id)}
                          disabled={actionLoading === ps._id}
                        >
                          Cancel
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pro Tips for Successful Exchange */}
              <div className="lt-tips-card">
                <div className="lt-tips-header">
                  <span className="material-symbols-outlined" style={{ color: '#f59e0b', fontSize: 20 }}>lightbulb</span>
                  <h4>Exchange Best Practices</h4>
                </div>
                <ul className="lt-tips-list">
                  <li>
                    <span className="material-symbols-outlined lt-tip-check">check_circle</span>
                    <span><strong>Alternating Sessions:</strong> Spend 30 mins teaching, then 30 mins learning.</span>
                  </li>
                  <li>
                    <span className="material-symbols-outlined lt-tip-check">check_circle</span>
                    <span><strong>Live Screen Sharing:</strong> Schedule Video Calls to debug and build projects together.</span>
                  </li>
                  <li>
                    <span className="material-symbols-outlined lt-tip-check">check_circle</span>
                    <span><strong>Finish Exchange:</strong> Click Finish Learning in chat to earn +100 XP and level up!</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* ── Recommended for You (Excludes already connected/pending peers) ── */}
        <section className="lt-recommended">
          <div className="lt-recommended-header">
            <div>
              <h3 className="lt-recommended-title">Recommended Peers for You</h3>
              <p className="lt-recommended-subtitle">New peers matching your teaching and learning skills.</p>
            </div>
            <button className="lt-view-all" onClick={() => navigate('/mentors')}>
              Browse Mentors{' '}
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
            </button>
          </div>
          <div className="lt-match-grid">
            {loading
              ? <p style={{ color: 'var(--on-surface-variant)', fontSize: 14, padding: 24 }}>Loading recommendations…</p>
              : recommended.length === 0
                ? <div className="lt-no-rec-box">
                    <span className="material-symbols-outlined" style={{ fontSize: 36, color: 'var(--secondary)' }}>groups</span>
                    <p style={{ fontWeight: 700, marginTop: 8 }}>All caught up!</p>
                    <p style={{ color: 'var(--on-surface-variant)', fontSize: 13 }}>You're connected with all current matches. Add more skills to find new peers!</p>
                  </div>
                : recommended.map((m) => (
                  <div key={m._id} className="lt-match-card">
                    <div className="lt-match-card-overlay" />
                    {m.avatar
                      ? <img src={m.avatar} alt={m.name} className="lt-match-card-img" />
                      : <div className="lt-match-card-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: '#fff', fontSize: 36, fontWeight: 700 }}>{m.initials}</div>
                    }
                    <div className="lt-match-card-body">
                      <div className="lt-match-top-row">
                        <span className={`lt-match-pct ${m.pctColor}`}>{m.pct}</span>
                        <div className="lt-match-skill-bubbles">
                          {(m.skills || []).map((s) => (
                            <span key={s.label} className={s.color}>{s.label}</span>
                          ))}
                        </div>
                      </div>
                      <h4 className="lt-match-person-name">{m.name}</h4>
                      <p className="lt-match-person-desc">{m.desc}</p>
                      <div className="lt-match-actions">
                        <button className="lt-view-profile-btn" onClick={() => handleOpenProfile(m)}>View Profile</button>
                        <button
                          className={`lt-match-exchange-btn ${m.accent === 'blue' ? 'blue-accent' : ''}`}
                          onClick={() => handleOpenRequest(m)}
                        >
                          Request
                        </button>
                      </div>
                    </div>
                  </div>
                ))
            }
          </div>
        </section>

        <Footer />
      </div>

      {/* Mobile FAB */}
      <button
        className="lt-fab"
        onClick={() => {
          if (recommended.length > 0) handleOpenRequest(recommended[0]);
          else showToast('Add skills to your profile first!', 'info');
        }}
        title="New request"
      >
        <span className="material-symbols-outlined">add</span>
      </button>

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

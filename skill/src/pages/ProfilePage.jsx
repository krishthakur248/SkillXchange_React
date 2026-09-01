import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import MobileNav from '../components/MobileNav';
import Footer from '../components/Footer';
import RequestDialog from '../components/RequestDialog';
import Toast from '../components/Toast';
import { profileApi, mentorFlowApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useAnimeStagger } from '../hooks/useAnime';
import './ProfilePage.css';

/* ── Sub-components ── */

function SkillDots({ filled, color = 'primary' }) {
  return (
    <div className="skill-dots">
      {[...Array(3)].map((_, i) => (
        <span key={i} className={`skill-dot ${i < filled ? `dot-${color}` : 'dot-empty'}`} />
      ))}
    </div>
  );
}

function SkillItem({ skill, type, onRemove }) {
  return (
    <div className={`skill-item group-skill-${type}`}>
      <div className="skill-item-left">
        <span className="skill-item-name">{skill.name}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className={`skill-item-level level-${skill.levelColor || 'muted'}`}>{skill.level}</span>
          {type === 'learn' && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: 'rgba(0,107,92,0.12)', color: 'var(--secondary)' }}>
              {skill.pct ?? (skill.bars === 3 ? 85 : skill.bars === 2 ? 50 : 25)}% Mastery
            </span>
          )}
        </div>
      </div>
      <div className="skill-item-right">
        <SkillDots filled={skill.bars} color={type === 'teach' ? 'primary' : 'secondary'} />
        <button
          className="skill-remove-btn"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(skill.name, type);
          }}
          title={`Remove ${skill.name}`}
          aria-label={`Remove ${skill.name}`}
        >
          <span className="material-symbols-outlined">remove</span>
        </button>
      </div>
    </div>
  );
}

function MatchCard({ m, onRequest }) {
  return (
    <div className="profile-match-card">
      <div className="pm-top">
        <div className="pm-avatar">{m.initials}</div>
        <div className="pm-info">
          <h5 className="pm-name">{m.name}</h5>
          <p className="pm-sub">{m.sub}</p>
        </div>
        {m.verified
          ? <span className="material-symbols-outlined pm-verified" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
          : <span className="material-symbols-outlined pm-more">more_horiz</span>}
      </div>
      <div className="pm-skills">
        <div className="pm-skill-row">
          <span className="pm-skill-label teaches">TEACHES:</span>
          <div className="pm-chips">
            {m.teaches.map((t) => <span key={t} className="pm-chip chip-teaches">{t}</span>)}
          </div>
        </div>
        <div className="pm-skill-row">
          <span className="pm-skill-label wants">WANTS:</span>
          <div className="pm-chips">
            {m.wants.map((w) => <span key={w} className="pm-chip chip-wants">{w}</span>)}
          </div>
        </div>
      </div>
      <div className="pm-actions">
        <Link to="/learn-teach" className="pm-view-btn">View Profile</Link>
        <button className="pm-request-btn" onClick={() => onRequest(m)}>Request</button>
      </div>
    </div>
  );
}

/* ── Add Skill Modal ── */
const levelOptions = [
  { label: 'Beginner Level',     color: 'muted',      bars: 1 },
  { label: 'Intermediate Level', color: 'muted',      bars: 2 },
  { label: 'Expert Level',       color: 'secondary',  bars: 3 },
];

function AddSkillModal({ type, onSave, onClose }) {
  const [name,  setName]  = useState('');
  const [level, setLevel] = useState(levelOptions[0]);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await onSave({ name: name.trim(), level: level.label, levelColor: level.color, bars: level.bars });
    setSaving(false);
  };

  return (
    <div className="add-skill-backdrop" onClick={onClose}>
      <div className="add-skill-modal" onClick={(e) => e.stopPropagation()}>
        <div className="add-skill-header">
          <h3 className="add-skill-title">
            {type === 'teach' ? 'Add Teaching Skill' : 'Add Learning Skill'}
          </h3>
          <button className="add-skill-close" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="add-skill-form">
          <div className="add-skill-field">
            <label className="add-skill-label">Skill Name</label>
            <input
              className="add-skill-input"
              type="text"
              placeholder={type === 'teach' ? 'e.g. React, Figma, Python…' : 'e.g. Machine Learning, Rust…'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="add-skill-field">
            <label className="add-skill-label">Level</label>
            <div className="level-options">
              {levelOptions.map((l) => (
                <button
                  key={l.label}
                  type="button"
                  className={`level-opt ${level.label === l.label ? 'level-opt-active' : ''}`}
                  onClick={() => setLevel(l)}
                >
                  <SkillDots filled={l.bars} color={type === 'teach' ? 'primary' : 'secondary'} />
                  <span>{l.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="add-skill-actions">
            <button type="button" className="add-skill-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="add-skill-save" disabled={saving || !name.trim()}>
              {saving ? 'Saving…' : 'Add Skill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Quit Mentor Confirmation Modal ── */
function QuitMentorModal({ onConfirm, onClose, loading }) {
  const navigate = useNavigate();
  const [classesLoading, setClassesLoading] = useState(true);
  const [activeClasses,  setActiveClasses]  = useState([]);

  useEffect(() => {
    mentorFlowApi.listClasses()
      .then(({ classes = [] }) => {
        const active = classes.filter((c) => c.status === 'active');
        setActiveClasses(active);
      })
      .catch(() => {})
      .finally(() => setClassesLoading(false));
  }, []);

  const hasActiveClasses = activeClasses.length > 0;

  return (
    <div className="add-skill-backdrop" onClick={onClose}>
      <div className="quit-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="quit-modal-header">
          <div className="quit-modal-header-left">
            <div className={`quit-icon-wrap ${hasActiveClasses ? 'blocked' : ''}`}>
              <span className="material-symbols-outlined">
                {hasActiveClasses ? 'block' : 'warning'}
              </span>
            </div>
            <div>
              <h3 className="quit-modal-title">
                {hasActiveClasses ? 'Cannot Quit Mentoring Yet' : 'Quit Mentoring?'}
              </h3>
              <p className="quit-modal-sub">
                {hasActiveClasses ? 'Active classes currently running' : 'Revert to standard member profile'}
              </p>
            </div>
          </div>
          <button className="quit-modal-close" onClick={onClose} title="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="quit-modal-body">
          {classesLoading ? (
            <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--on-surface-variant)', fontSize: 14 }}>
              <span className="material-symbols-outlined animate-spin" style={{ fontSize: 24, verticalAlign: 'middle', marginRight: 8 }}>
                progress_activity
              </span>
              Checking active classes…
            </div>
          ) : hasActiveClasses ? (
            <>
              <p className="quit-modal-text" style={{ color: 'var(--on-surface)' }}>
                You cannot quit mentoring while you have <strong>{activeClasses.length} active class{activeClasses.length > 1 ? 'es' : ''}</strong> running:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 130, overflowY: 'auto' }}>
                {activeClasses.map((c) => (
                  <div
                    key={c._id}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      background: 'var(--surface-container)',
                      border: '1px solid var(--outline-variant)',
                      fontSize: 13,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{c.title}</span>
                    <span style={{ fontSize: 11, color: 'var(--secondary)', fontWeight: 700 }}>
                      {c.enrolledStudents?.length || 0}/{c.maxStudents} Enrolled
                    </span>
                  </div>
                ))}
              </div>

              <div className="quit-modal-alert" style={{ borderLeftColor: 'var(--error)' }}>
                <span className="material-symbols-outlined quit-alert-icon" style={{ color: 'var(--error)' }}>error</span>
                <span>Please conclude or archive all your classes in the Mentor Dashboard before quitting.</span>
              </div>

              <div className="quit-modal-actions">
                <button className="quit-btn-cancel" onClick={onClose}>
                  Cancel
                </button>
                <button
                  className="quit-btn-confirm"
                  style={{ background: 'var(--primary)' }}
                  onClick={() => {
                    onClose();
                    navigate('/mentors', { state: { openMentorFlow: true } });
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>dashboard</span>
                  Go to Classes
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="quit-modal-text">
                You have no active classes running. You will be removed from the mentor pool and returned to normal member status.
              </p>

              <div className="quit-modal-alert">
                <span className="material-symbols-outlined quit-alert-icon">check_circle</span>
                <span>All your previous classes are archived. You can become a mentor again at any time.</span>
              </div>

              <div className="quit-modal-actions">
                <button className="quit-btn-cancel" onClick={onClose} disabled={loading}>
                  Cancel
                </button>
                <button
                  className="quit-btn-confirm"
                  onClick={onConfirm}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin" style={{ fontSize: 18 }}>progress_activity</span>
                      Updating…
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
                      Yes, Quit Mentoring
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ── */
export default function ProfilePage() {
  const { user: authUser, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [profile,   setProfile]   = useState(null);
  const [matches,   setMatches]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);

  // Settings state
  const [available, setAvailable] = useState(true);
  const [timezone,  setTimezone]  = useState('IST (UTC+5:30)');
  const [method,    setMethod]    = useState('Video Call');

  // Add skill modal
  const [addSkillType, setAddSkillType] = useState(null); // 'teach' | 'learn' | null

  // Mentor toggle
  const [showQuitModal,  setShowQuitModal]  = useState(false);
  const [mentorLoading,  setMentorLoading]  = useState(false);

  // Request dialog + toast
  const [dialogTarget, setDialogTarget] = useState(null);
  const [toast, setToast] = useState(null);

  const skillRef = useAnimeStagger('.skill-item');
  const matchRef = useAnimeStagger('.profile-match-card');

  useEffect(() => {
    Promise.all([profileApi.get(), profileApi.matches()])
      .then(([{ user }, { matches: m }]) => {
        setProfile(user);
        setMatches(m);
        setAvailable(user.availableForExchange);
        setTimezone(user.timezone || 'IST (UTC+5:30)');
        setMethod(user.preferredMethod || 'Video Call');
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const showToast = useCallback((message, type = 'success') => setToast({ message, type }), []);

  const saveSettings = async (patch) => {
    setSaving(true);
    try {
      const { user } = await profileApi.update(patch);
      setProfile(user);
      await refreshUser();
    } catch (err) {
      showToast(err.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAvailableChange = (e) => {
    const val = e.target.checked;
    setAvailable(val);
    saveSettings({ availableForExchange: val });
  };

  const handleTimezoneChange = (e) => {
    const val = e.target.value;
    setTimezone(val);
    saveSettings({ timezone: val });
  };

  const handleMethodChange = (m) => {
    setMethod(m);
    saveSettings({ preferredMethod: m });
  };

  // Add a new skill and persist
  const handleAddSkill = async (skillData) => {
    const field = addSkillType === 'teach' ? 'teachingSkills' : 'learningSkills';
    const currentSkills = profile?.[field] || [];

    // Prevent duplicates
    if (currentSkills.some((s) => s.name.toLowerCase() === skillData.name.toLowerCase())) {
      showToast('That skill is already in your list!', 'info');
      return;
    }

    const defaultPct = skillData.bars === 3 ? 85 : skillData.bars === 2 ? 50 : 25;
    const enrichedSkill = {
      ...skillData,
      pct: skillData.pct !== undefined ? skillData.pct : defaultPct,
      color: addSkillType === 'teach' ? 'primary' : 'secondary',
      next: `Milestone: Complete session in ${skillData.name}`,
    };

    const updated = [...currentSkills, enrichedSkill];
    try {
      const { user } = await profileApi.update({ [field]: updated });
      setProfile(user);
      await refreshUser();
      setAddSkillType(null);
      showToast(`"${skillData.name}" added to your ${addSkillType === 'teach' ? 'teaching' : 'learning'} skills! 🎉`, 'success');
    } catch (err) {
      showToast(err.message || 'Failed to add skill', 'error');
    }
  };

  // Remove a skill and persist
  const handleRemoveSkill = async (skillName, type) => {
    const field = type === 'teach' ? 'teachingSkills' : 'learningSkills';
    const currentSkills = profile?.[field] || [];
    const updated = currentSkills.filter((s) => s.name !== skillName);
    try {
      const { user } = await profileApi.update({ [field]: updated });
      setProfile(user);
      await refreshUser();
      showToast(`Removed "${skillName}" from your ${type === 'teach' ? 'teaching' : 'learning'} skills.`, 'info');
    } catch (err) {
      showToast(err.message || 'Failed to remove skill', 'error');
    }
  };

  const handleMatchRequest = useCallback((match) => {
    setDialogTarget({
      _id:      match._id,
      name:     match.name,
      initials: match.initials,
      teaches:  match.teaches || [],
      wants:    match.wants   || [],
    });
  }, []);

  // Mentor toggle handlers
  const handleBecomeMentor = () => {
    navigate('/mentors', { state: { openMentorFlow: true } });
  };

  const handleQuitMentor = async () => {
    setMentorLoading(true);
    try {
      await mentorFlowApi.quit();
      await refreshUser();
      const { user } = await profileApi.get();
      setProfile(user);
      setShowQuitModal(false);
      showToast('You have quit mentoring. Classes archived. ✅', 'info');
    } catch (err) {
      showToast(err.message || 'Failed to quit mentoring', 'error');
    } finally {
      setMentorLoading(false);
    }
  };

  const displayUser    = profile || authUser;
  const teachingSkills = profile?.teachingSkills || [];
  const learningSkills = profile?.learningSkills || [];

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        {/* Sticky Header */}
        <header className="profile-header">
          <h2 className="profile-header-title">Profile Dashboard</h2>
          <div className="profile-header-actions">
            <div className="notif-btn">
              <span className="material-symbols-outlined">notifications</span>
              <span className="notif-dot" />
            </div>
            <div className="header-avatar">{displayUser?.initials || '??'}</div>
          </div>
        </header>

        <div className="profile-content">
          {/* ── Hero Card ── */}
          <section className="profile-hero-card">
            <div className="hero-accent-bar" />
            <div className="profile-hero-inner">
              <div className="profile-avatar-wrap">
                <div className="profile-avatar">{displayUser?.initials || '??'}</div>
                <button
                  className="profile-avatar-edit"
                  onClick={() => showToast('Avatar upload coming soon! 📷', 'info')}
                >
                  <span className="material-symbols-outlined">edit</span>
                </button>
              </div>
              <div className="profile-info">
                <div className="profile-name-row">
                  <h3 className="profile-name">{displayUser?.name || '—'}</h3>
                  <span className={`profile-badge ${displayUser?.userRole === 'mentor' ? 'badge-mentor' : ''}`}>
                    {displayUser?.userRole === 'mentor' ? 'MENTOR' : (displayUser?.badge || 'LEARNER')}
                  </span>
                </div>
                <p className="profile-bio">
                  {displayUser?.bio || 'No bio yet. Update your profile to tell others what you\'re about.'}
                </p>
                <div className="profile-meta">
                  {displayUser?.location && (
                    <span className="profile-meta-item">
                      <span className="material-symbols-outlined">location_on</span> {displayUser.location}
                    </span>
                  )}
                  <span className="profile-meta-item">
                    <span className="material-symbols-outlined">event_available</span>
                    Member since {displayUser?.memberSince
                      ? new Date(displayUser.memberSince).getFullYear()
                      : new Date().getFullYear()}
                  </span>
                  {displayUser?.rating > 0 && (
                    <span className="profile-meta-item">
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      {displayUser.rating.toFixed(1)} ({displayUser.reviewCount} reviews)
                    </span>
                  )}
                  {/* Credit points — only displayed for regular users, completely hidden for mentors */}
                  {displayUser?.userRole !== 'mentor' && (
                    <span className="profile-meta-item" title="Credit Points">
                      <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontVariationSettings: "'FILL' 1" }}>stars</span>
                      <strong>{displayUser?.points ?? 0}</strong> Credits
                    </span>
                  )}
                </div>

                {/* Mentor toggle button */}
                <div className="mentor-toggle-row">
                  {displayUser?.userRole === 'mentor' ? (
                    <>
                      <span className="mentor-active-badge">
                        <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>school</span>
                        Active Mentor
                      </span>
                      <button
                        id="quit-mentor-btn"
                        className="mentor-toggle-btn quit"
                        onClick={() => setShowQuitModal(true)}
                        disabled={mentorLoading}
                      >
                        <span className="material-symbols-outlined">logout</span>
                        Quit Mentor
                      </button>
                    </>
                  ) : (
                    <button
                      id="become-mentor-btn"
                      className="mentor-toggle-btn become"
                      onClick={handleBecomeMentor}
                    >
                      <span className="material-symbols-outlined">school</span>
                      Become a Mentor
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* ── Skill Matrix ── */}
          {loading
            ? <p style={{ color: 'var(--on-surface-variant)', padding: 24 }}>Loading skills…</p>
            : (
              <div className="skill-matrix" ref={skillRef}>
                {/* Teaching */}
                <div className="skill-group">
                  <div className="skill-group-header">
                    <div className="skill-group-title-row">
                      <div className="skill-accent-bar accent-primary" />
                      <h4 className="skill-group-title">I am Teaching</h4>
                    </div>
                    <button className="skill-add-btn add-teach" onClick={() => setAddSkillType('teach')}>
                      <span className="material-symbols-outlined">add_circle</span>
                    </button>
                  </div>
                  <div className="skill-group-list">
                    {teachingSkills.length === 0
                      ? <p style={{ color: 'var(--on-surface-variant)', fontSize: 13, padding: '8px 0' }}>No teaching skills added yet.</p>
                      : teachingSkills.map((s) => <SkillItem key={s.name} skill={s} type="teach" onRemove={handleRemoveSkill} />)
                    }
                  </div>
                </div>
                {/* Learning */}
                <div className="skill-group">
                  <div className="skill-group-header">
                    <div className="skill-group-title-row">
                      <div className="skill-accent-bar accent-secondary" />
                      <h4 className="skill-group-title">I am Learning</h4>
                    </div>
                    <button className="skill-add-btn add-learn" onClick={() => setAddSkillType('learn')}>
                      <span className="material-symbols-outlined">add_circle</span>
                    </button>
                  </div>
                  <div className="skill-group-list">
                    {learningSkills.length === 0
                      ? <p style={{ color: 'var(--on-surface-variant)', fontSize: 13, padding: '8px 0' }}>No learning skills added yet.</p>
                      : learningSkills.map((s) => <SkillItem key={s.name} skill={s} type="learn" onRemove={handleRemoveSkill} />)
                    }
                  </div>
                </div>
              </div>
            )
          }

          {/* ── Settings + Matches ── */}
          <div className="profile-bottom-grid">
            {/* Match Settings */}
            <div className="match-settings-card">
              <h4 className="settings-title">Match Settings {saving && <span style={{ fontSize: 12, color: 'var(--secondary)', fontWeight: 400 }}>Saving…</span>}</h4>

              <div className="setting-row">
                <div>
                  <p className="setting-label">Available for Exchange</p>
                  <p className="setting-sub">Show my profile to potential matches</p>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={available} onChange={handleAvailableChange} />
                  <span className="toggle-track" />
                </label>
              </div>

              <div className="setting-group">
                <p className="setting-label">Timezone Preference</p>
                <div className="select-wrap">
                  <select className="setting-select" value={timezone} onChange={handleTimezoneChange}>
                    <option>PST (UTC-8)</option>
                    <option>EST (UTC-5)</option>
                    <option>GMT (UTC+0)</option>
                    <option>IST (UTC+5:30)</option>
                  </select>
                  <span className="material-symbols-outlined select-arrow">expand_more</span>
                </div>
              </div>

              <div className="setting-group">
                <p className="setting-label">Preferred Exchange Method</p>
                <div className="method-chips">
                  {['Video Call', 'Chat Only', 'In Person'].map((m) => (
                    <button
                      key={m}
                      className={`method-chip ${method === m ? 'active-method' : ''}`}
                      onClick={() => handleMethodChange(m)}
                    >{m}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Potential Matches */}
            <div className="potential-matches-card" ref={matchRef}>
              <div className="pm-card-header">
                <h4 className="settings-title">Top Potential Matches</h4>
                <button className="view-all-link" onClick={() => navigate('/learn-teach')}>View All</button>
              </div>
              <div className="pm-cards-grid">
                {loading
                  ? <p style={{ color: 'var(--on-surface-variant)', fontSize: 14 }}>Loading matches…</p>
                  : matches.length === 0
                    ? <p style={{ color: 'var(--on-surface-variant)', fontSize: 14 }}>Add skills to see potential matches!</p>
                    : matches.map((m) => <MatchCard key={m._id} m={m} onRequest={handleMatchRequest} />)
                }
              </div>
            </div>
          </div>
        </div>

        <Footer />
      </div>
      <MobileNav />

      {/* Add Skill Modal */}
      {addSkillType && (
        <AddSkillModal
          type={addSkillType}
          onSave={handleAddSkill}
          onClose={() => setAddSkillType(null)}
        />
      )}

      {/* Quit Mentor Modal */}
      {showQuitModal && (
        <QuitMentorModal
          loading={mentorLoading}
          onConfirm={handleQuitMentor}
          onClose={() => setShowQuitModal(false)}
        />
      )}

      {/* Request Dialog */}
      {dialogTarget && (
        <RequestDialog
          targetUser={dialogTarget}
          onClose={() => setDialogTarget(null)}
          onSuccess={(msg) => showToast(msg, 'success')}
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

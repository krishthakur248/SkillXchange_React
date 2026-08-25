import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import MobileNav from '../components/MobileNav';
import Footer from '../components/Footer';
import RequestDialog from '../components/RequestDialog';
import Toast from '../components/Toast';
import { profileApi } from '../api';
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

function SkillItem({ skill, type }) {
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

  const handleMatchRequest = useCallback((match) => {
    setDialogTarget({
      _id:      match._id,
      name:     match.name,
      initials: match.initials,
      teaches:  match.teaches || [],
      wants:    match.wants   || [],
    });
  }, []);

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
                  <span className="profile-badge">{displayUser?.badge || 'LEARNER'}</span>
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
                      : teachingSkills.map((s) => <SkillItem key={s.name} skill={s} type="teach" />)
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
                      : learningSkills.map((s) => <SkillItem key={s.name} skill={s} type="learn" />)
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

import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import MobileNav from '../components/MobileNav';
import Footer from '../components/Footer';
import RequestDialog from '../components/RequestDialog';
import Toast from '../components/Toast';
import { useAnimeStagger } from '../hooks/useAnime';
import { mentorsApi, mentorFlowApi, learnTeachApi } from '../api';
import { useAuth } from '../context/AuthContext';
import './MentorsPage.css';

// ─────────────────────────────────────────────
// Dev flag — controls visibility of test bypass
// ─────────────────────────────────────────────
const TEST_BYPASS_ENABLED = import.meta.env.VITE_ENABLE_MENTOR_TEST_BYPASS === 'true';

// ─────────────────────────────────────────────
// Sub-components — Browse tab (existing)
// ─────────────────────────────────────────────
function StarRating({ rating }) {
  return (
    <div className="star-rating">
      <span className="material-symbols-outlined star-icon" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
      <span className="rating-val">{rating.toFixed(1)}</span>
    </div>
  );
}

function MentorCard({ mentor, onRequest, isSelf }) {
  const navigate = useNavigate();
  const enrolled = mentor.totalEnrolled || 0;
  const max = mentor.totalMax || 10;
  const spotsLeft = mentor.spotsLeft !== undefined ? mentor.spotsLeft : Math.max(0, max - enrolled);
  const isAccepted = mentor.requestStatus === 'accepted' || mentor.isEnrolled;
  const isPending  = mentor.requestStatus === 'pending';

  return (
    <div className="mentor-card">
      <div className={`mentor-accent-bar accent-${mentor.accent}`} />
      <div className="mentor-card-body">
        <div className="mentor-card-top">
          <div className="mentor-avatar-wrap">
            {mentor.avatar
              ? <img src={mentor.avatar} alt={mentor.name} className="mentor-avatar-img" />
              : <div className="mentor-avatar">{mentor.initials}</div>
            }
            <div className={`mentor-online ${mentor.online ? 'online' : 'offline'}`} />
          </div>
          <div className="mentor-rating-wrap">
            <StarRating rating={mentor.rating} />
            <span className="mentor-reviews">{mentor.reviews} Reviews</span>
          </div>
        </div>
        <h3 className="mentor-name">{mentor.name}</h3>
        <p className="mentor-role">{mentor.role}</p>

        {/* Course / Class filled by mentor */}
        {mentor.classTitle && (
          <div style={{ background: 'rgba(0, 67, 200, 0.05)', border: '1px solid rgba(0, 67, 200, 0.15)', borderRadius: 8, padding: '8px 10px', margin: '8px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: mentor.classDescription ? 3 : 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--primary)' }}>school</span>
              <strong style={{ fontSize: 13, color: 'var(--on-surface)' }}>{mentor.classTitle}</strong>
            </div>
            {mentor.classDescription && (
              <p style={{ fontSize: 12, color: 'var(--on-surface-variant)', lineHeight: 1.4, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {mentor.classDescription}
              </p>
            )}
          </div>
        )}

        {/* Live student enrollment & spots left counter */}
        <div className="mentor-capacity-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '8px 0', fontSize: 12, padding: '6px 10px', background: 'var(--surface-container)', borderRadius: 8, border: '1px solid var(--outline-variant)' }}>
          <span style={{ fontWeight: 600, color: 'var(--on-surface)' }}>
            👥 {enrolled} / {max} students
          </span>
          <span style={{ fontWeight: 700, color: spotsLeft > 0 ? '#16a34a' : 'var(--error)' }}>
            {spotsLeft > 0 ? `🟢 ${spotsLeft} spots left` : '🔴 Class Full'}
          </span>
        </div>

        <div className="mentor-skills">
          {(mentor.skills && mentor.skills.length > 0 ? mentor.skills : ['Mentorship Cohort']).map((s) => (
            <span key={s} className="mentor-skill-chip">{s}</span>
          ))}
        </div>
      </div>
      <div className="mentor-card-footer">
        <Link to="/profile" className="view-profile-btn">View Profile</Link>
        {isSelf ? (
          <span className="tab-mentor-badge" style={{ padding: '6px 14px', fontSize: 12 }}>You</span>
        ) : isAccepted ? (
          <button
            className="request-btn connected"
            style={{ background: 'linear-gradient(135deg, #16a34a, #0d9488)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => navigate('/chat')}
            title="You are connected with this mentor. Click to open chat."
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16, marginRight: 4 }}>forum</span>
            Connected
          </button>
        ) : isPending ? (
          <button
            className="request-btn pending"
            style={{ background: 'var(--surface-container-high)', color: 'var(--on-surface-variant)', border: '1px solid var(--outline-variant)', cursor: 'default', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            disabled
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16, marginRight: 4 }}>hourglass_top</span>
            Pending
          </button>
        ) : spotsLeft === 0 ? (
          <button
            className="request-btn full"
            style={{ background: 'var(--surface-container-high)', color: 'var(--on-surface-variant)', cursor: 'not-allowed' }}
            disabled
          >
            Class Full
          </button>
        ) : (
          <button className="request-btn" onClick={() => onRequest(mentor)}>Request</button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Mentor Request Modal (Simplified 1-Click Request)
// ─────────────────────────────────────────────
function MentorRequestModal({ mentor, onClose, onSuccess, onError }) {
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      if (mentor.isUserMentor) {
        await mentorFlowApi.requestMentorship({
          mentorId: mentor._id,
          classId: (mentor.classes && mentor.classes[0]) ? mentor.classes[0]._id : undefined,
          note: note.trim(),
        });
        onSuccess(`Enrolled in ${mentor.name}'s mentorship cohort! 🎉`);
      } else {
        const toSkill = (mentor.skills && mentor.skills.length > 0) ? mentor.skills[0] : 'Mentorship';
        const fromSkill = note.trim() || 'Mentorship Guidance';
        await learnTeachApi.sendRequest({
          toUserId: mentor._id,
          fromSkill,
          toSkill,
        });
        onSuccess(`Mentorship request sent to ${mentor.name}! 🎉`);
      }
      onClose();
    } catch (err) {
      onError(err.message || 'Failed to send mentorship request.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="add-skill-backdrop" onClick={onClose}>
      <div className="quit-modal-card" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <div className="quit-modal-header">
          <div className="quit-modal-header-left">
            <div className="mentor-avatar-wrap" style={{ width: 44, height: 44, position: 'relative' }}>
              {mentor.avatar ? (
                <img src={mentor.avatar} alt={mentor.name} className="mentor-avatar-img" />
              ) : (
                <div className="mentor-avatar" style={{ width: 44, height: 44, fontSize: 16 }}>
                  {mentor.initials}
                </div>
              )}
            </div>
            <div>
              <h3 className="quit-modal-title">Request Mentorship</h3>
              <p className="quit-modal-sub">with <strong>{mentor.name}</strong></p>
            </div>
          </div>
          <button className="quit-modal-close" onClick={onClose} title="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form className="quit-modal-body" onSubmit={handleSubmit}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--on-surface-variant)', marginBottom: 8 }}>
              Mentorship Areas Offered by {mentor.name.split(' ')[0]}
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(mentor.skills || []).map((s) => (
                <span key={s} className="mentor-skill-chip" style={{ background: 'var(--surface-container-high)' }}>
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="quit-modal-alert">
            <span className="material-symbols-outlined quit-alert-icon">verified</span>
            <span>All course topics and sessions are structured by the mentor. You don't need to offer skills in return.</span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--on-surface-variant)', marginBottom: 6 }}>
              Add a note (optional)
            </label>
            <textarea
              className="add-skill-input"
              style={{ minHeight: 70, resize: 'vertical' }}
              placeholder="e.g. Hi! I'd love guidance on modern React patterns and best practices..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="quit-modal-actions">
            <button type="button" className="quit-btn-cancel" onClick={onClose} disabled={sending}>
              Cancel
            </button>
            <button
              type="submit"
              className="quit-btn-confirm"
              style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}
              disabled={sending}
            >
              {sending ? (
                <>
                  <span className="material-symbols-outlined animate-spin" style={{ fontSize: 18 }}>progress_activity</span>
                  Sending…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span>
                  Send Mentorship Request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Verification Panel
// ─────────────────────────────────────────────
function VerificationPanel({ onVerified, showToast }) {
  const [mode,         setMode]         = useState(null);   // 'document' | 'email' | null
  const [showBypass,   setShowBypass]   = useState(false);
  const [bypassCode,   setBypassCode]   = useState('');
  const [bypassError,  setBypassError]  = useState('');
  const [loading,      setLoading]      = useState(false);

  const handleBypass = async (e) => {
    e.preventDefault();
    setBypassError('');
    if (bypassCode.trim().toLowerCase() !== 'yes') {
      setBypassError('Type exactly "yes" to activate the bypass.');
      return;
    }
    setLoading(true);
    try {
      const { user } = await mentorFlowApi.testBypass({ code: 'yes' });
      showToast('✅ Test bypass granted — you are now a verified mentor!', 'success');
      onVerified(user);
    } catch (err) {
      setBypassError(err.message || 'Bypass failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { user } = await mentorFlowApi.verifyDocument({ documentUrl: 'stub_pending' });
      showToast('📄 Document submitted! We will review it and notify you.', 'info');
      setMode(null);
      if (onVerified && user) onVerified(user);
    } catch (err) {
      showToast(err.message || 'Submission failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    const email = e.target.email.value.trim();
    setLoading(true);
    try {
      const { user } = await mentorFlowApi.verifyEmail({ email });
      showToast('📧 Institutional email submitted! Verification pending.', 'info');
      setMode(null);
      if (onVerified && user) onVerified(user);
    } catch (err) {
      showToast(err.message || 'Submission failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="verify-panel">
      <div className="verify-panel-header">
        <div className="verify-panel-icon-wrap">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
        </div>
        <div>
          <h3 className="verify-panel-title">Mentor Verification</h3>
          <p className="verify-panel-sub">Verify your expertise to start teaching classes</p>
        </div>
      </div>

      {!mode && (
        <>
          <div className="verify-options">
            {/* Document upload */}
            <button className="verify-option-card" onClick={() => setMode('document')}>
              <div className="verify-option-icon">
                <span className="material-symbols-outlined">upload_file</span>
              </div>
              <div className="verify-option-text">
                <span className="verify-option-title">Upload Document</span>
                <span className="verify-option-sub">Certificate, degree, or professional ID</span>
              </div>
              <span className="material-symbols-outlined verify-option-arrow">arrow_forward_ios</span>
            </button>

            {/* Institutional email */}
            <button className="verify-option-card" onClick={() => setMode('email')}>
              <div className="verify-option-icon secondary">
                <span className="material-symbols-outlined">email</span>
              </div>
              <div className="verify-option-text">
                <span className="verify-option-title">Institutional Email</span>
                <span className="verify-option-sub">Use your .edu or company email for instant check</span>
              </div>
              <span className="material-symbols-outlined verify-option-arrow">arrow_forward_ios</span>
            </button>
          </div>

          {/* Dev-only bypass */}
          {TEST_BYPASS_ENABLED && (
            <div className="verify-bypass-wrap">
              {!showBypass ? (
                <button
                  id="try-another-way-btn"
                  className="verify-bypass-link"
                  onClick={() => setShowBypass(true)}
                >
                  Try another way
                </button>
              ) : (
                <form className="verify-bypass-form" onSubmit={handleBypass}>
                  <p className="verify-bypass-label">
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>developer_mode</span>
                    Dev bypass — type <code>yes</code> to skip verification
                  </p>
                  <div className="verify-bypass-input-row">
                    <input
                      id="bypass-code-input"
                      className="verify-bypass-input"
                      type="text"
                      placeholder='Type "yes" here'
                      value={bypassCode}
                      onChange={(e) => { setBypassCode(e.target.value); setBypassError(''); }}
                      autoFocus
                    />
                    <button
                      id="bypass-submit-btn"
                      type="submit"
                      className="verify-bypass-submit"
                      disabled={loading}
                    >
                      {loading ? '…' : 'Go'}
                    </button>
                  </div>
                  {bypassError && <p className="verify-bypass-error">{bypassError}</p>}
                  <button type="button" className="verify-bypass-cancel" onClick={() => { setShowBypass(false); setBypassCode(''); setBypassError(''); }}>
                    Cancel
                  </button>
                </form>
              )}
            </div>
          )}
        </>
      )}

      {/* Document upload form */}
      {mode === 'document' && (
        <form className="verify-subform" onSubmit={handleDocumentSubmit}>
          <button type="button" className="verify-back-btn" onClick={() => setMode(null)}>
            <span className="material-symbols-outlined">arrow_back</span> Back
          </button>
          <h4 className="verify-subform-title">Upload Your Document</h4>
          <p className="verify-subform-sub">Accepted: certificates, degrees, professional IDs (PDF/image)</p>
          <div className="verify-dropzone">
            <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'var(--primary)', opacity: 0.6 }}>cloud_upload</span>
            <p>File upload coming soon — submission will be queued for review.</p>
          </div>
          <button type="submit" className="verify-submit-btn" disabled={loading}>
            {loading ? 'Submitting…' : 'Submit for Review'}
          </button>
        </form>
      )}

      {/* Institutional email form */}
      {mode === 'email' && (
        <form className="verify-subform" onSubmit={handleEmailSubmit}>
          <button type="button" className="verify-back-btn" onClick={() => setMode(null)}>
            <span className="material-symbols-outlined">arrow_back</span> Back
          </button>
          <h4 className="verify-subform-title">Institutional Email Verification</h4>
          <p className="verify-subform-sub">Enter your .edu, .ac.in, or company domain email</p>
          <input
            id="inst-email-input"
            name="email"
            type="email"
            className="verify-email-input"
            placeholder="you@university.edu"
            required
          />
          <button type="submit" className="verify-submit-btn" disabled={loading}>
            {loading ? 'Checking…' : 'Submit Email'}
          </button>
        </form>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Create Class Modal
// ─────────────────────────────────────────────
function CreateClassModal({ onSave, onClose }) {
  const [form,    setForm]    = useState({ title: '', description: '', skills: '', maxStudents: 10, minReputationRequired: 0 });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.maxStudents) { setError('Title and max students are required.'); return; }
    setSaving(true);
    setError('');
    try {
      const skillsArr = form.skills.split(',').map((s) => s.trim()).filter(Boolean);
      await onSave({ ...form, skills: skillsArr, maxStudents: Number(form.maxStudents), minReputationRequired: Number(form.minReputationRequired) });
    } catch (err) {
      setError(err.message || 'Failed to create class.');
      setSaving(false);
    }
  };

  return (
    <div className="add-skill-backdrop" onClick={onClose}>
      <div className="add-skill-modal create-class-modal" onClick={(e) => e.stopPropagation()}>
        <div className="add-skill-header">
          <h3 className="add-skill-title">Create a New Class</h3>
          <button className="add-skill-close" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="add-skill-form">
          <div className="add-skill-field">
            <label className="add-skill-label">Class Title *</label>
            <input className="add-skill-input" type="text" placeholder="e.g. Advanced React Patterns" value={form.title} onChange={(e) => set('title', e.target.value)} required autoFocus />
          </div>
          <div className="add-skill-field">
            <label className="add-skill-label">Description</label>
            <textarea className="add-skill-input create-class-textarea" placeholder="What will students learn?" value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} />
          </div>
          <div className="add-skill-field">
            <label className="add-skill-label">Skills (comma-separated)</label>
            <input className="add-skill-input" type="text" placeholder="React, TypeScript, Testing" value={form.skills} onChange={(e) => set('skills', e.target.value)} />
          </div>
          <div className="create-class-row">
            <div className="add-skill-field" style={{ flex: 1 }}>
              <label className="add-skill-label">Max Students *</label>
              <input className="add-skill-input" type="number" min="1" max="500" value={form.maxStudents} onChange={(e) => set('maxStudents', e.target.value)} required />
            </div>
            <div className="add-skill-field" style={{ flex: 1 }}>
              <label className="add-skill-label">Min Reputation (stub)</label>
              <input className="add-skill-input" type="number" min="0" value={form.minReputationRequired} onChange={(e) => set('minReputationRequired', e.target.value)} />
            </div>
          </div>
          {error && <p style={{ color: 'var(--error)', fontSize: 13, margin: '4px 0' }}>{error}</p>}
          <div className="add-skill-actions">
            <button type="button" className="add-skill-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="add-skill-save" disabled={saving || !form.title.trim()}>
              {saving ? 'Creating…' : 'Create Class'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Class Card (mentor view)
// ─────────────────────────────────────────────
function ClassCard({ cls, onArchive, onComplete }) {
  const spotsLeft = cls.maxStudents - (cls.enrolledStudents?.length || 0);
  const isFull    = spotsLeft <= 0;
  const isArchived = cls.status === 'archived';
  const isCompleted = cls.status === 'completed';

  return (
    <div className={`class-card ${isArchived ? 'class-card-archived' : ''} ${isCompleted ? 'class-card-completed' : ''}`}>
      <div className="class-card-header">
        <div>
          <h4 className="class-card-title">{cls.title}</h4>
          {cls.description && <p className="class-card-desc">{cls.description}</p>}
        </div>
        {isArchived ? (
          <span className="class-status-chip archived">Archived</span>
        ) : isCompleted ? (
          <span className="class-status-chip completed" style={{ background: 'rgba(22, 163, 74, 0.12)', color: '#16a34a', border: '1px solid rgba(22, 163, 74, 0.3)', fontWeight: 700 }}>
            🎓 Completed
          </span>
        ) : isFull ? (
          <span className="class-status-chip full">Full</span>
        ) : (
          <span className="class-status-chip active">Active</span>
        )}
      </div>

      {cls.skills?.length > 0 && (
        <div className="class-skills">
          {cls.skills.map((s) => <span key={s} className="mentor-skill-chip">{s}</span>)}
        </div>
      )}

      <div className="class-meta-row">
        <span className="class-meta-item">
          <span className="material-symbols-outlined">group</span>
          {cls.enrolledStudents?.length || 0} / {cls.maxStudents} students
        </span>
        {cls.minReputationRequired > 0 && (
          <span className="class-meta-item">
            <span className="material-symbols-outlined">stars</span>
            {cls.minReputationRequired} rep required
          </span>
        )}
        <span className={`class-spots ${isFull ? 'spots-full' : ''}`}>
          {isCompleted ? '🎓 Course Finished' : (isFull ? '🔴 Full' : `🟢 ${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left`)}
        </span>
      </div>

      {!isArchived && !isCompleted && (
        <div className="class-actions" style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button
            className="class-complete-btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: 'linear-gradient(135deg, #16a34a, #0d9488)', color: '#fff', border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
            onClick={() => onComplete(cls._id, cls.title)}
            id={`complete-course-${cls._id}`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>school</span>
            Complete Course
          </button>
          <button className="class-archive-btn" onClick={() => onArchive(cls._id)}>
            <span className="material-symbols-outlined">archive</span> Archive
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Mentor Dashboard (full subsection)
// ─────────────────────────────────────────────
function MentorDashboard({ user, onUserUpdate, showToast }) {
  const { refreshUser } = useAuth();
  const [classes,       setClasses]       = useState([]);
  const [loadingClasses,setLoadingClasses] = useState(false);
  const [showCreate,    setShowCreate]     = useState(false);

  const verificationStatus = user?.mentorVerification?.status;
  const isVerified = verificationStatus === 'verified' || verificationStatus === 'test_bypass';
  const isMentor   = user?.userRole === 'mentor';

  // Fetch classes when verified mentor
  const fetchClasses = useCallback(() => {
    if (!isMentor || !isVerified) return;
    setLoadingClasses(true);
    mentorFlowApi.listClasses()
      .then(({ classes: list }) => setClasses(list))
      .catch((err) => showToast(err.message, 'error'))
      .finally(() => setLoadingClasses(false));
  }, [isMentor, isVerified, showToast]);

  useEffect(() => { fetchClasses(); }, [fetchClasses]);

  const handleVerified = async (updatedUser) => {
    await refreshUser();
    onUserUpdate(updatedUser);
    fetchClasses();
  };

  const handleCreateClass = async (data) => {
    const { class: newClass } = await mentorFlowApi.createClass(data);
    setClasses((prev) => [newClass, ...prev]);
    setShowCreate(false);
    showToast(`Class "${newClass.title}" created! 🎉`, 'success');
  };

  const handleArchiveClass = async (id) => {
    try {
      await mentorFlowApi.deleteClass(id);
      setClasses((prev) => prev.map((c) => c._id === id ? { ...c, status: 'archived' } : c));
      showToast('Class archived.', 'info');
    } catch (err) {
      showToast(err.message || 'Failed to archive class.', 'error');
    }
  };

  const handleCompleteClass = async (id, title) => {
    if (!window.confirm(`Are you sure you want to conclude and complete "${title}"? This will mark all enrolled students as course graduates.`)) {
      return;
    }
    try {
      await mentorFlowApi.completeClass(id);
      setClasses((prev) => prev.map((c) => c._id === id ? { ...c, status: 'completed' } : c));
      showToast(`Course "${title}" successfully marked as completed! 🎓`, 'success');
    } catch (err) {
      showToast(err.message || 'Failed to complete course.', 'error');
    }
  };

  return (
    <div className="mentor-dashboard">
      {/* Status banner */}
      <div className={`mentor-status-banner ${isMentor && isVerified ? 'verified' : isMentor && verificationStatus === 'pending' ? 'pending' : 'unstarted'}`}>
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
          {isMentor && isVerified ? 'verified' : verificationStatus === 'pending' ? 'hourglass_top' : 'school'}
        </span>
        <div>
          <strong>
            {isMentor && isVerified
              ? 'Verified Mentor'
              : verificationStatus === 'pending'
                ? 'Verification Pending Review'
                : 'Become a SkillXchange Mentor'}
          </strong>
          <span>
            {isMentor && isVerified
              ? ` · ${verificationStatus === 'test_bypass' ? 'Dev test bypass active' : 'Full access granted'}`
              : verificationStatus === 'pending'
                ? ' · Your credentials were submitted and are under review'
                : ' · Choose a verification method below to unlock your teaching privileges'}
          </span>
        </div>
      </div>

      {/* Verification panel — shown when not yet verified */}
      {!isVerified && (
        <VerificationPanel onVerified={handleVerified} showToast={showToast} />
      )}

      {/* Class management — shown when verified */}
      {isVerified && (
        <div className="class-management">
          <div className="class-management-header">
            <div>
              <h3 className="class-management-title">My Classes</h3>
              <p className="class-management-sub">
                {classes.filter(c => c.status === 'active').length} active ·{' '}
                {classes.filter(c => c.status === 'completed').length} completed ·{' '}
                {classes.filter(c => c.status === 'archived').length} archived
              </p>
            </div>
            <button id="create-class-btn" className="create-class-btn" onClick={() => setShowCreate(true)}>
              <span className="material-symbols-outlined">add_circle</span>
              New Class
            </button>
          </div>

          {loadingClasses ? (
            <div className="class-loading">
              {[1, 2].map((k) => <div key={k} className="class-card-skeleton" />)}
            </div>
          ) : classes.length === 0 ? (
            <div className="class-empty">
              <span className="material-symbols-outlined class-empty-icon">class</span>
              <p>No classes created yet. Click "+ New Class" to create your first session!</p>
            </div>
          ) : (
            <div className="class-list">
              {classes.map((c) => (
                <ClassCard
                  key={c._id}
                  cls={c}
                  onArchive={handleArchiveClass}
                  onComplete={handleCompleteClass}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create class modal */}
      {showCreate && (
        <CreateClassModal
          onSave={handleCreateClass}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────
export default function MentorsPage() {
  const { user: authUser, refreshUser } = useAuth();
  const location = useLocation();

  // Tab: 'browse' | 'dashboard'
  const [activeTab, setActiveTab] = useState(
    location.state?.openMentorFlow ? 'dashboard' : 'browse'
  );

  // Local copy of user so dashboard updates without full page reload
  const [localUser, setLocalUser] = useState(authUser);
  useEffect(() => { setLocalUser(authUser); }, [authUser]);

  // Browse tab state (existing)
  const [search,       setSearch]       = useState('');
  const [availability, setAvailability] = useState('');
  const [rating,       setRating]       = useState('');
  const [mentors,      setMentors]      = useState([]);
  const [trending,     setTrending]     = useState([]);
  const [totals,       setTotals]       = useState({ totalMentors: 0, totalSkills: 0 });
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');

  const [dialogTarget, setDialogTarget] = useState(null);
  const [toast,        setToast]        = useState(null);

  const gridRef = useAnimeStagger('.mentor-card');

  const showToast = useCallback((message, type = 'success') => setToast({ message, type }), []);

  const handleRequest = useCallback((mentor) => {
    setDialogTarget(mentor);
  }, []);

  const fetchMentors = useCallback(() => {
    setLoading(true);
    const params = {};
    if (search.trim())  params.search       = search.trim();
    if (availability)   params.availability = availability;
    if (rating)         params.rating       = rating;

    mentorsApi.list(params)
      .then(({ mentors: list, totalMentors, totalSkills }) => {
        // Exclude current logged in user from the mentors list
        const filtered = list.filter((m) => String(m._id) !== String(authUser?._id));
        setMentors(filtered);
        setTotals({ totalMentors, totalSkills });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [search, availability, rating, authUser?._id]);

  useEffect(() => {
    const timer = setTimeout(fetchMentors, 300);
    return () => clearTimeout(timer);
  }, [fetchMentors]);

  useEffect(() => {
    mentorsApi.trending()
      .then(({ trending: list }) => setTrending(list))
      .catch(() => {});
  }, []);

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">

        {/* ── Header ── */}
        <header className="mentors-header">
          <div className="mentors-header-inner">
            <div className="mentors-header-left">
              <h2 className="mentors-page-title">
                {activeTab === 'browse' ? 'Discover Mentors' : 'Mentor Dashboard'}
              </h2>
              <p className="mentors-page-sub">
                {activeTab === 'browse'
                  ? 'Connect with professionals who can help you reach your next milestone.'
                  : 'Manage your mentor profile, verification, and classes.'}
              </p>
            </div>
            <div className="mentors-stats">
              <div className="mentor-stat">
                <span className="mstat-val" style={{ color: 'var(--primary)' }}>
                  {loading ? '…' : totals.totalMentors.toLocaleString()}
                </span>
                <span className="mstat-label">Active Mentors</span>
              </div>
              <div className="mentor-stat">
                <span className="mstat-val" style={{ color: 'var(--secondary)' }}>
                  {loading ? '…' : totals.totalSkills}
                </span>
                <span className="mstat-label">Skills Available</span>
              </div>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="mentor-tabs-row">
            <div className="mentor-tabs">
              <button
                id="tab-browse"
                className={`mentor-tab ${activeTab === 'browse' ? 'active' : ''}`}
                onClick={() => setActiveTab('browse')}
              >
                <span className="material-symbols-outlined">explore</span>
                Browse Mentors
              </button>
              {localUser?.userRole === 'mentor' ? (
                <button
                  id="tab-dashboard"
                  className={`mentor-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
                  onClick={() => setActiveTab('dashboard')}
                >
                  <span className="material-symbols-outlined">dashboard</span>
                  Mentor Dashboard
                  <span className="tab-mentor-badge">MENTOR</span>
                </button>
              ) : (
                <button
                  id="tab-become-mentor"
                  className={`mentor-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
                  onClick={() => setActiveTab('dashboard')}
                >
                  <span className="material-symbols-outlined">school</span>
                  Become a Mentor
                </button>
              )}
            </div>
          </div>

          {/* Search & Filters (only on browse tab) */}
          {activeTab === 'browse' && (
            <div className="mentors-filters">
              <div className="search-bar">
                <span className="material-symbols-outlined search-icon">search</span>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search active mentors by skill or name (e.g. React, Python, UI Design)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') fetchMentors(); }}
                />
                {search && (
                  <button
                    className="search-clear-btn"
                    onClick={() => setSearch('')}
                    title="Clear search"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', padding: '0 8px' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                  </button>
                )}
              </div>
              <div className="filter-group">
                <div className="filter-select-wrap">
                  <select className="filter-select" value={availability} onChange={(e) => setAvailability(e.target.value)}>
                    <option value="">Availability</option>
                    <option>Immediate</option>
                    <option>Next Week</option>
                  </select>
                  <span className="material-symbols-outlined filter-arrow">expand_more</span>
                </div>
                <div className="filter-select-wrap">
                  <select className="filter-select" value={rating} onChange={(e) => setRating(e.target.value)}>
                    <option value="">Rating</option>
                    <option>4.5+ Stars</option>
                    <option>4.0+ Stars</option>
                  </select>
                  <span className="material-symbols-outlined filter-arrow">star</span>
                </div>
                <button
                  className="clear-btn"
                  onClick={() => {
                    setSearch('');
                    setAvailability('');
                    setRating('');
                  }}
                >
                  Clear All
                </button>
              </div>
            </div>
          )}
        </header>

        {/* ── Content ── */}
        <div className="mentors-body">
          {activeTab === 'browse' ? (
            /* ── Browse tab ── */
            <>
              <section className="mentors-feed">
                <div className="mentors-grid" ref={gridRef}>
                  {loading
                    ? [1, 2, 3, 4, 5, 6].map((k) => (
                      <div key={k} className="mentor-card" style={{ opacity: 0.4 }}>
                        <div className="mentor-accent-bar accent-primary" />
                        <div className="mentor-card-body">
                          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--surface-container-high)', margin: '0 auto 12px' }} />
                          <div style={{ width: 120, height: 14, borderRadius: 6, background: 'var(--surface-container-high)', margin: '0 auto 8px' }} />
                        </div>
                      </div>
                    ))
                    : mentors.map((m) => (
                      <MentorCard
                        key={m._id}
                        mentor={m}
                        isSelf={String(m._id) === String(authUser?._id)}
                        onRequest={handleRequest}
                      />
                    ))
                  }
                </div>
                {!loading && mentors.length === 0 && (
                  <div className="no-results" style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <span className="material-symbols-outlined no-results-icon" style={{ fontSize: 48, color: 'var(--on-surface-variant)', opacity: 0.5, marginBottom: 12 }}>
                      {search.trim() ? 'search_off' : 'school'}
                    </span>
                    {search.trim() ? (
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--on-surface)', marginBottom: 6 }}>
                          No mentors found for "{search.trim()}"
                        </p>
                        <p style={{ color: 'var(--on-surface-variant)', fontSize: 13 }}>
                          Try searching for another skill (e.g. Python, React, UX) or clearing your rating/availability filters.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--on-surface)', marginBottom: 6 }}>
                          No active mentors found
                        </p>
                        <p style={{ color: 'var(--on-surface-variant)', fontSize: 13 }}>
                          Please type in the search bar above to find mentors by skill, or clear your filters.
                        </p>
                      </div>
                    )}
                  </div>
                )}
                {!loading && mentors.length > 0 && (
                  <div className="load-more-row">
                    <p className="load-more-text">Showing {mentors.length} of {totals.totalMentors} mentors</p>
                    <button className="load-more-btn" onClick={fetchMentors}>Refresh Profiles</button>
                  </div>
                )}
                {error && <p style={{ color: 'var(--error)', padding: 16 }}>⚠ {error}</p>}
              </section>

              {/* Sidebar Widgets */}
              <aside className="mentors-sidebar">
                <div className="smart-match-widget">
                  <div className="sm-blob" />
                  <div className="sm-inner">
                    <div className="sm-header">
                      <div className="sm-icon-wrap animate-pulse">
                        <span className="material-symbols-outlined">auto_awesome</span>
                      </div>
                      <h4 className="sm-title">Smart Match</h4>
                    </div>
                    <p className="sm-desc">Finding your perfect match… Our AI is scanning {totals.totalMentors}+ profiles to find the best mentor for your current skill gap.</p>
                    <div className="sm-progress">
                      <div className="sm-prog-row">
                        <span>Scanning Experience</span>
                        <span>85%</span>
                      </div>
                      <div className="sm-prog-track">
                        <div className="sm-prog-fill" style={{ width: '85%' }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="trending-widget">
                  <h4 className="widget-title">Trending Skills</h4>
                  <div className="trending-list">
                    {trending.map(({ name, pct }) => (
                      <a key={name} href="#" className="trending-item">
                        <div className="trending-item-left">
                          <span className="trending-icon-wrap">
                            <span className="material-symbols-outlined">trending_up</span>
                          </span>
                          <span className="trending-name">{name}</span>
                        </div>
                        <span className="trending-pct">{pct}</span>
                      </a>
                    ))}
                  </div>
                </div>

                <div className="guild-widget">
                  <span className="guild-bg-icon material-symbols-outlined">groups</span>
                  <div className="guild-inner">
                    <h4 className="guild-title">Join the Guild</h4>
                    <p className="guild-desc">Participate in group mentorship sessions every Friday.</p>
                    <button className="guild-btn" onClick={() => showToast('Guild registration coming soon! 🎉', 'info')}>Learn more →</button>
                  </div>
                </div>
              </aside>
            </>
          ) : (
            /* ── Dashboard tab ── */
            <div className="mentor-dashboard-wrap">
              <MentorDashboard
                user={localUser}
                onUserUpdate={(u) => setLocalUser(u)}
                showToast={showToast}
              />
            </div>
          )}
        </div>

        <Footer />
      </div>
      <MobileNav />

      {/* Simplified 1-Click Mentor Request Modal */}
      {dialogTarget && (
        <MentorRequestModal
          mentor={dialogTarget}
          onClose={() => setDialogTarget(null)}
          onSuccess={(msg) => {
            showToast(msg, 'success');
            fetchMentors();
          }}
          onError={(msg) => showToast(msg, 'error')}
        />
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}

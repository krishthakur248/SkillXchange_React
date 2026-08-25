import { useState } from 'react';
import { learnTeachApi } from '../api';
import { useAuth } from '../context/AuthContext';
import './RequestDialog.css';

/**
 * RequestDialog — modal for sending a skill exchange request.
 *
 * Props:
 *   targetUser  { _id, name, initials, teaches: string[], wants: string[] }
 *   onClose     () => void
 *   onSuccess   (msg: string) => void
 *   onError     (msg: string) => void
 */
export default function RequestDialog({ targetUser, onClose, onSuccess, onError }) {
  const { user } = useAuth();

  const mySkills    = user?.teachingSkills?.map((s) => s.name) || [];
  const theirSkills = targetUser?.teaches || [];

  const [fromSkill, setFromSkill] = useState(mySkills[0]    || '');
  const [toSkill,   setToSkill]   = useState(theirSkills[0] || '');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo,   setCustomTo]   = useState('');
  const [loading,   setLoading]   = useState(false);

  const effectiveFrom = fromSkill === '__custom__' ? customFrom.trim() : fromSkill;
  const effectiveTo   = toSkill   === '__custom__' ? customTo.trim()   : toSkill;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!effectiveFrom || !effectiveTo) return;

    setLoading(true);
    try {
      await learnTeachApi.sendRequest({
        toUserId:  targetUser._id,
        fromSkill: effectiveFrom,
        toSkill:   effectiveTo,
      });
      onSuccess(`Request sent to ${targetUser.name}! 🎉`);
      onClose();
    } catch (err) {
      onError(err.message || 'Failed to send request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rd-backdrop" onClick={onClose}>
      <div className="rd-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="rd-header">
          <div className="rd-header-avatar">
            {targetUser.initials || targetUser.name?.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="rd-title">Request Skill Exchange</h3>
            <p className="rd-subtitle">with <strong>{targetUser.name}</strong></p>
          </div>
          <button className="rd-close" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Form */}
        <form className="rd-form" onSubmit={handleSubmit}>
          {/* What I offer */}
          <div className="rd-field">
            <label className="rd-label">
              <span className="material-symbols-outlined rd-label-icon" style={{ color: 'var(--primary)' }}>school</span>
              I will teach
            </label>
            <div className="rd-select-wrap">
              <select
                className="rd-select"
                value={fromSkill}
                onChange={(e) => setFromSkill(e.target.value)}
                required={fromSkill !== '__custom__'}
              >
                {mySkills.length === 0 && <option value="">— No skills added to profile yet —</option>}
                {mySkills.map((s) => <option key={s} value={s}>{s}</option>)}
                <option value="__custom__">✏️  Type a skill…</option>
              </select>
              <span className="material-symbols-outlined rd-select-arrow">expand_more</span>
            </div>
            {fromSkill === '__custom__' && (
              <input
                className="rd-text-input"
                type="text"
                placeholder="e.g. React, UX Design…"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                required
              />
            )}
          </div>

          {/* Exchange icon */}
          <div className="rd-exchange-icon">
            <span className="material-symbols-outlined">swap_vert</span>
          </div>

          {/* What I want */}
          <div className="rd-field">
            <label className="rd-label">
              <span className="material-symbols-outlined rd-label-icon" style={{ color: 'var(--secondary)' }}>psychology</span>
              I want to learn
            </label>
            <div className="rd-select-wrap">
              <select
                className="rd-select"
                value={toSkill}
                onChange={(e) => setToSkill(e.target.value)}
                required={toSkill !== '__custom__'}
              >
                {theirSkills.length === 0 && <option value="">— No skills listed —</option>}
                {theirSkills.map((s) => <option key={s} value={s}>{s}</option>)}
                <option value="__custom__">✏️  Type a skill…</option>
              </select>
              <span className="material-symbols-outlined rd-select-arrow">expand_more</span>
            </div>
            {toSkill === '__custom__' && (
              <input
                className="rd-text-input"
                type="text"
                placeholder="e.g. Node.js, Data Science…"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                required
              />
            )}
          </div>

          {/* Actions */}
          <div className="rd-actions">
            <button type="button" className="rd-cancel" onClick={onClose}>Cancel</button>
            <button
              type="submit"
              className="rd-submit"
              disabled={loading || !effectiveFrom || !effectiveTo}
            >
              {loading
                ? <><span className="rd-spinner" />Sending…</>
                : <><span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span>Send Request</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import MobileNav from '../components/MobileNav';
import Footer from '../components/Footer';
import RequestDialog from '../components/RequestDialog';
import Toast from '../components/Toast';
import { useAnimeStagger } from '../hooks/useAnime';
import { useAuth } from '../context/AuthContext';
import { homeApi } from '../api';
import './HomePage.css';

// ── Skeleton loaders ──
function SkeletonCard() {
  return (
    <div className="match-card" style={{ opacity: 0.5 }}>
      <div className="match-card-header">
        <div className="match-avatar" style={{ background: 'var(--surface-container-high)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ width: 100, height: 12, borderRadius: 4, background: 'var(--surface-container-high)' }} />
          <div style={{ width: 70, height: 10, borderRadius: 4, background: 'var(--surface-container)' }} />
        </div>
      </div>
    </div>
  );
}

function SkillBar({ name, pct = 0, color = 'primary', next, index = 0 }) {
  const [animatedWidth, setAnimatedWidth] = useState(0);
  const [displayPct, setDisplayPct] = useState(0);

  useEffect(() => {
    // Reset to 0 then animate to target pct
    setAnimatedWidth(0);
    setDisplayPct(0);

    const timer = setTimeout(() => {
      setAnimatedWidth(pct);
    }, 120 + index * 120);

    // Smooth percentage counter animation
    if (pct > 0) {
      let current = 0;
      const duration = 1100;
      const stepTime = 25;
      const stepIncrement = pct / (duration / stepTime);

      const counter = setInterval(() => {
        current += stepIncrement;
        if (current >= pct) {
          setDisplayPct(pct);
          clearInterval(counter);
        } else {
          setDisplayPct(Math.round(current));
        }
      }, stepTime);

      return () => {
        clearTimeout(timer);
        clearInterval(counter);
      };
    } else {
      setDisplayPct(0);
      return () => clearTimeout(timer);
    }
  }, [pct, index]);

  return (
    <div className="skill-bar-item">
      <div className="skill-bar-header">
        <span className="skill-bar-name">{name}</span>
        <span className={`skill-bar-pct pct-${color}`}>{displayPct}%</span>
      </div>
      <div className="skill-bar-track">
        <div
          className={`skill-bar-fill fill-${color}`}
          style={{
            width: `${animatedWidth}%`,
          }}
        >
          <div className="skill-bar-shimmer" />
        </div>
      </div>
      <p className="skill-bar-next">{next}</p>
    </div>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Request dialog state
  const [dialogTarget, setDialogTarget] = useState(null);
  const [toast, setToast] = useState(null); // { message, type }

  const cardsRef = useAnimeStagger('.match-card');
  const statsRef = useAnimeStagger('.stat-item');

  const loadHomeData = useCallback(() => {
    setLoading(true);
    homeApi.get()
      .then((d) => setData(d))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  const handleOpenRequest = useCallback((card) => {
    setDialogTarget({
      _id: card._id,
      name: card.name,
      initials: card.initials,
      teaches: card.teaches ? [card.teaches] : [],
      wants: card.wants ? [card.wants] : [],
    });
  }, []);

  const handleRSVP = () => {
    showToast('You\'re registered for the webinar! 📅', 'success');
  };

  const displayName = data?.user?.name || user?.name || 'there';
  const matchCards = data?.matchCards || [];
  const skills = data?.skills || [];
  const chats = data?.chats || [];
  const stats = data?.stats || {};
  const dailyProgress = data?.dailyProgress || { pct: 0, achieved: 0, total: 4 };
  const spotlight = data?.spotlight;

  const donutOffset = Math.round(175 - (175 * dailyProgress.pct) / 100);

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        {/* Top welcome area */}
        <section className="home-welcome">
          <div className="home-welcome-inner">
            <div>
              <h2 className="home-greeting">Welcome back, {displayName.split(' ')[0]}!</h2>
              <p className="home-subtext">Your intellectual exchange journey is flourishing. Ready for today's session?</p>
            </div>
            <div className="daily-progress-widget">
              <div className="donut-wrap">
                <svg className="progress-donut" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="28" fill="transparent" stroke="var(--surface-container-high)" strokeWidth="6" />
                  <circle
                    cx="32" cy="32" r="28" fill="transparent"
                    stroke="var(--primary)" strokeWidth="6"
                    strokeDasharray="175" strokeDashoffset={donutOffset}
                    style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
                  />
                </svg>
                <div className="progress-donut-label">{dailyProgress.pct}%</div>
              </div>
              <div className="daily-progress-text">
                <p className="dp-title">Daily Progress</p>
                <p className="dp-sub">{dailyProgress.achieved} of {dailyProgress.total} goals achieved</p>
              </div>
            </div>
          </div>
        </section>

        <div className="home-content">
          {/* ── Top Grid: Skill Mastery Progress & Active Conversations ── */}
          <div className="home-bottom-grid">
            {/* Skill Mastery Progress */}
            <section className="skill-mastery-card soft-shadow">
              <h3 className="card-title">
                <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>trending_up</span>
                Skill Mastery Progress
              </h3>
              <div className="skill-bars">
                {loading
                  ? [1, 2, 3].map((k) => (
                    <div key={k} className="skill-bar-item" style={{ opacity: 0.4 }}>
                      <div style={{ height: 10, borderRadius: 4, background: 'var(--surface-container-high)', marginBottom: 8 }} />
                      <div className="skill-bar-track"><div className="skill-bar-fill fill-primary" style={{ width: '40%' }} /></div>
                    </div>
                  ))
                  : skills.length === 0
                    ? <p style={{ color: 'var(--on-surface-variant)', fontSize: 14 }}>Add learning skills to your profile to track progress!</p>
                    : skills.map((s, idx) => (
                      <SkillBar
                        key={s.name}
                        index={idx}
                        name={s.name}
                        pct={s.pct ?? 25}
                        color={s.color || 'primary'}
                        next={s.next || `Milestone: Practice session in ${s.name}`}
                      />
                    ))
                }
              </div>
              <div className="stats-row" ref={statsRef}>
                <div className="stat-item">
                  <p className="stat-val" style={{ color: 'var(--primary)' }}>{loading ? '—' : stats.hoursLogged ?? 0}</p>
                  <p className="stat-label">Hours Logged</p>
                </div>
                <div className="stat-item">
                  <p className="stat-val" style={{ color: 'var(--secondary)' }}>{loading ? '—' : stats.liveSessions ?? 0}</p>
                  <p className="stat-label">Live Sessions</p>
                </div>
                <div className="stat-item">
                  <p className="stat-val" style={{ color: 'var(--primary)' }}>{loading ? '—' : stats.points ?? 0}</p>
                  <p className="stat-label">Points Earned</p>
                </div>
              </div>
            </section>

            {/* Active Conversations (Redirects to Chat) */}
            <section className="conversations-card soft-shadow">
              <h3 className="card-title">
                <span className="material-symbols-outlined" style={{ color: 'var(--secondary)' }}>chat_bubble</span>
                Active Conversations
              </h3>
              <div className="chat-list">
                {loading
                  ? <p style={{ color: 'var(--on-surface-variant)', fontSize: 14 }}>Loading…</p>
                  : chats.length === 0
                    ? <p style={{ color: 'var(--on-surface-variant)', fontSize: 14 }}>No active conversations yet. Accept a skill exchange to start chatting!</p>
                    : chats.map((ch) => (
                      <div
                        key={ch._id}
                        className={`chat-item ${ch.active ? 'chat-active' : ''}`}
                        onClick={() => navigate(ch.peerId ? `/chat?with=${ch.peerId}` : '/chat')}
                        style={{ cursor: 'pointer' }}
                        title="Click to open conversation"
                      >
                        {ch.avatar && (
                          <img
                            src={ch.avatar}
                            alt={ch.name}
                            className="chat-avatar-img"
                            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                          />
                        )}
                        <div className="chat-avatar" style={ch.avatar ? { display: 'none' } : {}}>
                          {ch.initials}
                        </div>
                        <div className="chat-body">
                          <div className="chat-row">
                            <span className="chat-name">{ch.name}</span>
                            <span className="chat-time">{ch.time}</span>
                          </div>
                          <p className="chat-preview">{ch.preview}</p>
                        </div>
                      </div>
                    ))
                }
              </div>
              <button className="join-chat-btn" onClick={() => navigate('/chat')}>
                Open Messages & Chat
              </button>
            </section>
          </div>

          {/* ── Middle: Match Cards (Excludes connected/pending peers) ── */}
          <section className="home-section">
            <div className="section-row-header">
              <h3 className="section-row-title">
                <span className="material-symbols-outlined" style={{ color: 'var(--secondary)' }}>swap_horiz</span>
                Perfect Reciprocal Matches
              </h3>
              <Link to="/mentors" className="view-all-link">View All</Link>
            </div>
            <div className="match-cards-scroll" ref={cardsRef}>
              {loading
                ? [1, 2, 3].map((k) => <SkeletonCard key={k} />)
                : matchCards.length === 0
                  ? <p style={{ color: 'var(--on-surface-variant)', fontSize: 14 }}>No matches yet — add skills to your profile or explore mentors!</p>
                  : matchCards.map((c) => (
                    <div key={c._id} className={`match-card border-accent-${c.accent || 'primary'}`}>
                      <div className="match-card-header">
                        {c.avatar ? (
                          <img
                            src={c.avatar}
                            alt={c.name}
                            className="match-avatar-img"
                            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                          />
                        ) : null}
                        <div className="match-avatar" style={c.avatar ? { display: 'none' } : {}}>{c.initials}</div>
                        <div>
                          <p className="match-name">{c.name}</p>
                          <p className="match-role">{c.role}</p>
                        </div>
                      </div>
                      <div className="match-skills">
                        <div className="match-skill-row teaches">
                          <p className="skill-label">Teaches</p>
                          <p className="skill-value">{c.teaches}</p>
                        </div>
                        <div className="match-skill-row wants">
                          <p className="skill-label wants-label">Wants to Learn</p>
                          <p className="skill-value">{c.wants}</p>
                        </div>
                      </div>
                      <div className="match-card-actions">
                        <Link to="/profile" className="view-profile-btn">View Profile</Link>
                        <button
                          className="match-btn"
                          onClick={() => handleOpenRequest(c)}
                        >
                          Request
                        </button>
                      </div>
                    </div>
                  ))
              }
            </div>
          </section>

          {/* ── Community Spotlight ── */}
          <section className="spotlight-section">
            <div className="spotlight-blob spotlight-blob-1" />
            <div className="spotlight-blob spotlight-blob-2" />
            <div className="spotlight-inner">
              <div className="spotlight-header">
                <span className="material-symbols-outlined">local_fire_department</span>
                <h3 className="spotlight-title">Community Spotlight</h3>
              </div>
              {loading
                ? <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Loading spotlight…</p>
                : (
                  <div className="spotlight-grid">
                    {/* Trending skills */}
                    <div className="spotlight-card">
                      <p className="spotlight-label">Rising This Week</p>
                      {((spotlight?.trendingSkills?.length ? spotlight.trendingSkills : [
                        { name: 'Rust & Systems Design', pct: '+48%' },
                        { name: 'Figma Design Tokens', pct: '+34%' },
                        { name: 'Python Data Pipelines', pct: '+26%' },
                        { name: 'Full-Stack Next.js 15', pct: '+21%' },
                      ])).map(({ name, pct }) => (
                        <div key={name} className="trending-row">
                          <span>{name}</span>
                          <span className="trending-badge">{pct}</span>
                        </div>
                      ))}
                    </div>
                    {/* Webinar */}
                    <div className="spotlight-card">
                      <p className="spotlight-label">Upcoming Webinar</p>
                      <h4 className="webinar-title">{spotlight?.upcomingWebinar?.title || 'Reciprocal Learning: Scaling Skills Faster with Peer Swaps'}</h4>
                      <p className="webinar-date">
                        <span className="material-symbols-outlined">calendar_today</span>
                        {spotlight?.upcomingWebinar?.date || 'Thursday, 6:00 PM (IST)'}
                      </p>
                      <button className="rsvp-btn" onClick={handleRSVP}>RSVP Now</button>
                    </div>
                    {/* Success Story */}
                    <div className="spotlight-card">
                      <p className="spotlight-label">Success Story</p>
                      <p className="success-quote">{spotlight?.successStory?.quote || '"I traded React tips for deep-dives into Rust & Distributed Systems. We launched our open-source project within 3 weeks!"'}</p>
                      <div className="success-author">
                        <div className="success-avatar">
                          {spotlight?.successStory?.author?.slice(0, 2).toUpperCase() || 'DC'}
                        </div>
                        <span>{spotlight?.successStory?.author || 'David Chen'}, {spotlight?.successStory?.role || 'Full Stack Architect'}</span>
                      </div>
                    </div>
                  </div>
                )
              }
            </div>
          </section>

          {error && (
            <p style={{ color: 'var(--error)', textAlign: 'center', padding: '16px' }}>
              ⚠ {error} — Make sure the backend is running.
            </p>
          )}
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
            loadHomeData();
          }}
          onError={(msg) => showToast(msg, 'error')}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}

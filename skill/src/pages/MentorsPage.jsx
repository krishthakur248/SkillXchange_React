import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import MobileNav from '../components/MobileNav';
import Footer from '../components/Footer';
import RequestDialog from '../components/RequestDialog';
import Toast from '../components/Toast';
import { useAnimeStagger } from '../hooks/useAnime';
import { mentorsApi } from '../api';
import './MentorsPage.css';

function StarRating({ rating }) {
  return (
    <div className="star-rating">
      <span className="material-symbols-outlined star-icon" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
      <span className="rating-val">{rating.toFixed(1)}</span>
    </div>
  );
}

function MentorCard({ mentor, onRequest }) {
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
        <div className="mentor-skills">
          {mentor.skills.map((s) => (
            <span key={s} className="mentor-skill-chip">{s}</span>
          ))}
        </div>
      </div>
      <div className="mentor-card-footer">
        <Link to="/profile" className="view-profile-btn">View Profile</Link>
        <button className="request-btn" onClick={() => onRequest(mentor)}>Request</button>
      </div>
    </div>
  );
}

export default function MentorsPage() {
  const [search,       setSearch]       = useState('');
  const [availability, setAvailability] = useState('');
  const [rating,       setRating]       = useState('');
  const [mentors,      setMentors]      = useState([]);
  const [trending,     setTrending]     = useState([]);
  const [totals,       setTotals]       = useState({ totalMentors: 0, totalSkills: 0 });
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');

  // Request dialog state
  const [dialogTarget, setDialogTarget] = useState(null);
  const [toast, setToast] = useState(null);

  const gridRef = useAnimeStagger('.mentor-card');

  const showToast = useCallback((message, type = 'success') => setToast({ message, type }), []);

  const handleRequest = useCallback((mentor) => {
    setDialogTarget({
      _id:      mentor._id,
      name:     mentor.name,
      initials: mentor.initials,
      teaches:  mentor.skills || [],
      wants:    [],
    });
  }, []);

  // Debounced fetch
  const fetchMentors = useCallback(() => {
    setLoading(true);
    const params = {};
    if (search.trim())  params.search       = search.trim();
    if (availability)   params.availability = availability;
    if (rating)         params.rating       = rating;

    mentorsApi.list(params)
      .then(({ mentors: list, totalMentors, totalSkills }) => {
        setMentors(list);
        setTotals({ totalMentors, totalSkills });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [search, availability, rating]);

  useEffect(() => {
    const timer = setTimeout(fetchMentors, 300);
    return () => clearTimeout(timer);
  }, [fetchMentors]);

  // Fetch trending once
  useEffect(() => {
    mentorsApi.trending()
      .then(({ trending: list }) => setTrending(list))
      .catch(() => {});
  }, []);

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        {/* Header */}
        <header className="mentors-header">
          <div className="mentors-header-inner">
            <div className="mentors-header-left">
              <h2 className="mentors-page-title">Discover Mentors</h2>
              <p className="mentors-page-sub">Connect with professionals who can help you reach your next milestone.</p>
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

          {/* Search & Filters */}
          <div className="mentors-filters">
            <div className="search-bar">
              <span className="material-symbols-outlined search-icon">search</span>
              <input
                type="text"
                className="search-input"
                placeholder="Search by skill (e.g. Python, UX Design)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
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
              <button className="clear-btn" onClick={() => { setSearch(''); setAvailability(''); setRating(''); }}>
                Clear All
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="mentors-body">
          {/* Main Feed */}
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
                : mentors.map((m) => <MentorCard key={m._id} mentor={m} onRequest={handleRequest} />)
              }
            </div>
            {!loading && mentors.length === 0 && (
              <div className="no-results">
                <span className="material-symbols-outlined no-results-icon">search_off</span>
                <p>No mentors found for "{search}"</p>
              </div>
            )}
            {!loading && (
              <div className="load-more-row">
                <p className="load-more-text">Showing {mentors.length} of {totals.totalMentors} mentors</p>
                <button className="load-more-btn" onClick={fetchMentors}>View More Profiles</button>
              </div>
            )}
            {error && <p style={{ color: 'var(--error)', padding: 16 }}>⚠ {error}</p>}
          </section>

          {/* Sidebar Widgets */}
          <aside className="mentors-sidebar">
            {/* Smart Match */}
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

            {/* Trending Skills */}
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

            {/* Community Promo */}
            <div className="guild-widget">
              <span className="guild-bg-icon material-symbols-outlined">groups</span>
              <div className="guild-inner">
                <h4 className="guild-title">Join the Guild</h4>
                <p className="guild-desc">Participate in group mentorship sessions every Friday.</p>
                <button className="guild-btn" onClick={() => showToast('Guild registration coming soon! 🎉', 'info')}>Learn more →</button>
              </div>
            </div>
          </aside>
        </div>

        <Footer />
      </div>
      <MobileNav />

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

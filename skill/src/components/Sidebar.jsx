import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const navItems = [
  { to: '/home',           icon: 'home',            label: 'Home' },
  { to: '/progress',       icon: 'insights',        label: 'Progress' },
  { to: '/learn-teach',    icon: 'group',           label: 'Learn and Teach' },
  { to: '/mentors',        icon: 'search',          label: 'Mentors' },
  { to: '/chat',           icon: 'chat',            label: 'Messages' },
  { to: '/video-sessions', icon: 'videocam',        label: 'Video Sessions' },
  { to: '/profile',        icon: 'person_edit',     label: 'Profile' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
        </div>
        <div>
          <h1 className="sidebar-title">SkillXchange</h1>
          <p className="sidebar-subtitle">Empowering Growth</p>
        </div>
      </div>

      {/* User info */}
      {user && (
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{user.initials || '??'}</div>
          <div className="sidebar-user-info">
            <p className="sidebar-user-name">{user.name}</p>
            <p className="sidebar-user-badge">{user.userRole === 'mentor' ? 'MENTOR' : (user.badge || 'LEARNER')}</p>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="sidebar-nav">
        {navItems.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 0" }}
            >{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="sidebar-bottom">
        <button type="button" className="sidebar-link">
          <span className="material-symbols-outlined">settings</span>
          <span>Settings</span>
        </button>
        <button type="button" className="sidebar-link">
          <span className="material-symbols-outlined">help</span>
          <span>Support</span>
        </button>
        <button type="button" className="sidebar-link sidebar-logout" onClick={handleLogout}>
          <span className="material-symbols-outlined">logout</span>
          <span>Log Out</span>
        </button>
        <NavLink to="/learn-teach" className="sidebar-cta">
          Start Exchange
        </NavLink>
      </div>
    </aside>
  );
}

import { NavLink } from 'react-router-dom';
import './MobileNav.css';

const navItems = [
  { to: '/home',           icon: 'home',     label: 'Home' },
  { to: '/learn-teach',    icon: 'group',    label: 'Exchange' },
  { to: '/chat',           icon: 'chat',     label: 'Chat' },
  { to: '/video-sessions', icon: 'videocam', label: 'Video' },
  { to: '/mentors',        icon: 'search',   label: 'Mentors' },
  { to: '/progress',       icon: 'insights', label: 'Progress' },
  { to: '/profile',        icon: 'person_edit', label: 'Profile' },
];

export default function MobileNav() {
  return (
    <nav className="mobile-nav">
      {navItems.map(({ to, icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}
        >
          <span className="material-symbols-outlined">{icon}</span>
          <span className="mobile-nav-label">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

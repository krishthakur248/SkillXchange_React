import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage       from './pages/LandingPage';
import LoginPage         from './pages/LoginPage';
import HomePage          from './pages/HomePage';
import LearnTeachPage    from './pages/LearnTeachPage';
import MentorsPage       from './pages/MentorsPage';
import ProgressPage      from './pages/ProgressPage';
import ProfilePage       from './pages/ProfilePage';
import ChatPage          from './pages/ChatPage';
import VideoSessionsPage from './pages/VideoSessionsPage';

/** Redirects unauthenticated users to /login */
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'var(--background)',
        color: 'var(--on-surface-variant)', fontFamily: 'var(--font-body)',
        flexDirection: 'column', gap: '12px',
      }}>
        <span className="material-symbols-outlined animate-pulse" style={{ fontSize: 40, color: 'var(--primary)' }}>
          school
        </span>
        <span style={{ fontSize: '0.875rem' }}>Loading SkillXchange…</span>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
}

/** Redirects already-logged-in users away from login page */
function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/home" replace /> : children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/"       element={<LandingPage />} />
      <Route path="/login"  element={<PublicRoute><LoginPage /></PublicRoute>} />

      {/* Protected */}
      <Route path="/home"           element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
      <Route path="/learn-teach"    element={<ProtectedRoute><LearnTeachPage /></ProtectedRoute>} />
      <Route path="/mentors"        element={<ProtectedRoute><MentorsPage /></ProtectedRoute>} />
      <Route path="/progress"       element={<ProtectedRoute><ProgressPage /></ProtectedRoute>} />
      <Route path="/profile"        element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/chat"           element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
      <Route path="/video-sessions" element={<ProtectedRoute><VideoSessionsPage /></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

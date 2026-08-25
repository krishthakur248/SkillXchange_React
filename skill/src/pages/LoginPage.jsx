import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [mode,     setMode]     = useState('login'); // 'login' | 'register'
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        if (!name.trim()) { setError('Please enter your full name.'); setLoading(false); return; }
        await register(name.trim(), email, password);
      }
      navigate('/home');
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
    setName('');
    setEmail('');
    setPassword('');
  };

  return (
    <div className="login-page">
      {/* Animated background */}
      <div className="login-grid" />
      <div className="login-bg-orb login-bg-orb-1" />
      <div className="login-bg-orb login-bg-orb-2" />
      <div className="login-bg-orb login-bg-orb-3" />

      <div className="login-card-wrap">
        <div className="login-card">
          {/* Brand */}
          <div className="login-brand">
            <div className="login-brand-icon">
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: "'FILL' 1", color: '#fff', fontSize: 20 }}
              >
                school
              </span>
            </div>
            <span className="login-brand-name">SkillXchange</span>
          </div>

          {/* Tab toggle */}
          <div className="login-tabs" role="tablist">
            <button
              role="tab"
              className={`login-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => switchMode('login')}
            >
              Sign In
            </button>
            <button
              role="tab"
              className={`login-tab ${mode === 'register' ? 'active' : ''}`}
              onClick={() => switchMode('register')}
            >
              Create Account
            </button>
          </div>

          {/* Headings */}
          <h1 className="login-heading">
            {mode === 'login' ? 'Welcome back' : 'Join the community'}
          </h1>
          <p className="login-sub">
            {mode === 'login'
              ? 'Sign in to continue your skill exchange journey.'
              : 'Start trading skills with hundreds of peers today.'}
          </p>

          {/* Error */}
          {error && (
            <div className="login-error" role="alert">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>error</span>
              {error}
            </div>
          )}

          {/* Form */}
          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {/* Name — register only */}
            {mode === 'register' && (
              <div className="login-field">
                <label className="login-label" htmlFor="login-name">Full Name</label>
                <div className="login-input-wrap">
                  <span className="material-symbols-outlined login-input-icon">person</span>
                  <input
                    id="login-name"
                    className="login-input"
                    type="text"
                    placeholder="Alex Rivera"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    required
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div className="login-field">
              <label className="login-label" htmlFor="login-email">Email Address</label>
              <div className="login-input-wrap">
                <span className="material-symbols-outlined login-input-icon">mail</span>
                <input
                  id="login-email"
                  className="login-input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="login-field">
              <label className="login-label" htmlFor="login-password">Password</label>
              <div className="login-input-wrap">
                <span className="material-symbols-outlined login-input-icon">lock</span>
                <input
                  id="login-password"
                  className="login-input"
                  type="password"
                  placeholder={mode === 'register' ? 'Minimum 6 characters' : '••••••••'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  minLength={6}
                  required
                />
              </div>
            </div>

            {/* Submit */}
            <button
              id="login-submit-btn"
              type="submit"
              className="login-submit-btn"
              disabled={loading}
            >
              {loading && <span className="login-spinner" />}
              {loading
                ? (mode === 'login' ? 'Signing in…' : 'Creating account…')
                : (mode === 'login' ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          {/* Demo tip */}
          <div className="login-demo-tip">
            <strong>Demo credentials:</strong><br />
            alex@skillxchange.io · password123
          </div>
        </div>
      </div>
    </div>
  );
}

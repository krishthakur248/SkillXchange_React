import { Link } from 'react-router-dom';
import './LandingPage.css';

const navigation = ['Home', 'Features', 'How It Works', 'Stories', 'Join Us'];

export default function LandingPage() {
  return (
    <div className="landing-page">
      <div className="lp-hero">
        <video
          className="lp-hero-video"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
        >
          <source src="/BackGround.mp4" type="video/mp4" />
        </video>

        <header className="lp-header">
          <Link to="/" className="lp-brand">
            SkillXchange
          </Link>

          <nav className="lp-nav">
            {navigation.map((item) => (
              <Link
                key={item}
                to={item === 'Home' ? '/home' : '#'}
                className={`lp-nav-item ${item === 'Home' ? 'active' : ''}`}
              >
                {item}
              </Link>
            ))}
          </nav>

          <Link to="/login" className="lp-glass-btn lp-glass-btn--nav">
            Get Started
          </Link>
        </header>

        <main className="lp-main">
          <h1 className="lp-title lp-animate-1">
            Where <em>learning becomes</em>{' '}
            <em>reciprocal and real.</em>
          </h1>

          <p className="lp-description lp-animate-2">
            SkillXchange connects learners with mentors through mutual, peer-to-peer mentoring. Break barriers to quality education and accelerate your growth in an accessible, flexible, and community-driven platform.
          </p>

          <Link to="/login" className="lp-glass-btn lp-glass-btn--cta lp-animate-3">
            Join the Community
          </Link>
        </main>
      </div>
    </div>
  );
}

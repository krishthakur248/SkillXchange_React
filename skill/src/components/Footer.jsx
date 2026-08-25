import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-brand">
        <h4 className="footer-title">SkillXchange</h4>
        <p className="footer-copy">© 2024 SkillXchange. Collaborative Growth.</p>
      </div>
      <div className="footer-links">
        <Link to="/" className="footer-link">Privacy Policy</Link>
        <Link to="/" className="footer-link">Terms of Service</Link>
        <Link to="/" className="footer-link">Community Guidelines</Link>
        <Link to="/" className="footer-link">Contact Us</Link>
      </div>
    </footer>
  );
}

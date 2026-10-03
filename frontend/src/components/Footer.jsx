import { Link } from 'react-router-dom';
import Logo from './Logo';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="foot-in">
        <div>
          <Logo light />
          <p>Making public transportation smarter and easier.</p>
        </div>
        <div><h4>Quick Links</h4>
          <Link to="/">Home</Link><Link to="/about">About</Link><Link to="/services">Services</Link>
          <Link to="/routes">Routes</Link><Link to="/live">Live Tracking</Link>
        </div>
        <div><h4>Support</h4>
          <Link to="/faq">FAQ</Link><Link to="/contact">Contact Support</Link>
        </div>
        <div><h4>Legal</h4>
          <Link to="/privacy">Privacy Policy</Link><Link to="/terms">Terms &amp; Conditions</Link>
          <h4 className="mt">Follow us</h4>
          <div className="social"><a href="https://facebook.com" target="_blank" rel="noreferrer">Facebook</a><a href="https://instagram.com" target="_blank" rel="noreferrer">Instagram</a><a href="https://x.com" target="_blank" rel="noreferrer">X</a><a href="https://linkedin.com" target="_blank" rel="noreferrer">LinkedIn</a></div>
        </div>
      </div>
      <p className="copy">© 2026 MoveSmart. All rights reserved.</p>
    </footer>
  );
}

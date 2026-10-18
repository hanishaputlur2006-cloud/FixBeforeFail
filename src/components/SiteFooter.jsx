import { Link } from 'react-router-dom'
import Logo from './Logo.jsx'
import './SiteFooter.css'

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container site-footer-inner">
        <div className="site-footer-brand">
          <Logo onDark />
          <p>Report problems before they become failures.</p>
        </div>

        <nav className="site-footer-links" aria-label="Footer">
          <div>
            <h4>Platform</h4>
            <a href="/#how-it-works">How it works</a>
            <a href="/#scoring">Risk scoring</a>
            <a href="/#roles">Who it's for</a>
          </div>
          <div>
            <h4>Get started</h4>
            <Link to="/report">Report an issue</Link>
            <Link to="/register">Create an account</Link>
            <Link to="/login">Log in</Link>
          </div>
        </nav>
      </div>

      <div className="container site-footer-bottom">
        <span>&copy; {new Date().getFullYear()} FixBeforeFail</span>
        <span>Rule-based, explainable risk scoring</span>
      </div>
    </footer>
  )
}

import { Link } from 'react-router-dom'
import Logo from './Logo.jsx'
import { useAuth } from '../lib/auth.jsx'
import ThemeToggle from './ThemeToggle.jsx'
import './SiteHeader.css'

// Top bar for public pages (landing, login, register).
export default function SiteHeader() {
  const { session } = useAuth()

  return (
    <header className="site-header">
      <div className="container site-header-inner">
        <Link to="/" aria-label="FixBeforeFail home">
          <Logo onDark />
        </Link>

        <nav className="site-nav" aria-label="Main">
          <a href="/#how-it-works">How it works</a>
          <a href="/#scoring">Risk scoring</a>
          <a href="/#roles">Who it's for</a>
        </nav>

        <div className="site-header-actions">
          <ThemeToggle onDark />
          {session ? (
            <Link to="/app" className="btn btn-text-light">
              Dashboard
            </Link>
          ) : (
            <Link to="/login" className="btn btn-text-light">
              Log in
            </Link>
          )}
          <Link to="/report" className="btn btn-primary">
            Report an issue
          </Link>
        </div>
      </div>
    </header>
  )
}

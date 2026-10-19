import { Navigate, useLocation } from 'react-router-dom'
import { CircleAlert, LogOut, RotateCcw } from 'lucide-react'
import { useAuth } from '../lib/auth.jsx'
import { LoadingState } from './StateViews.jsx'
import Logo from './Logo.jsx'
import '../pages/PlaceholderPage.css'

// Wraps pages that need a signed-in user. Visitors are sent to /login,
// and come back to the page they wanted after logging in.
export default function RequireAuth({ children }) {
  const { session, profile, loading, profileError, signOut } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingState label="Loading your account" />
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />

  // Signed in, but the profile (name and role) is missing or unreadable.
  // Always offer a way out so the user is never stuck.
  if (!profile) {
    return (
      <main className="placeholder">
        <div className="placeholder-card">
          <Logo />
          <span className="placeholder-icon">
            <CircleAlert size={20} strokeWidth={1.75} />
          </span>
          <h1>Account setup incomplete</h1>
          <p>
            {profileError} Please contact the administrator. You are signed in as{' '}
            <strong>{session.user.email}</strong>.
          </p>
          <div className="placeholder-actions">
            <button type="button" className="btn btn-secondary" onClick={() => window.location.reload()}>
              <RotateCcw size={16} />
              Try again
            </button>
            <button type="button" className="btn btn-primary" onClick={signOut}>
              <LogOut size={16} />
              Log out
            </button>
          </div>
        </div>
      </main>
    )
  }

  return children
}

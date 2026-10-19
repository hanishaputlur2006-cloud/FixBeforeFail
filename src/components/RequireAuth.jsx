import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { ErrorState, LoadingState } from './StateViews.jsx'

// Wraps pages that need a signed-in user. Visitors are sent to /login,
// and come back to the page they wanted after logging in.
export default function RequireAuth({ children }) {
  const { session, profile, loading, profileError } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingState label="Loading your account" />
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (!profile) {
    return (
      <ErrorState
        message={
          profileError
            ? `Your profile could not be loaded: ${profileError}`
            : 'Your account has no profile yet. Has the database setup script been run?'
        }
        onRetry={() => window.location.reload()}
      />
    )
  }

  return children
}

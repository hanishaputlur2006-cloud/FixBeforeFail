import { Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { useAuth } from '../lib/auth.jsx'
import { EmptyState } from './StateViews.jsx'

// Shows a page only to the listed roles. The database still enforces what data
// each role can read; this just keeps menus and pages tidy for everyone else.
export default function RoleGate({ roles, children }) {
  const { profile } = useAuth()
  if (roles.includes(profile.role)) return children
  return (
    <div className="card">
      <EmptyState
        icon={ShieldCheck}
        title="This page is not available for your account"
        message="It is only available to authority or maintenance staff."
        action={
          <Link to="/app" className="btn btn-secondary">
            Back to dashboard
          </Link>
        }
      />
    </div>
  )
}

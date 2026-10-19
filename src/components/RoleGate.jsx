import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'

// Shows a page only to the listed roles; anyone else is taken to their own dashboard.
// (This happens, for example, when someone logs in after being sent away from a staff page.)
// The database still enforces what data each role can read.
export default function RoleGate({ roles, children }) {
  const { profile } = useAuth()
  if (roles.includes(profile.role)) return children
  return <Navigate to="/app" replace />
}

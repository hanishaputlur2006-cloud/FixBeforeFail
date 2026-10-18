import { useDevRole } from '../../lib/devRole.jsx'
import AuthorityDashboard from './AuthorityDashboard.jsx'
import CitizenDashboard from './CitizenDashboard.jsx'
import WorkerDashboard from './WorkerDashboard.jsx'
import './app.css'

// /app shows a different dashboard depending on who is signed in.
export default function DashboardPage() {
  const { role } = useDevRole()

  if (role === 'citizen') return <CitizenDashboard />
  if (role === 'worker') return <WorkerDashboard />
  return <AuthorityDashboard />
}

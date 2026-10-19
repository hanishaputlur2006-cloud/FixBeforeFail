import { useAuth } from '../../lib/auth.jsx'
import { fetchReports } from '../../lib/reportsApi.js'
import { useAsync } from '../../lib/useAsync.js'
import { ErrorState, LoadingState } from '../../components/StateViews.jsx'
import AuthorityDashboard from './AuthorityDashboard.jsx'
import CitizenDashboard from './CitizenDashboard.jsx'
import WorkerDashboard from './WorkerDashboard.jsx'
import './app.css'

// /app loads the reports this user may see (the database enforces that),
// then shows the dashboard for their role.
export default function DashboardPage() {
  const { profile } = useAuth()
  const { data: reports, loading, error, reload } = useAsync(fetchReports, [])

  if (loading) return <LoadingState label="Loading reports" />
  if (error) return <ErrorState message={error.message} onRetry={reload} />

  if (profile.role === 'citizen') return <CitizenDashboard reports={reports} profile={profile} />
  if (profile.role === 'worker') return <WorkerDashboard reports={reports} profile={profile} />
  return <AuthorityDashboard reports={reports} />
}

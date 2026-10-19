import { useAuth } from '../../lib/auth.jsx'
import { fetchMySupports, fetchReports } from '../../lib/reportsApi.js'
import { useAsync } from '../../lib/useAsync.js'
import { ErrorState } from '../../components/StateViews.jsx'
import { DashboardSkeleton } from '../../components/Skeletons.jsx'
import AuthorityDashboard from './AuthorityDashboard.jsx'
import CitizenDashboard from './CitizenDashboard.jsx'
import WorkerDashboard from './WorkerDashboard.jsx'
import './app.css'

// /app loads the reports this user may see (the database enforces that),
// then shows the dashboard for their role.
export default function DashboardPage() {
  const { profile } = useAuth()
  const { data: reports, loading, error, reload } = useAsync(fetchReports, [])
  // Citizens also need the reports they confirmed, to list the problems they follow.
  const { data: supports } = useAsync(
    () => (profile.role === 'citizen' ? fetchMySupports() : Promise.resolve(new Set())),
    [profile.role],
  )

  if (loading && !reports) return <DashboardSkeleton />
  if (error && !reports) return <ErrorState message={error.message} onRetry={reload} />

  if (profile.role === 'citizen') return <CitizenDashboard reports={reports} profile={profile} supports={supports ?? new Set()} />
  if (profile.role === 'worker') return <WorkerDashboard reports={reports} profile={profile} />
  return <AuthorityDashboard reports={reports} />
}

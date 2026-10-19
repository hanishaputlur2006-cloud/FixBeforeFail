import { fetchReports } from '../../lib/reportsApi.js'
import { useAsync } from '../../lib/useAsync.js'
import { ErrorState } from '../../components/StateViews.jsx'
import { DashboardSkeleton } from '../../components/Skeletons.jsx'
import AuthorityDashboard from './AuthorityDashboard.jsx'
import './app.css'

// Every report in the area, for citizens: the same ranked list authorities use,
// without any of the authority actions. Reporters' names stay private.
export default function AllReportsPage() {
  const { data: reports, loading, error, reload } = useAsync(fetchReports, [])

  if (loading && !reports) return <DashboardSkeleton />
  if (error && !reports) return <ErrorState message={error.message} onRetry={reload} />

  return (
    <AuthorityDashboard
      reports={reports}
      title="All reports"
      description="Every problem reported in your area, ranked by risk. Open one to follow its repair or confirm it."
    />
  )
}

import { Link, useLocation, useParams } from 'react-router-dom'
import { ArrowLeft, CircleCheck, FileQuestion, ImageOff, MapPin, Merge } from 'lucide-react'
import ScoreBreakdown from '../../components/ScoreBreakdown.jsx'
import StatusTimeline from '../../components/StatusTimeline.jsx'
import { EmptyState } from '../../components/StateViews.jsx'
import { PriorityBadge, StatusBadge } from '../../components/Badges.jsx'
import { CATEGORIES, LOCATION_TYPES } from '../../lib/reportMeta.js'
import { getPriority, isOverdue } from '../../lib/reportUtils.js'
import { formatDate } from '../../lib/format.js'
import { fetchReportByRef } from '../../lib/reportsApi.js'
import { useAsync } from '../../lib/useAsync.js'
import { ErrorState, LoadingState } from '../../components/StateViews.jsx'
import PrivatePhoto from '../../components/PrivatePhoto.jsx'
import { useAuth } from '../../lib/auth.jsx'
import DuplicatesPanel from './DuplicatesPanel.jsx'
import ReportActions from './ReportActions.jsx'
import './app.css'

export default function ReportDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  const { profile } = useAuth()
  const { data: report, loading, error, reload } = useAsync(() => fetchReportByRef(id), [id])

  const backLink = (
    <Link to="/app" className="back-link">
      <ArrowLeft size={16} />
      Back to dashboard
    </Link>
  )

  // While refreshing after an action, keep showing the current report.
  if (loading && !report) return <LoadingState label="Loading report" />
  if (error && !report) return <ErrorState message={error.message} onRetry={reload} />

  if (!report) {
    return (
      <>
        {backLink}
        <div className="card">
          <EmptyState
            icon={FileQuestion}
            title="Report not found"
            message={`There is no report ${id}, or you do not have access to it.`}
          />
        </div>
      </>
    )
  }

  const level = getPriority(report.score)

  return (
    <>
      {backLink}

      {location.state?.justCreated && (
        <div className="notice-success" role="status">
          <CircleCheck size={18} />
          <span>
            Report submitted. It has been scored and sent to the authorities for review. You can follow its progress here.
          </span>
        </div>
      )}

      {report.mergedInto && (
        <div className="notice-info" role="status">
          <Merge size={18} />
          <span>
            This report was merged into <Link to={`/app/reports/${report.mergedInto}`}>{report.mergedInto}</Link>, which
            describes the same problem. Follow that report to see the repair progress.
          </span>
        </div>
      )}

      <header className="detail-header">
        <div className="detail-tags">
          <span className="detail-id mono">{report.id}</span>
          <PriorityBadge level={level} />
          <StatusBadge status={report.status} />
          {isOverdue(report) && <span className="rt-overdue detail-overdue">Overdue</span>}
        </div>
        <h1>{report.title}</h1>
        <p className="detail-loc">
          <MapPin size={16} strokeWidth={1.75} />
          {report.location}
        </p>
      </header>

      <div className="detail-grid">
        <div className="detail-main">
          <section className="card detail-card">
            <h2>Details</h2>
            <p className="detail-desc">{report.description}</p>
            <dl className="detail-facts">
              <div>
                <dt>Category</dt>
                <dd>{CATEGORIES[report.category]}</dd>
              </div>
              <div>
                <dt>Type of place</dt>
                <dd>{LOCATION_TYPES[report.locationType] ?? 'Not specified'}</dd>
              </div>
              <div>
                <dt>Coordinates</dt>
                <dd className="mono">
                  {report.latitude != null ? `${report.latitude.toFixed(5)}, ${report.longitude.toFixed(5)}` : 'Not provided'}
                </dd>
              </div>
              <div>
                <dt>Reported by</dt>
                <dd>{report.reporter?.name ?? 'Citizen'}</dd>
              </div>
              <div>
                <dt>Reported on</dt>
                <dd>{formatDate(report.reportedAt)}</dd>
              </div>
              <div>
                <dt>Assigned to</dt>
                <dd>{report.assignee?.name ?? 'Not yet assigned'}</dd>
              </div>
              <div>
                <dt>Related reports</dt>
                <dd>
                  {report.duplicates > 1
                    ? `${report.duplicates - 1} duplicate ${report.duplicates === 2 ? 'report' : 'reports'} merged into this one`
                    : 'None'}
                </dd>
              </div>
            </dl>
          </section>

          <section className="card detail-card">
            <h2>Photo</h2>
            {report.photoPath ? (
              <PrivatePhoto path={report.photoPath} alt="Photo submitted with the report" className="detail-photo" />
            ) : (
              <EmptyState icon={ImageOff} title="No photo" message="This report was submitted without a photo." />
            )}
          </section>

          <section className="card detail-card">
            <h2>Status history</h2>
            <StatusTimeline history={report.history} />
          </section>
        </div>

        <aside className="detail-side">
          <ReportActions report={report} onChanged={reload} />

          <div className="card detail-card detail-score">
            <ScoreBreakdown score={report.score} factors={report.factors} adjustment={report.adjustment} />
            <p className="detail-score-note">
              Rule-based score from six weighted factors. Missing details receive a neutral score and are marked as not
              provided. <Link to="/#scoring">How scoring works</Link>
            </p>
          </div>

          {profile.role === 'authority' && !report.duplicateOf && report.status !== 'resolved' && report.status !== 'closed' && (
            <DuplicatesPanel report={report} onMerged={reload} />
          )}
        </aside>
      </div>
    </>
  )
}

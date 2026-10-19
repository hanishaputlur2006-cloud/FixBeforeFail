import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, FileQuestion, ImageOff, MapPin } from 'lucide-react'
import ScoreBreakdown from '../../components/ScoreBreakdown.jsx'
import StatusTimeline from '../../components/StatusTimeline.jsx'
import { EmptyState } from '../../components/StateViews.jsx'
import { PriorityBadge, StatusBadge } from '../../components/Badges.jsx'
import { CATEGORIES } from '../../lib/reportMeta.js'
import { getPriority, isOverdue } from '../../lib/reportUtils.js'
import { formatDate } from '../../lib/format.js'
import { fetchReportByRef } from '../../lib/reportsApi.js'
import { useAsync } from '../../lib/useAsync.js'
import { ErrorState, LoadingState } from '../../components/StateViews.jsx'
import './app.css'

export default function ReportDetailPage() {
  const { id } = useParams()
  const { data: report, loading, error, reload } = useAsync(() => fetchReportByRef(id), [id])

  const backLink = (
    <Link to="/app" className="back-link">
      <ArrowLeft size={16} />
      Back to dashboard
    </Link>
  )

  if (loading) return <LoadingState label="Loading report" />
  if (error) return <ErrorState message={error.message} onRetry={reload} />

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
                <dd>{report.duplicates > 1 ? `${report.duplicates} reports merged into this issue` : 'None'}</dd>
              </div>
            </dl>
          </section>

          <section className="card detail-card">
            <h2>Photos</h2>
            <EmptyState icon={ImageOff} title="No photos yet" message="Report photos and repair evidence will appear here once uploads are available." />
          </section>

          <section className="card detail-card">
            <h2>Status history</h2>
            <StatusTimeline history={report.history} />
          </section>
        </div>

        <aside className="card detail-card detail-score">
          <ScoreBreakdown score={report.score} factors={report.factors} />
          <p className="detail-score-note">
            Rule-based score from six weighted factors. Missing details receive a neutral score and are marked as not
            provided.
          </p>
        </aside>
      </div>
    </>
  )
}

import { Link } from 'react-router-dom'
import { MapPin, Plus } from 'lucide-react'
import PageHeader from '../../components/PageHeader.jsx'
import StatCard from '../../components/StatCard.jsx'
import { EmptyState } from '../../components/StateViews.jsx'
import { PriorityBadge, StatusBadge } from '../../components/Badges.jsx'
import { STATUS_ORDER } from '../../lib/reportMeta.js'
import { getPriority, isOpen } from '../../lib/reportUtils.js'
import { formatDate } from '../../lib/format.js'
import { useDevRole } from '../../lib/devRole.jsx'
import { SAMPLE_REPORTS } from '../../lib/sampleData.js'

export default function CitizenDashboard() {
  const { user } = useDevRole()
  const mine = SAMPLE_REPORTS.filter((r) => r.reporter.id === user.id).sort(
    (a, b) => new Date(b.reportedAt) - new Date(a.reportedAt),
  )

  const newReportButton = (
    <Link to="/app/new-report" className="btn btn-primary">
      <Plus size={16} />
      New report
    </Link>
  )

  return (
    <>
      <PageHeader
        title="My reports"
        description="Track the issues you have reported and see how repairs are progressing."
        actions={newReportButton}
      />

      <div className="stat-grid stat-grid-3">
        <StatCard label="Submitted" value={mine.length} />
        <StatCard label="In progress" value={mine.filter(isOpen).length} />
        <StatCard label="Resolved" value={mine.filter((r) => !isOpen(r)).length} />
      </div>

      {mine.length === 0 ? (
        <div className="card">
          <EmptyState
            title="You have not reported anything yet"
            message="Spotted a broken streetlight, a pothole or a leaking pipe? Report it and track the repair here."
            action={newReportButton}
          />
        </div>
      ) : (
        <ul className="report-cards">
          {mine.map((r) => {
            const step = STATUS_ORDER.indexOf(r.status) + 1
            return (
              <li key={r.id}>
                <Link to={`/app/reports/${r.id}`} className="card report-card">
                  <div className="report-card-top">
                    <span className="report-card-id mono">{r.id}</span>
                    <PriorityBadge level={getPriority(r.score)} />
                  </div>
                  <h3>{r.title}</h3>
                  <p className="report-card-loc">
                    <MapPin size={14} strokeWidth={1.75} />
                    {r.location}
                  </p>

                  <div className="progress" aria-label={`Step ${step} of ${STATUS_ORDER.length}`}>
                    {STATUS_ORDER.map((s, i) => (
                      <span key={s} className={i < step ? 'is-done' : undefined} />
                    ))}
                  </div>

                  <div className="report-card-foot">
                    <StatusBadge status={r.status} />
                    <span className="report-card-date">Reported {formatDate(r.reportedAt)}</span>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}

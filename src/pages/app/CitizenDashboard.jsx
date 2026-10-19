import { Link } from 'react-router-dom'
import { MapPin, Plus } from 'lucide-react'
import PageHeader from '../../components/PageHeader.jsx'
import StatCard from '../../components/StatCard.jsx'
import { EmptyState } from '../../components/StateViews.jsx'
import { PriorityBadge, StatusBadge } from '../../components/Badges.jsx'
import { STATUS_ORDER } from '../../lib/reportMeta.js'
import { getPriority, isOpen } from '../../lib/reportUtils.js'
import { formatDate } from '../../lib/format.js'

function ReportCard({ report: r, following }) {
  const step = STATUS_ORDER.indexOf(r.status) + 1
  return (
    <li>
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

        {r.mergedInto && <p className="report-card-merged">Merged into {r.mergedInto}, which tracks the repair</p>}

        <div className="report-card-foot">
          <StatusBadge status={r.status} />
          <span className="report-card-date">
            {following ? `${r.duplicates + r.confirmations} reports` : `Reported ${formatDate(r.reportedAt)}`}
          </span>
        </div>
      </Link>
    </li>
  )
}

export default function CitizenDashboard({ reports, profile }) {
  // Newest first (the list already arrives in that order).
  const mine = reports.filter((r) => r.reporter?.id === profile.id)
  // Other people's reports a citizen can see: ones they confirmed, or that their report was merged into.
  const following = reports.filter((r) => r.reporter?.id !== profile.id)

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
          {mine.map((r) => (
            <ReportCard key={r.id} report={r} />
          ))}
        </ul>
      )}

      {following.length > 0 && (
        <>
          <h2 className="section-title">Problems you are following</h2>
          <p className="section-sub">Reports by others that you confirmed, or that your report was merged into.</p>
          <ul className="report-cards">
            {following.map((r) => (
              <ReportCard key={r.id} report={r} following />
            ))}
          </ul>
        </>
      )}
    </>
  )
}

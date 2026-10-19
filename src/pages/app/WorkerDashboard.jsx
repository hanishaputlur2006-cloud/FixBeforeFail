import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, MapPin } from 'lucide-react'
import PageHeader from '../../components/PageHeader.jsx'
import { EmptyState } from '../../components/StateViews.jsx'
import { PriorityBadge, ScoreValue, StatusBadge } from '../../components/Badges.jsx'
import { CATEGORIES } from '../../lib/reportMeta.js'
import { ageInDays, getPriority, isOverdue, sortByRisk } from '../../lib/reportUtils.js'
import { formatAge } from '../../lib/format.js'

const TABS = {
  active: { label: 'Active', statuses: ['assigned', 'under_repair'] },
  completed: { label: 'Completed', statuses: ['resolved', 'closed'] },
}

export default function WorkerDashboard({ reports, profile }) {
  const [tab, setTab] = useState('active')

  const assigned = reports.filter((r) => r.assignee?.id === profile.id)
  const counts = Object.fromEntries(
    Object.entries(TABS).map(([key, t]) => [key, assigned.filter((r) => t.statuses.includes(r.status)).length]),
  )
  const visible = sortByRisk(assigned.filter((r) => TABS[tab].statuses.includes(r.status)))

  return (
    <>
      <PageHeader title="My assignments" description="Repairs assigned to you, highest risk first." />

      <div className="segmented tabs" role="tablist" aria-label="Assignment status">
        {Object.entries(TABS).map(([key, t]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={tab === key ? 'is-active' : undefined}
            onClick={() => setTab(key)}
          >
            {t.label} <span className="tab-count mono">{counts[key]}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={ClipboardList}
            title={tab === 'active' ? 'No active assignments' : 'No completed work yet'}
            message={
              tab === 'active'
                ? 'New repairs will appear here when an authority assigns them to you.'
                : 'Repairs you finish will be listed here.'
            }
          />
        </div>
      ) : (
        <ul className="job-list">
          {visible.map((r) => {
            const level = getPriority(r.score)
            return (
              <li key={r.id}>
                <Link to={`/app/reports/${r.id}`} className={`card job ${level === 'critical' ? 'is-critical' : ''}`}>
                  <div className="job-score">
                    <ScoreValue score={r.score} level={level} size="lg" />
                    <PriorityBadge level={level} />
                  </div>
                  <div className="job-main">
                    <span className="job-id mono">
                      {r.id} &middot; {CATEGORIES[r.category]}
                    </span>
                    <h3>{r.title}</h3>
                    <p className="job-loc">
                      <MapPin size={14} strokeWidth={1.75} />
                      {r.location}
                    </p>
                  </div>
                  <div className="job-meta">
                    <StatusBadge status={r.status} />
                    <span className="job-age">Reported {formatAge(ageInDays(r))}</span>
                    {isOverdue(r) && <span className="rt-overdue">Overdue</span>}
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

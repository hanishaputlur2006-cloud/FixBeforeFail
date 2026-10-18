import { Link, useNavigate } from 'react-router-dom'
import { PriorityBadge, ScoreValue, StatusBadge } from './Badges.jsx'
import { CATEGORIES } from '../lib/reportMeta.js'
import { ageInDays, getPriority, isOverdue } from '../lib/reportUtils.js'
import { formatAge } from '../lib/format.js'
import './ReportsTable.css'

// The main list of reports used on dashboards. Rows open the report details page.
// showAssignee adds an "Assigned to" column (useful for authorities).
export default function ReportsTable({ reports, showAssignee = false }) {
  const navigate = useNavigate()

  return (
    <div className="rt-wrap">
      <table className="rt">
        <thead>
          <tr>
            <th>Score</th>
            <th>Issue</th>
            <th className="rt-hide-lg">Category</th>
            <th>Priority</th>
            <th className="rt-hide-sm">Status</th>
            {showAssignee && <th className="rt-hide-md">Assigned to</th>}
            <th className="rt-hide-md">Reported</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((r) => {
            const level = getPriority(r.score)
            const overdue = isOverdue(r)
            return (
              <tr
                key={r.id}
                className={level === 'critical' ? 'is-critical' : undefined}
                onClick={() => navigate(`/app/reports/${r.id}`)}
              >
                <td>
                  <ScoreValue score={r.score} level={level} />
                </td>
                <td className="rt-issue">
                  <Link to={`/app/reports/${r.id}`} className="rt-title" onClick={(e) => e.stopPropagation()}>
                    {r.title}
                  </Link>
                  <div className="rt-sub">
                    <span className="mono">{r.id}</span> &middot; {r.location}
                  </div>
                </td>
                <td className="rt-hide-lg rt-muted">{CATEGORIES[r.category]}</td>
                <td>
                  <PriorityBadge level={level} />
                </td>
                <td className="rt-hide-sm">
                  <StatusBadge status={r.status} />
                </td>
                {showAssignee && (
                  <td className="rt-hide-md rt-muted">{r.assignee?.name ?? <span className="rt-none">Unassigned</span>}</td>
                )}
                <td className="rt-hide-md">
                  <span className="rt-muted">{formatAge(ageInDays(r))}</span>
                  {overdue && <span className="rt-overdue">Overdue</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

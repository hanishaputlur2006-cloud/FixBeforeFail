import { PriorityBadge, StatusBadge, ScoreValue } from '../../components/Badges.jsx'
import ScoreBreakdown from '../../components/ScoreBreakdown.jsx'

// A static preview of the authority dashboard for the landing page.
// Clearly labelled as sample data: these are not real reports.
const SAMPLE_REPORTS = [
  {
    id: 'FBF-1042',
    title: 'Water main leak',
    place: 'Station Road, near primary school',
    category: 'Water supply',
    score: 86,
    priority: 'critical',
    status: 'verified',
  },
  {
    id: 'FBF-1039',
    title: 'Pothole cluster at junction',
    place: 'Ring Road and 4th Cross',
    category: 'Roads',
    score: 72,
    priority: 'high',
    status: 'assigned',
  },
  {
    id: 'FBF-1031',
    title: 'Streetlight outage, 6 poles',
    place: 'Park Lane',
    category: 'Streetlights',
    score: 46,
    priority: 'medium',
    status: 'under_repair',
  },
  {
    id: 'FBF-1027',
    title: 'Damaged public bench',
    place: 'Central Library forecourt',
    category: 'Public facilities',
    score: 21,
    priority: 'low',
    status: 'reported',
  },
]

// Points per factor for FBF-1042. The maximums are the default weights (sum = 100).
const SAMPLE_BREAKDOWN = [
  { label: 'Severity', points: 22, max: 25, note: 'Reported as major' },
  { label: 'Safety impact', points: 18, max: 20, note: 'Pedestrian and traffic risk' },
  { label: 'Public impact', points: 17, max: 20, note: 'Affects supply to nearby homes' },
  { label: 'Repeat reports', points: 12, max: 15, note: '4 reports, merged into one issue' },
  { label: 'Location importance', points: 9, max: 10, note: 'School zone' },
  { label: 'Time unresolved', points: 8, max: 10, note: 'Open for 6 days' },
]

export default function ProductPreview() {
  return (
    <div className="preview" aria-label="Sample dashboard preview">
      <div className="preview-bar">
        <div className="preview-bar-title">
          <h3>Priority queue</h3>
          <span className="preview-sample-tag mono">Sample data</span>
        </div>
        <div className="preview-filters">
          <span>All categories</span>
          <span>Unresolved</span>
          <span>Sorted by risk</span>
        </div>
      </div>

      <div className="preview-body">
        <div className="preview-table-wrap">
          <table className="pq-table">
            <thead>
              <tr>
                <th>Score</th>
                <th>Issue</th>
                <th className="pq-hide-sm">Category</th>
                <th>Priority</th>
                <th className="pq-hide-sm">Status</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE_REPORTS.map((r) => (
                <tr key={r.id} className={r.priority === 'critical' ? 'is-critical' : undefined}>
                  <td>
                    <ScoreValue score={r.score} level={r.priority} />
                  </td>
                  <td>
                    <div className="pq-title">{r.title}</div>
                    <div className="pq-sub mono">
                      {r.id} &middot; {r.place}
                    </div>
                  </td>
                  <td className="pq-hide-sm pq-muted">{r.category}</td>
                  <td>
                    <PriorityBadge level={r.priority} />
                  </td>
                  <td className="pq-hide-sm">
                    <StatusBadge status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="preview-breakdown">
          <ScoreBreakdown score={86} factors={SAMPLE_BREAKDOWN} reportId="FBF-1042" />
        </aside>
      </div>
    </div>
  )
}

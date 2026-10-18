import { PriorityBadge, ScoreValue } from './Badges.jsx'
import { getPriority } from '../lib/reportUtils.js'
import './ScoreBreakdown.css'

// Shows a report's total score and how much each factor contributed.
// factors: [{ label, points, max, note }]
export default function ScoreBreakdown({ score, factors, reportId }) {
  const level = getPriority(score)

  return (
    <div className="breakdown">
      <div className="breakdown-head">
        <span className="breakdown-label">Score breakdown</span>
        {reportId && <span className="breakdown-id mono">{reportId}</span>}
      </div>

      <div className="breakdown-total">
        <ScoreValue score={score} level={level} size="lg" />
        <span className="breakdown-of mono">/100</span>
        <PriorityBadge level={level} />
      </div>

      <ul className="breakdown-list">
        {factors.map((f) => (
          <li key={f.label}>
            <div className="breakdown-row">
              <span>{f.label}</span>
              <span className="mono">
                {f.points}
                <span className="breakdown-max">/{f.max}</span>
              </span>
            </div>
            <div className="breakdown-track">
              <div className="breakdown-fill" style={{ width: `${(f.points / f.max) * 100}%` }} />
            </div>
            {f.note && <div className="breakdown-note">{f.note}</div>}
          </li>
        ))}
      </ul>
    </div>
  )
}

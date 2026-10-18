import './ui.css'

// A single headline number, e.g. "Unresolved: 9".
// tone="critical" highlights numbers that need attention.
export default function StatCard({ label, value, hint, tone }) {
  return (
    <div className={`card stat-card ${tone ? `stat-card-${tone}` : ''}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value mono">{value}</span>
      {hint && <span className="stat-hint">{hint}</span>}
    </div>
  )
}

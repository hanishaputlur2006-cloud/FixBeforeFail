import { fetchPublicStats } from '../../lib/reportsApi.js'
import { useAsync } from '../../lib/useAsync.js'

const number = new Intl.NumberFormat('en-IN')

// Live totals from the database, shown to everyone on the landing page.
// Only totals are public; no report, location or person can be identified.
export default function LiveStats() {
  const { data: stats, loading, error } = useAsync(fetchPublicStats, [])

  // If the statistics cannot be loaded, the section is simply left out.
  if (error) return null

  const items = stats && [
    { label: 'Problems reported', value: number.format(stats.reports) },
    { label: 'Repairs completed', value: number.format(stats.repaired) },
    { label: 'Average repair time', value: stats.avg_repair_days == null ? 'Not yet' : `${stats.avg_repair_days} days` },
    { label: 'Citizen satisfaction', value: stats.avg_rating == null ? 'Not yet' : `${stats.avg_rating} / 5` },
  ]

  return (
    <section className="live-stats" aria-label="Live platform statistics">
      <div className="container">
        <p className="live-label mono">
          <span className="live-dot" aria-hidden="true" />
          Live from the platform
        </p>
        <dl className="live-grid">
          {(items ?? [0, 1, 2, 3]).map((item, i) => (
            <div key={item.label ?? i}>
              <dt>{loading ? <span className="skeleton" style={{ width: 120, height: 12 }} /> : item.label}</dt>
              <dd className="mono">{loading ? <span className="skeleton" style={{ width: 70, height: 28 }} /> : item.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

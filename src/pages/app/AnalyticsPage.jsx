import { useMemo } from 'react'
import { MapPin } from 'lucide-react'
import PageHeader from '../../components/PageHeader.jsx'
import StatCard from '../../components/StatCard.jsx'
import { PriorityBadge } from '../../components/Badges.jsx'
import { BarList, GroupedColumns, SERIES } from '../../components/Charts.jsx'
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews.jsx'
import { PRIORITY_ORDER, STATUS } from '../../lib/reportMeta.js'
import { fetchRatings, fetchReports } from '../../lib/reportsApi.js'
import { useAsync } from '../../lib/useAsync.js'
import { computeAnalytics } from '../../lib/analytics.js'
import './app.css'
import './analytics.css'

const weekLabel = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })

export default function AnalyticsPage() {
  const { data: reports, loading, error, reload } = useAsync(fetchReports, [])
  const { data: ratings } = useAsync(fetchRatings, [])
  const a = useMemo(() => (reports ? computeAnalytics(reports) : null), [reports])

  if (loading && !reports) return <LoadingState label="Loading analytics" />
  if (error && !reports) return <ErrorState message={error.message} onRetry={reload} />

  const header = <PageHeader title="Analytics" description="Trends across all reported issues. Merged duplicates count toward their original issue." />

  if (a.totals.issues === 0) {
    return (
      <>
        {header}
        <div className="card">
          <EmptyState title="No data yet" message="Analytics will appear once citizens start submitting reports." />
        </div>
      </>
    )
  }

  const avg = a.totals.avgRepairDays
  const weekly = a.weekly.map((w) => ({
    key: w.start,
    label: weekLabel.format(new Date(w.start)),
    values: { reported: w.reported, resolved: w.resolved },
  }))

  return (
    <>
      {header}

      <div className="stat-grid stat-grid-4">
        <StatCard label="Open issues" value={a.totals.open} hint={`of ${a.totals.issues} total`} />
        <StatCard label="Overdue" value={a.totals.overdue} hint="Past target time" tone={a.totals.overdue ? 'critical' : undefined} />
        <StatCard
          label="Average repair time"
          value={avg == null ? 'None yet' : `${avg < 10 ? avg.toFixed(1) : Math.round(avg)} d`}
          hint={`${a.totals.resolvedLast30} repaired in the last 30 days`}
        />
        <StatCard
          label="Citizen satisfaction"
          value={ratings?.length ? `${(ratings.reduce((s, x) => s + x, 0) / ratings.length).toFixed(1)} / 5` : 'No ratings'}
          hint={ratings?.length ? `From ${ratings.length} ${ratings.length === 1 ? 'rating' : 'ratings'}` : 'Citizens rate closed repairs'}
        />
      </div>

      <section className="card analytics-card">
        <h2>Open issues by priority</h2>
        <div className="priority-tiles">
          {PRIORITY_ORDER.map((p) => (
            <div key={p} className={`priority-tile ${p === 'critical' && a.byPriority[p] ? 'is-critical' : ''}`}>
              <PriorityBadge level={p} />
              <span className="priority-tile-value mono">{a.byPriority[p]}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="analytics-grid">
        <section className="card analytics-card">
          <h2>Open issues by category</h2>
          <BarList items={a.byCategory} />
        </section>

        <section className="card analytics-card">
          <h2>Issues at each stage</h2>
          <BarList items={a.byStatus.map((s) => ({ key: s.key, label: STATUS[s.key].label, value: s.value }))} />
        </section>
      </div>

      <section className="card analytics-card">
        <h2>Reported and repaired per week</h2>
        <p className="analytics-sub">Last 12 weeks. Reported counts every submission, including duplicates.</p>
        <GroupedColumns
          groups={weekly}
          series={[
            { key: 'reported', label: 'Reported', color: SERIES.primary },
            { key: 'resolved', label: 'Repaired', color: SERIES.secondary },
          ]}
        />
      </section>

      <section className="card analytics-card">
        <h2>Hotspots</h2>
        <p className="analytics-sub">Places with repeated reports. Frequent problems in one place may need a permanent fix.</p>
        {a.hotspots.length === 0 ? (
          <p className="analytics-empty">No place has more than one report yet.</p>
        ) : (
          <ul className="hotspots">
            {a.hotspots.map((h) => (
              <li key={h.place}>
                <MapPin size={16} strokeWidth={1.75} />
                <span className="hotspot-place">{h.place}</span>
                <span className="hotspot-count mono">{h.reports} reports</span>
                <span className="hotspot-open">{h.open ? `${h.open} open` : 'All resolved'}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

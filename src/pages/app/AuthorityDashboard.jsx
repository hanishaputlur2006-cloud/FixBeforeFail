import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Repeat, Search, TriangleAlert } from 'lucide-react'
import PageHeader from '../../components/PageHeader.jsx'
import StatCard from '../../components/StatCard.jsx'
import ReportsTable from '../../components/ReportsTable.jsx'
import { EmptyState } from '../../components/StateViews.jsx'
import { ScoreValue } from '../../components/Badges.jsx'
import { CATEGORIES, PRIORITY, PRIORITY_ORDER, STATUS, STATUS_ORDER, TARGET_DAYS } from '../../lib/reportMeta.js'
import { ageInDays, getPriority, isOpen, isOverdue, sortByRisk } from '../../lib/reportUtils.js'

const DEFAULT_FILTERS = { search: '', category: 'all', priority: 'all', status: 'open' }

// Also used as the citizens' "All reports" page, with a different title.
export default function AuthorityDashboard({
  reports: allReports,
  title = 'Overview',
  description = 'Every reported issue in your area, ranked by risk.',
}) {
  // Merged duplicates are counted on their original report, so list each issue once.
  const reports = useMemo(() => allReports.filter((r) => !r.duplicateOf), [allReports])
  const [filters, setFilters] = useState(DEFAULT_FILTERS)

  function updateFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  // Headline numbers.
  const stats = useMemo(
    () => ({
      total: reports.length,
      open: reports.filter(isOpen).length,
      active: reports.filter((r) => r.status === 'assigned' || r.status === 'under_repair').length,
      resolved: reports.filter((r) => !isOpen(r)).length,
      overdue: reports.filter(isOverdue).length,
    }),
    [reports],
  )

  // Apply the search box and dropdowns, then rank by risk.
  const visible = useMemo(() => {
    const term = filters.search.trim().toLowerCase()
    const matches = reports.filter((r) => {
      if (term && !`${r.id} ${r.title} ${r.location}`.toLowerCase().includes(term)) return false
      if (filters.category !== 'all' && r.category !== filters.category) return false
      if (filters.priority !== 'all' && getPriority(r.score) !== filters.priority) return false
      if (filters.status === 'open' && !isOpen(r)) return false
      if (filters.status !== 'open' && filters.status !== 'all' && r.status !== filters.status) return false
      return true
    })
    return sortByRisk(matches)
  }, [reports, filters])

  const overdue = sortByRisk(reports.filter(isOverdue))
  const recurring = sortByRisk(reports.filter((r) => isOpen(r) && r.duplicates >= 3))

  return (
    <>
      <PageHeader title={title} description={description} />

      <div className="stat-grid">
        <StatCard label="Total reports" value={stats.total} />
        <StatCard label="Unresolved" value={stats.open} />
        <StatCard label="Active repairs" value={stats.active} hint="Assigned or under repair" />
        <StatCard label="Resolved" value={stats.resolved} />
        <StatCard label="Overdue" value={stats.overdue} hint="Past target time" tone={stats.overdue ? 'critical' : undefined} />
      </div>

      <div className="dash-grid">
        <section className="card dash-queue" aria-label="Priority queue">
          <div className="toolbar">
            <label className="search">
              <Search size={16} aria-hidden="true" />
              <span className="sr-only">Search reports</span>
              <input
                className="input"
                type="search"
                placeholder="Search by ID, issue or location"
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
              />
            </label>

            <select className="input" aria-label="Category" value={filters.category} onChange={(e) => updateFilter('category', e.target.value)}>
              <option value="all">All categories</option>
              {Object.entries(CATEGORIES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>

            <select className="input" aria-label="Priority" value={filters.priority} onChange={(e) => updateFilter('priority', e.target.value)}>
              <option value="all">All priorities</option>
              {PRIORITY_ORDER.map((key) => (
                <option key={key} value={key}>
                  {PRIORITY[key].label}
                </option>
              ))}
            </select>

            <select className="input" aria-label="Status" value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}>
              <option value="open">Unresolved</option>
              <option value="all">All statuses</option>
              {STATUS_ORDER.map((key) => (
                <option key={key} value={key}>
                  {STATUS[key].label}
                </option>
              ))}
            </select>
          </div>

          {visible.length > 0 ? (
            <ReportsTable reports={visible} showAssignee />
          ) : (
            <EmptyState
              title={reports.length === 0 ? 'No reports yet' : 'No reports match these filters'}
              message={
                reports.length === 0
                  ? 'Reports submitted by citizens will appear here, ranked by risk.'
                  : 'Try a different search term or widen the filters.'
              }
              action={
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFilters(DEFAULT_FILTERS)}>
                  Clear filters
                </button>
              }
            />
          )}

          <div className="dash-queue-foot">
            Showing {visible.length} of {reports.length} reports, sorted by risk score
          </div>
        </section>

        <aside className="dash-side">
          <section className="card side-card">
            <h2 className="side-title">
              <TriangleAlert size={16} strokeWidth={2} className="side-icon-critical" />
              Overdue
            </h2>
            <p className="side-desc">Unresolved past their target time.</p>
            {overdue.length ? (
              <ul className="side-list">
                {overdue.map((r) => {
                  const level = getPriority(r.score)
                  const daysOver = ageInDays(r) - TARGET_DAYS[level]
                  return (
                    <li key={r.id}>
                      <Link to={`/app/reports/${r.id}`} className="side-item">
                        <ScoreValue score={r.score} level={level} />
                        <span className="side-item-text">
                          <span className="side-item-title">{r.title}</span>
                          <span className="side-item-sub">
                            {daysOver} {daysOver === 1 ? 'day' : 'days'} over the {TARGET_DAYS[level]}-day target
                          </span>
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="side-empty">Nothing overdue.</p>
            )}
          </section>

          <section className="card side-card">
            <h2 className="side-title">
              <Repeat size={16} strokeWidth={2} />
              Recurring
            </h2>
            <p className="side-desc">Open issues reported 3 or more times.</p>
            {recurring.length ? (
              <ul className="side-list">
                {recurring.map((r) => (
                  <li key={r.id}>
                    <Link to={`/app/reports/${r.id}`} className="side-item">
                      <ScoreValue score={r.score} level={getPriority(r.score)} />
                      <span className="side-item-text">
                        <span className="side-item-title">{r.title}</span>
                        <span className="side-item-sub">
                          {r.duplicates} reports &middot; {r.location}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="side-empty">No recurring issues.</p>
            )}
          </section>
        </aside>
      </div>
    </>
  )
}

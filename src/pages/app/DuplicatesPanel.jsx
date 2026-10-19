import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LoaderCircle, Merge } from 'lucide-react'
import { ScoreValue } from '../../components/Badges.jsx'
import { fetchReports, mergeReport } from '../../lib/reportsApi.js'
import { getPriority } from '../../lib/reportUtils.js'
import { formatDate } from '../../lib/format.js'
import { useAsync } from '../../lib/useAsync.js'
import { findPossibleDuplicates } from '../../scoring/duplicates.js'

// Authority-only panel on the report details page: suggests reports that may
// describe the same problem and lets the authority merge this report into one.
export default function DuplicatesPanel({ report, onMerged }) {
  const { data: all, loading, error } = useAsync(fetchReports, [])
  const [merging, setMerging] = useState(null)
  const [mergeError, setMergeError] = useState('')

  if (loading || error) return null

  const suggestions = findPossibleDuplicates(report, all)
  const hasMergedChildren = report.duplicates > 1

  async function handleMerge(target) {
    const ok = window.confirm(
      `Merge ${report.id} into ${target.id}?\n\n${report.id} will be closed as a duplicate and ${target.id} will count it as a repeat report.`,
    )
    if (!ok) return
    setMerging(target.uuid)
    setMergeError('')
    try {
      await mergeReport(report, target)
      onMerged()
    } catch (err) {
      setMergeError(err.message)
      setMerging(null)
    }
  }

  return (
    <section className="card detail-card dup-card">
      <h2>Possible duplicates</h2>
      <p className="dup-desc">
        {suggestions.length
          ? 'Open reports in the same category at a nearby or similar location.'
          : 'No similar open reports found nearby.'}
      </p>

      {suggestions.length > 0 && (
        <ul className="dup-list">
          {suggestions.map(({ report: c, reason }) => (
            <li key={c.uuid}>
              <div>
                <ScoreValue score={c.score} level={getPriority(c.score)} />{' '}
                <Link to={`/app/reports/${c.id}`} className="dup-title">
                  {c.title}
                </Link>
              </div>
              <span className="dup-meta">
                {c.id} &middot; {reason} &middot; Reported {formatDate(c.reportedAt)}
              </span>
              {!hasMergedChildren && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleMerge(c)}
                  disabled={merging !== null}
                >
                  {merging === c.uuid ? <LoaderCircle size={14} className="spin" /> : <Merge size={14} />}
                  Merge this report into {c.id}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {hasMergedChildren && suggestions.length > 0 && (
        <p className="dup-desc">Other reports are already merged into this one. To combine, open a report above and merge it into this one.</p>
      )}
      {mergeError && <p className="field-error">{mergeError}</p>}
    </section>
  )
}

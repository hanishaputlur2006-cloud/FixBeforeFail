import { STATUS } from '../lib/reportMeta.js'
import { formatDateTime } from '../lib/format.js'
import './StatusTimeline.css'

// The audit trail of a report: every status change, newest first.
// history: [{ status, at, by, remark }]
export default function StatusTimeline({ history }) {
  const entries = [...history].reverse()

  return (
    <ol className="timeline">
      {entries.map((entry, i) => (
        <li key={`${entry.status}-${entry.at}`} className={i === 0 ? 'is-current' : undefined}>
          <span className="timeline-marker" aria-hidden="true" />
          <div className="timeline-body">
            <div className="timeline-head">
              <span className="timeline-status">{STATUS[entry.status].label}</span>
              <time className="timeline-time mono" dateTime={entry.at}>
                {formatDateTime(entry.at)}
              </time>
            </div>
            {entry.remark && <p className="timeline-remark">{entry.remark}</p>}
            {entry.by && <p className="timeline-by">by {entry.by}</p>}
          </div>
        </li>
      ))}
    </ol>
  )
}

import { STATUS } from '../lib/reportMeta.js'
import { formatDateTime } from '../lib/format.js'
import PrivatePhoto from './PrivatePhoto.jsx'
import './StatusTimeline.css'

// The audit trail of a report: every status change and remark, newest first.
// history: [{ status, kind, at, by, remark, photoPath }]
export default function StatusTimeline({ history }) {
  const entries = [...history].reverse()

  return (
    <ol className="timeline">
      {entries.map((entry, i) => {
        const isRemark = entry.kind === 'remark'
        return (
          <li key={`${entry.kind}-${entry.status}-${entry.at}`} className={`${i === 0 ? 'is-current' : ''} ${isRemark ? 'is-remark' : ''}`}>
            <span className="timeline-marker" aria-hidden="true" />
            <div className="timeline-body">
              <div className="timeline-head">
                <span className="timeline-status">{isRemark ? 'Remark' : STATUS[entry.status]?.label ?? entry.status}</span>
                <time className="timeline-time mono" dateTime={entry.at}>
                  {formatDateTime(entry.at)}
                </time>
              </div>
              {entry.remark && <p className="timeline-remark">{entry.remark}</p>}
              {entry.photoPath && (
                <PrivatePhoto path={entry.photoPath} alt="Photo attached to this update" className="timeline-photo" />
              )}
              {entry.by && <p className="timeline-by">by {entry.by}</p>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

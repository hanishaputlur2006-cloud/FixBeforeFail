import { PRIORITY, STATUS } from '../lib/reportMeta.js'
import './Badges.css'

export function PriorityBadge({ level }) {
  const meta = PRIORITY[level]
  if (!meta) return null
  return <span className={`badge badge-${level}`}>{meta.label}</span>
}

export function StatusBadge({ status }) {
  const meta = STATUS[status]
  if (!meta) return null
  return (
    <span className={`status status-${meta.tone}`}>
      <span className="status-dot" aria-hidden="true" />
      {meta.label}
    </span>
  )
}

// A risk score rendered as a precise measurement, coloured by priority.
export function ScoreValue({ score, level, size = 'md' }) {
  return <span className={`score score-${level} score-${size} mono`}>{score}</span>
}

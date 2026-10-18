import { PRIORITY, PRIORITY_ORDER, TARGET_DAYS } from './reportMeta.js'

const DAY_MS = 24 * 60 * 60 * 1000

export function getPriority(score) {
  return PRIORITY_ORDER.find((level) => score >= PRIORITY[level].minScore) ?? 'low'
}

// Resolved and closed reports no longer need work.
export function isOpen(report) {
  return report.status !== 'resolved' && report.status !== 'closed'
}

export function ageInDays(report, now = Date.now()) {
  return Math.floor((now - new Date(report.reportedAt).getTime()) / DAY_MS)
}

export function isOverdue(report) {
  return isOpen(report) && ageInDays(report) > TARGET_DAYS[getPriority(report.score)]
}

// Highest score first; older reports win ties.
export function sortByRisk(reports) {
  return [...reports].sort(
    (a, b) => b.score - a.score || new Date(a.reportedAt) - new Date(b.reportedAt),
  )
}

// Pure calculations for the analytics page, kept separate so they can be tested.
// Input: reports as returned by fetchReports() (one entry per report, including merged duplicates).

import { CATEGORIES, PRIORITY_ORDER, STATUS_ORDER } from './reportMeta.js'
import { getPriority, isOpen, isOverdue } from './reportUtils.js'

const DAY_MS = 24 * 60 * 60 * 1000
const WEEK_MS = 7 * DAY_MS

// Monday 00:00 (local time) of the week containing `time`.
function weekStart(time) {
  const d = new Date(time)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d.getTime()
}

function normalizePlace(text) {
  return (text ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

export function computeAnalytics(reports, now = Date.now(), weeks = 12) {
  // Each real-world issue once: merged duplicates count toward their original.
  const issues = reports.filter((r) => !r.duplicateOf)
  const open = issues.filter(isOpen)

  // Repair time: from report to "resolved", for issues that were actually repaired.
  const repaired = issues.filter((r) => r.resolvedAt)
  const repairDays = repaired.map((r) => (new Date(r.resolvedAt) - new Date(r.reportedAt)) / DAY_MS)
  const avgRepairDays = repairDays.length ? repairDays.reduce((a, b) => a + b, 0) / repairDays.length : null

  const byPriority = Object.fromEntries(PRIORITY_ORDER.map((p) => [p, 0]))
  for (const r of open) byPriority[getPriority(r.score)]++

  const byCategory = Object.keys(CATEGORIES)
    .map((key) => ({ key, label: CATEGORIES[key], value: open.filter((r) => r.category === key).length }))
    .sort((a, b) => b.value - a.value)

  const byStatus = STATUS_ORDER.filter((s) => s !== 'closed').map((s) => ({
    key: s,
    value: issues.filter((r) => r.status === s).length,
  }))

  // Weekly trend: every submitted report (duplicates included) and every repair completed.
  const firstWeek = weekStart(now) - (weeks - 1) * WEEK_MS
  const weekly = Array.from({ length: weeks }, (_, i) => ({ start: firstWeek + i * WEEK_MS, reported: 0, resolved: 0 }))
  const slot = (iso) => {
    // Round to whole weeks so a daylight-saving shift cannot move a report into the wrong week.
    const i = Math.round((weekStart(new Date(iso).getTime()) - firstWeek) / WEEK_MS)
    return i >= 0 && i < weeks ? weekly[i] : null
  }
  for (const r of reports) {
    const w = slot(r.reportedAt)
    if (w) w.reported++
  }
  for (const r of repaired) {
    const w = slot(r.resolvedAt)
    if (w) w.resolved++
  }

  // Hotspots: places with several reports (an issue's merged duplicates count too).
  const places = new Map()
  for (const r of issues) {
    const key = normalizePlace(r.location)
    if (!key) continue
    const entry = places.get(key) ?? { place: r.location, reports: 0, open: 0 }
    entry.reports += r.duplicates ?? 1
    if (isOpen(r)) entry.open++
    places.set(key, entry)
  }
  const hotspots = [...places.values()]
    .filter((p) => p.reports >= 2)
    .sort((a, b) => b.reports - a.reports)
    .slice(0, 5)

  return {
    totals: {
      issues: issues.length,
      open: open.length,
      overdue: open.filter(isOverdue).length,
      resolvedLast30: repaired.filter((r) => now - new Date(r.resolvedAt).getTime() <= 30 * DAY_MS).length,
      avgRepairDays,
    },
    byPriority,
    byCategory,
    byStatus,
    weekly,
    hotspots,
  }
}

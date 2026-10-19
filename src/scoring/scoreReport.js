import { SCORING_CONFIG as C, NEUTRAL_SHARE, SAFETY_FLOORS } from './config.js'

const DAY_MS = 24 * 60 * 60 * 1000

// Missing information gets a neutral middle score and is flagged, so it is
// neither ignored (scored 0) nor exaggerated (scored max).
function neutral(factor) {
  return { points: Math.round(factor.max * NEUTRAL_SHARE), note: 'Not provided, neutral score used', missing: true }
}

function fromTable(factor, value) {
  if (value == null || factor.points[value] == null) return neutral(factor)
  return { points: factor.points[value], note: factor.labels[value] }
}

function publicImpact(category, locationType) {
  const f = C.publicImpact
  const base = f.categoryPoints[category] ?? Math.round(f.max * NEUTRAL_SHARE)
  const bonus = f.footfallBonus[locationType] ?? 0
  const points = Math.min(f.max, base + bonus)
  const note = bonus > 0 ? 'Widely used asset in a busy area' : 'Based on the type of asset'
  return { points, note }
}

export function repeatPoints(reportCount) {
  const f = C.repeats
  if (reportCount <= 1) return 0
  return Math.min(f.max, f.firstExtraBonus + f.pointsPerExtraReport * (reportCount - 1))
}

function repeats(reportCount) {
  if (reportCount <= 1) return { points: 0, note: 'Single report' }
  return { points: repeatPoints(reportCount), note: `${reportCount} reports, merged into one issue` }
}

function timeOpen(createdAt, resolvedAt, now) {
  const f = C.time
  const end = resolvedAt ? new Date(resolvedAt).getTime() : now
  const days = Math.max(0, Math.floor((end - new Date(createdAt).getTime()) / DAY_MS))
  const points = Math.min(f.max, Math.round((days / f.daysToMax) * f.max))
  const label = days === 0 ? 'Reported today' : `Open for ${days} ${days === 1 ? 'day' : 'days'}`
  return { points, note: resolvedAt ? `${label} before resolution` : label }
}

/**
 * Scores one report from its stored details (a database row).
 *
 * Returns {
 *   score:      final score, 0 to 100
 *   baseScore:  plain sum of the six factors
 *   factors:    [{ key, label, max, points, note, missing }]
 *   adjustment: { points, note } when a safety rule raised the score, otherwise null
 * }
 * score always equals baseScore + adjustment.points, so the breakdown adds up.
 */
export function scoreReport(report, now = Date.now()) {
  const results = {
    severity: fromTable(C.severity, report.severity),
    safety: fromTable(C.safety, report.safety_risk),
    publicImpact: publicImpact(report.category, report.location_type),
    repeats: repeats(1 + (report.duplicate_count ?? 0)),
    location: fromTable(C.location, report.location_type),
    time: timeOpen(report.created_at, report.resolved_at, now),
  }

  const factors = Object.entries(results).map(([key, r]) => ({
    key,
    label: C[key].label,
    max: C[key].max,
    points: r.points,
    note: r.note,
    missing: Boolean(r.missing),
  }))

  const baseScore = factors.reduce((sum, f) => sum + f.points, 0)
  const floor = SAFETY_FLOORS.find((rule) => rule.when(report))
  const adjustment = floor && floor.minScore > baseScore ? { points: floor.minScore - baseScore, note: floor.note } : null

  return { score: baseScore + (adjustment?.points ?? 0), baseScore, factors, adjustment }
}

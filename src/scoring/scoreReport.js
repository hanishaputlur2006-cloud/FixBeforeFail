import { SCORING_CONFIG as C, NEUTRAL_SHARE } from './config.js'

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

function repeats(count) {
  const f = C.repeats
  if (count <= 1) return { points: 0, note: 'Single report' }
  const points = Math.min(f.max, f.firstExtraBonus + f.pointsPerExtraReport * (count - 1))
  return { points, note: `${count} reports, merged into one issue` }
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
 * Scores one report from its stored details.
 * Returns { score, factors: [{ key, label, max, points, note, missing }] }.
 * The score is the plain sum of the factor points, so it always adds up.
 */
export function scoreReport(report, now = Date.now()) {
  const results = {
    severity: fromTable(C.severity, report.severity),
    safety: fromTable(C.safety, report.safety_risk),
    publicImpact: publicImpact(report.category, report.location_type),
    repeats: repeats(report.report_count ?? 1),
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

  return { score: factors.reduce((sum, f) => sum + f.points, 0), factors }
}

import { DUPLICATE_RULES } from './config.js'

const DAY_MS = 24 * 60 * 60 * 1000

// Common words that say nothing about where something is.
const STOP_WORDS = new Set(['the', 'and', 'near', 'next', 'opposite', 'behind', 'front', 'road', 'street', 'from', 'with'])

// Straight-line distance between two GPS points, in metres.
export function distanceMeters(a, b) {
  const R = 6371000
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(b.latitude - a.latitude)
  const dLon = toRad(b.longitude - a.longitude)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function locationWords(text) {
  return new Set(
    (text ?? '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 3 && !STOP_WORDS.has(w)),
  )
}

// Share of distinct location words the two descriptions have in common (0 to 1).
export function textSimilarity(a, b) {
  const wa = locationWords(a)
  const wb = locationWords(b)
  if (!wa.size || !wb.size) return 0
  let shared = 0
  for (const w of wa) if (wb.has(w)) shared++
  return shared / new Set([...wa, ...wb]).size
}

const hasCoords = (r) => r.latitude != null && r.longitude != null

/**
 * Suggests reports that may describe the same problem as `report`.
 * Only suggestions: an authority confirms before anything is merged.
 * Candidates must be in the same category, still open, not themselves duplicates,
 * reported within maxDaysApart, and either close by GPS or similarly described.
 */
export function findPossibleDuplicates(report, candidates, rules = DUPLICATE_RULES) {
  const created = new Date(report.reportedAt).getTime()

  return candidates
    .filter(
      (c) =>
        c.uuid !== report.uuid &&
        c.category === report.category &&
        !c.duplicateOf &&
        c.status !== 'resolved' &&
        c.status !== 'closed' &&
        Math.abs(new Date(c.reportedAt).getTime() - created) <= rules.maxDaysApart * DAY_MS,
    )
    .map((c) => {
      if (hasCoords(report) && hasCoords(c)) {
        const meters = distanceMeters(report, c)
        return meters <= rules.maxDistanceMeters ? { report: c, reason: `About ${Math.round(meters)} m away`, rank: meters } : null
      }
      const similarity = textSimilarity(report.location, c.location)
      return similarity >= rules.minTextSimilarity
        ? { report: c, reason: 'Similar location description', rank: 1000 * (1 - similarity) }
        : null
    })
    .filter(Boolean)
    .sort((a, b) => a.rank - b.rank)
}

// Run with: npm test
// Uses Node's built-in test runner, so no extra packages are needed.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { repeatPoints, scoreReport } from './scoreReport.js'
import { distanceMeters, findPossibleDuplicates, textSimilarity } from './duplicates.js'
import { SCORING_CONFIG } from './config.js'

const NOW = Date.parse('2026-10-20T12:00:00Z')
const daysAgo = (n) => new Date(NOW - n * 24 * 60 * 60 * 1000).toISOString()

const base = {
  category: 'roads',
  severity: 'moderate',
  safety_risk: 'possible',
  location_type: 'residential',
  created_at: daysAgo(0),
  resolved_at: null,
  duplicate_count: 0,
}

test('factor maximums add up to 100', () => {
  const total = Object.values(SCORING_CONFIG).reduce((sum, f) => sum + f.max, 0)
  assert.equal(total, 100)
})

test('score equals the sum of factors plus any safety adjustment', () => {
  const r = scoreReport(base, NOW)
  const sum = r.factors.reduce((s, f) => s + f.points, 0)
  assert.equal(r.baseScore, sum)
  assert.equal(r.score, sum + (r.adjustment?.points ?? 0))
})

test('no factor ever exceeds its maximum, and the score stays within 0 to 100', () => {
  const worst = {
    category: 'water',
    severity: 'critical',
    safety_risk: 'immediate',
    location_type: 'hospital',
    created_at: daysAgo(400),
    duplicate_count: 50,
  }
  const r = scoreReport(worst, NOW)
  for (const f of r.factors) assert.ok(f.points <= f.max, `${f.key} exceeds max`)
  assert.equal(r.score, 100)
})

test('missing details get a neutral score and are flagged', () => {
  const r = scoreReport({ category: 'roads', created_at: daysAgo(0) }, NOW)
  const severity = r.factors.find((f) => f.key === 'severity')
  assert.equal(severity.missing, true)
  assert.equal(severity.points, Math.round(severity.max / 2))
})

test('a more severe report scores higher, all else equal', () => {
  const minor = scoreReport({ ...base, severity: 'minor' }, NOW).score
  const major = scoreReport({ ...base, severity: 'major' }, NOW).score
  assert.ok(major > minor)
})

test('repeat reports raise the score but are capped', () => {
  assert.equal(repeatPoints(1), 0)
  assert.ok(repeatPoints(2) > 0)
  assert.ok(repeatPoints(4) > repeatPoints(2))
  assert.equal(repeatPoints(100), SCORING_CONFIG.repeats.max)
})

test('time unresolved grows with age and stops at resolution', () => {
  const fresh = scoreReport({ ...base, created_at: daysAgo(0) }, NOW)
  const old = scoreReport({ ...base, created_at: daysAgo(30) }, NOW)
  const t = (r) => r.factors.find((f) => f.key === 'time').points
  assert.ok(t(old) > t(fresh))

  const resolvedQuickly = scoreReport({ ...base, created_at: daysAgo(30), resolved_at: daysAgo(29) }, NOW)
  assert.ok(t(resolvedQuickly) < t(old))
})

test('immediate danger is always at least High (50)', () => {
  const r = scoreReport({ ...base, severity: 'minor', safety_risk: 'immediate', category: 'facilities' }, NOW)
  assert.ok(r.score >= 50)
  assert.ok(r.adjustment)
})

test('immediate danger with critical damage is always Critical (75)', () => {
  const r = scoreReport({ ...base, severity: 'critical', safety_risk: 'immediate', location_type: 'park' }, NOW)
  assert.ok(r.score >= 75)
})

test('no adjustment when the score is already above the safety floor', () => {
  const r = scoreReport(
    { ...base, severity: 'critical', safety_risk: 'immediate', category: 'water', location_type: 'school', created_at: daysAgo(14) },
    NOW,
  )
  assert.equal(r.adjustment, null)
})

test('"I see this too" confirmations count like merged duplicates', () => {
  const merged = scoreReport({ ...base, duplicate_count: 2 }, NOW)
  const confirmed = scoreReport({ ...base, support_count: 2 }, NOW)
  const both = scoreReport({ ...base, duplicate_count: 1, support_count: 1 }, NOW)
  const r = (x) => x.factors.find((f) => f.key === 'repeats').points
  assert.equal(r(merged), r(confirmed))
  assert.equal(r(both), r(merged))
})

// ---- Duplicate detection ----

const report = (over) => ({
  uuid: Math.random().toString(36),
  category: 'roads',
  status: 'reported',
  duplicateOf: null,
  reportedAt: daysAgo(1),
  location: 'MG Road bus stop',
  latitude: null,
  longitude: null,
  ...over,
})

test('distance between two points about 111 m apart', () => {
  const d = distanceMeters({ latitude: 12.97, longitude: 77.59 }, { latitude: 12.971, longitude: 77.59 })
  assert.ok(d > 100 && d < 120)
})

test('location text similarity ignores filler words and case', () => {
  assert.equal(textSimilarity('Near the MG Road bus stop', 'mg road bus stop'), 1)
  assert.equal(textSimilarity('Park Lane', 'Station Road'), 0)
})

test('suggests nearby reports in the same category only', () => {
  const target = report({ latitude: 12.97, longitude: 77.59 })
  const near = report({ latitude: 12.9705, longitude: 77.59 })
  const far = report({ latitude: 12.98, longitude: 77.59 })
  const otherCategory = report({ latitude: 12.9705, longitude: 77.59, category: 'water' })
  const found = findPossibleDuplicates(target, [near, far, otherCategory]).map((s) => s.report)
  assert.deepEqual(found, [near])
})

test('falls back to location text when there are no coordinates', () => {
  const target = report({ location: 'MG Road bus stop' })
  const similar = report({ location: 'Bus stop on MG Road' })
  const different = report({ location: 'Lakeshore Avenue' })
  const found = findPossibleDuplicates(target, [similar, different]).map((s) => s.report)
  assert.deepEqual(found, [similar])
})

test('never suggests itself, closed reports or existing duplicates', () => {
  const target = report({})
  const closed = report({ status: 'closed' })
  const alreadyDuplicate = report({ duplicateOf: 'x' })
  assert.equal(findPossibleDuplicates(target, [target, closed, alreadyDuplicate]).length, 0)
})

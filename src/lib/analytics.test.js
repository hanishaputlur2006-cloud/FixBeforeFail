// Run with: npm test

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeAnalytics } from './analytics.js'

const NOW = new Date('2026-10-21T12:00:00').getTime()
const daysAgo = (n) => new Date(NOW - n * 24 * 60 * 60 * 1000).toISOString()

const report = (over) => ({
  category: 'roads',
  status: 'reported',
  score: 30,
  reportedAt: daysAgo(1),
  resolvedAt: null,
  duplicateOf: null,
  duplicates: 1,
  location: 'MG Road',
  ...over,
})

test('merged duplicates are not counted as separate issues', () => {
  const a = computeAnalytics([report({}), report({ duplicateOf: 'x', status: 'closed' })], NOW)
  assert.equal(a.totals.issues, 1)
  assert.equal(a.totals.open, 1)
})

test('average repair time uses only repaired issues', () => {
  const a = computeAnalytics(
    [
      report({ status: 'resolved', reportedAt: daysAgo(10), resolvedAt: daysAgo(6) }),
      report({ status: 'closed', reportedAt: daysAgo(10), resolvedAt: daysAgo(8) }),
      report({ status: 'closed', reportedAt: daysAgo(5) }), // closed without repair
    ],
    NOW,
  )
  assert.equal(a.totals.avgRepairDays, 3)
})

test('no repaired issues gives no average instead of zero', () => {
  assert.equal(computeAnalytics([report({})], NOW).totals.avgRepairDays, null)
})

test('open issues are counted by priority and category', () => {
  const a = computeAnalytics([report({ score: 80 }), report({ score: 10, category: 'water' }), report({ status: 'closed' })], NOW)
  assert.equal(a.byPriority.critical, 1)
  assert.equal(a.byPriority.low, 1)
  assert.equal(a.byCategory.find((c) => c.key === 'water').value, 1)
  assert.equal(a.byCategory.reduce((s, c) => s + c.value, 0), 2)
})

test('weekly trend has one slot per week and counts reports in the right week', () => {
  const a = computeAnalytics([report({ reportedAt: daysAgo(0) }), report({ reportedAt: daysAgo(200) })], NOW, 12)
  assert.equal(a.weekly.length, 12)
  assert.equal(a.weekly.at(-1).reported, 1)
  assert.equal(a.weekly.reduce((s, w) => s + w.reported, 0), 1) // the 200-day-old report is outside the range
})

test('hotspots group places and include merged duplicates', () => {
  const a = computeAnalytics(
    [report({ location: 'MG Road', duplicates: 3 }), report({ location: 'mg  road' }), report({ location: 'Park Lane' })],
    NOW,
  )
  assert.equal(a.hotspots.length, 1)
  assert.equal(a.hotspots[0].reports, 4)
})

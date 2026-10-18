// DEMO DATA ONLY.
// These reports and people are made up so the dashboards can be designed before
// the database exists. Phase 3 replaces this file with real data from Supabase.

import { FACTORS, STATUS_ORDER } from './reportMeta.js'

export const DEMO_USERS = {
  citizen: { id: 'u-citizen', name: 'Aditi Rao', role: 'citizen', roleLabel: 'Citizen' },
  authority: { id: 'u-authority', name: 'Meera Nair', role: 'authority', roleLabel: 'Ward engineer' },
  worker: { id: 'u-worker', name: 'Ravi Kumar', role: 'worker', roleLabel: 'Maintenance crew' },
}

const OTHER_WORKER = { id: 'u-worker-2', name: 'Sunita Das' }
const OTHER_CITIZEN = { id: 'u-citizen-2', name: 'Karan Mehta' }

const DAY_MS = 24 * 60 * 60 * 1000

function daysAgo(days, hour = 10) {
  const d = new Date(Date.now() - days * DAY_MS)
  d.setHours(hour, 15, 0, 0)
  return d.toISOString()
}

const REMARKS = {
  reported: 'Report submitted with photo and location.',
  verified: 'Verified by site inspection. Risk confirmed.',
  assigned: 'Assigned to maintenance crew.',
  under_repair: 'Crew on site. Repair work started.',
  resolved: 'Work completed. Evidence uploaded for verification.',
  closed: 'Repair verified. Report closed.',
}

// Builds a plausible status history: one entry per lifecycle step reached,
// spread across the days since the report was submitted.
function buildHistory({ status, reportedDaysAgo, reporter, assignee }) {
  const steps = STATUS_ORDER.slice(0, STATUS_ORDER.indexOf(status) + 1)
  const gap = Math.max(1, Math.floor(reportedDaysAgo / steps.length))
  const authority = DEMO_USERS.authority.name

  return steps.map((step, i) => {
    const by =
      step === 'reported' ? reporter.name : step === 'under_repair' || step === 'resolved' ? assignee?.name : authority
    return {
      status: step,
      at: daysAgo(Math.max(reportedDaysAgo - i * gap, 0), 9 + i),
      by,
      remark: step === 'assigned' ? `Assigned to ${assignee?.name}.` : REMARKS[step],
    }
  })
}

// Factor points are listed in FACTORS order: severity, safety, public impact,
// repeat reports, location importance, time unresolved.
function factors(points, notes) {
  return FACTORS.map((f, i) => ({ ...f, points: points[i], note: notes[i] }))
}

const RAW_REPORTS = [
  {
    id: 'FBF-1042',
    title: 'Water main leak',
    description:
      'Clean water is pooling across the road outside the school gate. The flow has increased over the past few days and the road edge is starting to erode.',
    category: 'water',
    location: 'Station Road, near Government Primary School',
    status: 'verified',
    reportedDaysAgo: 6,
    reporter: DEMO_USERS.citizen,
    assignee: null,
    duplicates: 4,
    factors: factors(
      [22, 18, 17, 12, 9, 8],
      ['Reported as major', 'Pedestrian and traffic risk', 'Affects supply to nearby homes', '4 reports, merged into one issue', 'School zone', 'Open for 6 days'],
    ),
  },
  {
    id: 'FBF-1039',
    title: 'Pothole cluster at junction',
    description: 'Three deep potholes in the left lane. Two-wheelers are swerving into oncoming traffic to avoid them.',
    category: 'roads',
    location: 'Ring Road and 4th Cross',
    status: 'assigned',
    reportedDaysAgo: 9,
    reporter: OTHER_CITIZEN,
    assignee: DEMO_USERS.worker,
    duplicates: 3,
    factors: factors(
      [20, 17, 14, 9, 7, 5],
      ['Reported as major', 'Risk to two-wheelers', 'Busy junction', '3 reports, merged', 'Arterial road', 'Open for 9 days'],
    ),
  },
  {
    id: 'FBF-1036',
    title: 'Collapsed footpath slab',
    description: 'A concrete slab over the drain has collapsed, leaving an open gap next to the bus stop.',
    category: 'pathways',
    location: 'MG Road bus stop',
    status: 'assigned',
    reportedDaysAgo: 8,
    reporter: OTHER_CITIZEN,
    assignee: OTHER_WORKER,
    duplicates: 2,
    factors: factors(
      [19, 16, 12, 6, 8, 6],
      ['Reported as major', 'Fall hazard', 'High footfall', '2 reports, merged', 'Transit stop', 'Open for 8 days'],
    ),
  },
  {
    id: 'FBF-1024',
    title: 'Faulty traffic signal timer',
    description: 'The pedestrian signal turns green while the vehicle signal is still green on one approach.',
    category: 'equipment',
    location: 'Hospital Road junction',
    status: 'verified',
    reportedDaysAgo: 4,
    reporter: OTHER_CITIZEN,
    assignee: null,
    duplicates: 2,
    factors: factors(
      [15, 15, 13, 6, 9, 4],
      ['Reported as moderate', 'Conflicting signals', 'Main hospital access', '2 reports, merged', 'Hospital zone', 'Open for 4 days'],
    ),
  },
  {
    id: 'FBF-1044',
    title: 'Exposed wiring on streetlight pole',
    description: 'The access panel at the base of the pole is missing and live wires are visible.',
    category: 'streetlights',
    location: 'Lake View Park entrance',
    status: 'reported',
    reportedDaysAgo: 1,
    reporter: OTHER_CITIZEN,
    assignee: null,
    duplicates: 1,
    factors: factors(
      [21, 20, 10, 3, 6, 1],
      ['Reported as major', 'Electric shock risk', 'Park entrance', 'Single report', 'Children’s play area nearby', 'Open for 1 day'],
    ),
  },
  {
    id: 'FBF-1031',
    title: 'Streetlight outage, 6 poles',
    description: 'Six consecutive streetlights are not working, leaving a long stretch of the lane dark at night.',
    category: 'streetlights',
    location: 'Park Lane',
    status: 'under_repair',
    reportedDaysAgo: 12,
    reporter: DEMO_USERS.citizen,
    assignee: DEMO_USERS.worker,
    duplicates: 2,
    factors: factors(
      [14, 12, 11, 6, 4, 7],
      ['Reported as moderate', 'Low visibility at night', 'Residential lane', '2 reports, merged', 'Residential area', 'Open for 12 days'],
    ),
  },
  {
    id: 'FBF-1028',
    title: 'Blocked storm drain',
    description: 'Drain inlet is blocked with debris. Water collects across the street after rain.',
    category: 'water',
    location: 'Market Street',
    status: 'under_repair',
    reportedDaysAgo: 15,
    reporter: OTHER_CITIZEN,
    assignee: DEMO_USERS.worker,
    duplicates: 2,
    factors: factors(
      [13, 8, 12, 6, 5, 8],
      ['Reported as moderate', 'Slippery surface', 'Market traffic', '2 reports, merged', 'Commercial area', 'Open for 15 days'],
    ),
  },
  {
    id: 'FBF-1018',
    title: 'Broken drinking water fountain',
    description: 'The fountain near the playground leaks continuously and the basin is cracked.',
    category: 'facilities',
    location: 'City Park, north gate',
    status: 'resolved',
    reportedDaysAgo: 20,
    reporter: DEMO_USERS.citizen,
    assignee: DEMO_USERS.worker,
    duplicates: 1,
    factors: factors(
      [7, 2, 6, 3, 3, 10],
      ['Reported as minor', 'Minimal risk', 'Park visitors', 'Single report', 'Public park', 'Open for 20 days'],
    ),
  },
  {
    id: 'FBF-1012',
    title: 'Cracked road surface',
    description: 'Long cracks along the centre of the road, widening near the bridge approach.',
    category: 'roads',
    location: 'Lakeshore Avenue',
    status: 'closed',
    reportedDaysAgo: 34,
    reporter: DEMO_USERS.citizen,
    assignee: OTHER_WORKER,
    duplicates: 1,
    factors: factors(
      [10, 8, 9, 3, 5, 10],
      ['Reported as moderate', 'Early-stage damage', 'Local traffic', 'Single report', 'Bridge approach', 'Open for 34 days'],
    ),
  },
  {
    id: 'FBF-1009',
    title: 'Fallen direction signboard',
    description: 'A direction sign has fallen onto the footpath after strong wind.',
    category: 'equipment',
    location: 'North Avenue',
    status: 'closed',
    reportedDaysAgo: 41,
    reporter: OTHER_CITIZEN,
    assignee: DEMO_USERS.worker,
    duplicates: 1,
    factors: factors(
      [12, 11, 6, 0, 4, 3],
      ['Reported as moderate', 'Obstructs footpath', 'Local footfall', 'Single report', 'Residential area', 'Open for 3 days'],
    ),
  },
  {
    id: 'FBF-1027',
    title: 'Damaged public bench',
    description: 'One of the bench slats is broken and has a sharp edge.',
    category: 'facilities',
    location: 'Central Library forecourt',
    status: 'reported',
    reportedDaysAgo: 3,
    reporter: OTHER_CITIZEN,
    assignee: null,
    duplicates: 1,
    factors: factors(
      [6, 3, 5, 0, 4, 3],
      ['Reported as minor', 'Minor cut risk', 'Library visitors', 'Single report', 'Public building', 'Open for 3 days'],
    ),
  },
  {
    id: 'FBF-1047',
    title: 'Uneven paving stones',
    description: 'Several paving stones have lifted along the riverside walking path.',
    category: 'pathways',
    location: 'Riverside Walk',
    status: 'reported',
    reportedDaysAgo: 0,
    reporter: DEMO_USERS.citizen,
    assignee: null,
    duplicates: 1,
    factors: factors(
      [8, 6, 5, 0, 3, 0],
      ['Reported as minor', 'Trip hazard', 'Recreational path', 'Single report', 'Recreational area', 'Reported today'],
    ),
  },
]

// The total score is the sum of factor points, so the breakdown always adds up.
export const SAMPLE_REPORTS = RAW_REPORTS.map((r) => ({
  ...r,
  score: r.factors.reduce((sum, f) => sum + f.points, 0),
  reportedAt: daysAgo(r.reportedDaysAgo, 9),
  history: buildHistory(r),
}))

export function getSampleReport(id) {
  return SAMPLE_REPORTS.find((r) => r.id === id) ?? null
}

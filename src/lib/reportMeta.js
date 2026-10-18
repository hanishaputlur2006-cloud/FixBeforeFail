// Shared labels for priority levels and report statuses.
// Every badge, filter and table reads from here, so names stay consistent app-wide.

export const PRIORITY = {
  critical: { label: 'Critical', minScore: 75 },
  high: { label: 'High', minScore: 50 },
  medium: { label: 'Medium', minScore: 25 },
  low: { label: 'Low', minScore: 0 },
}

// The report lifecycle, in order.
export const STATUS_ORDER = ['reported', 'verified', 'assigned', 'under_repair', 'resolved', 'closed']

// "tone" controls the badge colour: neutral, blue, teal or green.
export const STATUS = {
  reported: { label: 'Reported', tone: 'neutral' },
  verified: { label: 'Verified', tone: 'blue' },
  assigned: { label: 'Assigned', tone: 'blue' },
  under_repair: { label: 'Under repair', tone: 'teal' },
  resolved: { label: 'Resolved', tone: 'green' },
  closed: { label: 'Closed', tone: 'green' },
}

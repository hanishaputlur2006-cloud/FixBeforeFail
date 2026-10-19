// The report lifecycle rules, as shown in the app.
// The database enforces the same rules in supabase/005_lifecycle.sql (lifecycle_rule);
// if you change one, change the other.

export const TRANSITIONS = [
  { from: 'reported', to: 'verified', roles: ['authority'], noteRequired: false, label: 'Verify report', tone: 'primary', hint: 'Confirm the problem is real and needs repair.' },
  { from: 'reported', to: 'closed', roles: ['authority'], noteRequired: true, label: 'Reject', tone: 'danger', hint: 'Close the report as invalid. The reporter will see your reason.' },
  { from: 'verified', to: 'assigned', roles: ['authority'], noteRequired: false, label: 'Assign to worker', tone: 'primary', hint: 'Choose who will carry out the repair.', needsAssignee: true },
  { from: 'verified', to: 'closed', roles: ['authority'], noteRequired: true, label: 'Close report', tone: 'danger', hint: 'Close without repair. Explain why.' },
  { from: 'assigned', to: 'under_repair', roles: ['worker', 'authority'], noteRequired: false, label: 'Start repair', tone: 'primary', hint: 'Let everyone know work has begun.', allowsPhoto: true },
  { from: 'assigned', to: 'closed', roles: ['authority'], noteRequired: true, label: 'Close report', tone: 'danger', hint: 'Close without repair. Explain why.' },
  { from: 'under_repair', to: 'resolved', roles: ['worker', 'authority'], noteRequired: true, label: 'Mark as resolved', tone: 'primary', hint: 'Describe the work done and add a photo of the finished repair. The photo is required as evidence.', allowsPhoto: true, photoRequired: true },
  { from: 'under_repair', to: 'closed', roles: ['authority'], noteRequired: true, label: 'Close report', tone: 'danger', hint: 'Close without completing the repair. Explain why.' },
  { from: 'resolved', to: 'closed', roles: ['authority'], noteRequired: false, label: 'Confirm fix and close', tone: 'primary', hint: 'The repair has been checked and the report is complete.' },
  { from: 'resolved', to: 'under_repair', roles: ['authority'], noteRequired: true, label: 'Reopen for rework', tone: 'secondary', hint: 'The repair is not good enough. Explain what still needs doing.' },
]

// Which status changes the signed-in user can make on this report right now.
export function availableTransitions(report, profile) {
  if (report.duplicateOf) return []
  if (profile.role === 'worker' && report.assignee?.id !== profile.id) return []
  return TRANSITIONS.filter((t) => t.from === report.status && t.roles.includes(profile.role))
}

// Authorities can always add remarks; workers only on reports assigned to them.
export function canAddRemark(report, profile) {
  if (report.duplicateOf) return false
  if (profile.role === 'authority') return true
  return profile.role === 'worker' && report.assignee?.id === profile.id
}

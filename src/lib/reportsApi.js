// All database reads for reports live here, so pages never talk to Supabase directly.
// Row Level Security decides which reports come back: citizens get their own,
// workers their assigned jobs, authorities everything.

import { supabase } from './supabase.js'
import { scoreReport } from '../scoring/scoreReport.js'

const REPORT_COLUMNS = `
  id, ref_no, title, description, category, severity, safety_risk,
  location_text, location_type, latitude, longitude, photo_path,
  status, assigned_to, duplicate_of, duplicate_count, support_count, source, created_at, updated_at, resolved_at,
  parent:reports!duplicate_of ( ref_no ),
  reporter:profiles!reporter_id ( id, full_name ),
  assignee:profiles!assigned_to ( id, full_name )
`

export function formatRef(refNo) {
  return `FBF-${refNo}`
}

// Accepts "FBF-1042" or "1042"; returns the number or null.
export function parseRef(ref) {
  const match = /^(?:FBF-)?(\d+)$/i.exec(ref ?? '')
  return match ? Number(match[1]) : null
}

// Turns a database row into the shape the UI components use.
function toReport(row) {
  const { score, factors, adjustment } = scoreReport(row)
  return {
    uuid: row.id,
    id: formatRef(row.ref_no),
    title: row.title,
    description: row.description,
    category: row.category,
    location: row.location_text,
    locationType: row.location_type,
    latitude: row.latitude,
    longitude: row.longitude,
    photoPath: row.photo_path,
    status: row.status,
    reportedAt: row.created_at,
    resolvedAt: row.resolved_at,
    reporter: row.reporter ? { id: row.reporter.id, name: row.reporter.full_name || 'Citizen' } : null,
    assignee: row.assignee ? { id: row.assignee.id, name: row.assignee.full_name || 'Maintenance crew' } : null,
    duplicates: 1 + (row.duplicate_count ?? 0),
    confirmations: row.support_count ?? 0,
    duplicateOf: row.duplicate_of,
    mergedInto: row.parent ? formatRef(row.parent.ref_no) : null,
    source: row.source,
    score,
    factors,
    adjustment,
  }
}

export async function fetchReports() {
  const { data, error } = await supabase
    .from('reports')
    .select(REPORT_COLUMNS)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data.map(toReport)
}

// Returns the report plus its status history, or null if it does not exist
// (or the signed-in user is not allowed to see it).
export async function fetchReportByRef(ref) {
  const refNo = parseRef(ref)
  if (refNo == null) return null

  const { data, error } = await supabase.from('reports').select(REPORT_COLUMNS).eq('ref_no', refNo).maybeSingle()
  if (error) throw error
  if (!data) return null

  const { data: events, error: eventsError } = await supabase
    .from('report_events')
    .select('status, note, kind, photo_path, created_at, actor:profiles ( full_name )')
    .eq('report_id', data.id)
    .order('created_at', { ascending: true })
  if (eventsError) throw eventsError

  return {
    ...toReport(data),
    history: events.map((e) => ({
      status: e.status,
      at: e.created_at,
      by: e.actor?.full_name || null,
      remark: e.note,
      kind: e.kind,
      photoPath: e.photo_path,
    })),
  }
}

const PHOTO_BUCKET = 'report-images'

// Uploads a photo into the signed-in user's own folder and returns its path.
async function uploadPhoto(blob) {
  const { data: auth } = await supabase.auth.getUser()
  const userId = auth.user?.id
  if (!userId) throw new Error('You are signed out. Please log in again.')
  const path = `${userId}/${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: 'image/jpeg' })
  if (error) throw new Error(`Photo upload failed: ${error.message}`)
  return path
}

/**
 * Saves a new report. If a photo is given it is uploaded first, then the report
 * row is created pointing to it. Returns the new reference, e.g. "FBF-1001".
 */
export async function createReport(input, photoBlob) {
  const { data: auth } = await supabase.auth.getUser()
  const userId = auth.user?.id
  if (!userId) throw new Error('You are signed out. Please log in again.')

  const photoPath = photoBlob ? await uploadPhoto(photoBlob) : null

  const { data, error } = await supabase
    .from('reports')
    .insert({
      reporter_id: userId,
      title: input.title,
      description: input.description,
      category: input.category,
      severity: input.severity,
      safety_risk: input.safetyRisk,
      location_text: input.location,
      location_type: input.locationType || null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      photo_path: photoPath,
    })
    .select('ref_no')
    .single()

  if (error) {
    // Do not leave an orphaned photo behind if the report could not be saved.
    if (photoPath) await supabase.storage.from(PHOTO_BUCKET).remove([photoPath])
    throw error
  }
  return formatRef(data.ref_no)
}

// Photos are private, so the app asks for a temporary link (valid for one hour).
export async function getPhotoUrl(path) {
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(path, 3600)
  if (error) throw error
  return data.signedUrl
}

// Authority action: mark a report as a duplicate of an earlier one.
// The duplicate is closed with a note; the original's repeat count goes up automatically.
export async function mergeReport(report, target) {
  const { error } = await supabase
    .from('reports')
    .update({
      duplicate_of: target.uuid,
      status: 'closed',
      status_note: `Merged into ${target.id} as a duplicate report of the same issue.`,
    })
    .eq('id', report.uuid)
  if (error) throw error
}

// Moves a report to its next status. The database checks the role, the order of
// steps and required notes, and records the change in the history.
export async function updateReportStatus(report, { status, note, photoBlob, assigneeId }) {
  const photoPath = photoBlob ? await uploadPhoto(photoBlob) : null
  const { error } = await supabase.rpc('update_report_status', {
    p_report: report.uuid,
    p_status: status,
    p_note: note || null,
    p_photo: photoPath,
    p_assignee: assigneeId || null,
  })
  if (error) {
    if (photoPath) await supabase.storage.from(PHOTO_BUCKET).remove([photoPath])
    throw error
  }
}

// Adds a remark (and optional progress photo) without changing the status.
export async function addReportRemark(report, { note, photoBlob }) {
  const photoPath = photoBlob ? await uploadPhoto(photoBlob) : null
  const { error } = await supabase.rpc('add_report_remark', {
    p_report: report.uuid,
    p_note: note || null,
    p_photo: photoPath,
  })
  if (error) {
    if (photoPath) await supabase.storage.from(PHOTO_BUCKET).remove([photoPath])
    throw error
  }
}

// Maintenance workers with how many open jobs each has, for the assignment list.
export async function fetchWorkers() {
  const [{ data: workers, error }, { data: jobs, error: jobsError }] = await Promise.all([
    supabase.from('profiles').select('id, full_name').eq('role', 'worker').order('full_name'),
    supabase.from('reports').select('assigned_to').in('status', ['assigned', 'under_repair']),
  ])
  if (error) throw error
  if (jobsError) throw jobsError
  return workers.map((w) => ({
    id: w.id,
    name: w.full_name || 'Unnamed worker',
    activeJobs: jobs.filter((j) => j.assigned_to === w.id).length,
  }))
}

// Open reports of the same category within 200 m (see supabase/009_engagement.sql).
export async function fetchNearbyReports(latitude, longitude, category) {
  const { data, error } = await supabase.rpc('nearby_reports', { p_lat: latitude, p_lng: longitude, p_category: category })
  if (error) throw error
  return data.map((r) => ({
    uuid: r.id,
    id: formatRef(r.ref_no),
    title: r.title,
    status: r.status,
    distance: r.distance_m,
    reports: r.confirmations,
  }))
}

// "I see this too": confirms an existing report instead of filing a duplicate.
export async function supportReport(reportUuid) {
  const { error } = await supabase.rpc('support_report', { p_report: reportUuid })
  if (error) throw error
}

// The reporter's rating of a finished repair, or null if not rated yet.
export async function fetchFeedback(reportUuid) {
  const { data, error } = await supabase
    .from('report_feedback')
    .select('rating, comment, created_at')
    .eq('report_id', reportUuid)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function submitFeedback(reportUuid, rating, comment) {
  const { error } = await supabase.rpc('submit_feedback', { p_report: reportUuid, p_rating: rating, p_comment: comment || null })
  if (error) throw error
}

// All repair ratings (authorities only, enforced by the database), for analytics.
export async function fetchRatings() {
  const { data, error } = await supabase.from('report_feedback').select('rating')
  if (error) throw error
  return data.map((r) => r.rating)
}

// Totals for the public landing page. Works without logging in.
export async function fetchPublicStats() {
  const { data, error } = await supabase.rpc('public_stats')
  if (error) throw error
  return data
}

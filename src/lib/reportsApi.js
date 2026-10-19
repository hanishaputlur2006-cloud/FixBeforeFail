// All database reads for reports live here, so pages never talk to Supabase directly.
// Row Level Security decides which reports come back: citizens get their own,
// workers their assigned jobs, authorities everything.

import { supabase } from './supabase.js'
import { scoreReport } from '../scoring/scoreReport.js'

const REPORT_COLUMNS = `
  id, ref_no, title, description, category, severity, safety_risk,
  location_text, location_type, latitude, longitude, photo_path,
  status, assigned_to, duplicate_of, source, created_at, updated_at, resolved_at,
  reporter:profiles!reports_reporter_id_fkey ( id, full_name ),
  assignee:profiles!reports_assigned_to_fkey ( id, full_name )
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
  const { score, factors } = scoreReport(row)
  return {
    uuid: row.id,
    id: formatRef(row.ref_no),
    title: row.title,
    description: row.description,
    category: row.category,
    location: row.location_text,
    status: row.status,
    reportedAt: row.created_at,
    resolvedAt: row.resolved_at,
    reporter: row.reporter ? { id: row.reporter.id, name: row.reporter.full_name || 'Citizen' } : null,
    assignee: row.assignee ? { id: row.assignee.id, name: row.assignee.full_name || 'Maintenance crew' } : null,
    duplicates: row.report_count ?? 1,
    source: row.source,
    score,
    factors,
  }
}

export async function fetchReports() {
  const { data, error } = await supabase
    .from('reports')
    .select(REPORT_COLUMNS)
    .is('duplicate_of', null)
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
    .select('status, note, created_at, actor:profiles ( full_name )')
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
    })),
  }
}

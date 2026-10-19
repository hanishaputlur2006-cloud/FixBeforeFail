import { useEffect, useRef, useState } from 'react'
import { Camera, CircleAlert, LoaderCircle, MessageSquarePlus, Trash2 } from 'lucide-react'
import { availableTransitions, canAddRemark } from '../../lib/lifecycle.js'
import { addReportRemark, fetchWorkers, updateReportStatus } from '../../lib/reportsApi.js'
import { compressImage } from '../../lib/imageUtils.js'
import { useAuth } from '../../lib/auth.jsx'
import { useAsync } from '../../lib/useAsync.js'

const REMARK_ACTION = {
  to: null,
  label: 'Add remark',
  tone: 'secondary',
  hint: 'Post an update without changing the status.',
  noteRequired: false,
  allowsPhoto: true,
}

// List of workers for the "Assign to worker" action, with their open job counts.
function WorkerSelect({ value, onChange }) {
  const { data: workers, loading, error } = useAsync(fetchWorkers, [])
  if (loading) return <p className="action-hint">Loading workers...</p>
  if (error) return <p className="field-error">Could not load workers: {error.message}</p>
  if (!workers.length) {
    return <p className="field-error">There are no maintenance worker accounts yet. Give an account the worker role first.</p>
  }
  return (
    <label className="field">
      <span>Maintenance worker</span>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Choose a worker</option>
        {workers.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name} ({w.activeJobs} open {w.activeJobs === 1 ? 'job' : 'jobs'})
          </option>
        ))}
      </select>
    </label>
  )
}

// Panel on the report details page with the actions the signed-in user may take.
export default function ReportActions({ report, onChanged }) {
  const { profile } = useAuth()
  const fileInput = useRef(null)
  const [action, setAction] = useState(null)
  const [note, setNote] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [photo, setPhoto] = useState(null) // { blob, previewUrl }
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => () => photo && URL.revokeObjectURL(photo.previewUrl), [photo])

  const transitions = availableTransitions(report, profile)
  const actions = canAddRemark(report, profile) ? [...transitions, REMARK_ACTION] : transitions
  if (!actions.length) return null

  function choose(a) {
    setAction(a)
    setNote('')
    setAssigneeId('')
    setPhoto(null)
    setError('')
  }

  async function handlePhoto(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const blob = await compressImage(file)
      setPhoto({ blob, previewUrl: URL.createObjectURL(blob) })
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  async function submit(e) {
    e.preventDefault()
    const trimmed = note.trim()
    if (action.noteRequired && !trimmed) return setError('Please add a note explaining this change.')
    if (action.needsAssignee && !assigneeId) return setError('Choose a maintenance worker.')
    if (!action.to && !trimmed && !photo) return setError('Write a remark or add a photo.')
    if (trimmed.length > 1000) return setError('Keep the note under 1000 characters.')

    setBusy(true)
    setError('')
    try {
      if (action.to) {
        await updateReportStatus(report, { status: action.to, note: trimmed, photoBlob: photo?.blob, assigneeId })
      } else {
        await addReportRemark(report, { note: trimmed, photoBlob: photo?.blob })
      }
      setAction(null)
      onChanged()
    } catch (err) {
      setError(err.message || 'The update could not be saved.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card detail-card actions-card">
      <h2>Actions</h2>

      {!action ? (
        <div className="action-list">
          {actions.map((a) => (
            <button
              key={a.label + a.to}
              type="button"
              className={`btn ${a.tone === 'primary' ? 'btn-primary' : 'btn-secondary'} ${a.tone === 'danger' ? 'btn-danger-text' : ''}`}
              onClick={() => choose(a)}
            >
              {!a.to && <MessageSquarePlus size={16} />}
              {a.label}
            </button>
          ))}
        </div>
      ) : (
        <form className="action-form" onSubmit={submit} noValidate>
          <div>
            <h3>{action.label}</h3>
            <p className="action-hint">{action.hint}</p>
          </div>

          {action.needsAssignee && <WorkerSelect value={assigneeId} onChange={setAssigneeId} />}

          <label className="field">
            <span>
              {action.to ? 'Note' : 'Remark'} {!action.noteRequired && action.to && <em>optional</em>}
            </span>
            <textarea
              className="input textarea"
              rows={3}
              maxLength={1000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={action.noteRequired ? 'Required' : 'Visible in the status history'}
            />
          </label>

          {action.allowsPhoto && (
            <div className="field">
              <span>
                Photo <em>optional</em>
              </span>
              <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handlePhoto} />
              {photo ? (
                <div className="action-photo">
                  <img src={photo.previewUrl} alt="Selected photo" />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPhoto(null)}>
                    <Trash2 size={14} />
                    Remove
                  </button>
                </div>
              ) : (
                <button type="button" className="btn btn-secondary" onClick={() => fileInput.current.click()}>
                  <Camera size={16} />
                  Add photo
                </button>
              )}
            </div>
          )}

          {error && (
            <div className="form-error" role="alert">
              <CircleAlert size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="action-buttons">
            <button type="button" className="btn btn-secondary" onClick={() => setAction(null)} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className={`btn ${action.tone === 'danger' ? 'btn-danger' : 'btn-primary'}`} disabled={busy}>
              {busy && <LoaderCircle size={16} className="spin" />}
              {busy ? 'Saving' : action.to ? action.label : 'Post remark'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

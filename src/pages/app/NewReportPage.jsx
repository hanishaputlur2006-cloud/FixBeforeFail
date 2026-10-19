import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Camera,
  CircleAlert,
  Cog,
  Droplets,
  Footprints,
  Landmark,
  Lightbulb,
  LoaderCircle,
  LocateFixed,
  TrafficCone,
  Trash2,
} from 'lucide-react'
import PageHeader from '../../components/PageHeader.jsx'
import { CATEGORIES, LOCATION_TYPES, SAFETY_OPTIONS, SEVERITY_OPTIONS } from '../../lib/reportMeta.js'
import { createReport } from '../../lib/reportsApi.js'
import { compressImage } from '../../lib/imageUtils.js'
import './app.css'
import './newReport.css'

const CATEGORY_ICONS = {
  streetlights: Lightbulb,
  roads: TrafficCone,
  water: Droplets,
  pathways: Footprints,
  facilities: Landmark,
  equipment: Cog,
}

const EMPTY_FORM = {
  category: '',
  title: '',
  description: '',
  severity: '',
  safetyRisk: '',
  location: '',
  locationType: '',
  latitude: null,
  longitude: null,
}

// Mirrors the limits enforced by the database, so users see problems before submitting.
function validate(form) {
  const errors = {}
  if (!form.category) errors.category = 'Choose a category.'
  if (form.title.trim().length < 5) errors.title = 'Give a short title of at least 5 characters.'
  if (form.title.trim().length > 120) errors.title = 'Keep the title under 120 characters.'
  if (form.description.length > 2000) errors.description = 'Keep the description under 2000 characters.'
  if (!form.severity) errors.severity = 'Choose how serious it is.'
  if (!form.safetyRisk) errors.safetyRisk = 'Tell us whether anyone is in danger.'
  if (form.location.trim().length < 3) errors.location = 'Describe where the problem is.'
  if (form.location.trim().length > 200) errors.location = 'Keep the location under 200 characters.'
  return errors
}

function FieldError({ message }) {
  return message ? <p className="field-error">{message}</p> : null
}

export default function NewReportPage() {
  const navigate = useNavigate()
  const fileInput = useRef(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [photo, setPhoto] = useState(null) // { blob, previewUrl }
  const [photoBusy, setPhotoBusy] = useState(false)
  const [locating, setLocating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Free the preview image from memory when it changes or the page closes.
  useEffect(() => () => photo && URL.revokeObjectURL(photo.previewUrl), [photo])

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  async function handlePhoto(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPhotoBusy(true)
    setErrors((er) => ({ ...er, photo: undefined }))
    try {
      const blob = await compressImage(file)
      setPhoto({ blob, previewUrl: URL.createObjectURL(blob) })
    } catch (err) {
      setErrors((er) => ({ ...er, photo: err.message }))
    } finally {
      setPhotoBusy(false)
    }
  }

  function locateMe() {
    if (!navigator.geolocation) {
      setErrors((er) => ({ ...er, coords: 'Your browser cannot share its location.' }))
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({ ...f, latitude: pos.coords.latitude, longitude: pos.coords.longitude }))
        setErrors((er) => ({ ...er, coords: undefined }))
        setLocating(false)
      },
      () => {
        setErrors((er) => ({ ...er, coords: 'Location access was denied or unavailable. You can still describe the place.' }))
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitError('')
    const found = validate(form)
    setErrors(found)
    if (Object.keys(found).length) {
      document.querySelector('.field-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setSubmitting(true)
    try {
      const ref = await createReport(
        { ...form, title: form.title.trim(), description: form.description.trim(), location: form.location.trim() },
        photo?.blob,
      )
      navigate(`/app/reports/${ref}`, { replace: true, state: { justCreated: true } })
    } catch (err) {
      setSubmitError(err.message || 'The report could not be saved. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Report an issue"
        description="Tell us what is wrong and where. Your report is scored and sent to the authorities for review."
      />

      <form className="report-form" onSubmit={handleSubmit} noValidate>
        {/* 1. What */}
        <section className="card form-section">
          <h2>What is the problem?</h2>

          <fieldset className="field">
            <legend>Category</legend>
            <div className="category-grid">
              {Object.entries(CATEGORIES).map(([key, label]) => {
                const Icon = CATEGORY_ICONS[key]
                return (
                  <label key={key} className={`choice-tile ${form.category === key ? 'is-selected' : ''}`}>
                    <input
                      type="radio"
                      name="category"
                      value={key}
                      checked={form.category === key}
                      onChange={() => update('category', key)}
                    />
                    <Icon size={20} strokeWidth={1.75} />
                    <span>{label}</span>
                  </label>
                )
              })}
            </div>
            <FieldError message={errors.category} />
          </fieldset>

          <label className="field">
            <span>Title</span>
            <input
              className="input"
              placeholder="For example: Streetlight not working"
              maxLength={120}
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
            />
            <FieldError message={errors.title} />
          </label>

          <label className="field">
            <span>
              Description <em>optional</em>
            </span>
            <textarea
              className="input textarea"
              rows={4}
              maxLength={2000}
              placeholder="What did you see? How long has it been like this?"
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
            />
            <FieldError message={errors.description} />
          </label>
        </section>

        {/* 2. How serious */}
        <section className="card form-section">
          <h2>How serious is it?</h2>

          <fieldset className="field">
            <legend>Severity</legend>
            <div className="option-grid option-grid-4">
              {SEVERITY_OPTIONS.map((o) => (
                <label key={o.value} className={`choice-option ${form.severity === o.value ? 'is-selected' : ''}`}>
                  <input
                    type="radio"
                    name="severity"
                    value={o.value}
                    checked={form.severity === o.value}
                    onChange={() => update('severity', o.value)}
                  />
                  <strong>{o.label}</strong>
                  <span>{o.hint}</span>
                </label>
              ))}
            </div>
            <FieldError message={errors.severity} />
          </fieldset>

          <fieldset className="field">
            <legend>Is anyone in danger?</legend>
            <div className="option-grid option-grid-3">
              {SAFETY_OPTIONS.map((o) => (
                <label
                  key={o.value}
                  className={`choice-option ${form.safetyRisk === o.value ? 'is-selected' : ''} ${
                    o.value === 'immediate' ? 'choice-danger' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="safetyRisk"
                    value={o.value}
                    checked={form.safetyRisk === o.value}
                    onChange={() => update('safetyRisk', o.value)}
                  />
                  <strong>{o.label}</strong>
                  <span>{o.hint}</span>
                </label>
              ))}
            </div>
            <FieldError message={errors.safetyRisk} />
          </fieldset>
        </section>

        {/* 3. Where */}
        <section className="card form-section">
          <h2>Where is it?</h2>

          <label className="field">
            <span>Location</span>
            <input
              className="input"
              placeholder="Street, landmark or area, for example: MG Road near the bus stop"
              maxLength={200}
              value={form.location}
              onChange={(e) => update('location', e.target.value)}
            />
            <FieldError message={errors.location} />
          </label>

          <div className="form-row">
            <label className="field">
              <span>
                Type of place <em>optional</em>
              </span>
              <select className="input" value={form.locationType} onChange={(e) => update('locationType', e.target.value)}>
                <option value="">Not sure</option>
                {Object.entries(LOCATION_TYPES).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <div className="field">
              <span>
                Exact position <em>optional</em>
              </span>
              <button type="button" className="btn btn-secondary locate-btn" onClick={locateMe} disabled={locating}>
                {locating ? <LoaderCircle size={16} className="spin" /> : <LocateFixed size={16} />}
                {form.latitude != null
                  ? `${form.latitude.toFixed(5)}, ${form.longitude.toFixed(5)}`
                  : locating
                    ? 'Finding your location'
                    : 'Use my current location'}
              </button>
              <FieldError message={errors.coords} />
            </div>
          </div>
        </section>

        {/* 4. Photo */}
        <section className="card form-section">
          <h2>
            Photo <em>optional, but helps a lot</em>
          </h2>

          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handlePhoto} />

          {photo ? (
            <div className="photo-preview">
              <img src={photo.previewUrl} alt="Selected photo of the problem" />
              <div className="photo-preview-actions">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileInput.current.click()}>
                  <Camera size={14} />
                  Replace
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPhoto(null)}>
                  <Trash2 size={14} />
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="photo-drop" onClick={() => fileInput.current.click()} disabled={photoBusy}>
              {photoBusy ? <LoaderCircle size={22} className="spin" /> : <Camera size={22} strokeWidth={1.75} />}
              <strong>{photoBusy ? 'Preparing photo' : 'Add a photo'}</strong>
              <span>JPEG, PNG or WebP. Large photos are resized automatically.</span>
            </button>
          )}
          <FieldError message={errors.photo} />
        </section>

        {submitError && (
          <div className="form-error" role="alert">
            <CircleAlert size={16} />
            <span>{submitError}</span>
          </div>
        )}

        <div className="form-actions">
          <button type="button" className="btn btn-secondary btn-lg" onClick={() => navigate('/app')} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary btn-lg" disabled={submitting || photoBusy}>
            {submitting && <LoaderCircle size={16} className="spin" />}
            {submitting ? 'Submitting report' : 'Submit report'}
          </button>
        </div>
      </form>
    </>
  )
}

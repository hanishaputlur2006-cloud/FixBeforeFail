import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  CircleAlert,
  Cog,
  Droplets,
  Footprints,
  Landmark,
  Lightbulb,
  LoaderCircle,
  LocateFixed,
  MapPinned,
  TrafficCone,
  Trash2,
  Users,
} from 'lucide-react'
import PageHeader from '../../components/PageHeader.jsx'
import { StatusBadge } from '../../components/Badges.jsx'
import { useFeedback } from '../../components/Feedback.jsx'
import { CATEGORIES, LOCATION_TYPES, SAFETY_OPTIONS, SEVERITY_OPTIONS } from '../../lib/reportMeta.js'
import { createReport, fetchNearbyReports, supportReport } from '../../lib/reportsApi.js'
import { compressImage } from '../../lib/imageUtils.js'
import './app.css'
import './newReport.css'

// The map library is large, so the picker loads only when the location step opens.
const LocationPicker = lazy(() => import('./LocationPicker.jsx'))

const CATEGORY_ICONS = {
  streetlights: Lightbulb,
  roads: TrafficCone,
  water: Droplets,
  pathways: Footprints,
  facilities: Landmark,
  equipment: Cog,
}

const STEPS = ['Photo', 'Problem', 'Seriousness', 'Location', 'Review']

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

// Checks for each step. Mirrors the limits enforced by the database.
function validateStep(step, form) {
  const e = {}
  if (step === 1) {
    if (!form.category) e.category = 'Choose a category.'
    if (form.title.trim().length < 5) e.title = 'Give a short title of at least 5 characters.'
    if (form.title.trim().length > 120) e.title = 'Keep the title under 120 characters.'
    if (form.description.length > 2000) e.description = 'Keep the description under 2000 characters.'
  }
  if (step === 2) {
    if (!form.severity) e.severity = 'Choose how serious it is.'
    if (!form.safetyRisk) e.safetyRisk = 'Tell us whether anyone is in danger.'
  }
  if (step === 3) {
    if (form.location.trim().length < 3) e.location = 'Describe where the problem is.'
    if (form.location.trim().length > 200) e.location = 'Keep the location under 200 characters.'
  }
  return e
}

function FieldError({ message }) {
  return message ? <p className="field-error">{message}</p> : null
}

// Street address for a map position, from OpenStreetMap's free Nominatim service.
async function addressFor(latitude, longitude) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&lat=${latitude}&lon=${longitude}`
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
  if (!res.ok) throw new Error('Address lookup failed')
  const data = await res.json()
  return (data.display_name ?? '').split(',').slice(0, 3).join(',').trim().slice(0, 200)
}

// Shows open reports of the same category close to the chosen position, so the
// citizen can confirm an existing report instead of filing a duplicate.
function NearbyReports({ latitude, longitude, category }) {
  const navigate = useNavigate()
  const { confirm, toast } = useFeedback()
  const [nearby, setNearby] = useState([])
  const [busy, setBusy] = useState(null)

  useEffect(() => {
    if (latitude == null || !category) {
      setNearby([])
      return undefined
    }
    let cancelled = false
    const timer = setTimeout(() => {
      fetchNearbyReports(latitude, longitude, category)
        .then((list) => !cancelled && setNearby(list))
        .catch(() => !cancelled && setNearby([]))
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [latitude, longitude, category])

  if (!nearby.length) return null

  async function seeThisToo(r) {
    const ok = await confirm({
      title: 'Is this the same problem?',
      message: `Confirming ${r.id} adds your voice to the existing report and raises its priority. You will get updates on its repair. Your new report will not be submitted.`,
      confirmLabel: 'Yes, I see this too',
    })
    if (!ok) return
    setBusy(r.uuid)
    try {
      await supportReport(r.uuid)
      toast(`Thanks. Your confirmation was added to ${r.id}.`)
      navigate(`/app/reports/${r.id}`, { replace: true })
    } catch (err) {
      toast(err.message, 'error')
      setBusy(null)
    }
  }

  return (
    <div className="nearby" role="region" aria-label="Already reported nearby">
      <div className="nearby-head">
        <Users size={18} />
        <div>
          <strong>Already reported nearby?</strong>
          <p>If one of these is the same problem, confirm it instead. It helps the repair happen sooner.</p>
        </div>
      </div>
      <ul>
        {nearby.map((r) => (
          <li key={r.uuid}>
            <div className="nearby-info">
              <span className="nearby-title">{r.title}</span>
              <span className="nearby-meta">
                {r.id} &middot; {r.distance} m away &middot; {r.reports} {r.reports === 1 ? 'report' : 'reports'}
              </span>
              <StatusBadge status={r.status} />
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => seeThisToo(r)} disabled={busy !== null}>
              {busy === r.uuid ? <LoaderCircle size={14} className="spin" /> : <Check size={14} />}
              I see this too
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function NewReportPage() {
  const navigate = useNavigate()
  const fileInput = useRef(null)
  const { toast } = useFeedback()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [photo, setPhoto] = useState(null) // { blob, previewUrl }
  const [photoBusy, setPhotoBusy] = useState(false)
  const [locating, setLocating] = useState(false)
  const [lookingUp, setLookingUp] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => () => photo && URL.revokeObjectURL(photo.previewUrl), [photo])

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  function setPosition(pos) {
    setForm((f) => ({ ...f, latitude: pos?.latitude ?? null, longitude: pos?.longitude ?? null }))
    setErrors((e) => ({ ...e, coords: undefined }))
  }

  function next() {
    const found = validateStep(step, form)
    setErrors(found)
    if (Object.keys(found).length) return
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function back() {
    setErrors({})
    setStep((s) => Math.max(s - 1, 0))
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
      setErrors((er) => ({ ...er, coords: 'Your browser cannot share its location. Tap the map instead.' }))
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ latitude: pos.coords.latitude, longitude: pos.coords.longitude })
        setLocating(false)
      },
      () => {
        setErrors((er) => ({ ...er, coords: 'Location access was denied or unavailable. Tap the map to place the pin.' }))
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  async function fillAddress() {
    setLookingUp(true)
    try {
      const address = await addressFor(form.latitude, form.longitude)
      if (address) update('location', address)
    } catch {
      toast('Could not look up the address. Please type it instead.', 'error')
    } finally {
      setLookingUp(false)
    }
  }

  async function submit() {
    setSubmitError('')
    for (const s of [1, 2, 3]) {
      const found = validateStep(s, form)
      if (Object.keys(found).length) {
        setErrors(found)
        setStep(s)
        return
      }
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

  const severity = SEVERITY_OPTIONS.find((o) => o.value === form.severity)
  const safety = SAFETY_OPTIONS.find((o) => o.value === form.safetyRisk)
  const hasPin = form.latitude != null

  return (
    <>
      <PageHeader title="Report an issue" description="Five quick steps. Your report is scored and sent to the authorities for review." />

      <ol className="stepper" aria-label="Progress">
        {STEPS.map((label, i) => (
          <li key={label} className={i === step ? 'is-current' : i < step ? 'is-done' : ''} aria-current={i === step ? 'step' : undefined}>
            <button type="button" onClick={() => i < step && setStep(i)} disabled={i >= step}>
              <span className="stepper-num mono">{i < step ? <Check size={14} /> : i + 1}</span>
              <span className="stepper-label">{label}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="report-form">
        <section className="card form-section">
          {/* Step 1: Photo */}
          {step === 0 && (
            <>
              <div>
                <h2>Add a photo of the problem</h2>
                <p className="step-hint">A clear photo helps the authorities judge the problem without a site visit. You can skip this.</p>
              </div>
              <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" hidden onChange={handlePhoto} />
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
                <button type="button" className="photo-drop photo-drop-lg" onClick={() => fileInput.current.click()} disabled={photoBusy}>
                  {photoBusy ? <LoaderCircle size={26} className="spin" /> : <Camera size={26} strokeWidth={1.75} />}
                  <strong>{photoBusy ? 'Preparing photo' : 'Take or choose a photo'}</strong>
                  <span>JPEG, PNG or WebP. Large photos are resized automatically.</span>
                </button>
              )}
              <FieldError message={errors.photo} />
            </>
          )}

          {/* Step 2: What */}
          {step === 1 && (
            <>
              <h2>What is the problem?</h2>
              <fieldset className="field">
                <legend>Category</legend>
                <div className="category-grid">
                  {Object.entries(CATEGORIES).map(([key, label]) => {
                    const Icon = CATEGORY_ICONS[key]
                    return (
                      <label key={key} className={`choice-tile ${form.category === key ? 'is-selected' : ''}`}>
                        <input type="radio" name="category" value={key} checked={form.category === key} onChange={() => update('category', key)} />
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
                <input className="input" placeholder="For example: Streetlight not working" maxLength={120} value={form.title} onChange={(e) => update('title', e.target.value)} />
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
            </>
          )}

          {/* Step 3: How serious */}
          {step === 2 && (
            <>
              <h2>How serious is it?</h2>
              <fieldset className="field">
                <legend>Severity</legend>
                <div className="option-grid option-grid-4">
                  {SEVERITY_OPTIONS.map((o) => (
                    <label key={o.value} className={`choice-option ${form.severity === o.value ? 'is-selected' : ''}`}>
                      <input type="radio" name="severity" value={o.value} checked={form.severity === o.value} onChange={() => update('severity', o.value)} />
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
                      className={`choice-option ${form.safetyRisk === o.value ? 'is-selected' : ''} ${o.value === 'immediate' ? 'choice-danger' : ''}`}
                    >
                      <input type="radio" name="safetyRisk" value={o.value} checked={form.safetyRisk === o.value} onChange={() => update('safetyRisk', o.value)} />
                      <strong>{o.label}</strong>
                      <span>{o.hint}</span>
                    </label>
                  ))}
                </div>
                <FieldError message={errors.safetyRisk} />
              </fieldset>
            </>
          )}

          {/* Step 4: Where */}
          {step === 3 && (
            <>
              <div>
                <h2>Where is it?</h2>
                <p className="step-hint">Tap the map to place the pin, or use your current location. Drag the pin to adjust it.</p>
              </div>

              <div className="locate-row">
                <button type="button" className="btn btn-secondary" onClick={locateMe} disabled={locating}>
                  {locating ? <LoaderCircle size={16} className="spin" /> : <LocateFixed size={16} />}
                  {locating ? 'Finding your location' : 'Use my current location'}
                </button>
                {hasPin && (
                  <span className="locate-coords mono">
                    {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}
                  </span>
                )}
              </div>
              <FieldError message={errors.coords} />

              <Suspense fallback={<div className="map picker-map photo-placeholder" />}>
                <LocationPicker value={hasPin ? { latitude: form.latitude, longitude: form.longitude } : null} onChange={setPosition} />
              </Suspense>

              <NearbyReports latitude={form.latitude} longitude={form.longitude} category={form.category} />

              <label className="field">
                <span>Location description</span>
                <div className="input-with-action">
                  <input
                    className="input"
                    placeholder="Street, landmark or area, for example: MG Road near the bus stop"
                    maxLength={200}
                    value={form.location}
                    onChange={(e) => update('location', e.target.value)}
                  />
                  {hasPin && (
                    <button type="button" className="btn btn-secondary" onClick={fillAddress} disabled={lookingUp}>
                      {lookingUp ? <LoaderCircle size={16} className="spin" /> : <MapPinned size={16} />}
                      Fill from pin
                    </button>
                  )}
                </div>
                <FieldError message={errors.location} />
              </label>

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
            </>
          )}

          {/* Step 5: Review */}
          {step === 4 && (
            <>
              <h2>Check your report</h2>
              <dl className="review">
                {[
                  ['Photo', photo ? <img src={photo.previewUrl} alt="Your photo" className="review-photo" /> : 'No photo', 0],
                  ['Category', CATEGORIES[form.category], 1],
                  ['Title', form.title.trim(), 1],
                  ['Description', form.description.trim() || 'None', 1],
                  ['Severity', severity?.label, 2],
                  ['Danger', safety?.label, 2],
                  ['Location', form.location.trim(), 3],
                  ['Type of place', LOCATION_TYPES[form.locationType] ?? 'Not specified', 3],
                  ['Map position', hasPin ? `${form.latitude.toFixed(5)}, ${form.longitude.toFixed(5)}` : 'Not set', 3],
                ].map(([label, value, target]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                    <button type="button" className="review-edit" onClick={() => setStep(target)}>
                      Edit
                    </button>
                  </div>
                ))}
              </dl>
              {!hasPin && <p className="step-hint">Without a map position the report will not appear on the map, and nearby duplicates cannot be checked.</p>}
            </>
          )}
        </section>

        {submitError && (
          <div className="form-error" role="alert">
            <CircleAlert size={16} />
            <span>{submitError}</span>
          </div>
        )}

        <div className="form-actions">
          {step === 0 ? (
            <button type="button" className="btn btn-secondary btn-lg" onClick={() => navigate('/app')}>
              Cancel
            </button>
          ) : (
            <button type="button" className="btn btn-secondary btn-lg" onClick={back} disabled={submitting}>
              <ArrowLeft size={16} />
              Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button type="button" className="btn btn-primary btn-lg" onClick={next} disabled={photoBusy}>
              {step === 0 && !photo ? 'Continue without photo' : 'Continue'}
              <ArrowRight size={16} />
            </button>
          ) : (
            <button type="button" className="btn btn-primary btn-lg" onClick={submit} disabled={submitting}>
              {submitting && <LoaderCircle size={16} className="spin" />}
              {submitting ? 'Submitting report' : 'Submit report'}
            </button>
          )}
        </div>
      </div>
    </>
  )
}

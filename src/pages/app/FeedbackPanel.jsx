import { useState } from 'react'
import { CircleAlert, LoaderCircle, Star } from 'lucide-react'
import { fetchFeedback, submitFeedback } from '../../lib/reportsApi.js'
import { useAsync } from '../../lib/useAsync.js'
import { useAuth } from '../../lib/auth.jsx'
import { useFeedback } from '../../components/Feedback.jsx'
import { formatDate } from '../../lib/format.js'

const LABELS = ['', 'Not fixed', 'Poor', 'Acceptable', 'Good', 'Excellent']

function Stars({ value }) {
  return (
    <span className="stars" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={18} className={n <= value ? 'is-on' : ''} aria-hidden="true" />
      ))}
    </span>
  )
}

// After a repaired report is closed, the citizen who reported it rates the repair.
// A rating of 1 or 2 alerts the authorities, who can reopen the report.
export default function FeedbackPanel({ report, onChanged }) {
  const { profile } = useAuth()
  const { toast } = useFeedback()
  const { data: feedback, loading, reload } = useAsync(() => fetchFeedback(report.uuid), [report.uuid])
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const repairedAndClosed = report.status === 'closed' && report.resolvedAt && !report.duplicateOf
  if (!repairedAndClosed || loading) return null

  const isReporter = report.reporter?.id === profile.id

  if (feedback) {
    return (
      <section className="card detail-card">
        <h2>Citizen rating</h2>
        <div className="rating-result">
          <Stars value={feedback.rating} />
          <strong>{LABELS[feedback.rating]}</strong>
        </div>
        {feedback.comment && <p className="rating-comment">{feedback.comment}</p>}
        <p className="rating-date">Rated on {formatDate(feedback.created_at)}</p>
      </section>
    )
  }

  if (!isReporter) return null

  async function submit(e) {
    e.preventDefault()
    if (!rating) return setError('Choose a rating.')
    if (rating <= 2 && !comment.trim()) return setError('Please tell us what is still wrong.')
    setBusy(true)
    setError('')
    try {
      await submitFeedback(report.uuid, rating, comment.trim())
      toast(rating <= 2 ? 'Thanks. The authorities have been alerted to check the repair again.' : 'Thanks for rating the repair.')
      reload()
      onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card detail-card">
      <h2>How was the repair?</h2>
      <form className="action-form" onSubmit={submit} noValidate>
        <div className="rating-input" role="radiogroup" aria-label="Rating from 1 to 5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n}: ${LABELS[n]}`}
              className={n <= rating ? 'is-on' : ''}
              onClick={() => setRating(n)}
            >
              <Star size={26} />
            </button>
          ))}
          {rating > 0 && <span className="rating-label">{LABELS[rating]}</span>}
        </div>

        <label className="field">
          <span>
            Comment <em>{rating && rating <= 2 ? 'required' : 'optional'}</em>
          </span>
          <textarea
            className="input textarea"
            rows={3}
            maxLength={1000}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={rating && rating <= 2 ? 'What is still wrong?' : 'Anything you would like to add'}
          />
        </label>

        {error && (
          <div className="form-error" role="alert">
            <CircleAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className="action-buttons">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy && <LoaderCircle size={16} className="spin" />}
            Submit rating
          </button>
        </div>
      </form>
    </section>
  )
}

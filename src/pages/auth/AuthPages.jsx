import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { CircleAlert, LoaderCircle, MailCheck } from 'lucide-react'
import SiteHeader from '../../components/SiteHeader.jsx'
import { useAuth } from '../../lib/auth.jsx'
import './auth.css'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Supabase error messages are technical; show friendlier ones where we can.
function friendlyError(error) {
  const msg = error?.message ?? ''
  if (/invalid login credentials/i.test(msg)) return 'Incorrect email or password.'
  if (/email not confirmed/i.test(msg)) return 'Please confirm your email first. Check your inbox for the confirmation link.'
  if (/already registered/i.test(msg)) return 'An account with this email already exists. Try logging in instead.'
  if (/rate limit/i.test(msg)) return 'Too many attempts. Please wait a few minutes and try again.'
  return msg || 'Something went wrong. Please try again.'
}

function AuthShell({ title, subtitle, children, footer }) {
  return (
    <>
      <SiteHeader />
      <main className="auth">
        <div className="auth-card card">
          <h1>{title}</h1>
          {subtitle && <p className="auth-subtitle">{subtitle}</p>}
          {children}
        </div>
        {footer && <p className="auth-footer">{footer}</p>}
      </main>
    </>
  )
}

function FormError({ message }) {
  if (!message) return null
  return (
    <div className="form-error" role="alert">
      <CircleAlert size={16} />
      <span>{message}</span>
    </div>
  )
}

export function LoginPage() {
  const { session, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Where to go after logging in: the page they tried to open, or the dashboard.
  const destination = location.state?.from ?? '/app'

  if (session) return <Navigate to={destination} replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!EMAIL_PATTERN.test(email.trim())) return setError('Enter a valid email address.')
    if (!password) return setError('Enter your password.')

    setSubmitting(true)
    const { error: signInError } = await signIn(email.trim(), password)
    setSubmitting(false)

    if (signInError) setError(friendlyError(signInError))
    else navigate(destination, { replace: true })
  }

  return (
    <AuthShell
      title="Log in"
      subtitle="Welcome back. Log in to report issues and track repairs."
      footer={
        <>
          New to FixBeforeFail? <Link to="/register">Create an account</Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <FormError message={error} />
        <label className="field">
          <span>Email</span>
          <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={submitting}>
          {submitting && <LoaderCircle size={16} className="spin" />}
          {submitting ? 'Logging in' : 'Log in'}
        </button>
      </form>
    </AuthShell>
  )
}

export function RegisterPage() {
  const { session, signUp } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false)

  if (session) return <Navigate to="/app" replace />

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const fullName = form.fullName.trim()
    const email = form.email.trim()
    if (fullName.length < 2) return setError('Enter your full name.')
    if (!EMAIL_PATTERN.test(email)) return setError('Enter a valid email address.')
    if (form.password.length < 8) return setError('Use a password of at least 8 characters.')

    setSubmitting(true)
    const { data, error: signUpError } = await signUp(fullName, email, form.password)
    setSubmitting(false)

    if (signUpError) return setError(friendlyError(signUpError))
    // If email confirmation is on, there is no session until the link is clicked.
    if (data.session) navigate('/app', { replace: true })
    else setAwaitingConfirmation(true)
  }

  if (awaitingConfirmation) {
    return (
      <AuthShell title="Check your email">
        <div className="auth-confirm">
          <span className="icon-box">
            <MailCheck size={20} strokeWidth={1.75} />
          </span>
          <p>
            We sent a confirmation link to <strong>{form.email.trim()}</strong>. Open it to activate your account, then
            log in.
          </p>
          <Link to="/login" className="btn btn-secondary">
            Go to log in
          </Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Create an account"
      subtitle="Report infrastructure problems and follow every repair."
      footer={
        <>
          Already have an account? <Link to="/login">Log in</Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <FormError message={error} />
        <label className="field">
          <span>Full name</span>
          <input className="input" autoComplete="name" value={form.fullName} onChange={(e) => update('fullName', e.target.value)} />
        </label>
        <label className="field">
          <span>Email</span>
          <input className="input" type="email" autoComplete="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
          />
          <small>At least 8 characters.</small>
        </label>
        <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={submitting}>
          {submitting && <LoaderCircle size={16} className="spin" />}
          {submitting ? 'Creating account' : 'Create account'}
        </button>
        <p className="auth-note">New accounts are citizen accounts. Authority and crew access is granted by an administrator.</p>
      </form>
    </AuthShell>
  )
}

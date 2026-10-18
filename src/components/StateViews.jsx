import { CircleAlert, Inbox, LoaderCircle } from 'lucide-react'
import './ui.css'

// Consistent messages for "nothing here", "loading" and "something went wrong".

export function EmptyState({ title, message, action, icon: Icon = Inbox }) {
  return (
    <div className="state-view">
      <span className="icon-box">
        <Icon size={20} strokeWidth={1.75} />
      </span>
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {action}
    </div>
  )
}

export function LoadingState({ label = 'Loading' }) {
  return (
    <div className="state-view" role="status">
      <LoaderCircle size={22} className="spin" aria-hidden="true" />
      <p>{label}...</p>
    </div>
  )
}

export function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <div className="state-view state-view-error" role="alert">
      <span className="icon-box">
        <CircleAlert size={20} strokeWidth={1.75} />
      </span>
      <h3>Could not load this page</h3>
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn btn-secondary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}

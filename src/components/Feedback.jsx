import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { CircleAlert, CircleCheck, X } from 'lucide-react'
import './Feedback.css'

// App-wide feedback: short "toast" messages after actions, and a confirmation
// dialog styled like the app (instead of the browser's window.confirm).

const FeedbackContext = createContext(null)

export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [dialog, setDialog] = useState(null) // { title, message, confirmLabel, danger, resolve }
  const nextId = useRef(1)

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), [])

  const toast = useCallback(
    (message, type = 'success') => {
      const id = nextId.current++
      setToasts((list) => [...list.slice(-2), { id, message, type }])
      setTimeout(() => dismiss(id), type === 'error' ? 7000 : 4000)
    },
    [dismiss],
  )

  // Returns a promise that resolves to true (confirmed) or false (cancelled).
  const confirm = useCallback(
    (options) => new Promise((resolve) => setDialog({ confirmLabel: 'Confirm', ...options, resolve })),
    [],
  )

  function closeDialog(result) {
    dialog?.resolve(result)
    setDialog(null)
  }

  return (
    <FeedbackContext.Provider value={{ toast, confirm }}>
      {children}

      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`} role={t.type === 'error' ? 'alert' : 'status'}>
            {t.type === 'error' ? <CircleAlert size={18} /> : <CircleCheck size={18} />}
            <span>{t.message}</span>
            <button type="button" className="toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {dialog && <ConfirmDialog {...dialog} onClose={closeDialog} />}
    </FeedbackContext.Provider>
  )
}

function ConfirmDialog({ title, message, confirmLabel, danger, onClose }) {
  const confirmButton = useRef(null)

  useEffect(() => {
    confirmButton.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose(false)}>
      <div className="dialog card" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-message">
        <h2 id="dialog-title">{title}</h2>
        {message && (
          <p id="dialog-message" className="dialog-message">
            {message}
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={() => onClose(false)}>
            Cancel
          </button>
          <button
            ref={confirmButton}
            type="button"
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={() => onClose(true)}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function useFeedback() {
  return useContext(FeedbackContext)
}

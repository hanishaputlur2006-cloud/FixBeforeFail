import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck } from 'lucide-react'
import { useNotifications } from '../lib/notifications.js'
import { formatDateTime } from '../lib/format.js'
import './NotificationBell.css'

// Bell in the top bar with an unread count and a dropdown list.
export default function NotificationBell({ userId }) {
  const { items, error, unreadCount, markRead, markAllRead } = useNotifications(userId)
  const [open, setOpen] = useState(false)
  const wrapper = useRef(null)
  const navigate = useNavigate()

  // Close when clicking outside or pressing Escape.
  useEffect(() => {
    if (!open) return undefined
    const onClick = (e) => !wrapper.current?.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function openItem(n) {
    markRead([n.id])
    setOpen(false)
    if (n.reportRef) navigate(`/app/reports/${n.reportRef}`)
  }

  return (
    <div className="bell" ref={wrapper}>
      <button
        type="button"
        className="icon-btn"
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Bell size={18} />
        {unreadCount > 0 && <span className="bell-count mono">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {open && (
        <div className="bell-panel card" role="dialog" aria-label="Notifications">
          <div className="bell-head">
            <h2>Notifications</h2>
            {unreadCount > 0 && (
              <button type="button" className="bell-mark" onClick={markAllRead}>
                <CheckCheck size={14} />
                Mark all as read
              </button>
            )}
          </div>

          {error ? (
            <p className="bell-empty">Notifications could not be loaded.</p>
          ) : items.length === 0 ? (
            <p className="bell-empty">You are all caught up. Updates about your reports will appear here.</p>
          ) : (
            <ul className="bell-list">
              {items.map((n) => (
                <li key={n.id}>
                  <button type="button" className={`bell-item ${n.read ? '' : 'is-unread'}`} onClick={() => openItem(n)}>
                    <span className="bell-dot" aria-hidden="true" />
                    <span className="bell-text">
                      <span className="bell-msg">{n.message}</span>
                      <span className="bell-time">{formatDateTime(n.createdAt)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

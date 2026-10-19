import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase.js'

// Notifications are created by the database whenever a report changes
// (see supabase/007_notifications_and_hardening.sql). The app only reads them
// and marks them as read.

const SELECT = 'id, message, created_at, read_at, report:reports ( ref_no )'

function toNotification(row) {
  return {
    id: row.id,
    message: row.message,
    createdAt: row.created_at,
    read: Boolean(row.read_at),
    reportRef: row.report ? `FBF-${row.report.ref_no}` : null,
  }
}

// Loads the latest notifications and keeps them up to date in real time.
export function useNotifications(userId) {
  const [items, setItems] = useState([])
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('notifications')
      .select(SELECT)
      .order('created_at', { ascending: false })
      .limit(30)
    if (err) setError(err)
    else {
      setError(null)
      setItems(data.map(toNotification))
    }
  }, [])

  useEffect(() => {
    if (!userId) return undefined
    load()

    // Instant updates when a new notification is inserted for this user.
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => load(),
      )
      .subscribe()

    // Also refresh when the user comes back to the tab, in case the live connection dropped.
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('focus', onFocus)
    }
  }, [userId, load])

  async function markRead(ids) {
    if (!ids.length) return
    const now = new Date().toISOString()
    setItems((list) => list.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)))
    const { error: err } = await supabase.from('notifications').update({ read_at: now }).in('id', ids)
    if (err) load()
  }

  return {
    items,
    error,
    unreadCount: items.filter((n) => !n.read).length,
    markRead,
    markAllRead: () => markRead(items.filter((n) => !n.read).map((n) => n.id)),
  }
}

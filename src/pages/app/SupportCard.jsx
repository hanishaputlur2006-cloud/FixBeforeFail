import { useState } from 'react'
import { Check, CircleCheck, LoaderCircle } from 'lucide-react'
import { fetchMySupports, supportReport } from '../../lib/reportsApi.js'
import { isOpen } from '../../lib/reportUtils.js'
import { useAsync } from '../../lib/useAsync.js'
import { useAuth } from '../../lib/auth.jsx'
import { useFeedback } from '../../components/Feedback.jsx'

// On someone else's open report, a citizen can say "I see this too". It counts as an
// extra report of the problem (raising its priority) and the citizen gets repair updates.
export default function SupportCard({ report, onChanged }) {
  const { profile } = useAuth()
  const { confirm, toast } = useFeedback()
  const { data: supports, reload } = useAsync(fetchMySupports, [])
  const [busy, setBusy] = useState(false)

  const eligible =
    profile.role === 'citizen' && report.reporter?.id !== profile.id && !report.duplicateOf && isOpen(report)
  if (!eligible || !supports) return null

  if (supports.has(report.uuid)) {
    return (
      <section className="card detail-card support-card is-done">
        <CircleCheck size={18} />
        <p>You confirmed this problem. You will be notified as the repair progresses.</p>
      </section>
    )
  }

  async function seeThisToo() {
    const ok = await confirm({
      title: 'Do you see this problem too?',
      message: `Confirming ${report.id} counts as an extra report of the problem, which raises its priority. You will get updates on its repair.`,
      confirmLabel: 'Yes, I see this too',
    })
    if (!ok) return
    setBusy(true)
    try {
      await supportReport(report.uuid)
      toast(`Thanks. Your confirmation was added to ${report.id}.`)
      reload()
      onChanged()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card detail-card support-card">
      <h2>Seeing this problem too?</h2>
      <p>Confirming it raises its priority, so it is repaired sooner.</p>
      <button type="button" className="btn btn-primary" onClick={seeThisToo} disabled={busy}>
        {busy ? <LoaderCircle size={16} className="spin" /> : <Check size={16} />}
        I see this too
      </button>
    </section>
  )
}

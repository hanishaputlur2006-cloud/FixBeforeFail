import './Feedback.css'

// Grey placeholder shapes shown while data loads, laid out like the real page,
// so the screen does not jump when content arrives.

function Bone({ w = '100%', h = 14, style }) {
  return <span className="skeleton" style={{ width: w, height: h, ...style }} aria-hidden="true" />
}

export function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading">
      <Bone w={180} h={26} />
      <Bone w={320} style={{ marginTop: 10, marginBottom: 28 }} />
      <div className="stat-grid stat-grid-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card stat-card">
            <Bone w={90} h={12} />
            <Bone w={50} h={26} style={{ marginTop: 6 }} />
          </div>
        ))}
      </div>
      <div className="card" style={{ padding: 16 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
            <Bone w={28} h={20} />
            <div style={{ flex: 1 }}>
              <Bone w="45%" />
              <Bone w="30%" h={11} style={{ marginTop: 6 }} />
            </div>
            <Bone w={64} h={22} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function DetailSkeleton() {
  return (
    <div role="status" aria-label="Loading">
      <Bone w={140} style={{ marginBottom: 24 }} />
      <Bone w={220} h={12} />
      <Bone w="50%" h={28} style={{ margin: '12px 0 8px' }} />
      <Bone w="35%" style={{ marginBottom: 24 }} />
      <div className="detail-grid">
        <div className="card detail-card">
          <Bone w={80} />
          <Bone style={{ marginTop: 16 }} />
          <Bone w="80%" style={{ marginTop: 8 }} />
          <Bone w="60%" style={{ marginTop: 8 }} />
        </div>
        <div className="card detail-card">
          <Bone w={120} />
          <Bone w={80} h={40} style={{ marginTop: 16 }} />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Bone key={i} h={10} style={{ marginTop: 14 }} />
          ))}
        </div>
      </div>
    </div>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import PageHeader from '../../components/PageHeader.jsx'
import { ErrorState, LoadingState } from '../../components/StateViews.jsx'
import { PRIORITY, PRIORITY_ORDER } from '../../lib/reportMeta.js'
import { fetchReports } from '../../lib/reportsApi.js'
import { getPriority, isOpen } from '../../lib/reportUtils.js'
import { useAsync } from '../../lib/useAsync.js'
import { useAuth } from '../../lib/auth.jsx'
import './app.css'
import './map.css'

// Marker style per priority. Size also grows with priority, so the map
// does not rely on colour alone.
const MARKER = {
  critical: { fill: '#c9302c', stroke: '#8f1f1c', radius: 10 },
  high: { fill: '#d98a1c', stroke: '#8a5500', radius: 8.5 },
  medium: { fill: '#e3c56d', stroke: '#8a6a00', radius: 7 },
  low: { fill: '#8392a6', stroke: '#4d5b6e', radius: 6 },
}

// Shown when no report has a GPS position yet (centre of India).
const DEFAULT_VIEW = { center: [22.5, 79], zoom: 5 }

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}

export default function MapPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { data: reports, loading, error, reload } = useAsync(fetchReports, [])
  const [showClosed, setShowClosed] = useState(false)
  const mapEl = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)

  // Workers see their own jobs; authorities see every issue. Merged duplicates are hidden.
  const visible = useMemo(() => {
    if (!reports) return []
    return reports.filter(
      (r) =>
        !r.duplicateOf &&
        (profile.role !== 'worker' || r.assignee?.id === profile.id) &&
        (showClosed || isOpen(r)),
    )
  }, [reports, profile, showClosed])

  const located = useMemo(() => visible.filter((r) => r.latitude != null && r.longitude != null), [visible])
  const missing = visible.length - located.length

  // Create the map once, as soon as the page has rendered its container.
  const ready = Boolean(reports)
  useEffect(() => {
    if (!ready || !mapEl.current || mapRef.current) return undefined
    const map = L.map(mapEl.current, { scrollWheelZoom: true }).setView(DEFAULT_VIEW.center, DEFAULT_VIEW.zoom)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)
    layerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [ready])

  // Redraw markers whenever the visible reports change.
  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return
    layer.clearLayers()

    // Draw low priority first so critical markers sit on top.
    const sorted = [...located].sort((a, b) => a.score - b.score)
    for (const r of sorted) {
      const level = getPriority(r.score)
      const style = MARKER[level]
      L.circleMarker([r.latitude, r.longitude], {
        radius: style.radius,
        color: '#ffffff',
        weight: 2,
        fillColor: style.fill,
        fillOpacity: 1,
      })
        .bindTooltip(
          `<strong>${escapeHtml(r.title)}</strong><br>${r.id} &middot; Score ${r.score} &middot; ${PRIORITY[level].label}`,
          { direction: 'top', offset: [0, -style.radius] },
        )
        .on('click', () => navigate(`/app/reports/${r.id}`))
        .addTo(layer)
    }

    if (located.length === 1) map.setView([located[0].latitude, located[0].longitude], 16)
    else if (located.length > 1) {
      map.fitBounds(L.latLngBounds(located.map((r) => [r.latitude, r.longitude])), { padding: [40, 40], maxZoom: 16 })
    }
  }, [located, navigate])

  if (loading && !reports) return <LoadingState label="Loading map" />
  if (error && !reports) return <ErrorState message={error.message} onRetry={reload} />

  return (
    <>
      <PageHeader
        title="Map"
        description={
          profile.role === 'worker' ? 'Your assigned jobs by location. Click a marker to open it.' : 'Reported issues by location. Click a marker to open the report.'
        }
      />

      <div className="card map-card">
        <div className="map-toolbar">
          <ul className="map-legend" aria-label="Priority legend">
            {PRIORITY_ORDER.map((level) => (
              <li key={level}>
                <span
                  className="map-legend-dot"
                  style={{ background: MARKER[level].fill, width: MARKER[level].radius * 1.6, height: MARKER[level].radius * 1.6 }}
                />
                {PRIORITY[level].label}
              </li>
            ))}
          </ul>
          <label className="map-toggle">
            <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} />
            Show resolved and closed
          </label>
        </div>

        <div ref={mapEl} className="map" role="region" aria-label="Map of reported issues" />

        <div className="map-foot">
          {located.length} {located.length === 1 ? 'issue' : 'issues'} on the map
          {missing > 0 && (
            <>
              {' '}
              &middot; {missing} without a GPS position (not shown)
            </>
          )}
        </div>
      </div>
    </>
  )
}

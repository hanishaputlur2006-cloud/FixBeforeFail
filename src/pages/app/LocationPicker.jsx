import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './map.css'

// Centre of India, shown until a position is chosen.
const DEFAULT_VIEW = { center: [22.5, 79], zoom: 5 }

// A pin drawn with CSS, so no marker image files are needed.
const pinIcon = L.divIcon({
  className: 'picker-pin',
  html: '<span></span>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
})

/**
 * Map for choosing where the problem is. Click or tap the map to drop the pin,
 * then drag it to fine-tune. value: { latitude, longitude } or null.
 */
export default function LocationPicker({ value, onChange }) {
  const el = useRef(null)
  const map = useRef(null)
  const marker = useRef(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  // Create the map once.
  useEffect(() => {
    const m = L.map(el.current).setView(
      value ? [value.latitude, value.longitude] : DEFAULT_VIEW.center,
      value ? 17 : DEFAULT_VIEW.zoom,
    )
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(m)
    m.on('click', (e) => onChangeRef.current({ latitude: e.latlng.lat, longitude: e.latlng.lng }))
    map.current = m
    return () => {
      m.remove()
      map.current = null
      marker.current = null
    }
    // The initial position is only used when the map is first created.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep the pin in sync with the chosen position.
  useEffect(() => {
    const m = map.current
    if (!m) return
    if (!value) {
      marker.current?.remove()
      marker.current = null
      return
    }
    const latlng = [value.latitude, value.longitude]
    if (!marker.current) {
      marker.current = L.marker(latlng, { icon: pinIcon, draggable: true, keyboard: false }).addTo(m)
      marker.current.on('dragend', () => {
        const p = marker.current.getLatLng()
        onChangeRef.current({ latitude: p.lat, longitude: p.lng })
      })
    } else {
      marker.current.setLatLng(latlng)
    }
    if (!m.getBounds().contains(latlng) || m.getZoom() < 15) m.setView(latlng, Math.max(m.getZoom(), 17))
  }, [value])

  return <div ref={el} className="map picker-map" role="application" aria-label="Map. Click to place the pin where the problem is." />
}

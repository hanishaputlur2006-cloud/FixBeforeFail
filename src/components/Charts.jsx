import { useEffect, useRef, useState } from 'react'
import './Charts.css'

// Small hand-built charts (no chart library). Colours were checked for
// colour-blind separation and contrast: blue for single series, blue + teal for pairs.
export const SERIES = { primary: '#1e5fd8', secondary: '#0f9d8a' }

// Hover tooltip shared by the charts. Follows the pointer inside the chart box.
function useTooltip() {
  const [tip, setTip] = useState(null)
  const box = useRef(null)
  function show(e, content) {
    const rect = box.current.getBoundingClientRect()
    setTip({ x: e.clientX - rect.left, y: e.clientY - rect.top, content, flip: e.clientX - rect.left > rect.width * 0.6 })
  }
  const node = tip && (
    <div className={`chart-tip ${tip.flip ? 'is-flipped' : ''}`} style={{ left: tip.x, top: tip.y }} role="status">
      {tip.content}
    </div>
  )
  return { box, show, hide: () => setTip(null), node }
}

// Collapsible table with the same numbers, for screen readers and exact values.
function DataTable({ columns, rows }) {
  return (
    <details className="chart-table">
      <summary>Show data table</summary>
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className={j > 0 ? 'mono' : undefined}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  )
}

/**
 * Horizontal bars for one series. items: [{ key, label, value }]
 * Each bar is labelled with its value at the end, so no legend is needed.
 */
export function BarList({ items, unit = 'issues' }) {
  const tip = useTooltip()
  const max = Math.max(1, ...items.map((i) => i.value))

  return (
    <div className="chart" ref={tip.box}>
      <ul className="barlist">
        {items.map((item) => (
          <li
            key={item.key}
            onMouseMove={(e) => tip.show(e, `${item.label}: ${item.value} ${unit}`)}
            onMouseLeave={tip.hide}
          >
            <span className="barlist-label">{item.label}</span>
            <span className="barlist-track">
              {item.value > 0 && (
                <span className="barlist-bar" style={{ width: `${(item.value / max) * 100}%`, background: SERIES.primary }} />
              )}
            </span>
            <span className="barlist-value mono">{item.value}</span>
          </li>
        ))}
      </ul>
      {tip.node}
      <DataTable columns={['Item', 'Count']} rows={items.map((i) => [i.label, i.value])} />
    </div>
  )
}

function useWidth(ref) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
  return width
}

// Rectangle with rounded top corners only, anchored flat on the baseline.
function columnPath(x, y, w, h, r = 4) {
  if (h <= 0) return ''
  const rr = Math.min(r, w / 2, h)
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`
}

/**
 * Grouped columns over time for two series on ONE shared axis.
 * groups: [{ key, label, values: { a, b } }]; series: [{ key, label, color }]
 */
export function GroupedColumns({ groups, series, height = 220 }) {
  const tip = useTooltip()
  const width = useWidth(tip.box)
  const pad = { top: 12, right: 8, bottom: 26, left: 32 }
  const innerW = Math.max(0, width - pad.left - pad.right)
  const innerH = height - pad.top - pad.bottom

  const maxValue = Math.max(1, ...groups.flatMap((g) => series.map((s) => g.values[s.key])))
  const step = Math.max(1, Math.ceil(maxValue / 4))
  const top = step * Math.ceil(maxValue / step)
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step)

  const groupW = groups.length ? innerW / groups.length : 0
  const gap = 2
  const barW = Math.max(2, Math.min(18, (groupW * 0.7 - gap) / series.length))
  const y = (v) => pad.top + innerH - (v / top) * innerH
  const labelEvery = groups.length > 8 && innerW < 560 ? 3 : groups.length > 8 ? 2 : 1

  return (
    <div className="chart" ref={tip.box}>
      <ul className="chart-legend">
        {series.map((s) => (
          <li key={s.key}>
            <span className="chart-swatch" style={{ background: s.color }} />
            {s.label}
          </li>
        ))}
      </ul>

      {width > 0 && (
        <svg width={width} height={height} className="columns" role="img" aria-label={series.map((s) => s.label).join(' and ') + ' per week'}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} className={t === 0 ? 'axis-base' : 'axis-grid'} />
              <text x={pad.left - 8} y={y(t)} className="axis-label" textAnchor="end" dominantBaseline="middle">
                {t}
              </text>
            </g>
          ))}

          {groups.map((g, i) => {
            const groupX = pad.left + i * groupW
            const startX = groupX + (groupW - (barW * series.length + gap * (series.length - 1))) / 2
            return (
              <g
                key={g.key}
                onMouseMove={(e) =>
                  tip.show(
                    e,
                    <>
                      <strong>Week of {g.label}</strong>
                      {series.map((s) => (
                        <span key={s.key} className="chart-tip-row">
                          <span className="chart-swatch" style={{ background: s.color }} />
                          {s.label}: {g.values[s.key]}
                        </span>
                      ))}
                    </>,
                  )
                }
                onMouseLeave={tip.hide}
              >
                {/* Invisible hit area, larger than the bars */}
                <rect x={groupX} y={pad.top} width={groupW} height={innerH} fill="transparent" />
                {series.map((s, j) => {
                  const v = g.values[s.key]
                  const x = startX + j * (barW + gap)
                  return <path key={s.key} d={columnPath(x, y(v), barW, y(0) - y(v))} fill={s.color} />
                })}
                {i % labelEvery === 0 && (
                  <text x={groupX + groupW / 2} y={height - 8} className="axis-label" textAnchor="middle">
                    {g.label}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      )}
      {tip.node}
      <DataTable
        columns={['Week of', ...series.map((s) => s.label)]}
        rows={groups.map((g) => [g.label, ...series.map((s) => g.values[s.key])])}
      />
    </div>
  )
}

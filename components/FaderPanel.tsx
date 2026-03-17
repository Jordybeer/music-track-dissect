'use client'

import { useRef } from 'react'
import { useProjectStore } from '@/store/projectStore'
import { useAudioEngine } from '@/hooks/useAudioEngine'

const MIN_DB = -60
const MAX_DB = 6

function dbToPercent(db: number) {
  return ((db - MIN_DB) / (MAX_DB - MIN_DB)) * 100
}
function percentToDb(pct: number) {
  return MIN_DB + (pct / 100) * (MAX_DB - MIN_DB)
}

// ─── Pan Knob ────────────────────────────────────────────────────────────────
// Drag vertically to pan; double-click to reset center.
function PanKnob({ value, color, onChange }: {
  value: number   // -1 (L) → 0 (C) → 1 (R)
  color: string
  onChange: (v: number) => void
}) {
  const dragRef = useRef<{ startY: number; startVal: number } | null>(null)
  const SIZE = 28
  const DRAG_RANGE = 60   // px to sweep full range

  // Arc from -135° to +135° (270° total)
  const angle = -135 + (value + 1) / 2 * 270   // degrees
  const rad   = (angle * Math.PI) / 180
  const cx = SIZE / 2
  const cy = SIZE / 2
  const r  = 10

  // Filled arc from center (0°) to current angle
  function arcPath(startDeg: number, endDeg: number, radius: number) {
    const s = ((startDeg - 90) * Math.PI) / 180
    const e = ((endDeg   - 90) * Math.PI) / 180
    const x1 = cx + radius * Math.cos(s)
    const y1 = cy + radius * Math.sin(s)
    const x2 = cx + radius * Math.cos(e)
    const y2 = cy + radius * Math.sin(e)
    const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0
    const sweep = endDeg > startDeg ? 1 : 0
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} ${sweep} ${x2} ${y2}`
  }

  // Track arc (full -135° → +135°)
  const trackPath = arcPath(-135, 135, r)

  // Fill arc from 0° (center) to current angle
  const fillFrom  = 0   // center = pan 0
  const fillTo    = angle
  const fillPath  = fillFrom !== fillTo ? arcPath(
    Math.min(fillFrom, fillTo),
    Math.max(fillFrom, fillTo),
    r,
  ) : ''

  // Indicator dot
  const dotX = cx + r * Math.cos(rad)
  const dotY = cy + r * Math.sin(rad)

  const label = value === 0 ? 'C' : value < 0 ? `L${Math.round(-value * 100)}` : `R${Math.round(value * 100)}`

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { startY: e.clientY, startVal: value }
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return
    const dy = dragRef.current.startY - e.clientY
    const delta = (dy / DRAG_RANGE) * 2
    const next = Math.max(-1, Math.min(1, dragRef.current.startVal + delta))
    onChange(parseFloat(next.toFixed(2)))
  }
  function onPointerUp() { dragRef.current = null }

  return (
    <div className="flex flex-col items-center gap-0 select-none">
      <svg
        width={SIZE} height={SIZE}
        className="cursor-ns-resize touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={() => onChange(0)}
        title="Drag to pan. Double-click to center"
      >
        {/* Track arc */}
        <path d={trackPath} fill="none" stroke="#2a2a2a" strokeWidth={2.5} strokeLinecap="round" />
        {/* Fill arc */}
        {fillPath && <path d={fillPath} fill="none" stroke={color + '99'} strokeWidth={2.5} strokeLinecap="round" />}
        {/* Center tick */}
        <line
          x1={cx} y1={cy - r + 3}
          x2={cx} y2={cy - r - 1}
          stroke="#444" strokeWidth={1}
        />
        {/* Knob body */}
        <circle cx={cx} cy={cy} r={6} fill="#1e1e1e" stroke="#3a3a3a" strokeWidth={1} />
        {/* Indicator dot */}
        <circle cx={dotX} cy={dotY} r={1.8} fill={color} />
      </svg>
      <span className="text-[7px] font-mono" style={{ color: color + 'bb' }}>{label}</span>
    </div>
  )
}

// ─── Vertical Fader ──────────────────────────────────────────────────────────
function VerticalFader({ trackId, color, name, db, pan, onVolumeChange, onPanChange }: {
  trackId: string
  color: string
  name: string
  db: number
  pan: number
  onVolumeChange: (db: number) => void
  onPanChange: (v: number) => void
}) {
  const dragRef = useRef<{ startY: number; startDb: number } | null>(null)
  const FADER_H = 80
  const pct = dbToPercent(db)
  const displayDb = db === -Infinity ? '-∞' : (db >= 0 ? `+${db.toFixed(1)}` : db.toFixed(1))

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { startY: e.clientY, startDb: db }
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return
    const dy = dragRef.current.startY - e.clientY
    const deltaDb = (dy / FADER_H) * (MAX_DB - MIN_DB)
    const newDb = Math.min(MAX_DB, Math.max(MIN_DB, dragRef.current.startDb + deltaDb))
    onVolumeChange(parseFloat(newDb.toFixed(1)))
  }
  function onPointerUp() { dragRef.current = null }

  return (
    <div className="flex flex-col items-center gap-1 select-none" style={{ minWidth: 44 }}>
      {/* Track name */}
      <span className="text-[8px] text-gray-500 truncate w-full text-center" style={{ maxWidth: 44 }}>{name}</span>

      {/* Fader track */}
      <div
        className="relative rounded-sm cursor-ns-resize touch-none"
        style={{ width: 12, height: FADER_H, background: '#111', border: '1px solid #2a2a2a' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={() => onVolumeChange(0)}
        title="Drag to set volume. Double-click to reset to 0 dB"
      >
        {/* Unity (0 dB) tick mark */}
        <div
          className="absolute left-0 right-0 h-px bg-[#e8a020]/50"
          style={{ top: `${100 - dbToPercent(0)}%` }}
        />
        {/* Fill */}
        <div
          className="absolute bottom-0 left-0 right-0 rounded-sm transition-none"
          style={{ height: `${pct}%`, background: color + '88' }}
        />
        {/* Thumb */}
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-sm shadow"
          style={{
            bottom: `calc(${pct}% - 4px)`,
            width: 14, height: 8,
            background: color,
            border: '1px solid #fff4',
          }}
        />
      </div>

      {/* dB value */}
      <span className="text-[8px] font-mono" style={{ color }}>{displayDb}</span>

      {/* Pan knob */}
      <PanKnob value={pan} color={color} onChange={onPanChange} />

      {/* Color dot */}
      <div className="w-2 h-2 rounded-full" style={{ background: color }} />
    </div>
  )
}

export default function FaderPanel() {
  const { tracks } = useProjectStore()
  const { setTrackVolume, setTrackPan } = useAudioEngine()
  const visible = tracks.filter(t => t.type !== 'group')

  return (
    <div
      className="shrink-0 bg-[#161616] border-t border-[#3a3a3a] flex items-end gap-3 px-4 overflow-x-auto"
      style={{ height: 168 }}
    >
      {visible.length === 0 && (
        <p className="text-xs text-gray-700 italic self-center">No tracks</p>
      )}
      {visible.map(track => (
        <VerticalFader
          key={track.id}
          trackId={track.id}
          color={track.color}
          name={track.name}
          db={track.volume ?? 0}
          pan={track.pan ?? 0}
          onVolumeChange={(db) => setTrackVolume(track.id, db)}
          onPanChange={(v) => setTrackPan(track.id, v)}
        />
      ))}
    </div>
  )
}

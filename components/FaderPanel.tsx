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

function VerticalFader({ trackId, color, name, db, onChange }: {
  trackId: string
  color: string
  name: string
  db: number
  onChange: (db: number) => void
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
    onChange(parseFloat(newDb.toFixed(1)))
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
        onDoubleClick={() => onChange(0)}
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

      {/* Color dot */}
      <div className="w-2 h-2 rounded-full" style={{ background: color }} />
    </div>
  )
}

export default function FaderPanel() {
  const { tracks } = useProjectStore()
  const { setTrackVolume } = useAudioEngine()
  const visible = tracks.filter(t => t.type !== 'group')

  return (
    <div
      className="shrink-0 bg-[#161616] border-t border-[#3a3a3a] flex items-end gap-3 px-4 overflow-x-auto"
      style={{ height: 148 }}
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
          onChange={(db) => setTrackVolume(track.id, db)}
        />
      ))}
    </div>
  )
}

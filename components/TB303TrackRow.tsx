'use client'

import { useState, useRef } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Track, useProjectStore } from '@/store/projectStore'

const KNOB_COLOR = '#22c55e'

interface KnobProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  size?: number
}

function Knob({ label, value, min, max, step = 0.01, onChange, size = 44 }: KnobProps) {
  const dragStart = useRef<{ y: number; val: number } | null>(null)
  const r = size / 2
  const cx = r, cy = r
  const trackR = r - 5
  const START_DEG = 225
  const pct = (value - min) / (max - min)
  const arcDeg = pct * 270
  const fillEnd = START_DEG + arcDeg

  function polar(deg: number, radius: number) {
    const rad = ((deg - 90) * Math.PI) / 180
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) }
  }
  function arc(s: number, e: number, radius: number) {
    const sp = polar(s, radius), ep = polar(e, radius)
    const large = e - s > 180 ? 1 : 0
    return `M ${sp.x} ${sp.y} A ${radius} ${radius} 0 ${large} 1 ${ep.x} ${ep.y}`
  }

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragStart.current = { y: e.clientY, val: value }
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragStart.current) return
    const dy = dragStart.current.y - e.clientY
    const delta = (dy / 150) * (max - min)
    const clamped = Math.min(max, Math.max(min, dragStart.current.val + delta))
    const stepped = Math.round(clamped / step) * step
    onChange(parseFloat(stepped.toFixed(6)))
  }
  function onPointerUp() { dragStart.current = null }

  const dot = polar(fillEnd, trackR - 1)
  const displayVal = Math.abs(value) >= 100 ? Math.round(value) : value.toFixed(step >= 1 ? 0 : 2)

  return (
    <div className="flex flex-col items-center gap-0.5 select-none" style={{ width: size + 12 }}>
      <svg width={size} height={size} className="cursor-ns-resize touch-none"
        onPointerDown={onPointerDown} onPointerMove={onPointerMove}
        onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
        <circle cx={cx} cy={cy} r={r - 2} fill="#111" stroke="#333" strokeWidth={1.5} />
        <path d={arc(START_DEG, START_DEG + 270, trackR)} fill="none" stroke="#2a2a2a" strokeWidth={4} strokeLinecap="round" />
        {arcDeg > 1 && (
          <path d={arc(START_DEG, fillEnd, trackR)} fill="none" stroke={KNOB_COLOR} strokeWidth={4} strokeLinecap="round" />
        )}
        <circle cx={dot.x} cy={dot.y} r={2} fill={KNOB_COLOR} />
        <circle cx={cx} cy={cy} r={2.5} fill="#444" />
      </svg>
      <span className="text-[8px] text-gray-500 uppercase tracking-wide truncate" style={{ maxWidth: size + 12 }}>{label}</span>
      <span className="text-[9px] font-mono" style={{ color: KNOB_COLOR }}>{displayVal}</span>
    </div>
  )
}

interface Props {
  track: Track
  barWidth: number
  headerW: number
  indent?: number
}

export default function TB303TrackRow({ track, barWidth, headerW, indent = 0 }: Props) {
  const { updateTrack, removeTrack, selectTrack, selectedTrackId, toggleMute, toggleSolo } = useProjectStore()
  const isSelected = selectedTrackId === track.id

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `track-${track.id}`,
    data: { kind: 'track-row', trackId: track.id },
  })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }

  function set(key: keyof Track, val: any) {
    updateTrack(track.id, { [key]: val } as any)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex border-b border-[#2a2a2a] relative transition-colors animate-slide-in-left ${
        isSelected ? 'bg-[#0d1f0d]' : 'hover:bg-[#111a11]'
      }`}
      onClick={() => selectTrack(track.id)}
    >
      {/* ── Header ── */}
      <div
        className="shrink-0 flex flex-col justify-center gap-1 px-2 border-r border-[#3a3a3a] min-h-[72px]"
        style={{
          width: headerW,
          borderLeft: `3px solid ${KNOB_COLOR}`,
        }}
      >
        <div className="flex items-center gap-1">
          <div
            {...attributes} {...listeners}
            className="text-gray-600 hover:text-gray-300 cursor-grab active:cursor-grabbing p-1 -ml-1 shrink-0 select-none touch-none"
          >⠿</div>
          {/* 303 brand badge */}
          <span
            className="text-[10px] font-black tracking-[0.15em] uppercase shrink-0"
            style={{ color: KNOB_COLOR, textShadow: `0 0 6px ${KNOB_COLOR}88` }}
          >TB-303</span>
          <div className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ background: KNOB_COLOR, boxShadow: `0 0 4px ${KNOB_COLOR}` }} />
        </div>

        <input
          className="bg-transparent text-[10px] font-medium outline-none text-gray-300 w-full truncate"
          value={track.name}
          onChange={e => updateTrack(track.id, { name: e.target.value })}
          onClick={e => e.stopPropagation()}
        />

        <div className="flex items-center gap-1">
          {/* Wave selector */}
          {(['sawtooth', 'square'] as const).map(w => (
            <button key={w}
              onClick={e => { e.stopPropagation(); set('tb303Wave', w) }}
              className={`px-1.5 py-0.5 text-[8px] font-bold rounded border transition-colors touch-manipulation ${
                (track.tb303Wave ?? 'sawtooth') === w
                  ? 'text-black border-transparent'
                  : 'bg-transparent text-gray-500 border-[#3a3a3a] hover:border-[#22c55e]'
              }`}
              style={(track.tb303Wave ?? 'sawtooth') === w ? { background: KNOB_COLOR, borderColor: KNOB_COLOR } : {}}
            >{w === 'sawtooth' ? 'SAW' : 'SQR'}</button>
          ))}
          <button onClick={e => { e.stopPropagation(); toggleMute(track.id) }}
            className={`text-[9px] font-bold px-1 py-0.5 rounded touch-manipulation ml-auto ${
              track.muted ? 'bg-[#e8a020] text-black' : 'text-gray-500 hover:text-[#e8a020]'
            }`}>M</button>
          <button onClick={e => { e.stopPropagation(); toggleSolo(track.id) }}
            className={`text-[9px] font-bold px-1 py-0.5 rounded touch-manipulation ${
              track.soloed ? 'bg-[#e8a020] text-black' : 'text-gray-500 hover:text-[#e8a020]'
            }`}>S</button>
          <button onClick={e => { e.stopPropagation(); removeTrack(track.id) }}
            className="text-gray-600 hover:text-red-400 text-xs touch-manipulation">×</button>
        </div>
      </div>

      {/* ── Knob panel (inline 303 controls) ── */}
      <div
        className="flex items-center gap-2 px-3 overflow-x-auto"
        style={{ borderBottom: `1px solid ${KNOB_COLOR}22` }}
        onClick={e => e.stopPropagation()}
      >
        <Knob label="Cutoff" value={track.tb303Cutoff ?? 800} min={80} max={8000} step={10}
          onChange={v => set('tb303Cutoff', v)} />
        <Knob label="Reso" value={track.tb303Resonance ?? 0.6} min={0} max={1} step={0.01}
          onChange={v => set('tb303Resonance', v)} />
        <Knob label="Env Mod" value={track.tb303EnvMod ?? 0.5} min={0} max={1} step={0.01}
          onChange={v => set('tb303EnvMod', v)} />
        <Knob label="Decay" value={track.tb303Decay ?? 0.3} min={0.01} max={2} step={0.01}
          onChange={v => set('tb303Decay', v)} />
        <Knob label="Accent" value={track.tb303Accent ?? 0.7} min={0} max={1} step={0.01}
          onChange={v => set('tb303Accent', v)} />

        {/* Thin vertical divider */}
        <div className="w-px h-10 bg-[#2a2a2a] shrink-0 mx-1" />

        {/* Clip strip — shows clips on the timeline inline, read-only mini view */}
        <div className="flex-1 relative h-12 min-w-0" style={{ minWidth: 120 }}>
          {track.clips.length === 0 && (
            <span className="text-[9px] text-gray-700 italic absolute inset-0 flex items-center justify-center">
              No clips — add from timeline
            </span>
          )}
          {track.clips.map(clip => (
            <div
              key={clip.id}
              className="absolute top-1 rounded text-[8px] font-bold overflow-hidden"
              style={{
                left: (clip.startBar - 1) * barWidth,
                width: Math.max(barWidth, clip.lengthBars * barWidth - 2),
                height: 40,
                background: KNOB_COLOR + '33',
                border: `1px solid ${KNOB_COLOR}66`,
                color: KNOB_COLOR,
                padding: '2px 4px',
              }}
            >
              {clip.label}
              <div className="text-[7px] opacity-60">
                {clip.steps?.filter(s => s.active).length ?? 0}/16
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

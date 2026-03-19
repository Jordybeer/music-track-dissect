'use client'

import { useState, useRef } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Track, Clip, useProjectStore, uid, makeSteps } from '@/store/projectStore'
import { useAudioEngine } from '@/hooks/useAudioEngine'

const COLOR_303 = '#22c55e'

const KNOB_PARAMS = [
  { key: 'tb303Cutoff',    label: 'Cutoff',   min: 80,  max: 8000, def: 800,  step: 10  },
  { key: 'tb303Resonance', label: 'Reso',     min: 0,   max: 1,    def: 0.6,  step: 0.01 },
  { key: 'tb303EnvMod',    label: 'Env Mod',  min: 0,   max: 1,    def: 0.5,  step: 0.01 },
  { key: 'tb303Decay',     label: 'Decay',    min: 0.01,max: 2,    def: 0.3,  step: 0.01 },
  { key: 'tb303Accent',    label: 'Accent',   min: 0,   max: 1,    def: 0.7,  step: 0.01 },
] as const

type KnobKey = typeof KNOB_PARAMS[number]['key']

function Knob({ label, value, min, max, size = 44, onChange }: {
  label: string; value: number; min: number; max: number; size?: number; onChange: (v: number) => void
}) {
  const dragRef = useRef<{ y: number; val: number } | null>(null)
  const r = size / 2
  const trackR = r - 5
  const pct = (value - min) / (max - min)
  const START = 225; const END = 495
  const arcDeg = pct * 270
  const fillEnd = START + arcDeg

  function polar(deg: number, radius: number) {
    const rad = ((deg - 90) * Math.PI) / 180
    return { x: r + radius * Math.cos(rad), y: r + radius * Math.sin(rad) }
  }
  function arc(s: number, e: number, rad: number) {
    const sp = polar(s, rad); const ep = polar(e, rad)
    const large = e - s > 180 ? 1 : 0
    return `M ${sp.x} ${sp.y} A ${rad} ${rad} 0 ${large} 1 ${ep.x} ${ep.y}`
  }

  function onPD(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { y: e.clientY, val: value }
  }
  function onPM(e: React.PointerEvent) {
    if (!dragRef.current) return
    const dy = dragRef.current.y - e.clientY
    const delta = (dy / 150) * (max - min)
    onChange(Math.min(max, Math.max(min, dragRef.current.val + delta)))
  }
  function onPU() { dragRef.current = null }

  const ind = polar(fillEnd, trackR - 2)
  const disp = Math.abs(value) >= 100 ? Math.round(value) : value.toFixed(2)

  return (
    <div className="flex flex-col items-center gap-0.5 select-none" style={{ width: size + 12 }}>
      <svg width={size} height={size} className="cursor-ns-resize touch-none"
        onPointerDown={onPD} onPointerMove={onPM} onPointerUp={onPU} onPointerCancel={onPU}>
        <circle cx={r} cy={r} r={r - 2} fill="#111" stroke="#333" strokeWidth={1.5} />
        <path d={arc(START, END, trackR)} fill="none" stroke="#2a2a2a" strokeWidth={4} strokeLinecap="round" />
        {arcDeg > 1 && <path d={arc(START, fillEnd, trackR)} fill="none" stroke={COLOR_303} strokeWidth={4} strokeLinecap="round" />}
        <circle cx={ind.x} cy={ind.y} r={2} fill={COLOR_303} />
        <circle cx={r} cy={r} r={2.5} fill="#444" />
      </svg>
      <span className="text-[8px] uppercase tracking-wide text-gray-500 truncate" style={{ maxWidth: size + 12 }}>{label}</span>
      <span className="text-[9px] font-mono" style={{ color: COLOR_303 }}>{disp}</span>
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
  const {
    selectTrack, selectClip, selectedTrackId, selectedClipId,
    removeTrack, removeClip, addClip, updateTrack, updateClip, duplicateClip,
    toggleMute, toggleSolo,
  } = useProjectStore()
  const { updateFXParam } = useAudioEngine()
  const isSelected = selectedTrackId === track.id
  const [isAdding, setIsAdding] = useState(false)
  const [clipBar, setClipBar] = useState(1)
  const [clipLen, setClipLen] = useState(4)
  const [clipLabel, setClipLabel] = useState('')
  const [ctxMenu, setCtxMenu] = useState<{ clipId: string; x: number; y: number } | null>(null)
  const [editingClipId, setEditingClipId] = useState<string | null>(null)
  const [editingLabel, setEditingLabel] = useState('')

  const { attributes, listeners, setNodeRef: setSortableRef, transform, transition, isDragging } = useSortable({
    id: `track-${track.id}`,
    data: { kind: 'track-row', trackId: track.id },
  })
  const { setNodeRef: setDropRef } = useDroppable({ id: `track-clips-${track.id}` })

  // Live knob update → audio engine + store
  function handleKnobChange(key: KnobKey, value: number) {
    updateTrack(track.id, { [key]: value } as any)
    // mirror cutoff/resonance/decay live to the 303 audio engine via a dummy deviceId
    const paramMap: Partial<Record<KnobKey, string>> = {
      tb303Cutoff:    'cutoff',
      tb303Resonance: 'resonance',
      tb303Decay:     'decay',
    }
    const audioParam = paramMap[key]
    if (audioParam) updateFXParam(track.id, `303-${track.id}`, audioParam, value)
  }

  function handleAddClip() {
    addClip(track.id, {
      id: uid(), label: clipLabel || `Pat ${track.clips.length + 1}`,
      startBar: clipBar, lengthBars: clipLen,
      color: COLOR_303, notes: '',
      steps: makeSteps(), stepRows: 1,
    })
    setIsAdding(false); setClipLabel('')
  }

  function handleZoneTap(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return
    const rect = e.currentTarget.getBoundingClientRect()
    const bar = Math.max(1, Math.ceil((e.clientX - rect.left) / barWidth))
    setClipBar(bar); setClipLen(4); setClipLabel('')
    selectTrack(track.id); setIsAdding(true)
  }

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }

  return (
    <div
      ref={setSortableRef}
      style={style}
      className={`border-b border-[#2a2a2a] relative transition-colors animate-slide-in-left ${
        isSelected ? 'bg-[#0f1f0f]' : 'hover:bg-[#111a11]'
      }`}
      onClick={() => setCtxMenu(null)}
    >
      {/* ── 303 header strip ── */}
      <div className="flex" style={{ minHeight: 72 }}>
        {/* Track header */}
        <div
          className="shrink-0 flex flex-col justify-between px-1.5 py-1 border-r cursor-pointer"
          style={{
            width: headerW,
            borderColor: '#2a2a2a',
            borderLeft: `3px solid ${COLOR_303}`,
            background: `linear-gradient(180deg, #0a1a0a 0%, #111 100%)`,
          }}
          onClick={() => selectTrack(track.id)}
        >
          {/* Top row: drag + name + buttons */}
          <div className="flex items-center gap-1">
            <div
              {...attributes} {...listeners}
              className="text-gray-600 hover:text-gray-300 cursor-grab active:cursor-grabbing p-1 -ml-1 shrink-0 select-none touch-none text-xs"
            >⠿</div>
            {/* Glowing 303 label */}
            <span
              className="text-[10px] font-black tracking-[0.2em] uppercase shrink-0"
              style={{ color: COLOR_303, textShadow: `0 0 6px ${COLOR_303}` }}
            >303</span>
            <span className="text-[10px] font-medium truncate flex-1 text-gray-300 min-w-0">{track.name}</span>
          </div>

          {/* Mute / Solo / Wave / + / × */}
          <div className="flex items-center gap-1 flex-wrap">
            <button
              onClick={(e) => { e.stopPropagation(); toggleMute(track.id) }}
              className={`text-[9px] font-bold px-1 py-0.5 rounded touch-manipulation transition-colors ${
                track.muted ? 'bg-[#e8a020] text-black' : 'text-gray-500 hover:text-[#e8a020]'
              }`}>M</button>
            <button
              onClick={(e) => { e.stopPropagation(); toggleSolo(track.id) }}
              className={`text-[9px] font-bold px-1 py-0.5 rounded touch-manipulation transition-colors ${
                track.soloed ? 'bg-[#e8a020] text-black' : 'text-gray-500 hover:text-[#e8a020]'
              }`}>S</button>
            {/* Waveform toggle: SAW / SQ */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                updateTrack(track.id, { tb303Wave: track.tb303Wave === 'sawtooth' ? 'square' : 'sawtooth' })
              }}
              className="text-[9px] font-bold px-1.5 py-0.5 rounded border touch-manipulation transition-colors"
              style={{
                borderColor: COLOR_303 + '66',
                color: COLOR_303,
                background: '#0a1a0a',
              }}
            >{track.tb303Wave === 'sawtooth' ? 'SAW' : 'SQ'}</button>
            <button onClick={(e) => { e.stopPropagation(); setIsAdding(!isAdding) }}
              className="text-gray-500 hover:text-white p-0.5 shrink-0 touch-manipulation text-sm leading-none">+</button>
            <button onClick={(e) => { e.stopPropagation(); removeTrack(track.id) }}
              className="text-gray-600 hover:text-red-400 p-0.5 shrink-0 touch-manipulation">×</button>
          </div>
        </div>

        {/* Right side: knobs + clip zone stacked */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Knob row */}
          <div
            className="flex items-center gap-3 px-3 py-1 shrink-0"
            style={{ background: 'linear-gradient(90deg, #0d1f0d 0%, #111 100%)', borderBottom: `1px solid #1a2a1a` }}
          >
            {KNOB_PARAMS.map(p => (
              <Knob
                key={p.key}
                label={p.label}
                value={(track as any)[p.key] ?? p.def}
                min={p.min}
                max={p.max}
                onChange={(v) => handleKnobChange(p.key, v)}
              />
            ))}
            {/* LED pulse */}
            <div className="ml-auto w-2 h-2 rounded-full shrink-0 animate-pulse"
              style={{ background: COLOR_303, boxShadow: `0 0 6px ${COLOR_303}` }} />
          </div>

          {/* Clip zone */}
          <div
            ref={setDropRef}
            className={`flex-1 relative overflow-visible cursor-cell transition-opacity ${
              track.muted ? 'opacity-40' : ''
            }`}
            style={{ minHeight: 28 }}
            onClick={handleZoneTap}
          >
            {track.clips.map(clip => (
              <ClipBlock
                key={clip.id}
                clip={clip}
                barWidth={barWidth}
                isSelected={selectedClipId === clip.id}
                isEditing={editingClipId === clip.id}
                editingLabel={editingLabel}
                onSelect={() => { selectTrack(track.id); selectClip(selectedClipId === clip.id ? null : clip.id); setCtxMenu(null) }}
                onCtxMenu={(x, y) => setCtxMenu({ clipId: clip.id, x, y })}
                onLabelChange={setEditingLabel}
                onLabelSubmit={() => {
                  if (editingLabel.trim()) updateClip(track.id, clip.id, { label: editingLabel.trim() })
                  setEditingClipId(null)
                }}
                onLabelKeyDown={(e) => {
                  if (e.key === 'Enter') { if (editingLabel.trim()) updateClip(track.id, clip.id, { label: editingLabel.trim() }); setEditingClipId(null) }
                  if (e.key === 'Escape') setEditingClipId(null)
                }}
                onDragEnd={(newStart) => updateClip(track.id, clip.id, { startBar: newStart })}
                onResizeEnd={(newLen) => updateClip(track.id, clip.id, { lengthBars: newLen })}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Context menu */}
      {ctxMenu && (
        <div
          className="fixed z-50 bg-[#1a2a1a] border border-[#22c55e]/30 rounded-xl shadow-2xl py-1 min-w-[180px] animate-fade-in"
          style={{
            top: Math.min(ctxMenu.y, (typeof window !== 'undefined' ? window.innerHeight : 600) - 140),
            left: Math.min(ctxMenu.x, (typeof window !== 'undefined' ? window.innerWidth : 400) - 200),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-4 py-2 text-[11px] font-bold border-b border-[#22c55e]/20" style={{ color: COLOR_303 }}>
            {track.clips.find(c => c.id === ctxMenu.clipId)?.label ?? 'Pattern'}
          </div>
          <button className="w-full text-left px-4 py-3 text-sm hover:bg-[#1e2e1e] text-white touch-manipulation"
            onClick={() => { duplicateClip(track.id, ctxMenu.clipId); setCtxMenu(null) }}>Duplicate</button>
          <button className="w-full text-left px-4 py-3 text-sm hover:bg-[#1e2e1e] text-white touch-manipulation"
            onClick={() => {
              const c = track.clips.find(c => c.id === ctxMenu.clipId)
              if (c) { setEditingClipId(c.id); setEditingLabel(c.label) }
              setCtxMenu(null)
            }}>Rename</button>
          <div className="border-t border-[#22c55e]/20 my-1" />
          <button className="w-full text-left px-4 py-3 text-sm hover:bg-[#1e2e1e] text-red-400 touch-manipulation"
            onClick={() => { removeClip(track.id, ctxMenu.clipId); setCtxMenu(null) }}>Delete</button>
        </div>
      )}

      {/* Add clip sheet */}
      {isAdding && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t p-4 shadow-2xl animate-sheet-up"
          style={{ background: '#0d1a0d', borderColor: COLOR_303 + '55' }}
          onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold" style={{ color: COLOR_303 }}>Add Pattern — {track.name}</span>
            <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-white p-2 touch-manipulation text-lg">×</button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Label</label>
              <input className="w-full bg-[#1a2a1a] border rounded px-3 py-2 text-sm text-white outline-none"
                style={{ borderColor: COLOR_303 + '44' }}
                placeholder={`Pat ${track.clips.length + 1}`} value={clipLabel}
                onChange={(e) => setClipLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddClip()} autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Bar</label>
                <input type="number" min={1} value={clipBar} onChange={(e) => setClipBar(Number(e.target.value))}
                  className="w-full bg-[#1a2a1a] border rounded px-2 py-2 text-sm text-white text-center outline-none"
                  style={{ borderColor: COLOR_303 + '44' }} />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Len</label>
                <input type="number" min={1} value={clipLen} onChange={(e) => setClipLen(Number(e.target.value))}
                  className="w-full bg-[#1a2a1a] border rounded px-2 py-2 text-sm text-white text-center outline-none"
                  style={{ borderColor: COLOR_303 + '44' }} />
              </div>
            </div>
          </div>
          <button onClick={handleAddClip}
            className="w-full font-bold py-3 rounded text-sm touch-manipulation"
            style={{ background: COLOR_303, color: '#000' }}>Add Pattern</button>
        </div>
      )}
    </div>
  )
}

// ── Draggable / resizable clip block ────────────────────────────────────────
function ClipBlock({
  clip, barWidth, isSelected, isEditing, editingLabel,
  onSelect, onCtxMenu, onLabelChange, onLabelSubmit, onLabelKeyDown,
  onDragEnd, onResizeEnd,
}: {
  clip: Clip
  barWidth: number
  isSelected: boolean
  isEditing: boolean
  editingLabel: string
  onSelect: () => void
  onCtxMenu: (x: number, y: number) => void
  onLabelChange: (v: string) => void
  onLabelSubmit: () => void
  onLabelKeyDown: (e: React.KeyboardEvent) => void
  onDragEnd: (newStart: number) => void
  onResizeEnd: (newLen: number) => void
}) {
  const dragState = useRef<{ startX: number; origBar: number; dragging: boolean } | null>(null)
  const [dragOffset, setDragOffset] = useState(0)
  const isResizing = useRef(false)
  const resizeState = useRef<{ startX: number; origLen: number } | null>(null)
  const [resizeOffset, setResizeOffset] = useState(0)
  const activeSteps = clip.steps?.filter(s => s.active).length ?? 0

  function onDP(e: React.PointerEvent) {
    if (isResizing.current) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragState.current = { startX: e.clientX, origBar: clip.startBar, dragging: false }
    setDragOffset(0)
  }
  function onDM(e: React.PointerEvent) {
    if (!dragState.current) return
    const dx = e.clientX - dragState.current.startX
    if (!dragState.current.dragging && Math.abs(dx) > 4) dragState.current.dragging = true
    if (dragState.current.dragging) setDragOffset(dx)
  }
  function onDU(e: React.PointerEvent) {
    if (!dragState.current) return
    if (dragState.current.dragging) {
      const barDelta = Math.round((e.clientX - dragState.current.startX) / barWidth)
      onDragEnd(Math.max(1, dragState.current.origBar + barDelta))
    } else { onSelect() }
    dragState.current = null; setDragOffset(0)
  }
  function onRP(e: React.PointerEvent) {
    e.stopPropagation(); isResizing.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    resizeState.current = { startX: e.clientX, origLen: clip.lengthBars }
    setResizeOffset(0)
  }
  function onRM(e: React.PointerEvent) {
    if (!resizeState.current) return
    setResizeOffset(e.clientX - resizeState.current.startX)
  }
  function onRU(e: React.PointerEvent) {
    if (!resizeState.current) return
    const barDelta = Math.round((e.clientX - resizeState.current.startX) / barWidth)
    onResizeEnd(Math.max(1, resizeState.current.origLen + barDelta))
    resizeState.current = null; isResizing.current = false; setResizeOffset(0)
  }

  const displayLeft = (clip.startBar - 1) * barWidth + dragOffset
  const displayWidth = Math.max(barWidth, clip.lengthBars * barWidth - 2 + resizeOffset)

  // Step stripes
  const stepW = (clip.lengthBars * barWidth - 2) / 16
  const stripes = clip.steps?.map((s, i) => s.active ? (
    <div key={i} className="absolute bottom-0 rounded-sm"
      style={{ left: i * stepW + 1, width: Math.max(stepW - 2, 1), height: '45%', background: `${COLOR_303}88` }} />
  ) : null)

  return (
    <div
      className={`absolute top-1 rounded text-xs font-bold overflow-visible select-none touch-manipulation ${
        dragOffset !== 0 || resizeOffset !== 0 ? 'z-50 shadow-2xl brightness-125' :
        isSelected ? 'ring-2 z-10' : 'hover:brightness-110'
      }`}
      style={{
        left: displayLeft, width: displayWidth, height: 28,
        background: '#0d2a0d',
        border: `1px solid ${COLOR_303}88`,
        boxShadow: isSelected ? `0 0 0 2px ${COLOR_303}` : undefined,
        cursor: dragOffset !== 0 ? 'grabbing' : 'grab',
      }}
      onPointerDown={onDP} onPointerMove={onDM} onPointerUp={onDU}
      onPointerCancel={() => { dragState.current = null; setDragOffset(0) }}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onCtxMenu(e.clientX, e.clientY) }}
    >
      <div className="absolute inset-0 pointer-events-none rounded overflow-hidden">{stripes}</div>
      <div className="relative z-10 px-2 h-full flex items-center pointer-events-none">
        {isEditing ? (
          <input autoFocus
            className="bg-transparent outline-none text-[10px] w-full pointer-events-auto"
            style={{ color: COLOR_303 }}
            value={editingLabel}
            onChange={(e) => onLabelChange(e.target.value)}
            onBlur={onLabelSubmit}
            onKeyDown={onLabelKeyDown}
            onPointerDown={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="truncate text-[10px]" style={{ color: COLOR_303 }}>{clip.label}</span>
        )}
        {activeSteps > 0 && !isEditing && (
          <span className="ml-1 text-[8px] opacity-60" style={{ color: COLOR_303 }}>{activeSteps}/16</span>
        )}
      </div>
      <div
        className="absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize"
        onPointerDown={onRP} onPointerMove={onRM} onPointerUp={onRU}
        onPointerCancel={() => { resizeState.current = null; isResizing.current = false; setResizeOffset(0) }}
      />
    </div>
  )
}

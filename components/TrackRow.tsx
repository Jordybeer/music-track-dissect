'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Track, Clip, useProjectStore, uid, makeSteps } from '@/store/projectStore'

const TRACK_COLORS = [
  '#3b82f6','#22c55e','#ef4444','#a855f7','#f59e0b','#06b6d4',
  '#f43f5e','#84cc16','#8b5cf6','#fb923c','#14b8a6','#e879f9',
]

interface Props {
  track: Track
  barWidth: number
  headerW: number
  indent?: number
}

interface CtxMenu { clipId: string; x: number; y: number }

function DraggableClip({
  clip, track, barWidth, isSelected,
  onSelect, onDoubleClick, onCtxMenu,
  isEditing, editingLabel, onLabelChange, onLabelSubmit, onLabelKeyDown,
}: {
  clip: Clip
  track: Track
  barWidth: number
  isSelected: boolean
  onSelect: () => void
  onDoubleClick: () => void
  onCtxMenu: (x: number, y: number) => void
  isEditing: boolean
  editingLabel: string
  onLabelChange: (v: string) => void
  onLabelSubmit: () => void
  onLabelKeyDown: (e: React.KeyboardEvent) => void
}) {
  const { updateClip } = useProjectStore()
  const isPatternTrack = track.type === 'midi' || track.type === 'drum'
  const activeSteps = clip.steps?.filter(s => s.active).length ?? 0

  // --- Drag state ---
  const dragState = useRef<{ startX: number; origBar: number; dragging: boolean } | null>(null)
  const [dragOffset, setDragOffset] = useState(0) // px offset while dragging
  const isDragging = useRef(false)

  // --- Resize state ---
  const resizeState = useRef<{ startX: number; origLen: number } | null>(null)
  const [resizeOffset, setResizeOffset] = useState(0)
  const isResizing = useRef(false)

  // --- Long press for context menu ---
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchOrigin = useRef<{ x: number; y: number } | null>(null)

  // Drag — pointer events on the clip body
  function onDragPointerDown(e: React.PointerEvent) {
    if (isResizing.current) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragState.current = { startX: e.clientX, origBar: clip.startBar, dragging: false }
    setDragOffset(0)
  }
  function onDragPointerMove(e: React.PointerEvent) {
    if (!dragState.current) return
    const dx = e.clientX - dragState.current.startX
    if (!dragState.current.dragging && Math.abs(dx) > 4) dragState.current.dragging = true
    if (dragState.current.dragging) setDragOffset(dx)
  }
  function onDragPointerUp(e: React.PointerEvent) {
    if (!dragState.current) return
    if (dragState.current.dragging) {
      const dx = e.clientX - dragState.current.startX
      const barDelta = Math.round(dx / barWidth)
      const newStart = Math.max(1, dragState.current.origBar + barDelta)
      updateClip(track.id, clip.id, { startBar: newStart })
    } else {
      onSelect()
    }
    dragState.current = null
    setDragOffset(0)
  }

  // Resize — separate pointer events on the right-edge handle
  function onResizePointerDown(e: React.PointerEvent) {
    e.stopPropagation()
    isResizing.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    resizeState.current = { startX: e.clientX, origLen: clip.lengthBars }
    setResizeOffset(0)
  }
  function onResizePointerMove(e: React.PointerEvent) {
    if (!resizeState.current) return
    const dx = e.clientX - resizeState.current.startX
    setResizeOffset(dx)
  }
  function onResizePointerUp(e: React.PointerEvent) {
    if (!resizeState.current) return
    const dx = e.clientX - resizeState.current.startX
    const barDelta = Math.round(dx / barWidth)
    const newLen = Math.max(1, resizeState.current.origLen + barDelta)
    updateClip(track.id, clip.id, { lengthBars: newLen })
    resizeState.current = null
    isResizing.current = false
    setResizeOffset(0)
  }

  // Long-press touch for context menu (with jitter threshold)
  function onTouchStart(e: React.TouchEvent) {
    touchOrigin.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    longPressTimer.current = setTimeout(() => {
      if (touchOrigin.current) onCtxMenu(touchOrigin.current.x, touchOrigin.current.y)
    }, 600)
  }
  function onTouchMove(e: React.TouchEvent) {
    if (!touchOrigin.current) return
    const dx = Math.abs(e.touches[0].clientX - touchOrigin.current.x)
    const dy = Math.abs(e.touches[0].clientY - touchOrigin.current.y)
    if (dx > 10 || dy > 10) {
      if (longPressTimer.current) clearTimeout(longPressTimer.current)
      touchOrigin.current = null
    }
  }
  function onTouchEnd() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
    touchOrigin.current = null
  }

  const isActiveDrag = dragOffset !== 0
  const isActiveResize = resizeOffset !== 0
  const displayLeft = (clip.startBar - 1) * barWidth + dragOffset
  const displayWidth = Math.max(barWidth, clip.lengthBars * barWidth - 2 + resizeOffset)

  // MIDI stripes
  function renderStripes() {
    if (!isPatternTrack || !clip.steps || clip.steps.length === 0) return null
    const totalW = clip.lengthBars * barWidth - 2
    const stepW = totalW / 16
    return (
      <div className="absolute inset-0 pointer-events-none rounded overflow-hidden">
        {clip.steps.map((step, i) =>
          step.active ? (
            <div key={i} className="absolute bottom-0 rounded-sm"
              style={{ left: i * stepW + 1, width: Math.max(stepW - 2, 1), height: '40%', background: 'rgba(255,255,255,0.35)' }}
            />
          ) : null
        )}
      </div>
    )
  }

  return (
    <div
      className={`absolute top-1 rounded text-xs font-medium overflow-visible select-none touch-manipulation ${
        isActiveDrag || isActiveResize ? 'z-50 shadow-2xl brightness-125' :
        isSelected ? 'ring-2 ring-white brightness-110 z-10' : 'hover:brightness-110'
      }`}
      style={{
        left: displayLeft,
        width: displayWidth,
        height: 40,
        background: clip.color + 'cc',
        border: `1px solid ${clip.color}`,
        cursor: isActiveDrag ? 'grabbing' : 'grab',
        transition: isActiveDrag || isActiveResize ? 'none' : 'left 0.05s, width 0.05s',
      }}
      onPointerDown={onDragPointerDown}
      onPointerMove={onDragPointerMove}
      onPointerUp={onDragPointerUp}
      onPointerCancel={() => { dragState.current = null; setDragOffset(0) }}
      onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick() }}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onCtxMenu(e.clientX, e.clientY) }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {renderStripes()}

      {/* Label */}
      <div className="relative z-10 px-2 h-full flex flex-col justify-center pointer-events-none">
        {isEditing ? (
          <input
            autoFocus
            className="bg-transparent outline-none text-white text-xs w-full pointer-events-auto"
            value={editingLabel}
            onChange={(e) => onLabelChange(e.target.value)}
            onBlur={onLabelSubmit}
            onKeyDown={onLabelKeyDown}
            onPointerDown={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="truncate leading-tight block text-white">{clip.label}</span>
        )}
        {isPatternTrack && activeSteps > 0 && !isEditing && (
          <span className="text-[8px] opacity-70 leading-tight block">{activeSteps}/16</span>
        )}
      </div>

      {/* Resize handle — right edge */}
      <div
        className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize flex items-center justify-center group"
        onPointerDown={onResizePointerDown}
        onPointerMove={onResizePointerMove}
        onPointerUp={onResizePointerUp}
        onPointerCancel={() => { resizeState.current = null; isResizing.current = false; setResizeOffset(0) }}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <div className="w-0.5 h-4 rounded-full bg-white/30 group-hover:bg-white/70 transition-colors" />
      </div>
    </div>
  )
}

export default function TrackRow({ track, barWidth, headerW, indent = 0 }: Props) {
  const {
    selectTrack, selectClip, selectedTrackId, selectedClipId,
    removeTrack, removeClip, addClip, setGroupId, updateTrack, updateClip, duplicateClip
  } = useProjectStore()
  const isSelected = selectedTrackId === track.id
  const [isAdding, setIsAdding] = useState(false)
  const [clipBar, setClipBar] = useState(1)
  const [clipLen, setClipLen] = useState(4)
  const [clipLabel, setClipLabel] = useState('')
  const [editingClipId, setEditingClipId] = useState<string | null>(null)
  const [editingLabel, setEditingLabel] = useState('')
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null)

  const { attributes, listeners, setNodeRef: setSortableRef, transform, transition, isDragging } = useSortable({
    id: `track-${track.id}`,
    data: { kind: 'track-row', trackId: track.id },
  })
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `track-clips-${track.id}` })

  function handleAddClip() {
    addClip(track.id, {
      id: uid(),
      label: clipLabel || `Clip ${track.clips.length + 1}`,
      startBar: clipBar, lengthBars: clipLen,
      color: track.color, notes: '',
      steps: makeSteps(), stepRows: 1,
    })
    setIsAdding(false)
    setClipLabel('')
  }

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }

  return (
    <div
      ref={setSortableRef}
      style={style}
      className={`flex border-b border-[#2a2a2a] relative transition-colors animate-slide-in-left ${
        isSelected ? 'bg-[#252535]' : isOver ? 'bg-[#1c2a1c]' : 'hover:bg-[#1e1e1e]'
      }`}
      onClick={() => setCtxMenu(null)}
    >
      {/* Track header */}
      <div
        className="shrink-0 flex items-center gap-1.5 px-1.5 border-r border-[#3a3a3a] cursor-pointer relative min-h-[48px]"
        style={{
          width: headerW,
          borderLeft: indent > 0 ? `${indent}px solid #a855f7` : `3px solid ${track.color}`,
        }}
        onClick={() => selectTrack(track.id)}
      >
        <div
          {...attributes} {...listeners}
          className="text-gray-600 hover:text-gray-300 cursor-grab active:cursor-grabbing p-2 -ml-1 shrink-0 select-none touch-none"
        >
          ⠿
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setShowColorPicker(v => !v) }}
          className="w-4 h-4 rounded-full shrink-0 border border-black/30 hover:scale-125 active:scale-110 transition-transform touch-manipulation"
          style={{ background: track.color }}
        />
        {showColorPicker && (
          <div
            className="absolute top-10 left-1 z-50 bg-[#2a2a2a] border border-[#3a3a3a] rounded p-2 flex flex-wrap gap-1.5 w-32 shadow-2xl animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {TRACK_COLORS.map(c => (
              <button key={c}
                onClick={() => { updateTrack(track.id, { color: c }); setShowColorPicker(false) }}
                className={`w-6 h-6 rounded-full border-2 hover:scale-110 active:scale-95 transition-transform touch-manipulation ${
                  track.color === c ? 'border-white' : 'border-transparent'
                }`}
                style={{ background: c }}
              />
            ))}
          </div>
        )}
        <span className="text-xs font-medium truncate flex-1 select-none">{track.name}</span>
        {track.groupId && (
          <button onClick={(e) => { e.stopPropagation(); setGroupId(track.id, null) }}
            className="text-[#a855f7] hover:text-white p-2 shrink-0 touch-manipulation">↑</button>
        )}
        <button onClick={(e) => { e.stopPropagation(); setIsAdding(!isAdding) }}
          className="text-gray-500 hover:text-white active:text-[#e8a020] p-2 shrink-0 touch-manipulation text-base leading-none">+</button>
        <button onClick={(e) => { e.stopPropagation(); removeTrack(track.id) }}
          className="text-gray-600 hover:text-red-400 active:text-red-300 p-2 shrink-0 touch-manipulation">×</button>
      </div>

      {/* Clip zone */}
      <div ref={setDropRef} className="flex-1 relative min-h-[48px] overflow-visible" onClick={() => setCtxMenu(null)}>
        {track.clips.map((clip) => (
          <DraggableClip
            key={clip.id}
            clip={clip}
            track={track}
            barWidth={barWidth}
            isSelected={selectedClipId === clip.id}
            onSelect={() => {
              selectTrack(track.id)
              selectClip(selectedClipId === clip.id ? null : clip.id)
              setCtxMenu(null)
            }}
            onDoubleClick={() => { setEditingClipId(clip.id); setEditingLabel(clip.label) }}
            onCtxMenu={(x, y) => setCtxMenu({ clipId: clip.id, x, y })}
            isEditing={editingClipId === clip.id}
            editingLabel={editingLabel}
            onLabelChange={setEditingLabel}
            onLabelSubmit={() => {
              if (editingLabel.trim()) updateClip(track.id, clip.id, { label: editingLabel.trim() })
              setEditingClipId(null)
            }}
            onLabelKeyDown={(e) => {
              if (e.key === 'Enter') { if (editingLabel.trim()) updateClip(track.id, clip.id, { label: editingLabel.trim() }); setEditingClipId(null) }
              if (e.key === 'Escape') setEditingClipId(null)
            }}
          />
        ))}
      </div>

      {/* Context menu */}
      {ctxMenu && (
        <div
          className="fixed z-50 bg-[#2a2a2a] border border-[#3a3a3a] rounded shadow-2xl py-1 min-w-[160px] animate-fade-in"
          style={{ top: ctxMenu.y, left: Math.min(ctxMenu.x, (typeof window !== 'undefined' ? window.innerWidth : 400) - 180) }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="w-full text-left px-4 py-3 text-sm hover:bg-[#3a3a3a] text-white flex justify-between touch-manipulation"
            onClick={() => { duplicateClip(track.id, ctxMenu.clipId); setCtxMenu(null) }}>
            Duplicate <span className="text-gray-500 text-xs">D</span>
          </button>
          <button className="w-full text-left px-4 py-3 text-sm hover:bg-[#3a3a3a] text-white flex justify-between touch-manipulation"
            onClick={() => { const c = track.clips.find(c => c.id === ctxMenu.clipId); if (c) { setEditingClipId(c.id); setEditingLabel(c.label) } setCtxMenu(null) }}>
            Rename <span className="text-gray-500 text-xs">dbl-tap</span>
          </button>
          <div className="border-t border-[#3a3a3a] my-1" />
          <button className="w-full text-left px-4 py-3 text-sm hover:bg-[#3a3a3a] text-red-400 touch-manipulation"
            onClick={() => { removeClip(track.id, ctxMenu.clipId); setCtxMenu(null) }}>
            Delete
          </button>
        </div>
      )}

      {/* Add clip bottom sheet */}
      {isAdding && (
        <div className="fixed inset-x-0 bottom-0 z-50 bg-[#2a2a2a] border-t border-[#3a3a3a] p-4 shadow-2xl animate-sheet-up"
          onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-white">Add Clip — {track.name}</span>
            <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-white p-2 touch-manipulation text-lg">×</button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Label</label>
              <input className="w-full bg-[#1a1a1a] border border-[#3a3a3a] rounded px-3 py-2 text-sm text-white"
                placeholder={`Clip ${track.clips.length + 1}`} value={clipLabel}
                onChange={(e) => setClipLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddClip()} autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Bar</label>
                <input type="number" min={1} value={clipBar} onChange={(e) => setClipBar(Number(e.target.value))}
                  className="w-full bg-[#1a1a1a] border border-[#3a3a3a] rounded px-2 py-2 text-sm text-white text-center" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Len</label>
                <input type="number" min={1} value={clipLen} onChange={(e) => setClipLen(Number(e.target.value))}
                  className="w-full bg-[#1a1a1a] border border-[#3a3a3a] rounded px-2 py-2 text-sm text-white text-center" />
              </div>
            </div>
          </div>
          <button onClick={handleAddClip} className="w-full bg-[#e8a020] text-black font-bold py-3 rounded text-sm hover:bg-yellow-400 touch-manipulation">
            Add Clip
          </button>
        </div>
      )}
    </div>
  )
}

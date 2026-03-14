'use client'

import { useState, useRef, useCallback } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Track, useProjectStore, uid, makeSteps } from '@/store/projectStore'

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
  const [justSelected, setJustSelected] = useState<string | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { attributes, listeners, setNodeRef: setSortableRef, transform, transition, isDragging } = useSortable({
    id: `track-${track.id}`,
    data: { kind: 'track-row', trackId: track.id },
  })
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `track-clips-${track.id}` })
  const isPatternTrack = track.type === 'midi' || track.type === 'drum'

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

  function handleLabelSubmit(clipId: string) {
    if (editingLabel.trim()) updateClip(track.id, clipId, { label: editingLabel.trim() })
    setEditingClipId(null)
  }

  // Long-press = context menu on touch devices
  const startLongPress = useCallback((clipId: string, x: number, y: number) => {
    longPressTimer.current = setTimeout(() => {
      setCtxMenu({ clipId, x, y })
    }, 500)
  }, [])

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
  }, [])

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
      {/* Track header — min h-12 for touch, taller feel */}
      <div
        className="shrink-0 flex items-center gap-1.5 px-1.5 border-r border-[#3a3a3a] cursor-pointer relative min-h-[48px]"
        style={{
          width: headerW,
          borderLeft: indent > 0 ? `${indent}px solid #a855f7` : `3px solid ${track.color}`,
        }}
        onClick={() => selectTrack(track.id)}
      >
        {/* Drag handle — larger tap zone */}
        <div
          {...attributes} {...listeners}
          className="text-gray-600 hover:text-gray-300 cursor-grab active:cursor-grabbing p-2 -ml-1 shrink-0 select-none touch-none"
        >
          ⠿
        </div>

        {/* Color swatch */}
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
              <button
                key={c}
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

        {/* Action buttons — 44px min tap zone via padding */}
        {track.groupId && (
          <button
            onClick={(e) => { e.stopPropagation(); setGroupId(track.id, null) }}
            className="text-[#a855f7] hover:text-white p-2 shrink-0 touch-manipulation"
            title="Remove from group"
          >↑</button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); setIsAdding(!isAdding) }}
          className="text-gray-500 hover:text-white active:text-[#e8a020] p-2 shrink-0 touch-manipulation text-base leading-none"
          title="Add clip"
        >+</button>
        <button
          onClick={(e) => { e.stopPropagation(); removeTrack(track.id) }}
          className="text-gray-600 hover:text-red-400 active:text-red-300 p-2 shrink-0 touch-manipulation"
          title="Delete track"
        >×</button>
      </div>

      {/* Clip zone */}
      <div ref={setDropRef} className="flex-1 relative min-h-[48px]" onClick={() => setCtxMenu(null)}>
        {track.clips.map((clip) => {
          const isSel = selectedClipId === clip.id
          const activeSteps = clip.steps?.filter(s => s.active).length ?? 0
          const isEditing = editingClipId === clip.id

          return (
            <div
              key={clip.id}
              className={`absolute top-1 rounded text-xs flex flex-col justify-center px-2 font-medium overflow-hidden select-none cursor-pointer touch-manipulation transition-all duration-100 ${
                isSel
                  ? 'ring-2 ring-white brightness-110 ' + (justSelected === clip.id ? 'animate-clip-select' : '')
                  : 'hover:brightness-110 active:scale-[0.98]'
              }`}
              style={{
                left: (clip.startBar - 1) * barWidth,
                width: clip.lengthBars * barWidth - 2,
                height: 40,
                background: clip.color + 'cc',
                border: `1px solid ${clip.color}`,
              }}
              onClick={(e) => {
                e.stopPropagation()
                selectTrack(track.id)
                selectClip(isSel ? null : clip.id)
                if (!isSel) setJustSelected(clip.id)
                setCtxMenu(null)
              }}
              onDoubleClick={(e) => {
                e.stopPropagation()
                setEditingClipId(clip.id)
                setEditingLabel(clip.label)
              }}
              onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ clipId: clip.id, x: e.clientX, y: e.clientY }) }}
              onTouchStart={(e) => startLongPress(clip.id, e.touches[0].clientX, e.touches[0].clientY)}
              onTouchEnd={cancelLongPress}
              onTouchMove={cancelLongPress}
            >
              {isEditing ? (
                <input
                  autoFocus
                  className="bg-transparent outline-none text-white text-xs w-full"
                  value={editingLabel}
                  onChange={(e) => setEditingLabel(e.target.value)}
                  onBlur={() => handleLabelSubmit(clip.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleLabelSubmit(clip.id)
                    if (e.key === 'Escape') setEditingClipId(null)
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="truncate leading-tight">{clip.label}</span>
              )}
              {isPatternTrack && activeSteps > 0 && !isEditing && (
                <span className="text-[8px] opacity-70 leading-tight">{activeSteps}/16 steps</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Context menu — works for both right-click and long-press */}
      {ctxMenu && (
        <div
          className="fixed z-50 bg-[#2a2a2a] border border-[#3a3a3a] rounded shadow-2xl py-1 min-w-[160px] animate-fade-in"
          style={{ top: ctxMenu.y, left: Math.min(ctxMenu.x, window.innerWidth - 180) }}
          onClick={(e) => e.stopPropagation()}
        >
          {[
            { label: 'Duplicate', hint: 'D', action: () => { duplicateClip(track.id, ctxMenu.clipId); setCtxMenu(null) }, danger: false },
            { label: 'Rename', hint: 'dbl-tap', action: () => { const c = track.clips.find(c => c.id === ctxMenu.clipId); if (c) { setEditingClipId(c.id); setEditingLabel(c.label) } setCtxMenu(null) }, danger: false },
          ].map(item => (
            <button key={item.label} className="w-full text-left px-4 py-3 text-sm hover:bg-[#3a3a3a] active:bg-[#444] text-white flex justify-between touch-manipulation" onClick={item.action}>
              {item.label} <span className="text-gray-500 text-xs">{item.hint}</span>
            </button>
          ))}
          <div className="border-t border-[#3a3a3a] my-1" />
          <button className="w-full text-left px-4 py-3 text-sm hover:bg-[#3a3a3a] active:bg-[#444] text-red-400 touch-manipulation" onClick={() => { removeClip(track.id, ctxMenu.clipId); setCtxMenu(null) }}>
            Delete
          </button>
        </div>
      )}

      {/* Add clip — bottom sheet on mobile */}
      {isAdding && (
        <div
          className="fixed inset-x-0 bottom-0 z-50 bg-[#2a2a2a] border-t border-[#3a3a3a] p-4 shadow-2xl animate-sheet-up safe-area-inset-bottom"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-white">Add Clip to {track.name}</span>
            <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-white p-2 touch-manipulation text-lg leading-none">×</button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Label</label>
              <input
                className="w-full bg-[#1a1a1a] border border-[#3a3a3a] rounded px-3 py-2 text-sm text-white"
                placeholder={`Clip ${track.clips.length + 1}`}
                value={clipLabel}
                onChange={(e) => setClipLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddClip()}
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Bar</label>
                <input type="number" min={1} value={clipBar}
                  onChange={(e) => setClipBar(Number(e.target.value))}
                  className="w-full bg-[#1a1a1a] border border-[#3a3a3a] rounded px-2 py-2 text-sm text-white text-center"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Len</label>
                <input type="number" min={1} value={clipLen}
                  onChange={(e) => setClipLen(Number(e.target.value))}
                  className="w-full bg-[#1a1a1a] border border-[#3a3a3a] rounded px-2 py-2 text-sm text-white text-center"
                />
              </div>
            </div>
          </div>
          <button onClick={handleAddClip} className="w-full bg-[#e8a020] text-black font-bold py-3 rounded text-sm hover:bg-yellow-400 active:bg-yellow-300 touch-manipulation transition-colors">
            Add Clip
          </button>
        </div>
      )}
    </div>
  )
}

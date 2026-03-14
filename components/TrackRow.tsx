'use client'

import { useState, useRef } from 'react'
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

interface ContextMenu {
  clipId: string
  x: number
  y: number
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
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)

  const {
    attributes, listeners, setNodeRef: setSortableRef,
    transform, transition, isDragging,
  } = useSortable({
    id: `track-${track.id}`,
    data: { kind: 'track-row', trackId: track.id },
  })

  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `track-clips-${track.id}` })

  const isPatternTrack = track.type === 'midi' || track.type === 'drum'

  function handleAddClip() {
    addClip(track.id, {
      id: uid(),
      label: clipLabel || `Clip ${track.clips.length + 1}`,
      startBar: clipBar,
      lengthBars: clipLen,
      color: track.color,
      notes: '',
      steps: makeSteps(),
      stepRows: 1,
    })
    setIsAdding(false)
    setClipLabel('')
  }

  function handleClipDoubleClick(clipId: string, currentLabel: string) {
    setEditingClipId(clipId)
    setEditingLabel(currentLabel)
  }

  function handleLabelSubmit(clipId: string) {
    if (editingLabel.trim()) updateClip(track.id, clipId, { label: editingLabel.trim() })
    setEditingClipId(null)
  }

  function openContextMenu(e: React.MouseEvent, clipId: string) {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ clipId, x: e.clientX, y: e.clientY })
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setSortableRef}
      style={style}
      className={`flex h-12 border-b border-[#2a2a2a] relative ${
        isSelected ? 'bg-[#252535]' : isOver ? 'bg-[#1c2a1c]' : 'hover:bg-[#1e1e1e]'
      } transition-colors`}
      onClick={() => { setContextMenu(null) }}
    >
      {/* Track header */}
      <div
        className="shrink-0 flex items-center gap-1 px-1.5 border-r border-[#3a3a3a] cursor-pointer relative"
        style={{
          width: headerW,
          borderLeft: indent > 0 ? `${indent}px solid #a855f7` : `3px solid ${track.color}`,
        }}
        onClick={() => selectTrack(track.id)}
      >
        <div
          {...attributes} {...listeners}
          className="text-gray-600 hover:text-gray-300 cursor-grab active:cursor-grabbing px-0.5 shrink-0 select-none"
        >
          ⠟
        </div>

        {/* Color swatch — click to open color picker */}
        <button
          onClick={(e) => { e.stopPropagation(); setShowColorPicker(v => !v) }}
          className="w-3 h-3 rounded-full shrink-0 border border-black/30 hover:scale-125 transition-transform"
          style={{ background: track.color }}
          title="Change color"
        />

        {showColorPicker && (
          <div
            className="absolute top-8 left-2 z-50 bg-[#2a2a2a] border border-[#3a3a3a] rounded p-2 flex flex-wrap gap-1 w-28 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {TRACK_COLORS.map(c => (
              <button
                key={c}
                onClick={() => { updateTrack(track.id, { color: c }); setShowColorPicker(false) }}
                className={`w-5 h-5 rounded-full border-2 hover:scale-110 transition-transform ${
                  track.color === c ? 'border-white' : 'border-transparent'
                }`}
                style={{ background: c }}
              />
            ))}
          </div>
        )}

        <span className="text-xs font-medium truncate flex-1">{track.name}</span>

        {track.groupId && (
          <button
            onClick={(e) => { e.stopPropagation(); setGroupId(track.id, null) }}
            className="text-[#a855f7] hover:text-white text-[10px] px-0.5 shrink-0"
            title="Remove from group"
          >↑</button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); setIsAdding(!isAdding) }}
          className="text-gray-500 hover:text-white text-xs px-0.5 shrink-0"
          title="Add clip"
        >+</button>
        <button
          onClick={(e) => { e.stopPropagation(); removeTrack(track.id) }}
          className="text-gray-600 hover:text-red-400 text-xs px-0.5 shrink-0"
          title="Delete track (Del)"
        >×</button>
      </div>

      {/* Clip zone */}
      <div ref={setDropRef} className="flex-1 relative" onClick={() => setContextMenu(null)}>
        {track.clips.map((clip) => {
          const isClipSelected = selectedClipId === clip.id
          const activeSteps = clip.steps?.filter(s => s.active).length ?? 0
          const isEditing = editingClipId === clip.id

          return (
            <div
              key={clip.id}
              className={`absolute top-1 h-10 rounded text-xs flex flex-col justify-center px-2 font-medium overflow-hidden select-none cursor-pointer transition-all ${
                isClipSelected ? 'ring-2 ring-white ring-offset-0 brightness-110' : 'hover:brightness-110'
              }`}
              style={{
                left: (clip.startBar - 1) * barWidth,
                width: clip.lengthBars * barWidth - 2,
                background: clip.color + 'cc',
                border: `1px solid ${clip.color}`,
              }}
              onClick={(e) => {
                e.stopPropagation()
                selectTrack(track.id)
                selectClip(isClipSelected ? null : clip.id)
                setContextMenu(null)
              }}
              onDoubleClick={(e) => {
                e.stopPropagation()
                handleClipDoubleClick(clip.id, clip.label)
              }}
              onContextMenu={(e) => openContextMenu(e, clip.id)}
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

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-[#2a2a2a] border border-[#3a3a3a] rounded shadow-2xl py-1 min-w-32"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-[#3a3a3a] text-white"
            onClick={() => {
              duplicateClip(track.id, contextMenu.clipId)
              setContextMenu(null)
            }}
          >
            Duplicate  <span className="text-gray-500 ml-1">D</span>
          </button>
          <button
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-[#3a3a3a] text-white"
            onClick={() => {
              const clip = track.clips.find(c => c.id === contextMenu.clipId)
              if (clip) handleClipDoubleClick(contextMenu.clipId, clip.label)
              setContextMenu(null)
            }}
          >
            Rename  <span className="text-gray-500 ml-1">dbl-click</span>
          </button>
          <div className="border-t border-[#3a3a3a] my-1" />
          <button
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-[#3a3a3a] text-red-400"
            onClick={() => {
              removeClip(track.id, contextMenu.clipId)
              setContextMenu(null)
            }}
          >
            Delete  <span className="text-gray-500 ml-1">Del</span>
          </button>
        </div>
      )}

      {/* Add clip popover */}
      {isAdding && (
        <div
          className="fixed z-50 bg-[#2a2a2a] border border-[#3a3a3a] rounded p-3 flex gap-2 items-center shadow-2xl flex-wrap"
          style={{ top: '4rem', left: headerW + 8 }}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            className="w-28 bg-[#1a1a1a] border border-[#3a3a3a] rounded px-2 py-1 text-xs text-white"
            placeholder="Label"
            value={clipLabel}
            onChange={(e) => setClipLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddClip()}
            autoFocus
          />
          <span className="text-xs text-gray-400">Bar</span>
          <input
            type="number" min={1} value={clipBar}
            onChange={(e) => setClipBar(Number(e.target.value))}
            className="w-12 bg-[#1a1a1a] border border-[#3a3a3a] rounded px-1 py-1 text-xs text-white text-center"
          />
          <span className="text-xs text-gray-400">Len</span>
          <input
            type="number" min={1} value={clipLen}
            onChange={(e) => setClipLen(Number(e.target.value))}
            className="w-12 bg-[#1a1a1a] border border-[#3a3a3a] rounded px-1 py-1 text-xs text-white text-center"
          />
          <button onClick={handleAddClip} className="bg-[#e8a020] text-black text-xs font-bold px-2 py-1 rounded hover:bg-yellow-400">Add</button>
          <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-white text-xs">✕</button>
        </div>
      )}
    </div>
  )
}

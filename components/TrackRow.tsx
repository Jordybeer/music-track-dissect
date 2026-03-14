'use client'

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Track, useProjectStore, uid } from '@/store/projectStore'

interface Props {
  track: Track
  barWidth: number
  headerW: number
  indent?: number
}

export default function TrackRow({ track, barWidth, headerW, indent = 0 }: Props) {
  const { selectTrack, selectedTrackId, removeTrack, addClip, setGroupId } = useProjectStore()
  const isSelected = selectedTrackId === track.id
  const [isAdding, setIsAdding] = useState(false)
  const [clipBar, setClipBar] = useState(1)
  const [clipLen, setClipLen] = useState(4)
  const [clipLabel, setClipLabel] = useState('')

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `track-${track.id}`,
    data: { kind: 'track-row', trackId: track.id },
  })

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `track-clips-${track.id}`,
  })

  function handleAddClip() {
    addClip(track.id, {
      id: uid(),
      label: clipLabel || `Clip ${track.clips.length + 1}`,
      startBar: clipBar,
      lengthBars: clipLen,
      color: track.color,
      notes: '',
    })
    setIsAdding(false)
    setClipLabel('')
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const indentStyle = indent > 0 ? {
    borderLeft: `${indent}px solid #a855f7`,
    paddingLeft: 0,
  } : {}

  return (
    <div
      ref={setSortableRef}
      style={style}
      className={`flex h-12 border-b border-[#2a2a2a] relative ${
        isSelected ? 'bg-[#252535]' : isOver ? 'bg-[#1c2a1c]' : 'hover:bg-[#1e1e1e]'
      } transition-colors`}
    >
      {/* Track header */}
      <div
        className="shrink-0 flex items-center gap-1 px-2 border-r border-[#3a3a3a] cursor-pointer"
        style={{ width: headerW, borderLeft: `3px solid ${track.color}`, ...indentStyle }}
        onClick={() => selectTrack(track.id)}
      >
        <div
          {...attributes}
          {...listeners}
          className="text-gray-600 hover:text-gray-300 cursor-grab active:cursor-grabbing px-0.5 shrink-0 select-none"
        >
          ⠟
        </div>
        <span className="text-xs font-medium truncate flex-1">{track.name}</span>

        {/* Ungroup button if inside a group */}
        {track.groupId && (
          <button
            onClick={(e) => { e.stopPropagation(); setGroupId(track.id, null) }}
            className="text-[#a855f7] hover:text-white text-[10px] px-0.5 shrink-0"
            title="Remove from group"
          >
            ↑
          </button>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); setIsAdding(!isAdding) }}
          className="text-gray-500 hover:text-white text-xs px-0.5 shrink-0"
          title="Add clip"
        >
          +
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); removeTrack(track.id) }}
          className="text-gray-600 hover:text-red-400 text-xs px-0.5 shrink-0"
        >
          ×
        </button>
      </div>

      {/* Clip zone */}
      <div ref={setDropRef} className="flex-1 relative">
        {track.clips.map((clip) => (
          <div
            key={clip.id}
            className="absolute top-1 h-10 rounded text-xs flex items-center px-2 font-medium overflow-hidden hover:brightness-110 select-none"
            style={{
              left: (clip.startBar - 1) * barWidth,
              width: clip.lengthBars * barWidth - 2,
              background: clip.color + 'cc',
              border: `1px solid ${clip.color}`,
            }}
            title={clip.notes || clip.label}
            onClick={(e) => { e.stopPropagation(); selectTrack(track.id) }}
          >
            <span className="truncate">{clip.label}</span>
          </div>
        ))}
      </div>

      {/* Add clip popover */}
      {isAdding && (
        <div
          className="fixed z-50 bg-[#2a2a2a] border border-[#3a3a3a] rounded p-3 flex gap-2 items-center shadow-2xl"
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
          <button onClick={handleAddClip} className="bg-[#e8a020] text-black text-xs font-bold px-2 py-1 rounded hover:bg-yellow-400">
            Add
          </button>
          <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-white text-xs">✕</button>
        </div>
      )}
    </div>
  )
}

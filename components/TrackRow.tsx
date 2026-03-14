'use client'

import { useState } from 'react'
import { Track, useProjectStore } from '@/store/projectStore'

interface Props {
  track: Track
  barWidth: number
}

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

export default function TrackRow({ track, barWidth }: Props) {
  const { selectTrack, selectedTrackId, removeTrack, addClip } = useProjectStore()
  const isSelected = selectedTrackId === track.id
  const [isAdding, setIsAdding] = useState(false)
  const [clipBar, setClipBar] = useState(1)
  const [clipLen, setClipLen] = useState(4)
  const [clipLabel, setClipLabel] = useState('')

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

  return (
    <div
      className={`flex h-12 border-b border-[#2a2a2a] ${ isSelected ? 'bg-[#252535]' : 'hover:bg-[#1e1e1e]' } transition-colors`}
      onClick={() => selectTrack(track.id)}
    >
      {/* Track header */}
      <div
        className="w-40 shrink-0 flex items-center gap-2 px-2 border-r border-[#3a3a3a] cursor-pointer"
        style={{ borderLeft: `3px solid ${track.color}` }}
      >
        <span className="text-xs font-medium truncate flex-1">{track.name}</span>
        <button
          onClick={(e) => { e.stopPropagation(); setIsAdding(!isAdding) }}
          className="text-gray-500 hover:text-white text-xs px-1"
          title="Add clip"
        >
          +
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); removeTrack(track.id) }}
          className="text-gray-600 hover:text-red-400 text-xs px-1"
          title="Remove track"
        >
          ×
        </button>
      </div>

      {/* Clip area */}
      <div className="flex-1 relative overflow-x-auto">
        <div className="h-full relative" style={{ minWidth: '100%' }}>
          {track.clips.map((clip) => (
            <div
              key={clip.id}
              className="absolute top-1 h-10 rounded text-xs flex items-center px-2 font-medium overflow-hidden cursor-pointer hover:brightness-110"
              style={{
                left: (clip.startBar - 1) * barWidth,
                width: clip.lengthBars * barWidth - 2,
                background: clip.color + 'cc',
                border: `1px solid ${clip.color}`,
              }}
              title={clip.notes || clip.label}
            >
              {clip.label}
            </div>
          ))}
        </div>
      </div>

      {/* Quick-add popover */}
      {isAdding && (
        <div
          className="absolute z-10 left-40 bg-[#2a2a2a] border border-[#3a3a3a] rounded p-3 flex gap-2 items-center shadow-xl mt-12"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            className="w-28 bg-[#1a1a1a] border border-[#3a3a3a] rounded px-2 py-1 text-xs text-white"
            placeholder="Label"
            value={clipLabel}
            onChange={(e) => setClipLabel(e.target.value)}
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
          <button
            onClick={handleAddClip}
            className="bg-[#e8a020] text-black text-xs font-bold px-2 py-1 rounded hover:bg-yellow-400"
          >
            Add
          </button>
          <button
            onClick={() => setIsAdding(false)}
            className="text-gray-400 hover:text-white text-xs px-1"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}

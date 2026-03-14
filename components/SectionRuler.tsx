'use client'

import { RefObject, useState } from 'react'
import { useProjectStore, uid } from '@/store/projectStore'

const SECTION_COLORS = ['#e8a020', '#3b82f6', '#22c55e', '#ef4444', '#a855f7', '#06b6d4', '#f43f5e']
const SECTION_LABELS = ['Intro', 'Build', 'Drop', 'Break', 'Outro', 'Bridge', 'Hook']

interface Props {
  barWidth: number
  headerW: number
  bars: number
  scrollRef: RefObject<HTMLDivElement | null>
}

export default function SectionRuler({ barWidth, headerW, bars }: Props) {
  const { markers, addMarker, removeMarker, updateMarker } = useProjectStore()
  const [adding, setAdding] = useState(false)
  const [newBar, setNewBar] = useState(1)
  const [newLabel, setNewLabel] = useState('Drop')
  const [newColor, setNewColor] = useState(SECTION_COLORS[0])

  function handleAdd() {
    addMarker({ id: uid(), label: newLabel, startBar: newBar, color: newColor })
    setAdding(false)
  }

  return (
    <div className="relative flex shrink-0 h-8 bg-[#1e1e1e] border-b border-[#3a3a3a] overflow-hidden">
      {/* Header spacer */}
      <div className="shrink-0 flex items-center justify-center border-r border-[#3a3a3a]" style={{ width: headerW }}>
        <button
          onClick={() => setAdding(!adding)}
          className="text-xs text-gray-500 hover:text-[#e8a020] px-2 transition-colors"
          title="Add section marker"
        >
          + Section
        </button>
      </div>

      {/* Marker area */}
      <div className="relative flex-1 overflow-hidden">
        <div className="relative h-full" style={{ minWidth: bars * barWidth }}>
          {markers.map((marker) => (
            <div
              key={marker.id}
              className="absolute top-0 h-full flex items-center group"
              style={{ left: (marker.startBar - 1) * barWidth }}
            >
              <div
                className="h-full w-px"
                style={{ background: marker.color }}
              />
              <div
                className="px-1.5 py-0.5 text-[10px] font-bold rounded-r whitespace-nowrap"
                style={{ background: marker.color + '33', color: marker.color, borderLeft: `2px solid ${marker.color}` }}
              >
                {marker.label}
                <button
                  onClick={() => removeMarker(marker.id)}
                  className="ml-1 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add popover */}
      {adding && (
        <div className="absolute top-8 left-0 z-20 bg-[#2a2a2a] border border-[#3a3a3a] rounded p-3 flex gap-2 items-center shadow-2xl">
          <select
            className="bg-[#1a1a1a] border border-[#3a3a3a] rounded px-1 py-1 text-xs text-white"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
          >
            {SECTION_LABELS.map(l => <option key={l}>{l}</option>)}
          </select>
          <input
            className="bg-[#1a1a1a] border border-[#3a3a3a] rounded px-1 py-1 text-xs text-white w-20"
            placeholder="Custom"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
          />
          <span className="text-xs text-gray-400">Bar</span>
          <input
            type="number" min={1} max={bars} value={newBar}
            onChange={(e) => setNewBar(Number(e.target.value))}
            className="w-12 bg-[#1a1a1a] border border-[#3a3a3a] rounded px-1 py-1 text-xs text-white text-center"
          />
          <div className="flex gap-1">
            {SECTION_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className={`w-4 h-4 rounded-full border-2 ${ newColor === c ? 'border-white' : 'border-transparent' }`}
                style={{ background: c }}
              />
            ))}
          </div>
          <button onClick={handleAdd} className="bg-[#e8a020] text-black text-xs font-bold px-2 py-1 rounded">Add</button>
          <button onClick={() => setAdding(false)} className="text-gray-400 hover:text-white text-xs">✕</button>
        </div>
      )}
    </div>
  )
}

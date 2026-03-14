'use client'

import { RefObject, useCallback, useRef, useState } from 'react'
import { useProjectStore, uid } from '@/store/projectStore'

const SECTION_COLORS = ['#e8a020', '#3b82f6', '#22c55e', '#ef4444', '#a855f7', '#06b6d4', '#f43f5e']
const SECTION_LABELS = ['Intro', 'Build', 'Drop', 'Break', 'Outro', 'Bridge', 'Hook']

interface Props {
  barWidth: number
  headerW: number
  bars: number
  bodyRef: RefObject<HTMLDivElement | null>
}

export default function SectionRuler({ barWidth, headerW, bars, bodyRef }: Props) {
  const { markers, addMarker, removeMarker } = useProjectStore()
  const [adding, setAdding] = useState(false)
  const [newBar, setNewBar] = useState(1)
  const [newLabel, setNewLabel] = useState('Drop')
  const [newColor, setNewColor] = useState(SECTION_COLORS[0])
  const rulerScrollRef = useRef<HTMLDivElement>(null)
  const syncingRef = useRef(false)

  // Sync section ruler scroll with body
  const onRulerScroll = useCallback(() => {
    if (syncingRef.current || !rulerScrollRef.current || !bodyRef.current) return
    syncingRef.current = true
    bodyRef.current.scrollLeft = rulerScrollRef.current.scrollLeft
    syncingRef.current = false
  }, [bodyRef])

  // Sync from body to section ruler
  if (typeof window !== 'undefined' && bodyRef.current && rulerScrollRef.current) {
    const body = bodyRef.current
    const ruler = rulerScrollRef.current
    if (!syncingRef.current) {
      ruler.scrollLeft = body.scrollLeft
    }
  }

  function handleAdd() {
    addMarker({ id: uid(), label: newLabel, startBar: newBar, color: newColor })
    setAdding(false)
  }

  return (
    <div className="flex shrink-0 h-8 bg-[#1e1e1e] border-b border-[#3a3a3a] overflow-hidden">
      {/* Fixed header button */}
      <div
        className="shrink-0 flex items-center justify-center border-r border-[#3a3a3a] relative"
        style={{ width: headerW }}
      >
        <button
          onClick={() => setAdding(!adding)}
          className="text-[10px] text-gray-500 hover:text-[#e8a020] px-2 transition-colors"
        >
          + Section
        </button>

        {adding && (
          <div className="absolute top-8 left-0 z-30 bg-[#2a2a2a] border border-[#3a3a3a] rounded p-3 flex gap-2 items-center shadow-2xl flex-wrap w-72">
            <select
              className="bg-[#1a1a1a] border border-[#3a3a3a] rounded px-1 py-1 text-xs text-white"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
            >
              {SECTION_LABELS.map(l => <option key={l}>{l}</option>)}
            </select>
            <input
              className="bg-[#1a1a1a] border border-[#3a3a3a] rounded px-1 py-1 text-xs text-white w-20"
              placeholder="Custom label"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
            />
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-400">Bar</span>
              <input
                type="number" min={1} max={bars} value={newBar}
                onChange={(e) => setNewBar(Number(e.target.value))}
                className="w-12 bg-[#1a1a1a] border border-[#3a3a3a] rounded px-1 py-1 text-xs text-white text-center"
              />
            </div>
            <div className="flex gap-1">
              {SECTION_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  className={`w-4 h-4 rounded-full border-2 ${newColor === c ? 'border-white' : 'border-transparent'}`}
                  style={{ background: c }}
                />
              ))}
            </div>
            <button onClick={handleAdd} className="bg-[#e8a020] text-black text-xs font-bold px-2 py-1 rounded">Add</button>
            <button onClick={() => setAdding(false)} className="text-gray-400 hover:text-white text-xs">✕</button>
          </div>
        )}
      </div>

      {/* Scrollable marker area */}
      <div
        ref={rulerScrollRef}
        className="flex-1 overflow-x-hidden relative"
        onScroll={onRulerScroll}
      >
        <div className="relative h-full" style={{ width: bars * barWidth }}>
          {markers.map((marker) => (
            <div
              key={marker.id}
              className="absolute top-0 h-full flex items-center group z-10"
              style={{ left: (marker.startBar - 1) * barWidth }}
            >
              <div className="h-full w-px" style={{ background: marker.color }} />
              <div
                className="px-1.5 py-0.5 text-[10px] font-bold rounded-r whitespace-nowrap select-none"
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
    </div>
  )
}

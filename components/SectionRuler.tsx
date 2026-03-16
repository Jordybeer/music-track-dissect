'use client'

import { RefObject, useCallback, useEffect, useRef, useState } from 'react'
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
  const { markers, addMarker, removeMarker, updateMarker } = useProjectStore()
  const [adding, setAdding] = useState(false)
  const [newBar, setNewBar] = useState(1)
  const [newLabel, setNewLabel] = useState('Drop')
  const [newColor, setNewColor] = useState(SECTION_COLORS[0])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingLabel, setEditingLabel] = useState('')
  const rulerScrollRef = useRef<HTMLDivElement>(null)
  const syncingRef = useRef(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 })

  const onRulerScroll = useCallback(() => {
    if (syncingRef.current || !rulerScrollRef.current || !bodyRef.current) return
    syncingRef.current = true
    bodyRef.current.scrollLeft = rulerScrollRef.current.scrollLeft
    syncingRef.current = false
  }, [bodyRef])

  if (typeof window !== 'undefined' && bodyRef.current && rulerScrollRef.current) {
    if (!syncingRef.current) rulerScrollRef.current.scrollLeft = bodyRef.current.scrollLeft
  }

  // Close popup on outside click
  useEffect(() => {
    if (!adding) return
    function handler(e: MouseEvent) {
      if (btnRef.current && !btnRef.current.closest('[data-section-popup]')?.contains(e.target as Node)) {
        // check if click is inside popup portal
        const portal = document.getElementById('section-popup-portal')
        if (portal && portal.contains(e.target as Node)) return
        setAdding(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [adding])

  function openAdding() {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setPopupPos({ top: rect.bottom + 4, left: rect.left })
    }
    setAdding(v => !v)
  }

  function handleAdd() {
    addMarker({ id: uid(), label: newLabel, startBar: newBar, color: newColor })
    setAdding(false)
  }

  function handleRulerTap(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return
    const rect = e.currentTarget.getBoundingClientRect()
    const bar = Math.max(1, Math.ceil((e.clientX - rect.left) / barWidth))
    setNewBar(bar)
    if (btnRef.current) {
      const brect = btnRef.current.getBoundingClientRect()
      setPopupPos({ top: brect.bottom + 4, left: brect.left })
    }
    setAdding(true)
  }

  return (
    <>
      <div className="flex shrink-0 border-b border-[#3a3a3a] overflow-hidden" style={{ height: 28 }}>
        {/* Fixed header */}
        <div
          className="shrink-0 flex items-center justify-center border-r border-[#3a3a3a] bg-[#1e1e1e] relative"
          style={{ width: headerW }}
        >
          <button
            ref={btnRef}
            data-section-popup
            onClick={openAdding}
            className="text-[10px] text-gray-500 hover:text-[#e8a020] px-2 transition-colors touch-manipulation"
          >+ Section</button>
        </div>

        {/* Scrollable ruler */}
        <div
          ref={rulerScrollRef}
          className="flex-1 overflow-x-hidden relative bg-[#171717] cursor-crosshair"
          onScroll={onRulerScroll}
          onClick={handleRulerTap}
        >
          <div className="relative h-full" style={{ width: bars * barWidth }}>
            {Array.from({ length: bars }, (_, i) => (
              <div
                key={i}
                className="absolute top-0 h-full pointer-events-none"
                style={{ left: i * barWidth, width: barWidth }}
              >
                <div
                  className="absolute left-0 top-0 h-full"
                  style={{ width: 1, background: i % 4 === 0 ? '#3a3a3a' : '#242424' }}
                />
                {i % 4 === 0 && (
                  <span
                    className="absolute top-0.5 left-0.5 text-[8px] text-gray-600 leading-none select-none pointer-events-none"
                    style={{ fontSize: 8 }}
                  >{i + 1}</span>
                )}
              </div>
            ))}

            {markers.map((marker) => (
              <div
                key={marker.id}
                className="absolute top-0 h-full flex items-center group z-10"
                style={{ left: (marker.startBar - 1) * barWidth }}
              >
                <div className="h-full w-px" style={{ background: marker.color }} />
                {editingId === marker.id ? (
                  <input
                    autoFocus
                    className="px-1 text-[10px] font-bold rounded-r bg-[#2a2a2a] border border-white/30 text-white outline-none w-20"
                    value={editingLabel}
                    onChange={(e) => setEditingLabel(e.target.value)}
                    onBlur={() => { updateMarker(marker.id, { label: editingLabel }); setEditingId(null) }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { updateMarker(marker.id, { label: editingLabel }); setEditingId(null) }
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <div
                    className="px-1.5 py-0.5 text-[10px] font-bold rounded-r whitespace-nowrap select-none cursor-pointer"
                    style={{ background: marker.color + '33', color: marker.color, borderLeft: `2px solid ${marker.color}` }}
                    onDoubleClick={(e) => { e.stopPropagation(); setEditingId(marker.id); setEditingLabel(marker.label) }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {marker.label}
                    <button
                      onClick={(e) => { e.stopPropagation(); removeMarker(marker.id) }}
                      className="ml-1 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 touch-manipulation"
                    >×</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Popup rendered at root level to escape overflow:hidden */}
      {adding && (
        <div
          id="section-popup-portal"
          className="fixed z-50 bg-[#2a2a2a] border border-[#3a3a3a] rounded p-3 flex gap-2 items-center shadow-2xl flex-wrap w-72"
          style={{ top: popupPos.top, left: popupPos.left }}
        >
          <select
            className="bg-[#1a1a1a] border border-[#3a3a3a] rounded px-1 py-1 text-xs text-white"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
          >
            {SECTION_LABELS.map(l => <option key={l}>{l}</option>)}
          </select>
          <input
            className="bg-[#1a1a1a] border border-[#3a3a3a] rounded px-1 py-1 text-xs text-white w-24"
            placeholder="Custom…"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
          />
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400">Bar</span>
            <input type="number" min={1} max={bars} value={newBar}
              onChange={(e) => setNewBar(Number(e.target.value))}
              className="w-12 bg-[#1a1a1a] border border-[#3a3a3a] rounded px-1 py-1 text-xs text-white text-center" />
          </div>
          <div className="flex gap-1">
            {SECTION_COLORS.map(c => (
              <button key={c} onClick={() => setNewColor(c)}
                className={`w-4 h-4 rounded-full border-2 touch-manipulation ${newColor === c ? 'border-white' : 'border-transparent'}`}
                style={{ background: c }} />
            ))}
          </div>
          <button onClick={handleAdd} className="bg-[#e8a020] text-black text-xs font-bold px-2 py-1 rounded touch-manipulation">Add</button>
          <button onClick={() => setAdding(false)} className="text-gray-400 hover:text-white text-xs touch-manipulation">✕</button>
        </div>
      )}
    </>
  )
}

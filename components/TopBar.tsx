'use client'

import { useRef, useState } from 'react'
import { useProjectStore, ZOOM_LEVELS } from '@/store/projectStore'

interface Props {
  inspectorOpen: boolean
  onToggleInspector: () => void
  rackOpen: boolean
  onToggleRack: () => void
}

export default function TopBar({ inspectorOpen, onToggleInspector, rackOpen, onToggleRack }: Props) {
  const { bpm, bars, barWidth, setBpm, setBars, setBarWidth, exportJSON, importJSON } = useProjectStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [undoFlash, setUndoFlash] = useState(false)
  const [redoFlash, setRedoFlash] = useState(false)
  const [gridOpen, setGridOpen] = useState(false)

  function triggerUndo() {
    useProjectStore.temporal.getState().undo()
    setUndoFlash(true)
    setTimeout(() => setUndoFlash(false), 400)
  }

  function triggerRedo() {
    useProjectStore.temporal.getState().redo()
    setRedoFlash(true)
    setTimeout(() => setRedoFlash(false), 400)
  }

  function handleExport() {
    const json = exportJSON()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'track-dissect.json'; a.click()
    URL.revokeObjectURL(url)
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => importJSON(ev.target?.result as string)
    reader.readAsText(file)
    e.target.value = ''
  }

  const currentZoom = ZOOM_LEVELS.find(z => z.px === barWidth) ?? ZOOM_LEVELS[4]
  const currentIdx = ZOOM_LEVELS.findIndex(z => z.px === barWidth)

  const btnBase = 'px-3 py-2 text-xs rounded border transition-colors touch-manipulation min-h-[40px] flex items-center'

  return (
    <div className="flex flex-col shrink-0 bg-[#242424] border-b border-[#3a3a3a]">
      {/* Main row */}
      <div className="flex items-center gap-2 px-3 h-12 overflow-x-auto">
        <span className="text-[#e8a020] font-bold text-xs tracking-widest uppercase shrink-0 select-none">Track Dissect</span>

        <div className="flex items-center gap-1 shrink-0">
          <button onClick={triggerUndo}
            className={`${btnBase} ${ undoFlash ? 'bg-[#e8a020] text-black border-[#e8a020]' : 'bg-[#2a2a2a] text-white border-[#3a3a3a] hover:bg-[#3a3a3a]' }`}
            title="Undo (Ctrl+Z)">↩</button>
          <button onClick={triggerRedo}
            className={`${btnBase} ${ redoFlash ? 'bg-[#e8a020] text-black border-[#e8a020]' : 'bg-[#2a2a2a] text-white border-[#3a3a3a] hover:bg-[#3a3a3a]' }`}
            title="Redo">↪</button>
        </div>

        <div className="w-px h-5 bg-[#3a3a3a] shrink-0" />

        <div className="flex items-center gap-1.5 shrink-0">
          <label className="text-xs text-gray-500 select-none">BPM</label>
          <input type="number" value={bpm} onChange={(e) => setBpm(Number(e.target.value))}
            className="w-14 bg-[#1a1a1a] border border-[#3a3a3a] rounded px-1.5 py-1.5 text-sm text-white text-center touch-manipulation"
            min={40} max={300} />
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <label className="text-xs text-gray-500 select-none">Bars</label>
          <input type="number" value={bars} onChange={(e) => setBars(Number(e.target.value))}
            className="w-14 bg-[#1a1a1a] border border-[#3a3a3a] rounded px-1.5 py-1.5 text-sm text-white text-center touch-manipulation"
            min={4} max={256} />
        </div>

        {/* Zoom — ‹ label › */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setGridOpen(v => !v)}
            className="text-xs text-gray-500 select-none hover:text-white transition-colors touch-manipulation"
            title="Toggle grid picker"
          >Zoom</button>
          <button
            onClick={() => currentIdx > 0 && setBarWidth(ZOOM_LEVELS[currentIdx - 1].px)}
            disabled={currentIdx === 0}
            className="w-7 h-8 flex items-center justify-center rounded border border-[#3a3a3a] bg-[#2a2a2a] text-white hover:bg-[#3a3a3a] disabled:opacity-30 touch-manipulation text-sm"
          >‹</button>
          <span className="w-10 text-center text-xs font-mono text-white bg-[#1a1a1a] border border-[#3a3a3a] rounded py-1">
            {currentZoom.label}
          </span>
          <button
            onClick={() => currentIdx < ZOOM_LEVELS.length - 1 && setBarWidth(ZOOM_LEVELS[currentIdx + 1].px)}
            disabled={currentIdx === ZOOM_LEVELS.length - 1}
            className="w-7 h-8 flex items-center justify-center rounded border border-[#3a3a3a] bg-[#2a2a2a] text-white hover:bg-[#3a3a3a] disabled:opacity-30 touch-manipulation text-sm"
          >›</button>
        </div>

        <div className="ml-auto flex items-center gap-2 shrink-0">
          <button onClick={onToggleRack} className={`${btnBase} ${ rackOpen ? 'bg-[#e8a020] text-black border-[#e8a020]' : 'bg-transparent text-gray-400 border-[#3a3a3a] hover:border-[#555]' }`}>FX</button>
          <button onClick={onToggleInspector} className={`${btnBase} ${ inspectorOpen ? 'bg-[#e8a020] text-black border-[#e8a020]' : 'bg-transparent text-gray-400 border-[#3a3a3a] hover:border-[#555]' }`}>Insp</button>
          <div className="w-px h-5 bg-[#3a3a3a]" />
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          <button onClick={() => fileRef.current?.click()} className={`${btnBase} bg-[#2a2a2a] text-white border-[#3a3a3a] hover:bg-[#3a3a3a]`}>Import</button>
          <button onClick={handleExport} className={`${btnBase} bg-[#e8a020] text-black font-bold hover:bg-yellow-400 border-[#e8a020]`}>Export</button>
        </div>
      </div>

      {/* Zoom pill row — toggled, hidden by default on landscape */}
      {gridOpen && (
        <div className="flex items-center gap-1 px-3 pb-1.5 overflow-x-auto">
          <span className="text-[10px] text-gray-600 shrink-0 mr-1">GRID</span>
          {ZOOM_LEVELS.map((z) => (
            <button
              key={z.label}
              onClick={() => { setBarWidth(z.px); setGridOpen(false) }}
              className={`px-2.5 py-1 text-[11px] rounded border shrink-0 transition-colors touch-manipulation font-mono ${
                z.px === barWidth
                  ? 'bg-[#e8a020] text-black border-[#e8a020] font-bold'
                  : 'bg-[#1a1a1a] text-gray-400 border-[#3a3a3a] hover:border-[#555] hover:text-white'
              }`}
            >
              {z.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

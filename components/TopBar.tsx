'use client'

import { useRef, useState } from 'react'
import { useProjectStore } from '@/store/projectStore'

interface Props {
  inspectorOpen: boolean
  onToggleInspector: () => void
  rackOpen: boolean
  onToggleRack: () => void
}

export default function TopBar({ inspectorOpen, onToggleInspector, rackOpen, onToggleRack }: Props) {
  const { bpm, bars, setBpm, setBars, exportJSON, importJSON } = useProjectStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [undoFlash, setUndoFlash] = useState(false)
  const [redoFlash, setRedoFlash] = useState(false)

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

  const btnBase = 'px-3 py-2 text-xs rounded border transition-colors touch-manipulation min-h-[40px] flex items-center'

  return (
    <div className="flex items-center gap-2 px-3 bg-[#242424] border-b border-[#3a3a3a] h-12 shrink-0 overflow-x-auto">
      <span className="text-[#e8a020] font-bold text-xs tracking-widest uppercase shrink-0 select-none">Track Dissect</span>

      {/* Undo / Redo — big enough for fingers */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={triggerUndo}
          className={`${btnBase} ${
            undoFlash ? 'bg-[#e8a020] text-black border-[#e8a020]' : 'bg-[#2a2a2a] text-white border-[#3a3a3a] hover:bg-[#3a3a3a]'
          }`}
          title="Undo (Ctrl+Z)"
        >↩</button>
        <button
          onClick={triggerRedo}
          className={`${btnBase} ${
            redoFlash ? 'bg-[#e8a020] text-black border-[#e8a020]' : 'bg-[#2a2a2a] text-white border-[#3a3a3a] hover:bg-[#3a3a3a]'
          }`}
          title="Redo"
        >↪</button>
      </div>

      <div className="w-px h-5 bg-[#3a3a3a] shrink-0" />

      <div className="flex items-center gap-1.5 shrink-0">
        <label className="text-xs text-gray-500 select-none">BPM</label>
        <input
          type="number" value={bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
          className="w-14 bg-[#1a1a1a] border border-[#3a3a3a] rounded px-1.5 py-1.5 text-sm text-white text-center touch-manipulation"
          min={40} max={300}
        />
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <label className="text-xs text-gray-500 select-none">Bars</label>
        <input
          type="number" value={bars}
          onChange={(e) => setBars(Number(e.target.value))}
          className="w-14 bg-[#1a1a1a] border border-[#3a3a3a] rounded px-1.5 py-1.5 text-sm text-white text-center touch-manipulation"
          min={4} max={256}
        />
      </div>

      <div className="ml-auto flex items-center gap-2 shrink-0">
        <button onClick={onToggleRack} className={`${btnBase} ${ rackOpen ? 'bg-[#e8a020] text-black border-[#e8a020]' : 'bg-transparent text-gray-400 border-[#3a3a3a] hover:border-[#555]' }`}>FX</button>
        <button onClick={onToggleInspector} className={`${btnBase} ${ inspectorOpen ? 'bg-[#e8a020] text-black border-[#e8a020]' : 'bg-transparent text-gray-400 border-[#3a3a3a] hover:border-[#555]' }`}>Inspector</button>
        <div className="w-px h-5 bg-[#3a3a3a]" />
        <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
        <button onClick={() => fileRef.current?.click()} className={`${btnBase} bg-[#2a2a2a] text-white border-[#3a3a3a] hover:bg-[#3a3a3a]`}>Import</button>
        <button onClick={handleExport} className={`${btnBase} bg-[#e8a020] text-black font-bold hover:bg-yellow-400 border-[#e8a020]`}>Export</button>
      </div>
    </div>
  )
}

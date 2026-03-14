'use client'

import { useRef } from 'react'
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

  function handleExport() {
    const json = exportJSON()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'track-dissect.json'
    a.click()
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

  return (
    <div className="flex items-center gap-3 px-4 py-0 bg-[#242424] border-b border-[#3a3a3a] h-11 shrink-0">
      <span className="text-[#e8a020] font-bold text-xs tracking-widest uppercase">Track Dissect</span>

      <div className="flex items-center gap-1.5 ml-3">
        <label className="text-xs text-gray-500">BPM</label>
        <input
          type="number" value={bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
          className="w-14 bg-[#1a1a1a] border border-[#3a3a3a] rounded px-1.5 py-0.5 text-sm text-white text-center"
          min={40} max={300}
        />
      </div>

      <div className="flex items-center gap-1.5">
        <label className="text-xs text-gray-500">Bars</label>
        <input
          type="number" value={bars}
          onChange={(e) => setBars(Number(e.target.value))}
          className="w-14 bg-[#1a1a1a] border border-[#3a3a3a] rounded px-1.5 py-0.5 text-sm text-white text-center"
          min={4} max={256}
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* View toggles */}
        <button
          onClick={onToggleRack}
          className={`px-2 py-0.5 text-xs rounded border transition-colors ${
            rackOpen ? 'bg-[#e8a020] text-black border-[#e8a020]' : 'bg-transparent text-gray-400 border-[#3a3a3a] hover:border-[#555]'
          }`}
          title="Toggle FX Rack"
        >
          FX Rack
        </button>
        <button
          onClick={onToggleInspector}
          className={`px-2 py-0.5 text-xs rounded border transition-colors ${
            inspectorOpen ? 'bg-[#e8a020] text-black border-[#e8a020]' : 'bg-transparent text-gray-400 border-[#3a3a3a] hover:border-[#555]'
          }`}
          title="Toggle Inspector"
        >
          Inspector
        </button>

        <div className="w-px h-4 bg-[#3a3a3a]" />

        <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
        <button
          onClick={() => fileRef.current?.click()}
          className="px-2 py-0.5 text-xs bg-[#2a2a2a] hover:bg-[#3a3a3a] rounded border border-[#3a3a3a] transition-colors"
        >
          Import
        </button>
        <button
          onClick={handleExport}
          className="px-2 py-0.5 text-xs bg-[#e8a020] text-black font-bold hover:bg-yellow-400 rounded transition-colors"
        >
          Export
        </button>
      </div>
    </div>
  )
}

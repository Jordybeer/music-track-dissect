'use client'

import { useProjectStore } from '@/store/projectStore'

export default function TopBar() {
  const { bpm, bars, setBpm, setBars, exportJSON } = useProjectStore()

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

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-[#242424] border-b border-[#3a3a3a] h-12 shrink-0">
      <span className="text-[#e8a020] font-bold text-sm tracking-widest uppercase">Track Dissect</span>
      <div className="flex items-center gap-2 ml-4">
        <label className="text-xs text-gray-400">BPM</label>
        <input
          type="number"
          value={bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
          className="w-16 bg-[#1a1a1a] border border-[#3a3a3a] rounded px-2 py-1 text-sm text-white text-center"
          min={40}
          max={300}
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-400">Bars</label>
        <input
          type="number"
          value={bars}
          onChange={(e) => setBars(Number(e.target.value))}
          className="w-16 bg-[#1a1a1a] border border-[#3a3a3a] rounded px-2 py-1 text-sm text-white text-center"
          min={4}
          max={256}
        />
      </div>
      <div className="ml-auto flex gap-2">
        <button
          onClick={handleExport}
          className="px-3 py-1 text-xs bg-[#3a3a3a] hover:bg-[#4a4a4a] rounded border border-[#4a4a4a] transition-colors"
        >
          Export JSON
        </button>
      </div>
    </div>
  )
}

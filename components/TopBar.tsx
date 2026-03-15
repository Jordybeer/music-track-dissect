'use client'

import { useRef, useState, useEffect } from 'react'
import { useProjectStore, ZOOM_LEVELS } from '@/store/projectStore'

interface Props {
  inspectorOpen: boolean
  onToggleInspector: () => void
  rackOpen: boolean
  onToggleRack: () => void
}

// Compress JSON -> base64url for URL hash sharing
async function encodeProject(json: string): Promise<string> {
  const stream = new CompressionStream('gzip')
  const writer = stream.writable.getWriter()
  writer.write(new TextEncoder().encode(json))
  writer.close()
  const buf = await new Response(stream.readable).arrayBuffer()
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function decodeProject(b64: string): Promise<string> {
  const pad = b64.replace(/-/g, '+').replace(/_/g, '/')
  const padded = pad + '=='.slice(0, (4 - pad.length % 4) % 4)
  const bytes = Uint8Array.from(atob(padded), c => c.charCodeAt(0))
  const stream = new DecompressionStream('gzip')
  const writer = stream.writable.getWriter()
  writer.write(bytes)
  writer.close()
  const buf = await new Response(stream.readable).arrayBuffer()
  return new TextDecoder().decode(buf)
}

export default function TopBar({ inspectorOpen, onToggleInspector, rackOpen, onToggleRack }: Props) {
  const { bpm, bars, barWidth, setBpm, setBars, setBarWidth, exportJSON, importJSON, projectName, setProjectName } = useProjectStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [undoFlash, setUndoFlash] = useState(false)
  const [redoFlash, setRedoFlash] = useState(false)
  const [gridOpen, setGridOpen] = useState(false)
  const [shareFlash, setShareFlash] = useState<'idle' | 'copying' | 'done' | 'error'>('idle')
  const [editingName, setEditingName] = useState(false)

  // On mount: load from URL hash if present
  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (!hash) return
    decodeProject(hash)
      .then(json => {
        importJSON(json)
        // Clear hash so refreshing doesn\'t re-import
        history.replaceState(null, '', window.location.pathname)
      })
      .catch(console.error)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  // 💾 Download .json file
  function handleDownload() {
    const json = exportJSON()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const safeName = (projectName || 'untitled').replace(/[^a-z0-9_\-]/gi, '_').toLowerCase()
    a.href = url; a.download = `${safeName}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  // 🔗 Encode project into URL hash and copy to clipboard
  async function handleShare() {
    setShareFlash('copying')
    try {
      const json = exportJSON()
      const encoded = await encodeProject(json)
      const shareUrl = `${window.location.origin}${window.location.pathname}#${encoded}`
      await navigator.clipboard.writeText(shareUrl)
      window.location.hash = encoded
      setShareFlash('done')
      setTimeout(() => setShareFlash('idle'), 2500)
    } catch {
      setShareFlash('error')
      setTimeout(() => setShareFlash('idle'), 2000)
    }
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
      <div className="flex items-center gap-2 px-3 h-12 overflow-x-auto">

        {/* Editable project name */}
        {editingName ? (
          <input
            autoFocus
            className="text-[#e8a020] font-bold text-xs tracking-widest uppercase bg-transparent border-b border-[#e8a020] outline-none shrink-0 w-40"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            onBlur={() => setEditingName(false)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setEditingName(false) }}
          />
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="text-[#e8a020] font-bold text-xs tracking-widest uppercase shrink-0 hover:opacity-70 transition-opacity touch-manipulation max-w-[140px] truncate text-left"
            title="Click to rename project"
          >
            {projectName || 'Untitled'}
          </button>
        )}

        <div className="flex items-center gap-1 shrink-0">
          <button onClick={triggerUndo}
            className={`${btnBase} ${ undoFlash ? 'bg-[#e8a020] text-black border-[#e8a020]' : 'bg-[#2a2a2a] text-white border-[#3a3a3a] hover:bg-[#3a3a3a]' }`}
            title="Undo">↩</button>
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

        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setGridOpen(v => !v)}
            className="text-xs text-gray-500 hover:text-white transition-colors touch-manipulation">Zoom</button>
          <button
            onClick={() => currentIdx > 0 && setBarWidth(ZOOM_LEVELS[currentIdx - 1].px)}
            disabled={currentIdx === 0}
            className="w-7 h-8 flex items-center justify-center rounded border border-[#3a3a3a] bg-[#2a2a2a] text-white hover:bg-[#3a3a3a] disabled:opacity-30 touch-manipulation text-sm"
          >‹</button>
          <span className="w-10 text-center text-xs font-mono text-white bg-[#1a1a1a] border border-[#3a3a3a] rounded py-1">{currentZoom.label}</span>
          <button
            onClick={() => currentIdx < ZOOM_LEVELS.length - 1 && setBarWidth(ZOOM_LEVELS[currentIdx + 1].px)}
            disabled={currentIdx === ZOOM_LEVELS.length - 1}
            className="w-7 h-8 flex items-center justify-center rounded border border-[#3a3a3a] bg-[#2a2a2a] text-white hover:bg-[#3a3a3a] disabled:opacity-30 touch-manipulation text-sm"
          >›</button>
        </div>

        <div className="ml-auto flex items-center gap-2 shrink-0">
          <button onClick={onToggleRack}
            className={`${btnBase} ${ rackOpen ? 'bg-[#e8a020] text-black border-[#e8a020]' : 'bg-transparent text-gray-400 border-[#3a3a3a] hover:border-[#555]' }`}>FX</button>
          <button onClick={onToggleInspector}
            className={`${btnBase} ${ inspectorOpen ? 'bg-[#e8a020] text-black border-[#e8a020]' : 'bg-transparent text-gray-400 border-[#3a3a3a] hover:border-[#555]' }`}>Insp</button>

          <div className="w-px h-5 bg-[#3a3a3a]" />

          {/* Import */}
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          <button
            onClick={() => fileRef.current?.click()}
            className={`${btnBase} bg-[#2a2a2a] text-white border-[#3a3a3a] hover:bg-[#3a3a3a]`}
            title="Import .json"
          >📂</button>

          {/* Download */}
          <button
            onClick={handleDownload}
            className={`${btnBase} bg-[#2a2a2a] text-white border-[#3a3a3a] hover:bg-[#3a3a3a]`}
            title="Download project as .json"
          >💾</button>

          {/* Share link */}
          <button
            onClick={handleShare}
            title={shareFlash === 'done' ? 'Link copied!' : shareFlash === 'error' ? 'Failed' : 'Copy shareable link'}
            className={`${btnBase} font-bold border transition-colors ${
              shareFlash === 'done'  ? 'bg-[#22c55e] text-black border-[#22c55e]' :
              shareFlash === 'error' ? 'bg-red-500 text-white border-red-500' :
              shareFlash === 'copying' ? 'bg-[#3a3a3a] text-white border-[#555] opacity-60' :
              'bg-[#e8a020] text-black border-[#e8a020] hover:bg-yellow-400'
            }`}
          >
            {shareFlash === 'done' ? '✓' : shareFlash === 'error' ? '✕' : '🔗'}
          </button>
        </div>
      </div>

      {gridOpen && (
        <div className="flex items-center gap-1 px-3 pb-1.5 overflow-x-auto">
          <span className="text-[10px] text-gray-600 shrink-0 mr-1">GRID</span>
          {ZOOM_LEVELS.map((z) => (
            <button key={z.label}
              onClick={() => { setBarWidth(z.px); setGridOpen(false) }}
              className={`px-2.5 py-1 text-[11px] rounded border shrink-0 transition-colors touch-manipulation font-mono ${
                z.px === barWidth
                  ? 'bg-[#e8a020] text-black border-[#e8a020] font-bold'
                  : 'bg-[#1a1a1a] text-gray-400 border-[#3a3a3a] hover:border-[#555] hover:text-white'
              }`}
            >{z.label}</button>
          ))}
        </div>
      )}
    </div>
  )
}

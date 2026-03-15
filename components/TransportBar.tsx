'use client'

import { useAudioEngine } from '@/hooks/useAudioEngine'
import { useAudioUnlock } from '@/hooks/useAudioUnlock'

export default function TransportBar() {
  const { transportState, position, masterVolume, play, pause, stop, setMasterVolume } = useAudioEngine()
  const { unlocked, unlock } = useAudioUnlock()

  const isPlaying = transportState === 'started'
  const isPaused  = transportState === 'paused'

  // Format Tone position string "bars:beats:sixteenths" → "1.1.1" style
  function fmtPos(pos: string) {
    // Tone returns e.g. "0:0:0" (0-indexed), display 1-indexed
    const parts = String(pos).split(':')
    if (parts.length < 3) return pos
    return `${Number(parts[0]) + 1}.${Number(parts[1]) + 1}.${Number(parts[2].split('.')[0]) + 1}`
  }

  return (
    <div className="shrink-0 flex items-center gap-3 px-3 h-10 bg-[#1a1a1a] border-b border-[#3a3a3a] overflow-x-auto">

      {/* Audio unlock gate */}
      {!unlocked && (
        <button
          onClick={unlock}
          className="px-3 py-1 text-[10px] rounded border border-[#e8a020] text-[#e8a020] hover:bg-[#e8a020] hover:text-black transition-colors touch-manipulation shrink-0 animate-pulse"
        >
          ▶ Enable Audio
        </button>
      )}

      {/* Transport buttons */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Play / Pause */}
        <button
          onClick={async () => {
            await unlock()
            isPlaying ? pause() : play()
          }}
          className={`w-9 h-8 flex items-center justify-center rounded border text-sm transition-colors touch-manipulation ${
            isPlaying
              ? 'bg-[#e8a020] text-black border-[#e8a020]'
              : isPaused
              ? 'bg-[#3a3a2a] text-[#e8a020] border-[#e8a020]'
              : 'bg-[#2a2a2a] text-white border-[#3a3a3a] hover:bg-[#3a3a3a]'
          }`}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        {/* Stop */}
        <button
          onClick={stop}
          disabled={transportState === 'stopped'}
          className="w-9 h-8 flex items-center justify-center rounded border text-sm transition-colors touch-manipulation bg-[#2a2a2a] text-white border-[#3a3a3a] hover:bg-[#3a3a3a] disabled:opacity-30"
          title="Stop"
        >
          ⏹
        </button>
      </div>

      {/* Position readout */}
      <div className="font-mono text-xs text-[#e8a020] bg-[#111] border border-[#3a3a3a] rounded px-2 py-1 shrink-0 min-w-[64px] text-center">
        {fmtPos(position)}
      </div>

      {/* Status pill */}
      <div className={`text-[10px] px-2 py-0.5 rounded border shrink-0 transition-colors ${
        isPlaying  ? 'bg-[#1a2a1a] text-[#22c55e] border-[#22c55e]/40' :
        isPaused   ? 'bg-[#2a2a1a] text-[#e8a020] border-[#e8a020]/40' :
                     'bg-[#1a1a1a] text-gray-600 border-[#2a2a2a]'
      }`}>
        {isPlaying ? 'PLAYING' : isPaused ? 'PAUSED' : 'STOPPED'}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Master volume */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] text-gray-500 select-none">VOL</span>
        <input
          type="range"
          min={-40}
          max={6}
          step={1}
          value={masterVolume}
          onChange={(e) => setMasterVolume(Number(e.target.value))}
          className="w-20 accent-[#e8a020] touch-manipulation"
        />
        <span className="text-[10px] font-mono text-gray-400 w-8 text-right">{masterVolume > 0 ? `+${masterVolume}` : masterVolume}dB</span>
      </div>
    </div>
  )
}

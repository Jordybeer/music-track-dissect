'use client'

import { useProjectStore } from '@/store/projectStore'

const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const SCALES = ['Major', 'Minor', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Locrian', 'Chromatic']
const FX_DEVICES = [
  'Reverb', 'Delay', 'Chorus', 'Flanger', 'Phaser', 'Compressor',
  'EQ', 'Limiter', 'Auto Filter', 'Env Follower', 'Distortion',
  'Saturator', 'Redux', 'Spectrum', 'Utility', 'ABL3', 'Slippery Slope',
  'Sting 2', 'Gross Beat', 'OTT', 'Sidechain', 'LFO Tool',
]

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

export default function Inspector() {
  const { tracks, selectedTrackId, updateTrack, addFX, removeFX } = useProjectStore()
  const track = tracks.find(t => t.id === selectedTrackId)

  if (!track) {
    return (
      <div className="w-52 shrink-0 bg-[#242424] border-l border-[#3a3a3a] flex items-center justify-center">
        <p className="text-xs text-gray-600 text-center px-4">Click a track to inspect</p>
      </div>
    )
  }

  return (
    <div className="w-52 shrink-0 bg-[#242424] border-l border-[#3a3a3a] flex flex-col overflow-y-auto">
      <div className="px-3 py-2 border-b border-[#3a3a3a] flex items-center gap-2">
        <div className="w-2 h-2 rounded-full" style={{ background: track.color }} />
        <input
          className="flex-1 bg-transparent text-sm font-semibold outline-none"
          value={track.name}
          onChange={(e) => updateTrack(track.id, { name: e.target.value })}
        />
        <span className="text-xs text-gray-500">{track.type}</span>
      </div>

      <div className="p-3 space-y-3">
        {/* Role */}
        <div>
          <label className="text-xs text-gray-400 block mb-1">Layer Role</label>
          <input
            className="w-full bg-[#1a1a1a] border border-[#3a3a3a] rounded px-2 py-1 text-xs text-white"
            placeholder="e.g. kick, sub, riser, pad"
            value={track.role}
            onChange={(e) => updateTrack(track.id, { role: e.target.value })}
          />
        </div>

        {/* Key + Scale */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Key</label>
            <select
              className="w-full bg-[#1a1a1a] border border-[#3a3a3a] rounded px-1 py-1 text-xs text-white"
              value={track.key}
              onChange={(e) => updateTrack(track.id, { key: e.target.value })}
            >
              <option value="">—</option>
              {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Scale</label>
            <select
              className="w-full bg-[#1a1a1a] border border-[#3a3a3a] rounded px-1 py-1 text-xs text-white"
              value={track.scale}
              onChange={(e) => updateTrack(track.id, { scale: e.target.value })}
            >
              <option value="">—</option>
              {SCALES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs text-gray-400 block mb-1">Notes</label>
          <textarea
            className="w-full bg-[#1a1a1a] border border-[#3a3a3a] rounded px-2 py-1 text-xs text-white resize-none"
            rows={3}
            placeholder="What did you hear? Observations..."
            value={track.notes}
            onChange={(e) => updateTrack(track.id, { notes: e.target.value })}
          />
        </div>

        {/* Sends */}
        <div>
          <label className="text-xs text-gray-400 block mb-1">Sends</label>
          <div className="flex gap-1 flex-wrap">
            {['A', 'B', 'C', 'D'].map(s => {
              const active = track.sends.includes(s)
              return (
                <button
                  key={s}
                  onClick={() => updateTrack(track.id, {
                    sends: active
                      ? track.sends.filter(x => x !== s)
                      : [...track.sends, s]
                  })}
                  className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                    active
                      ? 'bg-[#f59e0b] text-black border-[#f59e0b]'
                      : 'bg-transparent text-gray-400 border-[#3a3a3a] hover:border-[#555]'
                  }`}
                >
                  {s}
                </button>
              )
            })}
          </div>
        </div>

        {/* FX Chain */}
        <div>
          <label className="text-xs text-gray-400 block mb-2">FX Chain</label>
          <div className="space-y-1">
            {track.fx.map((device, i) => (
              <div
                key={device.id}
                className="flex items-center gap-1 bg-[#1a1a1a] border border-[#3a3a3a] rounded px-2 py-1"
              >
                <span className="text-xs text-gray-300 mr-1 text-gray-500">{i + 1}</span>
                <span className="text-xs flex-1 truncate">{device.name}</span>
                <button
                  onClick={() => removeFX(track.id, device.id)}
                  className="text-gray-600 hover:text-red-400 text-xs"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <select
            className="w-full mt-1 bg-[#1a1a1a] border border-[#3a3a3a] rounded px-1 py-1 text-xs text-white"
            value=""
            onChange={(e) => {
              if (e.target.value) {
                addFX(track.id, { id: uid(), name: e.target.value, params: {} })
              }
            }}
          >
            <option value="">+ Add FX device</option>
            {FX_DEVICES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>
    </div>
  )
}

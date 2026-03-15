'use client'

import { useRef } from 'react'
import { useProjectStore, makeSteps, SynthType } from '@/store/projectStore'
import { storeSample } from '@/hooks/useAudioEngine'
import StepEditor from './StepEditor'

const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const SCALES = ['Major', 'Minor', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Locrian', 'Chromatic']
const FX_DEVICES = [
  'Reverb', 'Delay', 'Chorus', 'Flanger', 'Phaser', 'Compressor',
  'EQ', 'Limiter', 'Auto Filter', 'Env Follower', 'Distortion',
  'Saturator', 'Redux', 'Spectrum', 'Utility', 'ABL3', 'Slippery Slope',
  'Sting 2', 'Gross Beat', 'OTT', 'Sidechain', 'LFO Tool',
]

const SYNTH_TYPES: { value: SynthType; label: string }[] = [
  { value: 'sawtooth', label: 'Saw' },
  { value: 'square',   label: 'Square' },
  { value: 'sine',     label: 'Sine' },
  { value: 'triangle', label: 'Triangle' },
  { value: 'fmsine',   label: 'FM Sine' },
  { value: 'amsine',   label: 'AM Sine' },
]

function uid() { return Math.random().toString(36).slice(2, 10) }

interface Props { onClose: () => void }

export default function Inspector({ onClose }: Props) {
  const { tracks, selectedTrackId, selectedClipId, updateTrack, addFX, removeFX, setGroupId, selectClip } = useProjectStore()
  const track = tracks.find(t => t.id === selectedTrackId)
  const groups = tracks.filter(t => t.type === 'group')
  const selectedClip = track?.clips.find(c => c.id === selectedClipId)
  const isPatternTrack = track?.type === 'midi' || track?.type === 'drum'
  const sampleRef = useRef<HTMLInputElement>(null)

  async function handleSampleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !track) return
    await storeSample(track.id, file)
    updateTrack(track.id, { sampleName: file.name })
    e.target.value = ''
  }

  return (
    <div className="w-48 lg:w-56 shrink-0 bg-[#242424] border-l border-[#3a3a3a] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-[#3a3a3a] flex items-center gap-2 shrink-0">
        {track ? (
          <>
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: track.color }} />
            <input
              className="flex-1 bg-transparent text-sm font-semibold outline-none min-w-0"
              value={track.name}
              onChange={(e) => updateTrack(track.id, { name: e.target.value })}
            />
            <span className="text-[10px] text-gray-500 shrink-0">{track.type}</span>
          </>
        ) : (
          <span className="flex-1 text-xs text-gray-500">Inspector</span>
        )}
        <button onClick={onClose} className="text-gray-500 hover:text-white text-xs ml-1 shrink-0 touch-manipulation">×</button>
      </div>

      {!track ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-gray-600 text-center px-4">Click a track to inspect</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">

          {/* ── SOUND SOURCE ── midi synth picker + sample upload ─────────── */}
          {(track.type === 'midi' || track.type === 'audio' || track.type === 'drum') && (
            <div className="px-3 py-2.5 border-b border-[#3a3a3a] bg-[#1a1e1a] space-y-2">
              <label className="text-[10px] text-[#22c55e] font-semibold uppercase tracking-wider block">Sound Source</label>

              {/* Synth type — midi only */}
              {track.type === 'midi' && (
                <div>
                  <label className="text-[10px] text-gray-500 block mb-1">Oscillator</label>
                  <div className="flex flex-wrap gap-1">
                    {SYNTH_TYPES.map(s => (
                      <button
                        key={s.value}
                        onClick={() => updateTrack(track.id, { synthType: s.value })}
                        className={`px-2 py-0.5 text-[10px] rounded border transition-colors touch-manipulation ${
                          (track.synthType ?? 'sawtooth') === s.value
                            ? 'bg-[#22c55e] text-black border-[#22c55e] font-bold'
                            : 'bg-transparent text-gray-400 border-[#3a3a3a] hover:border-[#555]'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sample upload — audio + drum tracks */}
              {(track.type === 'audio' || track.type === 'drum') && (
                <div>
                  <label className="text-[10px] text-gray-500 block mb-1">Sample</label>
                  <input
                    ref={sampleRef}
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={handleSampleUpload}
                  />
                  <button
                    onClick={() => sampleRef.current?.click()}
                    className="w-full text-left px-2 py-1.5 bg-[#1a1a1a] border border-[#3a3a3a] hover:border-[#22c55e] rounded text-xs text-gray-300 transition-colors touch-manipulation"
                  >
                    {track.sampleName ? (
                      <span className="text-[#22c55e] truncate block">✓ {track.sampleName}</span>
                    ) : (
                      <span className="text-gray-500">↑ Upload sample…</span>
                    )}
                  </button>
                  {track.sampleName && (
                    <button
                      onClick={() => {
                        updateTrack(track.id, { sampleName: '' })
                        // Don't delete from sampleBufferMap here — engine will
                        // fall back to synth on next play/sync automatically
                      }}
                      className="text-[9px] text-gray-600 hover:text-red-400 mt-0.5 touch-manipulation"
                    >
                      × clear sample
                    </button>
                  )}
                  <p className="text-[9px] text-gray-600 mt-1 leading-tight">
                    {track.type === 'drum'
                      ? 'Each active step triggers this sample'
                      : 'Replaces synth. Pitch-mapped to C3.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── MOVE TO GROUP ── */}
          {track.type !== 'group' && (
            <div className="px-3 py-2.5 border-b border-[#3a3a3a] bg-[#1e1e2e]">
              <label className="text-[10px] text-[#a855f7] font-semibold uppercase tracking-wider block mb-1.5">Move to Group</label>
              {groups.length === 0 ? (
                <p className="text-[10px] text-gray-600 italic">No groups yet — add a Group track first</p>
              ) : (
                <div className="flex gap-1.5 items-center">
                  <select
                    className="flex-1 bg-[#2a1f3a] border border-[#a855f7]/40 rounded px-2 py-1.5 text-xs text-white focus:border-[#a855f7] outline-none"
                    value={track.groupId ?? ''}
                    onChange={(e) => setGroupId(track.id, e.target.value || null)}
                  >
                    <option value="">— Ungrouped —</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                  {track.groupId && (
                    <button
                      onClick={() => setGroupId(track.id, null)}
                      className="text-[#a855f7] hover:text-white text-xs px-1.5 py-1.5 rounded border border-[#a855f7]/40 hover:border-[#a855f7] transition-colors touch-manipulation"
                    >↑</button>
                  )}
                </div>
              )}
              {track.groupId && (
                <p className="text-[9px] text-[#a855f7]/60 mt-1">
                  In: {groups.find(g => g.id === track.groupId)?.name}
                </p>
              )}
            </div>
          )}

          {/* ── Clip list & step editor ── */}
          {isPatternTrack && (
            <div className="p-3 border-b border-[#3a3a3a] space-y-2">
              <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">Clips</label>
              {track.clips.length === 0 && (
                <p className="text-[10px] text-gray-600 italic">No clips yet</p>
              )}
              {track.clips.map(clip => (
                <button
                  key={clip.id}
                  onClick={() => selectClip(selectedClipId === clip.id ? null : clip.id)}
                  className={`w-full text-left px-2 py-1.5 rounded border text-xs transition-colors touch-manipulation ${
                    selectedClipId === clip.id
                      ? 'border-[#e8a020] bg-[#2a2a1a] text-white'
                      : 'border-[#3a3a3a] bg-[#1a1a1a] text-gray-300 hover:border-[#555]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: clip.color }} />
                    <span className="flex-1 truncate">{clip.label}</span>
                    <span className="text-[9px] text-gray-600">{clip.steps?.filter(s => s.active).length ?? 0}/16</span>
                  </div>
                </button>
              ))}
              {selectedClip && (
                <div className="mt-2">
                  <StepEditor
                    clip={{ ...selectedClip, steps: selectedClip.steps?.length === 16 ? selectedClip.steps : makeSteps() }}
                    trackId={track.id}
                    color={track.color}
                    isDrum={track.type === 'drum'}
                  />
                </div>
              )}
            </div>
          )}

          {/* ── Group children ── */}
          {track.type === 'group' && (
            <div className="p-3 border-b border-[#3a3a3a]">
              <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block mb-1.5">
                Children ({tracks.filter(t => t.groupId === track.id).length})
              </label>
              {tracks.filter(t => t.groupId === track.id).map(c => (
                <div key={c.id} className="flex items-center gap-1 text-xs py-0.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} />
                  <span className="flex-1 truncate text-gray-300">{c.name}</span>
                  <button onClick={() => setGroupId(c.id, null)} className="text-gray-500 hover:text-red-400 text-[10px] touch-manipulation">↑</button>
                </div>
              ))}
              {tracks.filter(t => t.groupId === track.id).length === 0 && (
                <p className="text-[10px] text-gray-600 italic">Select a track and assign it here</p>
              )}
            </div>
          )}

          {/* ── Track settings ── */}
          <div className="p-3 space-y-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Layer Role</label>
              <input
                className="w-full bg-[#1a1a1a] border border-[#3a3a3a] rounded px-2 py-1 text-xs text-white"
                placeholder="kick, sub, riser, pad..."
                value={track.role}
                onChange={(e) => updateTrack(track.id, { role: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Key</label>
                <select className="w-full bg-[#1a1a1a] border border-[#3a3a3a] rounded px-1 py-1 text-xs text-white"
                  value={track.key} onChange={(e) => updateTrack(track.id, { key: e.target.value })}>
                  <option value="">—</option>
                  {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Scale</label>
                <select className="w-full bg-[#1a1a1a] border border-[#3a3a3a] rounded px-1 py-1 text-xs text-white"
                  value={track.scale} onChange={(e) => updateTrack(track.id, { scale: e.target.value })}>
                  <option value="">—</option>
                  {SCALES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Notes</label>
              <textarea
                className="w-full bg-[#1a1a1a] border border-[#3a3a3a] rounded px-2 py-1 text-xs text-white resize-none"
                rows={3} placeholder="Observations..."
                value={track.notes} onChange={(e) => updateTrack(track.id, { notes: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Sends</label>
              <div className="flex gap-1 flex-wrap">
                {['A', 'B', 'C', 'D'].map(s => {
                  const active = track.sends.includes(s)
                  return (
                    <button key={s}
                      onClick={() => updateTrack(track.id, { sends: active ? track.sends.filter(x => x !== s) : [...track.sends, s] })}
                      className={`px-2 py-0.5 text-xs rounded border transition-colors touch-manipulation ${
                        active ? 'bg-[#f59e0b] text-black border-[#f59e0b]' : 'bg-transparent text-gray-400 border-[#3a3a3a] hover:border-[#555]'
                      }`}>{s}</button>
                  )
                })}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">FX Chain</label>
              {track.fx.map((device, i) => (
                <div key={device.id} className="flex items-center gap-1 bg-[#1a1a1a] border border-[#3a3a3a] rounded px-2 py-1 mb-1">
                  <span className="text-[10px] text-gray-600">{i + 1}</span>
                  <span className="text-xs flex-1 truncate">{device.name}</span>
                  <button onClick={() => removeFX(track.id, device.id)} className="text-gray-600 hover:text-red-400 text-xs touch-manipulation">×</button>
                </div>
              ))}
              <select className="w-full bg-[#1a1a1a] border border-[#3a3a3a] rounded px-1 py-1 text-xs text-white mt-1"
                value="" onChange={(e) => { if (e.target.value) addFX(track.id, { id: uid(), name: e.target.value, params: {} }) }}>
                <option value="">+ Add FX device</option>
                {FX_DEVICES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

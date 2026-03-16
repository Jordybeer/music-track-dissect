'use client'

import { useState, useRef, useCallback } from 'react'
import { useProjectStore, uid, FXDevice } from '@/store/projectStore'
import { useSortable, SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAudioEngine } from '@/hooks/useAudioEngine'

const RACK_HEIGHT = 148

const DEVICE_COLORS: Record<string, string> = {
  'Auto Filter': '#06b6d4',
  'Reverb': '#8b5cf6',
  'Delay': '#8b5cf6',
  'Compressor': '#f59e0b',
  'Saturator': '#f59e0b',
  'EQ Eight': '#22c55e',
  'EQ': '#22c55e',
  'Limiter': '#f59e0b',
  'Env Follower': '#e8a020',
  'LFO Tool': '#e8a020',
  'Chorus': '#8b5cf6',
  'Flanger': '#8b5cf6',
  'Phaser': '#8b5cf6',
  'Distortion': '#ef4444',
  'Redux': '#ef4444',
  'Utility': '#6b7280',
  'Spectrum': '#6b7280',
  'OTT': '#f59e0b',
  'ABL3': '#22c55e',
  'Slippery Slope': '#22c55e',
  'Sting 2': '#22c55e',
  'Gross Beat': '#ef4444',
  'Sidechain': '#06b6d4',
  'ADSR': '#e8a020',
}

const DEVICE_PARAMS: Record<string, { key: string; label: string; min: number; max: number; def: number; step?: number }[]> = {
  Reverb:       [{ key: 'wet',         label: 'Wet',       min: 0,   max: 1,    def: 0.3,  step: 0.01 }, { key: 'decay',     label: 'Decay',     min: 0.1, max: 10,  def: 2.5, step: 0.1  }],
  Delay:        [{ key: 'wet',         label: 'Wet',       min: 0,   max: 1,    def: 0.3,  step: 0.01 }, { key: 'feedback',  label: 'Feedback',  min: 0,   max: 0.95, def: 0.3, step: 0.01 }],
  Chorus:       [{ key: 'wet',         label: 'Wet',       min: 0,   max: 1,    def: 0.5,  step: 0.01 }, { key: 'depth',     label: 'Depth',     min: 0,   max: 1,    def: 0.5, step: 0.01 }],
  Phaser:       [{ key: 'wet',         label: 'Wet',       min: 0,   max: 1,    def: 0.5,  step: 0.01 }, { key: 'frequency', label: 'Rate',      min: 0.1, max: 10,   def: 0.5, step: 0.1  }],
  Compressor:   [{ key: 'threshold',   label: 'Threshold', min: -60, max: 0,    def: -24,  step: 1    }, { key: 'ratio',     label: 'Ratio',     min: 1,   max: 20,   def: 4,   step: 0.5  }],
  OTT:          [{ key: 'threshold',   label: 'Threshold', min: -60, max: 0,    def: -24,  step: 1    }, { key: 'ratio',     label: 'Ratio',     min: 1,   max: 20,   def: 4,   step: 0.5  }],
  Sidechain:    [
    { key: 'amount',  label: 'Amount',  min: 0, max: 1,   def: 0.8,  step: 0.01 },
    { key: 'attack',  label: 'Attack',  min: 0.001, max: 1, def: 0.01, step: 0.001 },
    { key: 'release', label: 'Release', min: 0.01,  max: 2, def: 0.2,  step: 0.01  },
  ],
  Distortion:   [{ key: 'distortion', label: 'Drive',   min: 0,   max: 1,  def: 0.4, step: 0.01 }, { key: 'wet',       label: 'Wet',      min: 0,   max: 1,  def: 1,   step: 0.01 }],
  Saturator:    [{ key: 'distortion', label: 'Drive',   min: 0,   max: 1,  def: 0.4, step: 0.01 }, { key: 'wet',       label: 'Wet',      min: 0,   max: 1,  def: 1,   step: 0.01 }],
  Redux:        [{ key: 'distortion', label: 'Drive',   min: 0,   max: 1,  def: 0.4, step: 0.01 }, { key: 'wet',       label: 'Wet',      min: 0,   max: 1,  def: 1,   step: 0.01 }],
  EQ:           [{ key: 'low',        label: 'Low',     min: -12, max: 12, def: 0,   step: 0.5  }, { key: 'mid',       label: 'Mid',      min: -12, max: 12, def: 0,   step: 0.5  }, { key: 'high', label: 'High', min: -12, max: 12, def: 0, step: 0.5 }],
  Limiter:      [{ key: 'threshold',  label: 'Ceiling', min: -30, max: 0,  def: -6,  step: 0.5  }],
  'Auto Filter':[{ key: 'wet',        label: 'Wet',     min: 0,   max: 1,  def: 1,   step: 0.01 }, { key: 'frequency', label: 'Freq',     min: 20,  max: 20000, def: 1000, step: 10 }],
  ADSR:         [{ key: 'attack', label: 'A', min: 0.001, max: 2, def: 0.02, step: 0.001 }, { key: 'decay', label: 'D', min: 0.001, max: 4, def: 0.1, step: 0.001 }, { key: 'sustain', label: 'S', min: 0, max: 1, def: 0.5, step: 0.01 }, { key: 'release', label: 'R', min: 0.001, max: 8, def: 0.8, step: 0.001 }],
}

function getParams(name: string) {
  return DEVICE_PARAMS[name] ?? [{ key: 'wet', label: 'Wet', min: 0, max: 1, def: 0.5, step: 0.01 }]
}

function ParamSlider({ param, value, color, onChange }: {
  param: { key: string; label: string; min: number; max: number; def: number; step?: number }
  value: number
  color: string
  onChange: (v: number) => void
}) {
  const pct = ((value - param.min) / (param.max - param.min)) * 100
  return (
    <div className="flex items-center gap-1.5 w-full">
      <span className="text-[9px] text-gray-500 w-10 shrink-0 truncate">{param.label}</span>
      <div className="flex-1 relative">
        <input
          type="range"
          min={param.min} max={param.max} step={param.step ?? 0.01}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-3 appearance-none cursor-pointer touch-manipulation"
          style={{ background: `linear-gradient(to right, ${color}cc ${pct}%, #1a1a1a ${pct}%)`, borderRadius: 4 }}
        />
      </div>
      <span className="text-[9px] text-gray-400 w-8 text-right shrink-0">
        {Math.abs(value) >= 100 ? Math.round(value) : value.toFixed(param.step && param.step >= 1 ? 0 : 2)}
      </span>
    </div>
  )
}

function SidechainSourceRow({ device, trackId }: { device: FXDevice; trackId: string }) {
  const { tracks, updateFXParam } = useProjectStore()
  const sources = tracks.filter(t => t.id !== trackId && t.type !== 'group')
  const currentSource = device.params.sourceTrackId ?? ''
  return (
    <div className="px-1.5 pb-1.5">
      <span className="text-[9px] text-gray-500 block mb-0.5">Source</span>
      <select
        className="w-full bg-[#1a1a1a] border border-[#06b6d4]/40 rounded px-1 py-0.5 text-[9px] text-white focus:border-[#06b6d4] outline-none"
        value={currentSource}
        onChange={(e) => updateFXParam(trackId, device.id, 'sourceTrackId', e.target.value)}
      >
        <option value="">— none —</option>
        {sources.map(t => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
    </div>
  )
}

function DeviceCard({ device, trackId, index, onExpand }: {
  device: FXDevice
  trackId: string
  index: number
  onExpand: (device: FXDevice) => void
}) {
  const { removeFX } = useProjectStore()
  const { updateFXParam } = useAudioEngine()
  const color = DEVICE_COLORS[device.name] ?? '#555'
  const params = getParams(device.name)
  const isSidechain = device.name === 'Sidechain'
  const isADSR = device.name === 'ADSR'

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `fx-${device.id}`,
    data: { kind: 'fx-device', deviceId: device.id, trackId },
  })

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }

  function getVal(key: string, def: number) {
    const raw = device.params[key]
    return raw !== undefined ? parseFloat(raw) : def
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`shrink-0 bg-[#2a2a2a] border border-[#3a3a3a] rounded flex flex-col overflow-hidden hover:border-[#555] transition-colors ${
        isSidechain ? 'w-36' : 'w-32'
      }`}
    >
      <div
        className="h-6 flex items-center gap-1 px-1.5 cursor-grab active:cursor-grabbing shrink-0"
        style={{ background: color + '33', borderBottom: `1px solid ${color}` }}
        {...attributes} {...listeners}
      >
        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
        <span className="text-[10px] font-bold truncate flex-1" style={{ color }}>{device.name}</span>
        <button title="Open 303 panel" onClick={() => onExpand(device)}
          className="text-gray-500 hover:text-white text-[10px] shrink-0 px-0.5"
          onPointerDown={(e) => e.stopPropagation()}>&#9645;</button>
        <button onClick={() => removeFX(trackId, device.id)}
          className="text-gray-600 hover:text-red-400 text-[10px] shrink-0"
          onPointerDown={(e) => e.stopPropagation()}>×</button>
      </div>

      {isSidechain && <SidechainSourceRow device={device} trackId={trackId} />}

      <div className="flex-1 px-1.5 py-1 space-y-1 overflow-hidden">
        {params.slice(0, isADSR ? 4 : 2).map(p => (
          <ParamSlider key={p.key} param={p}
            value={getVal(p.key, p.def)}
            color={color}
            onChange={(v) => updateFXParam(trackId, device.id, p.key, v)}
          />
        ))}
      </div>
      <div className="px-1.5 pb-1"><span className="text-[9px] text-gray-600">#{index + 1}</span></div>
    </div>
  )
}

// ─── 303-style rotary knob ────────────────────────────────────────────────────
function Knob({ param, value, color, size = 64, onChange }: {
  param: { key: string; label: string; min: number; max: number; def: number; step?: number }
  value: number
  color: string
  size?: number
  onChange: (v: number) => void
}) {
  const dragStart = useRef<{ y: number; val: number } | null>(null)
  const r = size / 2
  const cx = r, cy = r
  const trackR = r - 6
  // 270-degree arc: from 225° to -45° (clockwise)
  const START_DEG = 225
  const END_DEG = 495 // 225 + 270
  const pct = (value - param.min) / (param.max - param.min)
  const arcDeg = pct * 270

  function polarToXY(deg: number, radius: number) {
    const rad = ((deg - 90) * Math.PI) / 180
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) }
  }

  function describeArc(startDeg: number, endDeg: number, radius: number) {
    const s = polarToXY(startDeg, radius)
    const e = polarToXY(endDeg, radius)
    const large = endDeg - startDeg > 180 ? 1 : 0
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${large} 1 ${e.x} ${e.y}`
  }

  // Pointer on knob = drag up to increase
  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragStart.current = { y: e.clientY, val: value }
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragStart.current) return
    const dy = dragStart.current.y - e.clientY // up = positive
    const range = param.max - param.min
    const sensitivity = 200 // px for full range
    const delta = (dy / sensitivity) * range
    const clamped = Math.min(param.max, Math.max(param.min, dragStart.current.val + delta))
    const stepped = param.step ? Math.round(clamped / param.step) * param.step : clamped
    onChange(parseFloat(stepped.toFixed(6)))
  }
  function onPointerUp() { dragStart.current = null }

  const fillEnd = START_DEG + arcDeg
  const indicatorPos = polarToXY(fillEnd, trackR - 2)
  const displayVal = Math.abs(value) >= 100 ? Math.round(value) : value.toFixed(param.step && param.step >= 1 ? 0 : 2)

  return (
    <div className="flex flex-col items-center gap-1 select-none" style={{ width: size + 16 }}>
      <svg
        width={size} height={size}
        className="cursor-ns-resize touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* Outer ring */}
        <circle cx={cx} cy={cy} r={r - 2} fill="#1a1a1a" stroke="#444" strokeWidth={1.5} />
        {/* Track arc (grey) */}
        <path d={describeArc(START_DEG, END_DEG, trackR)} fill="none" stroke="#333" strokeWidth={5} strokeLinecap="round" />
        {/* Fill arc (colored) */}
        {arcDeg > 1 && (
          <path d={describeArc(START_DEG, fillEnd, trackR)} fill="none" stroke={color} strokeWidth={5} strokeLinecap="round" />
        )}
        {/* Indicator dot */}
        <circle cx={indicatorPos.x} cy={indicatorPos.y} r={2.5} fill={color} />
        {/* Centre dot */}
        <circle cx={cx} cy={cy} r={3} fill="#555" />
      </svg>
      <span className="text-[9px] text-gray-400 font-medium tracking-wide uppercase truncate" style={{ maxWidth: size + 16 }}>{param.label}</span>
      <span className="text-[10px] font-mono" style={{ color }}>{displayVal}</span>
    </div>
  )
}

// ─── 303-style expanded panel (bottom sheet) ─────────────────────────────────
function FX303Window({ device, trackId, onClose }: { device: FXDevice; trackId: string; onClose: () => void }) {
  const { updateFXParam, tracks } = useProjectStore()
  const { updateFXParam: updateAudio } = useAudioEngine()
  const color = DEVICE_COLORS[device.name] ?? '#555'
  const params = getParams(device.name)
  const isSidechain = device.name === 'Sidechain'
  const sources = tracks.filter(t => t.id !== trackId && t.type !== 'group')

  function getVal(key: string, def: number) {
    const raw = device.params[key]
    return raw !== undefined ? parseFloat(raw) : def
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 animate-sheet-up"
      style={{ background: '#111', borderTop: `2px solid ${color}` }}
    >
      {/* 303 header strip */}
      <div
        className="flex items-center gap-3 px-4 py-2"
        style={{ background: `linear-gradient(90deg, ${color}22 0%, #111 100%)` }}
      >
        {/* Glowing brand name */}
        <span
          className="text-xs font-black tracking-[0.25em] uppercase"
          style={{ color, textShadow: `0 0 8px ${color}` }}
        >{device.name}</span>
        <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${color}66, transparent)` }} />
        {/* LED indicator */}
        <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
        <button
          onClick={onClose}
          className="ml-2 text-xs px-3 py-1.5 rounded border touch-manipulation"
          style={{ borderColor: color + '66', color: color }}
        >✕ close</button>
      </div>

      {/* Knob row */}
      <div
        className="flex items-end justify-around gap-2 px-4 pb-4 pt-3 overflow-x-auto"
        style={{ background: '#181818' }}
      >
        {isSidechain && (
          <div className="flex flex-col items-center gap-1 shrink-0">
            <span className="text-[9px] text-gray-400 uppercase tracking-wide mb-1">Source</span>
            <select
              className="bg-[#1a1a1a] border rounded px-2 py-1 text-[10px] text-white outline-none"
              style={{ borderColor: color + '55' }}
              value={device.params.sourceTrackId ?? ''}
              onChange={(e) => updateFXParam(trackId, device.id, 'sourceTrackId', e.target.value)}
            >
              <option value="">— none —</option>
              {sources.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        )}
        {params.map(p => (
          <Knob
            key={p.key}
            param={p}
            value={getVal(p.key, p.def)}
            color={color}
            size={72}
            onChange={(v) => updateAudio(trackId, device.id, p.key, v)}
          />
        ))}
      </div>

      {/* Bottom screws — purely decorative 303 vibe */}
      <div className="flex justify-between px-4 pb-2">
        {[0,1,2,3].map(i => (
          <div key={i} className="w-3 h-3 rounded-full bg-[#2a2a2a] border border-[#444] flex items-center justify-center">
            <div className="w-1 h-0.5 bg-[#555] rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DeviceRack({ rackOpen, onToggleRack }: { rackOpen: boolean; onToggleRack: () => void }) {
  const { tracks, selectedTrackId, addFX, reorderFX } = useProjectStore()
  const track = tracks.find(t => t.id === selectedTrackId)
  const [expandedDevice, setExpandedDevice] = useState<FXDevice | null>(null)

  const liveExpandedDevice = expandedDevice
    ? track?.fx.find(d => d.id === expandedDevice.id) ?? null
    : null

  const FX_QUICK = [
    'Auto Filter', 'Compressor', 'EQ', 'Reverb', 'Delay',
    'Saturator', 'Env Follower', 'OTT', 'Sidechain', 'ADSR',
  ]

  // Collapsed bar — shows instead of nothing when rack is closed
  if (!rackOpen) {
    return (
      <div
        className="shrink-0 bg-[#1e1e1e] border-t border-[#3a3a3a] flex items-center gap-2 px-3 cursor-pointer hover:bg-[#252525] transition-colors"
        style={{ height: 28 }}
        onClick={onToggleRack}
      >
        <span className="text-[9px] font-bold uppercase tracking-widest text-gray-600">▲ Device Rack</span>
        {track && (
          <>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: track.color }} />
            <span className="text-[9px] text-gray-600 truncate max-w-[120px]">{track.name}</span>
            {track.fx.length > 0 && (
              <span className="text-[9px] text-gray-700">· {track.fx.length} device{track.fx.length > 1 ? 's' : ''}</span>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <>
      {liveExpandedDevice && track && (
        <FX303Window device={liveExpandedDevice} trackId={track.id} onClose={() => setExpandedDevice(null)} />
      )}

      <div className="shrink-0 bg-[#1e1e1e] border-t border-[#3a3a3a] flex flex-col" style={{ height: RACK_HEIGHT }}>
        <div className="flex items-center gap-3 px-3 h-7 border-b border-[#3a3a3a] shrink-0">
          <button
            className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-gray-300 transition-colors"
            onClick={onToggleRack}
            title="Collapse device rack"
          >▼ Device Rack</button>
          {track && (
            <>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: track.color }} />
              <span className="text-[10px] text-gray-400">{track.name}</span>
              <div className="ml-auto flex gap-1 overflow-x-auto">
                {FX_QUICK.map(name => (
                  <button key={name}
                    onClick={() => addFX(track.id, { id: uid(), name, params: {} })}
                    className="shrink-0 px-1.5 py-0.5 text-[9px] bg-[#2a2a2a] hover:bg-[#3a3a3a] border border-[#3a3a3a] rounded transition-colors whitespace-nowrap"
                  >+ {name}</button>
                ))}
              </div>
            </>
          )}
          {!track && <span className="text-[10px] text-gray-600 italic">Select a track to view its device chain</span>}
        </div>

        <div className="flex-1 flex items-center gap-2 px-3 overflow-x-auto overflow-y-hidden py-2">
          {!track && <p className="text-xs text-gray-700 italic">No track selected</p>}
          {track && track.fx.length === 0 && <p className="text-xs text-gray-700 italic">No devices — add from the quick bar above</p>}
          {track && (
            <SortableContext items={track.fx.map(d => `fx-${d.id}`)} strategy={horizontalListSortingStrategy}>
              {track.fx.map((device, i) => (
                <DeviceCard key={device.id} device={device} trackId={track.id} index={i}
                  onExpand={(d) => setExpandedDevice(prev => prev?.id === d.id ? null : d)}
                />
              ))}
            </SortableContext>
          )}
        </div>
      </div>
    </>
  )
}

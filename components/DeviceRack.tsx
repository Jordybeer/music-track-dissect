'use client'

import { useState } from 'react'
import { useProjectStore, uid } from '@/store/projectStore'
import { useSortable, SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const RACK_HEIGHT = 140

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
  'Sidechain': '#f59e0b',
}

function DeviceCard({ device, trackId, index }: { device: { id: string; name: string; params: Record<string, string> }; trackId: string; index: number }) {
  const { removeFX, updateTrack } = useProjectStore()
  const [expanded, setExpanded] = useState(false)
  const color = DEVICE_COLORS[device.name] ?? '#555'

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `fx-${device.id}`,
    data: { kind: 'fx-device', deviceId: device.id, trackId },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="shrink-0 w-28 bg-[#2a2a2a] border border-[#3a3a3a] rounded flex flex-col overflow-hidden hover:border-[#555] transition-colors"
    >
      {/* Device header */}
      <div
        className="h-6 flex items-center gap-1 px-2 cursor-grab active:cursor-grabbing shrink-0"
        style={{ background: color + '33', borderBottom: `1px solid ${color}` }}
        {...attributes}
        {...listeners}
      >
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
        <span className="text-[10px] font-bold truncate flex-1" style={{ color }}>{device.name}</span>
        <button
          onClick={() => removeFX(trackId, device.id)}
          className="text-gray-600 hover:text-red-400 text-[10px] shrink-0"
          onPointerDown={(e) => e.stopPropagation()}
        >
          ×
        </button>
      </div>

      {/* Mock params */}
      <div className="flex-1 p-1.5 space-y-1 overflow-hidden">
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-gray-500 w-10 shrink-0">On</span>
          <div className="w-5 h-3 bg-[#22c55e] rounded-full cursor-pointer" />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-gray-500 w-10 shrink-0">Mix</span>
          <div className="flex-1 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: '70%', background: color }} />
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-gray-500 w-10 shrink-0">Amount</span>
          <div className="flex-1 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: '50%', background: color }} />
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[9px] text-gray-600 hover:text-gray-400 mt-0.5"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {expanded ? '\u25b2 less' : '\u25bc more'}
        </button>
        {expanded && (
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-gray-500 w-10 shrink-0">Dry/Wet</span>
              <div className="flex-1 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: '60%', background: color }} />
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-gray-500 w-10 shrink-0">Gain</span>
              <div className="flex-1 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: '80%', background: color }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Index badge */}
      <div className="px-2 pb-1">
        <span className="text-[9px] text-gray-600">#{index + 1}</span>
      </div>
    </div>
  )
}

export default function DeviceRack() {
  const { tracks, selectedTrackId, addFX, reorderFX } = useProjectStore()
  const track = tracks.find(t => t.id === selectedTrackId)

  const FX_QUICK = [
    'Auto Filter', 'Compressor', 'EQ', 'Reverb', 'Delay',
    'Saturator', 'Env Follower', 'OTT', 'ABL3', 'Slippery Slope',
  ]

  return (
    <div
      className="shrink-0 bg-[#1e1e1e] border-t border-[#3a3a3a] flex flex-col"
      style={{ height: RACK_HEIGHT }}
    >
      {/* Rack header */}
      <div className="flex items-center gap-3 px-3 h-7 border-b border-[#3a3a3a] shrink-0">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Device Rack</span>
        {track && (
          <>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: track.color }} />
            <span className="text-[10px] text-gray-400">{track.name}</span>
            <div className="ml-auto flex gap-1 overflow-x-auto">
              {FX_QUICK.map(name => (
                <button
                  key={name}
                  onClick={() => addFX(track.id, { id: uid(), name, params: {} })}
                  className="shrink-0 px-1.5 py-0.5 text-[9px] bg-[#2a2a2a] hover:bg-[#3a3a3a] border border-[#3a3a3a] rounded transition-colors whitespace-nowrap"
                >
                  + {name}
                </button>
              ))}
            </div>
          </>
        )}
        {!track && (
          <span className="text-[10px] text-gray-600 italic">Select a track to view its device chain</span>
        )}
      </div>

      {/* Device cards */}
      <div className="flex-1 flex items-center gap-2 px-3 overflow-x-auto overflow-y-hidden py-2">
        {!track && (
          <p className="text-xs text-gray-700 italic">No track selected</p>
        )}
        {track && track.fx.length === 0 && (
          <p className="text-xs text-gray-700 italic">No devices — add from the quick bar above or browser</p>
        )}
        {track && (
          <SortableContext
            items={track.fx.map(d => `fx-${d.id}`)}
            strategy={horizontalListSortingStrategy}
          >
            {track.fx.map((device, i) => (
              <DeviceCard key={device.id} device={device} trackId={track.id} index={i} />
            ))}
          </SortableContext>
        )}
      </div>
    </div>
  )
}

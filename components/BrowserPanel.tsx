'use client'

import { useState, useMemo } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { TrackType } from '@/store/projectStore'

const TRACK_ITEMS: { label: string; type: TrackType; color: string; description: string; tags: string[] }[] = [
  { label: 'Audio Track', type: 'audio', color: '#3b82f6', description: 'Sample, recording', tags: ['audio', 'sample', 'wav', 'track'] },
  { label: 'MIDI Track', type: 'midi', color: '#22c55e', description: 'Synth, plugin', tags: ['midi', 'synth', 'instrument', 'plugin'] },
  { label: 'Drum Rack', type: 'drum', color: '#ef4444', description: 'Kick, snare, hats', tags: ['drum', 'kick', 'snare', 'hat', 'perc', 'percussion', 'rack'] },
  { label: 'Group / Bus', type: 'group', color: '#a855f7', description: 'Bus, stem group', tags: ['group', 'bus', 'stem', 'chain'] },
  { label: 'Return', type: 'return', color: '#f59e0b', description: 'FX send, reverb', tags: ['return', 'send', 'fx', 'reverb', 'delay'] },
]

const RACK_DEVICES = [
  { label: 'Auto Filter', category: 'Filter', color: '#06b6d4' },
  { label: 'Reverb', category: 'FX', color: '#8b5cf6' },
  { label: 'Delay', category: 'FX', color: '#8b5cf6' },
  { label: 'Compressor', category: 'Dynamics', color: '#f59e0b' },
  { label: 'Saturator', category: 'Dynamics', color: '#f59e0b' },
  { label: 'EQ Eight', category: 'EQ', color: '#22c55e' },
  { label: 'Limiter', category: 'Dynamics', color: '#f59e0b' },
  { label: 'Env Follower', category: 'Modulation', color: '#e8a020' },
  { label: 'LFO Tool', category: 'Modulation', color: '#e8a020' },
  { label: 'Chorus', category: 'FX', color: '#8b5cf6' },
  { label: 'Flanger', category: 'FX', color: '#8b5cf6' },
  { label: 'Phaser', category: 'FX', color: '#8b5cf6' },
  { label: 'Distortion', category: 'FX', color: '#ef4444' },
  { label: 'Redux', category: 'FX', color: '#ef4444' },
  { label: 'Utility', category: 'Utility', color: '#6b7280' },
  { label: 'Spectrum', category: 'Utility', color: '#6b7280' },
  { label: 'OTT', category: 'Dynamics', color: '#f59e0b' },
  { label: 'ABL3', category: 'Instrument', color: '#22c55e' },
  { label: 'Slippery Slope', category: 'Instrument', color: '#22c55e' },
  { label: 'Sting 2', category: 'Instrument', color: '#22c55e' },
  { label: 'Gross Beat', category: 'FX', color: '#ef4444' },
  { label: 'Sidechain', category: 'Dynamics', color: '#f59e0b' },
]

type Tab = 'tracks' | 'devices'

function DraggableTrackItem({ label, type, color, description }: typeof TRACK_ITEMS[0]) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `browser-${type}`,
    data: { kind: 'browser-item', type },
  })
  return (
    <div
      ref={setNodeRef} {...listeners} {...attributes}
      className={`p-2 rounded border transition-all select-none ${
        isDragging ? 'opacity-30' : 'opacity-100'
      } bg-[#2a2a2a] hover:bg-[#333] border-[#3a3a3a] hover:border-[#555] cursor-grab active:cursor-grabbing`}
    >
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-[10px] text-gray-500 mt-0.5 ml-4">{description}</p>
    </div>
  )
}

export default function BrowserPanel() {
  const [tab, setTab] = useState<Tab>('tracks')
  const [search, setSearch] = useState('')

  const filteredTracks = useMemo(() => {
    if (!search) return TRACK_ITEMS
    const q = search.toLowerCase()
    return TRACK_ITEMS.filter(i =>
      i.label.toLowerCase().includes(q) ||
      i.tags.some(t => t.includes(q))
    )
  }, [search])

  const filteredDevices = useMemo(() => {
    if (!search) return RACK_DEVICES
    const q = search.toLowerCase()
    return RACK_DEVICES.filter(d =>
      d.label.toLowerCase().includes(q) ||
      d.category.toLowerCase().includes(q)
    )
  }, [search])

  return (
    <div className="w-44 shrink-0 bg-[#242424] border-r border-[#3a3a3a] flex flex-col overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-[#3a3a3a]">
        <button
          onClick={() => setTab('tracks')}
          className={`flex-1 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
            tab === 'tracks' ? 'text-white bg-[#2a2a2a]' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          Tracks
        </button>
        <button
          onClick={() => setTab('devices')}
          className={`flex-1 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
            tab === 'devices' ? 'text-white bg-[#2a2a2a]' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          Devices
        </button>
      </div>

      {/* Search */}
      <div className="px-2 py-1.5 border-b border-[#3a3a3a]">
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#1a1a1a] border border-[#3a3a3a] rounded px-2 py-1 text-xs text-white placeholder-gray-600 outline-none focus:border-[#555]"
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {tab === 'tracks' && (
          filteredTracks.length === 0
            ? <p className="text-xs text-gray-600 text-center py-4">No results</p>
            : filteredTracks.map(item => <DraggableTrackItem key={item.type} {...item} />)
        )}
        {tab === 'devices' && (
          filteredDevices.length === 0
            ? <p className="text-xs text-gray-600 text-center py-4">No results</p>
            : filteredDevices.map(device => (
              <div
                key={device.label}
                className="p-2 rounded border bg-[#2a2a2a] hover:bg-[#333] border-[#3a3a3a] hover:border-[#555] cursor-default"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: device.color }} />
                  <span className="text-xs font-medium truncate">{device.label}</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5 ml-4">{device.category}</p>
              </div>
            ))
        )}
      </div>

      <div className="px-2 py-1.5 border-t border-[#3a3a3a]">
        <p className="text-[10px] text-gray-600">Drag tracks → timeline</p>
      </div>
    </div>
  )
}

'use client'

import { useDraggable } from '@dnd-kit/core'
import { TrackType } from '@/store/projectStore'

const items: { label: string; type: TrackType; color: string; description: string }[] = [
  { label: 'Audio Track', type: 'audio', color: '#3b82f6', description: 'Sample, recording' },
  { label: 'MIDI Track', type: 'midi', color: '#22c55e', description: 'Synth, plugin' },
  { label: 'Drum Rack', type: 'drum', color: '#ef4444', description: 'Kick, snare, hats' },
  { label: 'Group', type: 'group', color: '#a855f7', description: 'Bus, stem group' },
  { label: 'Return', type: 'return', color: '#f59e0b', description: 'FX, reverb, delay' },
]

function DraggableItem({ label, type, color, description }: typeof items[0]) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `browser-${type}`,
    data: { type },
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`p-2 rounded cursor-grab active:cursor-grabbing border transition-all ${
        isDragging ? 'opacity-40' : 'opacity-100'
      } bg-[#2a2a2a] hover:bg-[#333] border-[#3a3a3a] hover:border-[#555]`}
    >
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="text-xs text-gray-500 mt-0.5 ml-4">{description}</p>
    </div>
  )
}

export default function BrowserPanel() {
  return (
    <div className="w-44 shrink-0 bg-[#242424] border-r border-[#3a3a3a] flex flex-col overflow-hidden">
      <div className="px-3 py-2 border-b border-[#3a3a3a]">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Browser</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {items.map((item) => (
          <DraggableItem key={item.type} {...item} />
        ))}
      </div>
      <div className="px-3 py-2 border-t border-[#3a3a3a]">
        <p className="text-xs text-gray-500">Drag to timeline →</p>
      </div>
    </div>
  )
}

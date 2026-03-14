'use client'

import { useDroppable } from '@dnd-kit/core'
import { useProjectStore } from '@/store/projectStore'
import TrackRow from './TrackRow'

const BAR_WIDTH = 32

export default function Timeline() {
  const { setNodeRef, isOver } = useDroppable({ id: 'timeline' })
  const { tracks, bars } = useProjectStore()

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#1a1a1a]">
      {/* Bar ruler */}
      <div className="flex shrink-0 h-7 bg-[#242424] border-b border-[#3a3a3a] overflow-x-auto overflow-y-hidden" style={{ paddingLeft: '160px' }}>
        {Array.from({ length: bars }, (_, i) => (
          <div
            key={i}
            className="shrink-0 border-r border-[#3a3a3a] flex items-center justify-start pl-1"
            style={{ width: BAR_WIDTH }}
          >
            {i % 4 === 0 && (
              <span className="text-xs text-gray-500">{i + 1}</span>
            )}
          </div>
        ))}
      </div>

      {/* Track rows */}
      <div
        ref={setNodeRef}
        className={`flex-1 overflow-auto transition-colors ${
          isOver ? 'bg-[#1e2a1a]' : ''
        }`}
      >
        {tracks.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-600 text-sm">← Drag tracks from the browser to get started</p>
          </div>
        ) : (
          tracks.map((track) => (
            <TrackRow key={track.id} track={track} barWidth={BAR_WIDTH} />
          ))
        )}
      </div>
    </div>
  )
}

'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useRef } from 'react'
import { useProjectStore } from '@/store/projectStore'
import TrackRow from './TrackRow'
import GroupRow from './GroupRow'
import SectionRuler from './SectionRuler'

export const BAR_WIDTH = 32
const HEADER_W = 160

export default function Timeline() {
  const { setNodeRef, isOver } = useDroppable({ id: 'timeline' })
  const { tracks, bars } = useProjectStore()
  const scrollRef = useRef<HTMLDivElement>(null)

  const totalW = bars * BAR_WIDTH + HEADER_W

  // Render order: top-level tracks in order, with children injected after each group
  const topLevel = tracks.filter(t => t.groupId === null)

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#1a1a1a]">
      <SectionRuler barWidth={BAR_WIDTH} headerW={HEADER_W} bars={bars} scrollRef={scrollRef} />

      {/* Bar ruler */}
      <div
        className="flex shrink-0 h-6 bg-[#242424] border-b border-[#3a3a3a] overflow-hidden"
        style={{ paddingLeft: HEADER_W }}
      >
        <div className="flex" style={{ minWidth: bars * BAR_WIDTH }}>
          {Array.from({ length: bars }, (_, i) => (
            <div
              key={i}
              className="shrink-0 border-r border-[#2a2a2a] flex items-center justify-start pl-1"
              style={{ width: BAR_WIDTH }}
            >
              {i % 4 === 0 && <span className="text-[10px] text-gray-500">{i + 1}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Tracks */}
      <div
        ref={(el) => {
          setNodeRef(el)
          ;(scrollRef as React.MutableRefObject<HTMLDivElement | null>).current = el
        }}
        className={`flex-1 overflow-auto transition-colors ${isOver ? 'bg-[#1c2a1c]' : ''}`}
      >
        <div style={{ minWidth: totalW }}>
          {topLevel.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-gray-600 text-sm">← Drag a track type from the browser</p>
            </div>
          ) : (
            <SortableContext
              items={tracks.map(t => `track-${t.id}`)}
              strategy={verticalListSortingStrategy}
            >
              {topLevel.map((track) => {
                if (track.type === 'group') {
                  const children = tracks.filter(t => t.groupId === track.id)
                  return (
                    <GroupRow
                      key={track.id}
                      group={track}
                      children={children}
                      barWidth={BAR_WIDTH}
                      headerW={HEADER_W}
                    />
                  )
                }
                return (
                  <TrackRow
                    key={track.id}
                    track={track}
                    barWidth={BAR_WIDTH}
                    headerW={HEADER_W}
                    indent={0}
                  />
                )
              })}
            </SortableContext>
          )}
        </div>
      </div>
    </div>
  )
}

'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useRef, useCallback } from 'react'
import { useProjectStore } from '@/store/projectStore'
import TrackRow from './TrackRow'
import GroupRow from './GroupRow'
import SectionRuler from './SectionRuler'

export const BAR_WIDTH = 32
export const HEADER_W = 160

export default function Timeline() {
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: 'timeline' })
  const { tracks, bars } = useProjectStore()

  const rulerRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const syncingRef = useRef(false)

  const onBodyScroll = useCallback(() => {
    if (syncingRef.current || !rulerRef.current || !bodyRef.current) return
    syncingRef.current = true
    rulerRef.current.scrollLeft = bodyRef.current.scrollLeft
    syncingRef.current = false
  }, [])

  const onRulerScroll = useCallback(() => {
    if (syncingRef.current || !rulerRef.current || !bodyRef.current) return
    syncingRef.current = true
    bodyRef.current.scrollLeft = rulerRef.current.scrollLeft
    syncingRef.current = false
  }, [])

  // Callback ref: assigns both the droppable ref and our bodyRef
  const setBodyRef = useCallback((el: HTMLDivElement | null) => {
    setDropRef(el)
    bodyRef.current = el
  }, [setDropRef])

  const totalW = bars * BAR_WIDTH
  const topLevel = tracks.filter(t => t.groupId === null)

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#1a1a1a] min-h-0">
      <SectionRuler barWidth={BAR_WIDTH} headerW={HEADER_W} bars={bars} bodyRef={bodyRef} />

      {/* Bar number ruler */}
      <div className="flex shrink-0 h-6 bg-[#242424] border-b border-[#3a3a3a] overflow-hidden">
        <div className="shrink-0 bg-[#242424] border-r border-[#3a3a3a]" style={{ width: HEADER_W }} />
        <div
          ref={rulerRef}
          className="flex-1 overflow-hidden"
          onScroll={onRulerScroll}
        >
          <div className="flex" style={{ width: totalW }}>
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
      </div>

      {/* Track body */}
      <div
        ref={setBodyRef}
        className={`flex-1 overflow-auto transition-colors min-h-0 ${ isOver ? 'bg-[#1c2a1c]' : '' }`}
        onScroll={onBodyScroll}
      >
        <div style={{ minWidth: totalW + HEADER_W }}>
          {topLevel.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-gray-600 text-sm">← Drag a track type from the browser</p>
            </div>
          ) : (
            <SortableContext
              items={tracks.map(t => `track-${t.id}`)}
              strategy={verticalListSortingStrategy}
            >
              {topLevel.map((track) =>
                track.type === 'group' ? (
                  <GroupRow
                    key={track.id}
                    group={track}
                    children={tracks.filter(t => t.groupId === track.id)}
                    barWidth={BAR_WIDTH}
                    headerW={HEADER_W}
                  />
                ) : (
                  <TrackRow
                    key={track.id}
                    track={track}
                    barWidth={BAR_WIDTH}
                    headerW={HEADER_W}
                    indent={0}
                  />
                )
              )}
            </SortableContext>
          )}
        </div>
      </div>
    </div>
  )
}

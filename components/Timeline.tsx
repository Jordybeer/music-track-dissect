'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useRef, useCallback } from 'react'
import { useProjectStore, HEADER_W } from '@/store/projectStore'
import TrackRow from './TrackRow'
import GroupRow from './GroupRow'
import SectionRuler from './SectionRuler'

export default function Timeline() {
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: 'timeline' })
  const { tracks, bars, barWidth } = useProjectStore()

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

  const setBodyRef = useCallback((el: HTMLDivElement | null) => {
    setDropRef(el)
    bodyRef.current = el
  }, [setDropRef])

  const totalW = bars * barWidth

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#1a1a1a] min-h-0">

      <SectionRuler barWidth={barWidth} headerW={HEADER_W} bars={bars} bodyRef={bodyRef} />

      {/* Bar number ruler */}
      <div className="flex shrink-0 bg-[#1e1e1e] border-b-2 border-[#3a3a3a]">
        <div
          className="shrink-0 flex items-center justify-center bg-[#1e1e1e] border-r-2 border-[#3a3a3a]"
          style={{ width: HEADER_W, height: 24 }}
        >
          <span className="text-[9px] text-gray-600 uppercase tracking-widest">BARS</span>
        </div>
        <div ref={rulerRef} className="flex-1 overflow-hidden" onScroll={onRulerScroll} style={{ height: 24 }}>
          <div className="flex h-full" style={{ width: totalW }}>
            {Array.from({ length: bars }, (_, i) => (
              <div
                key={i}
                className="shrink-0 border-r border-[#2a2a2a] flex items-center justify-start pl-1 h-full"
                style={{ width: barWidth }}
              >
                {(barWidth >= 36 || i % 4 === 0) && (
                  <span className="text-[10px] text-gray-500 leading-none">{i + 1}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Track body */}
      <div
        ref={setBodyRef}
        className={`flex-1 overflow-auto min-h-0 transition-colors ${ isOver ? 'bg-[#1c2a1c]' : '' }`}
        style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
        onScroll={onBodyScroll}
      >
        <div style={{ minWidth: totalW + HEADER_W }}>
          {tracks.filter(t => t.groupId === null).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 animate-fade-in">
              <div className="text-4xl opacity-20">🎵</div>
              <p className="text-gray-600 text-sm">Tap a track type in the browser to get started</p>
            </div>
          ) : (
            <SortableContext
              items={tracks.map(t => `track-${t.id}`)}
              strategy={verticalListSortingStrategy}
            >
              {tracks.filter(t => t.groupId === null).map((track) =>
                track.type === 'group' ? (
                  <GroupRow key={track.id} group={track}
                    children={tracks.filter(t => t.groupId === track.id)}
                    barWidth={barWidth} headerW={HEADER_W} />
                ) : (
                  <TrackRow key={track.id} track={track}
                    barWidth={barWidth} headerW={HEADER_W} indent={0} />
                )
              )}
            </SortableContext>
          )}
        </div>
      </div>
    </div>
  )
}

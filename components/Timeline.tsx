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

  const setBodyRef = useCallback((el: HTMLDivElement | null) => {
    setDropRef(el)
    bodyRef.current = el
  }, [setDropRef])

  const totalW = bars * BAR_WIDTH
  const topLevel = tracks.filter(t => t.groupId === null)

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#1a1a1a] min-h-0">

      {/* Section ruler + bar numbers share the same left-offset so they align with track headers */}
      <SectionRuler barWidth={BAR_WIDTH} headerW={HEADER_W} bars={bars} bodyRef={bodyRef} />

      {/* Bar number ruler — always in sync with body scroll */}
      <div className="flex shrink-0 bg-[#1e1e1e] border-b-2 border-[#3a3a3a]">
        {/* Header label area — same width as track headers */}
        <div
          className="shrink-0 flex items-center justify-center bg-[#1e1e1e] border-r-2 border-[#3a3a3a]"
          style={{ width: HEADER_W, height: 24 }}
        >
          <span className="text-[9px] text-gray-600 uppercase tracking-widest">BARS</span>
        </div>
        {/* Scrollable bar numbers — overflow hidden, JS-synced */}
        <div
          ref={rulerRef}
          className="flex-1 overflow-hidden"
          onScroll={onRulerScroll}
          style={{ height: 24 }}
        >
          <div className="flex h-full" style={{ width: totalW }}>
            {Array.from({ length: bars }, (_, i) => (
              <div
                key={i}
                className="shrink-0 border-r border-[#2a2a2a] flex items-center justify-start pl-1 h-full"
                style={{ width: BAR_WIDTH }}
              >
                {i % 4 === 0 && <span className="text-[10px] text-gray-500 leading-none">{i + 1}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Track body — scrolls both X and Y, momentum scroll on iOS */}
      <div
        ref={setBodyRef}
        className={`flex-1 overflow-auto min-h-0 transition-colors ${
          isOver ? 'bg-[#1c2a1c]' : ''
        }`}
        style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
        onScroll={onBodyScroll}
      >
        <div style={{ minWidth: totalW + HEADER_W }}>
          {topLevel.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 animate-fade-in">
              <div className="text-4xl opacity-20">🎵</div>
              <p className="text-gray-600 text-sm">Drag a track type from the browser to get started</p>
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

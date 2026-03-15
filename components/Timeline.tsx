'use client'

import { useRef, useCallback } from 'react'
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useProjectStore, HEADER_W } from '@/store/projectStore'
import TrackRow from './TrackRow'
import GroupRow from './GroupRow'
import SectionRuler from './SectionRuler'
import WaveformTrack from './WaveformTrack'

export default function Timeline() {
  const { tracks, barWidth, bars, bpm, reorderTracks } = useProjectStore()
  const bodyRef = useRef<HTMLDivElement>(null)
  const syncing = useRef(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 12 } })
  )

  const onBodyScroll = useCallback(() => {
    if (syncing.current || !bodyRef.current) return
  }, [])

  function handleDragEnd(event: any) {
    const { active, over } = event
    if (!over) return
    const fromIndex = tracks.findIndex((t) => `track-${t.id}` === String(active.id))
    const toIndex = tracks.findIndex((t) => `track-${t.id}` === String(over.id))
    if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) reorderTracks(fromIndex, toIndex)
  }

  const topTracks = tracks.filter(t => !t.groupId)

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      <SectionRuler barWidth={barWidth} headerW={HEADER_W} bars={bars} bodyRef={bodyRef} />
      <WaveformTrack barWidth={barWidth} bars={bars} bpm={bpm} />

      <div ref={bodyRef} className="flex-1 overflow-auto" onScroll={onBodyScroll}>
        <div style={{ minWidth: HEADER_W + bars * barWidth }}>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={topTracks.map(t => `track-${t.id}`)} strategy={verticalListSortingStrategy}>
              {topTracks.map(track =>
                track.type === 'group' ? (
                  <GroupRow
                    key={track.id}
                    group={track}
                    children={tracks.filter(t => t.groupId === track.id)}
                    barWidth={barWidth}
                    headerW={HEADER_W}
                  />
                ) : (
                  <TrackRow key={track.id} track={track} barWidth={barWidth} headerW={HEADER_W} />
                )
              )}
            </SortableContext>
          </DndContext>
        </div>
      </div>
    </div>
  )
}

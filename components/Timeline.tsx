'use client'

import { useRef, useCallback, useState } from 'react'
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useProjectStore, HEADER_W } from '@/store/projectStore'
import { useAudioEngine } from '@/hooks/useAudioEngine'
import TrackRow from './TrackRow'
import GroupRow from './GroupRow'
import SectionRuler from './SectionRuler'
import WaveformTrack from './WaveformTrack'
import TB303TrackRow from './TB303TrackRow'

// Parse Tone position string "bars:beats:sixteenths" → bar float
function positionToBar(pos: string): number {
  const parts = pos.split(':').map(Number)
  const bar = (parts[0] ?? 0)
  const beat = (parts[1] ?? 0) / 4
  const sixteenth = (parts[2] ?? 0) / 16
  return bar + beat + sixteenth
}

export default function Timeline() {
  const { tracks, barWidth, bars, bpm, reorderTracks } = useProjectStore()
  const { position } = useAudioEngine()
  const bodyRef = useRef<HTMLDivElement>(null)
  const syncing = useRef(false)
  const [scrollLeft, setScrollLeft] = useState(0)

  const playheadBar = positionToBar(position)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 12 } })
  )

  const onBodyScroll = useCallback(() => {
    if (syncing.current || !bodyRef.current) return
    setScrollLeft(bodyRef.current.scrollLeft)
  }, [])

  function handleDragEnd(event: any) {
    const { active, over } = event
    if (!over) return
    const fromIndex = tracks.findIndex((t) => `track-${t.id}` === String(active.id))
    const toIndex   = tracks.findIndex((t) => `track-${t.id}` === String(over.id))
    if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) reorderTracks(fromIndex, toIndex)
  }

  const topTracks = tracks.filter(t => !t.groupId)

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      <SectionRuler
        barWidth={barWidth}
        headerW={HEADER_W}
        bars={bars}
        bodyRef={bodyRef}
        scrollLeft={scrollLeft}
        setScrollLeft={setScrollLeft}
        playheadBar={playheadBar}
      />
      <WaveformTrack barWidth={barWidth} bars={bars} bpm={bpm} scrollLeft={scrollLeft} />

      <div ref={bodyRef} className="flex-1 overflow-auto" onScroll={onBodyScroll}>
        <div style={{ minWidth: HEADER_W + bars * barWidth }}>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={topTracks.map(t => `track-${t.id}`)} strategy={verticalListSortingStrategy}>
              {topTracks.map(track => {
                if (track.type === 'group') {
                  return (
                    <GroupRow
                      key={track.id}
                      group={track}
                      children={tracks.filter(t => t.groupId === track.id)}
                      barWidth={barWidth}
                      headerW={HEADER_W}
                    />
                  )
                }
                if (track.type === 'tb303') {
                  return (
                    <TB303TrackRow
                      key={track.id}
                      track={track}
                      barWidth={barWidth}
                      headerW={HEADER_W}
                    />
                  )
                }
                return (
                  <TrackRow key={track.id} track={track} barWidth={barWidth} headerW={HEADER_W} />
                )
              })}
            </SortableContext>
          </DndContext>
        </div>
      </div>
    </div>
  )
}

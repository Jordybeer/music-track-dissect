'use client'

import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCenter,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { useState } from 'react'
import BrowserPanel from '@/components/BrowserPanel'
import Timeline from '@/components/Timeline'
import Inspector from '@/components/Inspector'
import TopBar from '@/components/TopBar'
import { useProjectStore, TrackType } from '@/store/projectStore'

export default function Home() {
  const { addTrack, reorderTracks, tracks, moveClip } = useProjectStore()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeType, setActiveType] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  )

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
    setActiveType(event.active.data.current?.kind ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    setActiveType(null)

    if (!over) return
    const kind = active.data.current?.kind

    // Browser item dropped on timeline => add new track
    if (kind === 'browser-item' && (over.id === 'timeline' || String(over.id).startsWith('track-'))) {
      addTrack(active.data.current?.type as TrackType)
      return
    }

    // Track row reorder
    if (kind === 'track-row') {
      const fromIndex = tracks.findIndex(t => `track-${t.id}` === String(active.id))
      const toIndex = tracks.findIndex(t => `track-${t.id}` === String(over.id))
      if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
        reorderTracks(fromIndex, toIndex)
      }
      return
    }

    // Clip moved between tracks
    if (kind === 'clip') {
      const fromTrackId = active.data.current?.trackId
      const clipId = active.data.current?.clipId
      const toTrackId = String(over.id).replace('track-clips-', '')
      if (fromTrackId && clipId && toTrackId && fromTrackId !== toTrackId) {
        moveClip(fromTrackId, toTrackId, clipId)
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#1a1a1a]">
        <TopBar />
        <div className="flex flex-1 overflow-hidden">
          <BrowserPanel />
          <Timeline />
          <Inspector />
        </div>
      </div>
      <DragOverlay>
        {activeId && activeType === 'browser-item' && (
          <div className="px-3 py-2 bg-[#333] border border-[#555] rounded text-xs text-white shadow-xl opacity-90">
            {activeId.replace('browser-', '')}
          </div>
        )}
        {activeId && activeType === 'track-row' && (
          <div className="h-12 w-64 bg-[#252535] border border-[#555] rounded text-xs text-white shadow-xl opacity-80 flex items-center px-3">
            Moving track...
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

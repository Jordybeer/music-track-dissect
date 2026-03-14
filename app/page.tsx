'use client'

import {
  DndContext, DragEndEvent, DragStartEvent,
  PointerSensor, TouchSensor, useSensor, useSensors,
  DragOverlay, closestCenter,
} from '@dnd-kit/core'
import { useState } from 'react'
import BrowserPanel from '@/components/BrowserPanel'
import Timeline from '@/components/Timeline'
import Inspector from '@/components/Inspector'
import TopBar from '@/components/TopBar'
import DeviceRack from '@/components/DeviceRack'
import { useProjectStore, TrackType } from '@/store/projectStore'
import { useKeyboard } from '@/hooks/useKeyboard'

export default function Home() {
  const { addTrack, reorderTracks, tracks, moveClip } = useProjectStore()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeKind, setActiveKind] = useState<string | null>(null)
  const [inspectorOpen, setInspectorOpen] = useState(true)
  const [rackOpen, setRackOpen] = useState(true)

  useKeyboard()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    // Touch: 400ms hold before drag starts, 8px tolerance so micro-jitter doesn't cancel
    useSensor(TouchSensor, { activationConstraint: { delay: 400, tolerance: 8 } })
  )

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
    setActiveKind(event.active.data.current?.kind ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    setActiveKind(null)
    if (!over) return

    const kind = active.data.current?.kind

    if (kind === 'browser-item' && (over.id === 'timeline' || String(over.id).startsWith('track-'))) {
      addTrack(active.data.current?.type as TrackType)
      return
    }

    if (kind === 'track-row') {
      const fromIndex = tracks.findIndex(t => `track-${t.id}` === String(active.id))
      const toIndex = tracks.findIndex(t => `track-${t.id}` === String(over.id))
      if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
        reorderTracks(fromIndex, toIndex)
      }
      return
    }

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
        <TopBar
          inspectorOpen={inspectorOpen}
          onToggleInspector={() => setInspectorOpen(v => !v)}
          rackOpen={rackOpen}
          onToggleRack={() => setRackOpen(v => !v)}
        />
        <div className="flex flex-1 overflow-hidden min-h-0">
          <BrowserPanel />
          <div className="flex flex-col flex-1 overflow-hidden min-h-0">
            <Timeline />
            {rackOpen && <DeviceRack />}
          </div>
          {inspectorOpen && <Inspector onClose={() => setInspectorOpen(false)} />}
        </div>
      </div>

      <DragOverlay>
        {activeId && activeKind === 'browser-item' && (
          <div className="px-3 py-2 bg-[#333] border border-[#555] rounded text-xs text-white shadow-xl opacity-90">
            {activeId.replace('browser-', '')}
          </div>
        )}
        {activeId && activeKind === 'track-row' && (
          <div className="h-12 w-64 bg-[#252535] border border-[#555] rounded text-xs text-white shadow-xl opacity-80 flex items-center px-3">
            Moving track...
          </div>
        )}
        {activeId && activeKind === 'clip' && (
          <div className="h-10 w-24 rounded opacity-80 bg-[#3a3a3a] border border-[#555] shadow-xl" />
        )}
      </DragOverlay>
    </DndContext>
  )
}

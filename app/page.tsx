'use client'

import { useRef } from 'react'
import BrowserPanel from '@/components/BrowserPanel'
import Timeline from '@/components/Timeline'
import Inspector from '@/components/Inspector'
import TopBar from '@/components/TopBar'
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core'
import { useProjectStore } from '@/store/projectStore'

export default function Home() {
  const addTrack = useProjectStore((s) => s.addTrack)

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over?.id === 'timeline' && active.data.current?.type) {
      addTrack(active.data.current.type)
    }
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#1a1a1a]">
        <TopBar />
        <div className="flex flex-1 overflow-hidden">
          <BrowserPanel />
          <Timeline />
          <Inspector />
        </div>
      </div>
    </DndContext>
  )
}

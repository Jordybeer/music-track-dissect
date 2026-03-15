'use client'

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Track, useProjectStore } from '@/store/projectStore'
import TrackRow from './TrackRow'

interface Props {
  group: Track
  children: Track[]
  barWidth: number
  headerW: number
}

export default function GroupRow({ group, children, barWidth, headerW }: Props) {
  const { selectTrack, selectedTrackId, removeTrack, toggleCollapse, updateTrack, tracks } = useProjectStore()
  const isSelected = selectedTrackId === group.id
  const directChildren = children.filter(c => c.groupId === group.id)

  const {
    attributes, listeners, setNodeRef: setSortableRef,
    transform, transition, isDragging,
  } = useSortable({
    id: `track-${group.id}`,
    data: { kind: 'track-row', trackId: group.id },
  })

  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `group-drop-${group.id}` })

  function mergeRefs(el: HTMLDivElement | null) {
    setSortableRef(el)
    setDropRef(el)
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={mergeRefs} style={style}>
      <div
        className={`flex border-b border-[#3a3a3a] transition-colors min-h-[44px] ${
          isOver
            ? 'bg-[#3a1f5a] ring-2 ring-inset ring-[#a855f7]'
            : isSelected
            ? 'bg-[#2a1f3a]'
            : 'bg-[#221a2e] hover:bg-[#271e36]'
        }`}
        onClick={() => selectTrack(group.id)}
      >
        <div
          className="shrink-0 flex items-center gap-1.5 px-2 border-r border-[#3a3a3a]"
          style={{ width: headerW, borderLeft: `3px solid ${group.color}` }}
        >
          <div
            {...attributes} {...listeners}
            className="text-gray-600 hover:text-gray-300 cursor-grab active:cursor-grabbing p-2 -ml-1 shrink-0 select-none touch-none"
          >
            ⠿
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); toggleCollapse(group.id) }}
            className="text-[#a855f7] hover:text-white text-sm w-5 shrink-0 text-center touch-manipulation"
          >
            {group.collapsed ? '▶' : '▼'}
          </button>
          <input
            className="flex-1 bg-transparent text-xs font-bold text-[#a855f7] outline-none truncate min-w-0"
            value={group.name}
            onChange={(e) => updateTrack(group.id, { name: e.target.value })}
            onClick={(e) => e.stopPropagation()}
          />
          <span className="text-[10px] text-gray-500 shrink-0">{directChildren.length}t</span>
          <button
            onClick={(e) => { e.stopPropagation(); removeTrack(group.id) }}
            className="text-gray-600 hover:text-red-400 p-2 shrink-0 touch-manipulation"
          >×</button>
        </div>

        <div className="flex-1 relative bg-[#a855f7]/5 flex items-center">
          {isOver ? (
            <span className="absolute inset-0 flex items-center justify-center text-[11px] text-[#a855f7] font-semibold animate-fade-in">
              ＋ Drop into group
            </span>
          ) : (
            <span className="absolute left-2 text-[10px] text-[#a855f7]/40 font-bold uppercase tracking-widest">
              GROUP · BUS
            </span>
          )}
        </div>
      </div>

      {!group.collapsed && (
        <>
          {directChildren.map((child) =>
            child.type === 'group' ? (
              <div key={child.id} style={{ paddingLeft: 16 }}>
                <GroupRow
                  group={child}
                  children={tracks.filter(t => t.groupId === child.id)}
                  barWidth={barWidth}
                  headerW={headerW - 16}
                />
              </div>
            ) : (
              <TrackRow
                key={child.id}
                track={child}
                barWidth={barWidth}
                headerW={headerW}
                indent={14}
              />
            )
          )}
        </>
      )}
    </div>
  )
}

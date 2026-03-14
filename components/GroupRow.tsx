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

  // Sub-groups: children that are themselves groups
  const directChildren = children.filter(c => c.groupId === group.id)

  const {
    attributes, listeners, setNodeRef: setSortableRef,
    transform, transition, isDragging,
  } = useSortable({
    id: `track-${group.id}`,
    data: { kind: 'track-row', trackId: group.id },
  })

  // Drop zone to accept dragged tracks into this group
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `group-drop-${group.id}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setSortableRef} style={style}>
      {/* Group header row */}
      <div
        className={`flex h-10 border-b border-[#3a3a3a] transition-colors ${
          isSelected ? 'bg-[#2a1f3a]' : isOver ? 'bg-[#2a1f3a]/60' : 'bg-[#221a2e] hover:bg-[#271e36]'
        }`}
        onClick={() => selectTrack(group.id)}
      >
        <div
          className="shrink-0 flex items-center gap-1 px-2 border-r border-[#3a3a3a]"
          style={{ width: headerW, borderLeft: `3px solid ${group.color}` }}
        >
          <div
            {...attributes} {...listeners}
            className="text-gray-600 hover:text-gray-300 cursor-grab active:cursor-grabbing px-0.5 shrink-0 select-none"
          >
            ⠟
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); toggleCollapse(group.id) }}
            className="text-[#a855f7] hover:text-white text-xs w-4 shrink-0 text-center"
            title={group.collapsed ? 'Expand' : 'Collapse'}
          >
            {group.collapsed ? '▶' : '▼'}
          </button>
          <input
            className="flex-1 bg-transparent text-xs font-bold text-[#a855f7] outline-none truncate"
            value={group.name}
            onChange={(e) => updateTrack(group.id, { name: e.target.value })}
            onClick={(e) => e.stopPropagation()}
          />
          <span className="text-[10px] text-gray-500 shrink-0">{directChildren.length}t</span>
          <button
            onClick={(e) => { e.stopPropagation(); removeTrack(group.id) }}
            className="text-gray-600 hover:text-red-400 text-xs px-0.5 shrink-0"
          >×</button>
        </div>

        {/* Group bus lane */}
        <div className="flex-1 relative bg-[#a855f7]/5">
          <div className="absolute inset-0 border-b border-[#a855f7]/20" />
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-[#a855f7]/50 font-bold uppercase tracking-widest">
            GROUP · BUS
          </span>
        </div>
      </div>

      {/* Children — indented, hidden when collapsed */}
      {!group.collapsed && (
        <>
          {directChildren.map((child) =>
            child.type === 'group' ? (
              // Nested sub-group — recursive!
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

          {/* Drop zone */}
          <div
            ref={setDropRef}
            className={`h-6 flex items-center border-b border-[#3a3a3a]/50 pl-10 transition-colors ${
              isOver ? 'bg-[#2a1f3a]/60' : 'bg-[#1e1628]'
            }`}
          >
            <span className="text-[10px] text-[#a855f7]/40 italic">drop track here to add to group</span>
          </div>
        </>
      )}
    </div>
  )
}

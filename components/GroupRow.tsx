'use client'

import { useSortable } from '@dnd-kit/sortable'
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
  const { selectTrack, selectedTrackId, removeTrack, toggleCollapse, updateTrack } = useProjectStore()
  const isSelected = selectedTrackId === group.id

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `track-${group.id}`,
    data: { kind: 'track-row', trackId: group.id },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      {/* Group header row */}
      <div
        className={`flex h-10 border-b border-[#3a3a3a] ${
          isSelected ? 'bg-[#2a1f3a]' : 'bg-[#221a2e] hover:bg-[#271e36]'
        } transition-colors`}
        onClick={() => selectTrack(group.id)}
      >
        <div
          className="shrink-0 flex items-center gap-1 px-2 border-r border-[#3a3a3a]"
          style={{ width: headerW, borderLeft: `3px solid ${group.color}` }}
        >
          {/* Drag handle */}
          <div
            {...attributes}
            {...listeners}
            className="text-gray-600 hover:text-gray-300 cursor-grab active:cursor-grabbing px-0.5 shrink-0 select-none"
          >
            ⠟
          </div>

          {/* Collapse toggle */}
          <button
            onClick={(e) => { e.stopPropagation(); toggleCollapse(group.id) }}
            className="text-[#a855f7] hover:text-white text-xs w-4 shrink-0 text-center"
            title={group.collapsed ? 'Expand' : 'Collapse'}
          >
            {group.collapsed ? '▶' : '▼'}
          </button>

          {/* Name */}
          <input
            className="flex-1 bg-transparent text-xs font-bold text-[#a855f7] outline-none truncate"
            value={group.name}
            onChange={(e) => updateTrack(group.id, { name: e.target.value })}
            onClick={(e) => e.stopPropagation()}
          />

          <span className="text-[10px] text-gray-500 shrink-0">{children.length}t</span>

          <button
            onClick={(e) => { e.stopPropagation(); removeTrack(group.id) }}
            className="text-gray-600 hover:text-red-400 text-xs px-0.5 shrink-0"
          >
            ×
          </button>
        </div>

        {/* Group clip span — shows a faint bar spanning all children clips */}
        <div className="flex-1 relative bg-[#a855f7]/5">
          <div className="absolute inset-0 border-b border-[#a855f7]/20" />
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-[#a855f7]/50 font-bold uppercase tracking-widest">
            GROUP · BUS
          </span>
        </div>
      </div>

      {/* Children — indented, hidden when collapsed */}
      {!group.collapsed && children.map((child) => (
        <TrackRow
          key={child.id}
          track={child}
          barWidth={barWidth}
          headerW={headerW}
          indent={12}
        />
      ))}

      {/* Drop zone to add tracks into this group */}
      {!group.collapsed && (
        <div className="h-6 flex items-center bg-[#1e1628] border-b border-[#3a3a3a]/50 pl-10">
          <span className="text-[10px] text-[#a855f7]/40 italic">drop track here to add to group</span>
        </div>
      )}
    </div>
  )
}

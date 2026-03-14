'use client'

import { useEffect } from 'react'
import { useProjectStore } from '@/store/projectStore'

export function useKeyboard() {
  const { deleteSelected, duplicateClip, selectedTrackId, selectedClipId } = useProjectStore()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Don't fire when typing in an input/textarea
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      const ctrl = e.ctrlKey || e.metaKey

      // Delete / Backspace → delete selected clip or track
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        deleteSelected()
      }

      // Ctrl+Z → undo
      if (ctrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        useProjectStore.temporal.getState().undo()
      }

      // Ctrl+Shift+Z or Ctrl+Y → redo
      if ((ctrl && e.shiftKey && e.key === 'z') || (ctrl && e.key === 'y')) {
        e.preventDefault()
        useProjectStore.temporal.getState().redo()
      }

      // D → duplicate selected clip
      if (e.key === 'd' && !ctrl && selectedTrackId && selectedClipId) {
        e.preventDefault()
        duplicateClip(selectedTrackId, selectedClipId)
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [deleteSelected, duplicateClip, selectedTrackId, selectedClipId])
}

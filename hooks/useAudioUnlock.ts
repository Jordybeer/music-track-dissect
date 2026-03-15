'use client'

import { useEffect, useState } from 'react'

/**
 * Safari (and other mobile browsers) require a user gesture before AudioContext
 * can run. This hook tracks whether audio has been unlocked.
 * Call `unlock()` inside any tap/click handler to resume the context.
 */
export function useAudioUnlock() {
  const [unlocked, setUnlocked] = useState(false)

  async function unlock() {
    if (unlocked) return
    try {
      // Dynamically import Tone so it never runs server-side
      const Tone = await import('tone')
      await Tone.start()
      setUnlocked(true)
    } catch (e) {
      console.warn('Audio unlock failed', e)
    }
  }

  // Auto-unlock on any document interaction as fallback
  useEffect(() => {
    if (unlocked) return
    const handler = () => { unlock() }
    document.addEventListener('pointerdown', handler, { once: true })
    return () => document.removeEventListener('pointerdown', handler)
  })

  return { unlocked, unlock }
}

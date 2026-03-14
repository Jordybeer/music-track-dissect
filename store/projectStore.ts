'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type TrackType = 'audio' | 'midi' | 'drum' | 'group' | 'return'

export interface Clip {
  id: string
  label: string
  startBar: number
  lengthBars: number
  color: string
  notes: string
}

export interface FXDevice {
  id: string
  name: string
  params: Record<string, string>
}

export interface Track {
  id: string
  name: string
  type: TrackType
  color: string
  clips: Clip[]
  fx: FXDevice[]
  sends: string[]
  role: string
  key: string
  scale: string
  notes: string
}

export interface SectionMarker {
  id: string
  label: string
  startBar: number
  color: string
}

export interface ProjectState {
  bpm: number
  bars: number
  tracks: Track[]
  markers: SectionMarker[]
  selectedTrackId: string | null
  selectedClipId: string | null
  setBpm: (bpm: number) => void
  setBars: (bars: number) => void
  addTrack: (type: TrackType) => void
  removeTrack: (id: string) => void
  reorderTracks: (from: number, to: number) => void
  selectTrack: (id: string | null) => void
  selectClip: (id: string | null) => void
  updateTrack: (id: string, patch: Partial<Track>) => void
  addClip: (trackId: string, clip: Clip) => void
  removeClip: (trackId: string, clipId: string) => void
  updateClip: (trackId: string, clipId: string, patch: Partial<Clip>) => void
  moveClip: (fromTrackId: string, toTrackId: string, clipId: string) => void
  addFX: (trackId: string, device: FXDevice) => void
  removeFX: (trackId: string, deviceId: string) => void
  reorderFX: (trackId: string, from: number, to: number) => void
  addMarker: (marker: SectionMarker) => void
  removeMarker: (id: string) => void
  updateMarker: (id: string, patch: Partial<SectionMarker>) => void
  exportJSON: () => string
  importJSON: (json: string) => void
}

const trackColors: Record<TrackType, string> = {
  audio: '#3b82f6',
  midi: '#22c55e',
  drum: '#ef4444',
  group: '#a855f7',
  return: '#f59e0b',
}

export function uid() {
  return Math.random().toString(36).slice(2, 10)
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      bpm: 128,
      bars: 32,
      tracks: [],
      markers: [],
      selectedTrackId: null,
      selectedClipId: null,

      setBpm: (bpm) => set({ bpm }),
      setBars: (bars) => set({ bars }),

      addTrack: (type) => set((s) => ({
        tracks: [...s.tracks, {
          id: uid(),
          name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${s.tracks.filter(t => t.type === type).length + 1}`,
          type,
          color: trackColors[type],
          clips: [],
          fx: [],
          sends: [],
          role: '',
          key: '',
          scale: '',
          notes: '',
        }]
      })),

      removeTrack: (id) => set((s) => ({
        tracks: s.tracks.filter(t => t.id !== id),
        selectedTrackId: s.selectedTrackId === id ? null : s.selectedTrackId,
      })),

      reorderTracks: (from, to) => set((s) => {
        const tracks = [...s.tracks]
        const [moved] = tracks.splice(from, 1)
        tracks.splice(to, 0, moved)
        return { tracks }
      }),

      selectTrack: (id) => set({ selectedTrackId: id, selectedClipId: null }),
      selectClip: (id) => set({ selectedClipId: id }),

      updateTrack: (id, patch) => set((s) => ({
        tracks: s.tracks.map(t => t.id === id ? { ...t, ...patch } : t)
      })),

      addClip: (trackId, clip) => set((s) => ({
        tracks: s.tracks.map(t => t.id === trackId ? { ...t, clips: [...t.clips, clip] } : t)
      })),

      removeClip: (trackId, clipId) => set((s) => ({
        tracks: s.tracks.map(t => t.id === trackId
          ? { ...t, clips: t.clips.filter(c => c.id !== clipId) }
          : t
        )
      })),

      updateClip: (trackId, clipId, patch) => set((s) => ({
        tracks: s.tracks.map(t => t.id === trackId
          ? { ...t, clips: t.clips.map(c => c.id === clipId ? { ...c, ...patch } : c) }
          : t
        )
      })),

      moveClip: (fromTrackId, toTrackId, clipId) => set((s) => {
        const fromTrack = s.tracks.find(t => t.id === fromTrackId)
        const clip = fromTrack?.clips.find(c => c.id === clipId)
        if (!clip) return s
        return {
          tracks: s.tracks.map(t => {
            if (t.id === fromTrackId) return { ...t, clips: t.clips.filter(c => c.id !== clipId) }
            if (t.id === toTrackId) return { ...t, clips: [...t.clips, { ...clip, color: t.color }] }
            return t
          })
        }
      }),

      addFX: (trackId, device) => set((s) => ({
        tracks: s.tracks.map(t => t.id === trackId ? { ...t, fx: [...t.fx, device] } : t)
      })),

      removeFX: (trackId, deviceId) => set((s) => ({
        tracks: s.tracks.map(t => t.id === trackId
          ? { ...t, fx: t.fx.filter(d => d.id !== deviceId) }
          : t
        )
      })),

      reorderFX: (trackId, from, to) => set((s) => ({
        tracks: s.tracks.map(t => {
          if (t.id !== trackId) return t
          const fx = [...t.fx]
          const [moved] = fx.splice(from, 1)
          fx.splice(to, 0, moved)
          return { ...t, fx }
        })
      })),

      addMarker: (marker) => set((s) => ({ markers: [...s.markers, marker] })),
      removeMarker: (id) => set((s) => ({ markers: s.markers.filter(m => m.id !== id) })),
      updateMarker: (id, patch) => set((s) => ({
        markers: s.markers.map(m => m.id === id ? { ...m, ...patch } : m)
      })),

      exportJSON: () => {
        const { bpm, bars, tracks, markers } = get()
        return JSON.stringify({ bpm, bars, tracks, markers }, null, 2)
      },

      importJSON: (json) => {
        try {
          const data = JSON.parse(json)
          set({
            bpm: data.bpm ?? 128,
            bars: data.bars ?? 32,
            tracks: data.tracks ?? [],
            markers: data.markers ?? [],
            selectedTrackId: null,
            selectedClipId: null,
          })
        } catch (e) {
          console.error('Invalid JSON', e)
        }
      },
    }),
    { name: 'track-dissect-project' }
  )
)

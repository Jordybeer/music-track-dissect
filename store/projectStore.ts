'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { temporal } from 'zundo'

export type TrackType = 'audio' | 'midi' | 'drum' | 'group' | 'return'

export interface StepNote {
  active: boolean
  note: string
  velocity: number
}

export interface Clip {
  id: string
  label: string
  startBar: number
  lengthBars: number
  color: string
  notes: string
  steps: StepNote[]
  stepRows: number
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
  groupId: string | null
  collapsed: boolean
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
  addTrack: (type: TrackType, groupId?: string | null) => void
  removeTrack: (id: string) => void
  reorderTracks: (from: number, to: number) => void
  selectTrack: (id: string | null) => void
  selectClip: (id: string | null) => void
  updateTrack: (id: string, patch: Partial<Track>) => void
  setGroupId: (trackId: string, groupId: string | null) => void
  toggleCollapse: (groupId: string) => void
  addClip: (trackId: string, clip: Clip) => void
  removeClip: (trackId: string, clipId: string) => void
  updateClip: (trackId: string, clipId: string, patch: Partial<Clip>) => void
  duplicateClip: (trackId: string, clipId: string) => void
  moveClip: (fromTrackId: string, toTrackId: string, clipId: string) => void
  updateStep: (trackId: string, clipId: string, stepIndex: number, patch: Partial<StepNote>) => void
  deleteSelected: () => void
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

export function makeSteps(count = 16): StepNote[] {
  return Array.from({ length: count }, () => ({ active: false, note: 'C3', velocity: 100 }))
}

export function uid() {
  return Math.random().toString(36).slice(2, 10)
}

export const useProjectStore = create<ProjectState>()(
  persist(
    temporal(
      (set, get) => ({
        bpm: 128,
        bars: 32,
        tracks: [],
        markers: [],
        selectedTrackId: null,
        selectedClipId: null,

        setBpm: (bpm) => set({ bpm }),
        setBars: (bars) => set({ bars }),

        addTrack: (type, groupId = null) => set((s) => ({
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
            groupId: groupId ?? null,
            collapsed: false,
          }]
        })),

        removeTrack: (id) => set((s) => ({
          tracks: s.tracks
            .filter(t => t.id !== id)
            .map(t => t.groupId === id ? { ...t, groupId: null } : t),
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

        setGroupId: (trackId, groupId) => set((s) => ({
          tracks: s.tracks.map(t => t.id === trackId ? { ...t, groupId } : t)
        })),

        toggleCollapse: (groupId) => set((s) => ({
          tracks: s.tracks.map(t => t.id === groupId ? { ...t, collapsed: !t.collapsed } : t)
        })),

        addClip: (trackId, clip) => set((s) => ({
          tracks: s.tracks.map(t => t.id === trackId ? { ...t, clips: [...t.clips, clip] } : t)
        })),

        removeClip: (trackId, clipId) => set((s) => ({
          tracks: s.tracks.map(t => t.id === trackId
            ? { ...t, clips: t.clips.filter(c => c.id !== clipId) }
            : t
          ),
          selectedClipId: s.selectedClipId === clipId ? null : s.selectedClipId,
        })),

        updateClip: (trackId, clipId, patch) => set((s) => ({
          tracks: s.tracks.map(t => t.id === trackId
            ? { ...t, clips: t.clips.map(c => c.id === clipId ? { ...c, ...patch } : c) }
            : t
          )
        })),

        duplicateClip: (trackId, clipId) => set((s) => {
          const track = s.tracks.find(t => t.id === trackId)
          const clip = track?.clips.find(c => c.id === clipId)
          if (!clip) return s
          const newClip: Clip = {
            ...clip,
            id: uid(),
            startBar: clip.startBar + clip.lengthBars,
            steps: clip.steps.map(step => ({ ...step })),
          }
          return {
            tracks: s.tracks.map(t => t.id === trackId
              ? { ...t, clips: [...t.clips, newClip] }
              : t
            ),
            selectedClipId: newClip.id,
          }
        }),

        moveClip: (fromTrackId, toTrackId, clipId) => set((s) => {
          const clip = s.tracks.find(t => t.id === fromTrackId)?.clips.find(c => c.id === clipId)
          if (!clip) return s
          return {
            tracks: s.tracks.map(t => {
              if (t.id === fromTrackId) return { ...t, clips: t.clips.filter(c => c.id !== clipId) }
              if (t.id === toTrackId) return { ...t, clips: [...t.clips, { ...clip, color: t.color }] }
              return t
            })
          }
        }),

        updateStep: (trackId, clipId, stepIndex, patch) => set((s) => ({
          tracks: s.tracks.map(t => {
            if (t.id !== trackId) return t
            return {
              ...t,
              clips: t.clips.map(c => {
                if (c.id !== clipId) return c
                const steps = [...c.steps]
                steps[stepIndex] = { ...steps[stepIndex], ...patch }
                return { ...c, steps }
              })
            }
          })
        })),

        deleteSelected: () => {
          const { selectedTrackId, selectedClipId, removeTrack, removeClip } = get()
          if (selectedClipId && selectedTrackId) {
            removeClip(selectedTrackId, selectedClipId)
          } else if (selectedTrackId) {
            removeTrack(selectedTrackId)
          }
        },

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
              tracks: (data.tracks ?? []).map((t: Track) => {
                const track: Track = {
                  ...t,
                  groupId: t.groupId ?? null,
                  collapsed: t.collapsed ?? false,
                  clips: (t.clips ?? []).map((c: Clip) => ({
                    ...c,
                    steps: c.steps?.length === 16 ? c.steps : makeSteps(),
                    stepRows: c.stepRows ?? 1,
                  })),
                }
                return track
              }),
              markers: data.markers ?? [],
              selectedTrackId: null,
              selectedClipId: null,
            })
          } catch (e) {
            console.error('Invalid JSON', e)
          }
        },
      }),
      {
        partialize: (state) => {
          const { selectedTrackId: _a, selectedClipId: _b, ...rest } = state
          return rest
        },
      }
    ),
    { name: 'track-dissect-project' }
  )
)

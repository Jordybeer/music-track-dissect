'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { temporal } from 'zundo'

export type TrackType = 'audio' | 'midi' | 'drum' | 'group' | 'return'
export type SynthType = 'sawtooth' | 'square' | 'sine' | 'triangle' | 'fmsine' | 'amsine'

export interface StepNote {
  active: boolean
  note: string
  velocity: number
  duration: string
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
  synthType: SynthType
  sampleName: string
}

export interface SectionMarker {
  id: string
  label: string
  startBar: number
  color: string
}

export const ZOOM_LEVELS = [
  { label: '1/16', px: 8 },
  { label: '1/8',  px: 12 },
  { label: '1/4',  px: 18 },
  { label: '1/2',  px: 26 },
  { label: '1',    px: 36 },
  { label: '2',    px: 56 },
  { label: '4',    px: 96 },
] as const

export type ZoomLabel = typeof ZOOM_LEVELS[number]['label']
export const HEADER_W = 160

export interface ProjectState {
  projectName: string
  bpm: number
  bars: number
  barWidth: number
  tracks: Track[]
  markers: SectionMarker[]
  selectedTrackId: string | null
  selectedClipId: string | null
  setProjectName: (name: string) => void
  setBpm: (bpm: number) => void
  setBars: (bars: number) => void
  setBarWidth: (px: number) => void
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
  return Array.from({ length: count }, () => ({
    active: false,
    note: 'C3',
    velocity: 100,
    duration: '16n',
  }))
}

export function uid() {
  return Math.random().toString(36).slice(2, 10)
}

export const useProjectStore = create<ProjectState>()(
  persist(
    temporal(
      (set, get) => ({
        projectName: 'Untitled Project',
        bpm: 128,
        bars: 32,
        barWidth: 36,
        tracks: [],
        markers: [],
        selectedTrackId: null,
        selectedClipId: null,

        setProjectName: (projectName) => set({ projectName }),
        setBpm: (bpm) => set({ bpm }),
        setBars: (bars) => set({ bars }),
        setBarWidth: (barWidth) => set({ barWidth }),

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
            synthType: 'sawtooth',
            sampleName: '',
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
          if (selectedClipId && selectedTrackId) removeClip(selectedTrackId, selectedClipId)
          else if (selectedTrackId) removeTrack(selectedTrackId)
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
          const { projectName, bpm, bars, tracks, markers } = get()
          return JSON.stringify({ projectName, bpm, bars, tracks, markers }, null, 2)
        },

        importJSON: (json) => {
          try {
            const data = JSON.parse(json)
            set({
              projectName: data.projectName ?? 'Untitled Project',
              bpm: data.bpm ?? 128,
              bars: data.bars ?? 32,
              tracks: (data.tracks ?? []).map((t: Track) => ({
                ...t,
                groupId: t.groupId ?? null,
                collapsed: t.collapsed ?? false,
                synthType: t.synthType ?? 'sawtooth',
                sampleName: t.sampleName ?? '',
                clips: (t.clips ?? []).map((c: Clip) => ({
                  ...c,
                  steps: c.steps?.length === 16
                    ? c.steps.map((s: StepNote) => ({ ...s, duration: s.duration ?? '16n' }))
                    : makeSteps(),
                  stepRows: c.stepRows ?? 1,
                })),
              })),
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

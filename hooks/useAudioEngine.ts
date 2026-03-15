'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useProjectStore, Track } from '@/store/projectStore'

// ─── Types we expect from Tone (imported dynamically) ───────────────────────
type ToneModule = typeof import('tone')

// Note pool for the step sequencer: C-major pentatonic across two octaves
const STEP_NOTES = ['C3','E3','G3','A3','C4','E4','G4','A4']
// Drum note map: step row index → note name for MembraneSynth / MetalSynth
const DRUM_NOTES = ['C1','D1','E1','F1','G1','A1','B1','C2']

export type TransportState = 'stopped' | 'started' | 'paused'

export interface AudioEngine {
  transportState: TransportState
  position: string
  masterVolume: number
  play: () => Promise<void>
  pause: () => void
  stop: () => void
  setMasterVolume: (db: number) => void
}

/**
 * Core audio engine.
 * - Lazily imports Tone.js (client-only).
 * - Maintains one instrument per track.
 * - Wires track.fx names to real Tone effects.
 * - Drives step sequencer from track.clips[0].steps.
 */
export function useAudioEngine(): AudioEngine {
  const toneRef = useRef<ToneModule | null>(null)
  const masterRef = useRef<InstanceType<ToneModule['Volume']> | null>(null)
  // Map trackId → Tone instrument
  const instrumentMap = useRef<Map<string, any>>(new Map())
  // Map trackId → array of connected Tone FX nodes
  const fxMap = useRef<Map<string, any[]>>(new Map())
  // Map trackId → Tone.Sequence
  const seqMap = useRef<Map<string, any>>(new Map())

  const [transportState, setTransportState] = useState<TransportState>('stopped')
  const [position, setPosition] = useState('1:0:0')
  const [masterVolume, setMasterVolumeState] = useState(0)

  const { tracks, bpm } = useProjectStore()

  // ── Lazy-load Tone and build master chain ──────────────────────────────────
  const getTone = useCallback(async (): Promise<ToneModule> => {
    if (toneRef.current) return toneRef.current
    const Tone = await import('tone')
    toneRef.current = Tone
    masterRef.current = new Tone.Volume(0).toDestination()
    return Tone
  }, [])

  // ── Build a Tone instrument for a track ───────────────────────────────────
  function makeInstrument(Tone: ToneModule, track: Track) {
    switch (track.type) {
      case 'midi':
        return new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'sawtooth' },
          envelope: { attack: 0.02, decay: 0.1, sustain: 0.5, release: 0.8 },
        })
      case 'drum': {
        // We use a small cluster: MembraneSynth for low hits, MetalSynth for hats
        // Return MembraneSynth as the primary — we'll add MetalSynth separately
        return new Tone.MembraneSynth({
          pitchDecay: 0.05,
          octaves: 6,
          envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 },
        })
      }
      case 'audio':
        return new Tone.Synth({
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.05, decay: 0.2, sustain: 0.6, release: 1 },
        })
      case 'return':
        return new Tone.Synth({
          oscillator: { type: 'sine' },
          envelope: { attack: 0.1, decay: 0.3, sustain: 0.4, release: 2 },
        })
      case 'group':
      default:
        // Groups don't produce sound directly
        return null
    }
  }

  // ── Build Tone FX node from device name ───────────────────────────────────
  function makeFXNode(Tone: ToneModule, name: string): any | null {
    const n = name.toLowerCase()
    if (n.includes('reverb'))     return new Tone.Reverb({ decay: 2.5, wet: 0.3 })
    if (n.includes('delay'))      return new Tone.FeedbackDelay('8n', 0.3)
    if (n.includes('compressor') || n === 'ott' || n === 'sidechain')
                                  return new Tone.Compressor(-24, 4)
    if (n.includes('filter') || n.includes('auto filter'))
                                  return new Tone.AutoFilter('4n').start()
    if (n.includes('chorus'))     return new Tone.Chorus(4, 2.5, 0.5).start()
    if (n.includes('distortion') || n.includes('saturator') || n.includes('redux'))
                                  return new Tone.Distortion(0.4)
    if (n.includes('phaser'))     return new Tone.Phaser({ frequency: 0.5, octaves: 3, baseFrequency: 1000 })
    if (n.includes('eq'))         return new Tone.EQ3(0, 0, 0)
    if (n.includes('limiter'))    return new Tone.Limiter(-6)
    // Unknown device — pass-through
    return null
  }

  // ── Rebuild instrument + FX chain for a track ─────────────────────────────
  const syncTrack = useCallback(async (track: Track) => {
    const Tone = await getTone()
    if (!masterRef.current) return

    // Tear down existing
    const oldInstr = instrumentMap.current.get(track.id)
    if (oldInstr) { try { oldInstr.dispose() } catch {} }
    const oldFX = fxMap.current.get(track.id) ?? []
    oldFX.forEach(n => { try { n.dispose() } catch {} })
    const oldSeq = seqMap.current.get(track.id)
    if (oldSeq) { try { oldSeq.dispose() } catch {} }

    if (track.type === 'group') return

    const instr = makeInstrument(Tone, track)
    if (!instr) return
    instrumentMap.current.set(track.id, instr)

    // Build FX chain
    const fxNodes: any[] = []
    for (const device of track.fx) {
      const node = makeFXNode(Tone, device.name)
      if (node) fxNodes.push(node)
    }
    fxMap.current.set(track.id, fxNodes)

    // Connect: instr → fx[0] → fx[1] → ... → master
    const chain: any[] = [instr, ...fxNodes, masterRef.current]
    for (let i = 0; i < chain.length - 1; i++) {
      try { chain[i].connect(chain[i + 1]) } catch {}
    }

    // Build step sequencer from first clip with steps
    const clip = track.clips.find(c => c.steps && c.steps.length === 16)
    if (clip) {
      const steps = clip.steps
      const isDrum = track.type === 'drum'
      let stepIdx = 0
      const seq = new Tone.Sequence(
        (time: number) => {
          const step = steps[stepIdx % 16]
          if (step.active) {
            const note = isDrum
              ? DRUM_NOTES[stepIdx % DRUM_NOTES.length]
              : (step.note || STEP_NOTES[stepIdx % STEP_NOTES.length])
            try { instr.triggerAttackRelease(note, '16n', time, step.velocity / 127) } catch {}
          }
          stepIdx++
        },
        Array.from({ length: 16 }, (_, i) => i),
        '16n'
      )
      seq.loop = true
      seqMap.current.set(track.id, seq)
    }
  }, [getTone])

  // ── Sync BPM → Tone Transport ──────────────────────────────────────────────
  useEffect(() => {
    if (!toneRef.current) return
    toneRef.current.getTransport().bpm.value = bpm
  }, [bpm])

  // ── Sync tracks → instruments whenever store changes ──────────────────────
  useEffect(() => {
    // Only sync if Tone has been loaded (user interacted)
    if (!toneRef.current) return
    tracks.forEach(syncTrack)
  }, [tracks, syncTrack])

  // ── Position ticker ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!toneRef.current) return
    const id = setInterval(() => {
      if (!toneRef.current) return
      const transport = toneRef.current.getTransport()
      setPosition(transport.position as string)
    }, 100)
    return () => clearInterval(id)
  }, [transportState])

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      instrumentMap.current.forEach(i => { try { i.dispose() } catch {} })
      fxMap.current.forEach(nodes => nodes.forEach(n => { try { n.dispose() } catch {} }))
      seqMap.current.forEach(s => { try { s.dispose() } catch {} })
    }
  }, [])

  // ── Transport controls ────────────────────────────────────────────────────
  const play = useCallback(async () => {
    const Tone = await getTone()
    await Tone.start() // ensure AudioContext running (Safari)
    const transport = Tone.getTransport()
    transport.bpm.value = bpm

    // Sync all tracks on first play
    await Promise.all(tracks.map(syncTrack))

    // Start all sequences
    seqMap.current.forEach(seq => { try { seq.start(0) } catch {} })

    transport.start()
    setTransportState('started')
  }, [bpm, getTone, syncTrack, tracks])

  const pause = useCallback(async () => {
    if (!toneRef.current) return
    toneRef.current.getTransport().pause()
    setTransportState('paused')
  }, [])

  const stop = useCallback(async () => {
    if (!toneRef.current) return
    const transport = toneRef.current.getTransport()
    transport.stop()
    transport.position = 0
    seqMap.current.forEach(seq => { try { seq.stop() } catch {} })
    setTransportState('stopped')
    setPosition('1:0:0')
  }, [])

  const setMasterVolume = useCallback(async (db: number) => {
    setMasterVolumeState(db)
    const Tone = await getTone()
    if (masterRef.current) masterRef.current.volume.value = db
  }, [getTone])

  return { transportState, position, masterVolume, play, pause, stop, setMasterVolume }
}

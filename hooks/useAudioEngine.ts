'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useProjectStore, Track, SynthType } from '@/store/projectStore'

type ToneModule = typeof import('tone')

// 16 drum slot notes — each step index maps to its own note so
// kick (slot 0), snare (slot 4), hi-hat (slot 8) etc. fire independently
const DRUM_SLOT_NOTES = [
  'C1','C#1','D1','D#1','E1','F1','F#1','G1',
  'G#1','A1','A#1','B1','C2','C#2','D2','D#2',
]

// Fallback melodic notes for midi when no note set on step
const STEP_NOTES = ['C3','E3','G3','A3','C4','E4','G4','A4']

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
 * Module-level sample store.
 * Key: trackId, Value: ArrayBuffer of the decoded audio file.
 * Lives outside React so it survives re-renders and is accessible
 * from both the engine hook and the Inspector upload handler.
 */
export const sampleBufferMap = new Map<string, ArrayBuffer>()

/**
 * Call this from the Inspector after the user picks a file.
 * Reads the File into an ArrayBuffer and stores it.
 */
export async function storeSample(trackId: string, file: File): Promise<void> {
  const buf = await file.arrayBuffer()
  sampleBufferMap.set(trackId, buf)
}

export function useAudioEngine(): AudioEngine {
  const toneRef = useRef<ToneModule | null>(null)
  const masterRef = useRef<InstanceType<ToneModule['Volume']> | null>(null)
  const instrumentMap = useRef<Map<string, any>>(new Map())
  const fxMap = useRef<Map<string, any[]>>(new Map())
  const seqMap = useRef<Map<string, any>>(new Map())

  const [transportState, setTransportState] = useState<TransportState>('stopped')
  const [position, setPosition] = useState('1:0:0')
  const [masterVolume, setMasterVolumeState] = useState(0)

  const { tracks, bpm } = useProjectStore()

  const getTone = useCallback(async (): Promise<ToneModule> => {
    if (toneRef.current) return toneRef.current
    const Tone = await import('tone')
    toneRef.current = Tone
    masterRef.current = new Tone.Volume(0).toDestination()
    return Tone
  }, [])

  // ── Build instrument ────────────────────────────────────────────────────────
  async function makeInstrument(Tone: ToneModule, track: Track): Promise<any> {
    const hasSample = sampleBufferMap.has(track.id)

    if (hasSample && (track.type === 'audio' || track.type === 'drum')) {
      // Decode the stored ArrayBuffer into an AudioBuffer
      const rawBuf = sampleBufferMap.get(track.id)!
      const audioBuf = await Tone.getContext().rawContext.decodeAudioData(rawBuf.slice(0))

      if (track.type === 'drum') {
        // Map all 16 drum slot notes to the same sample so every active step fires it
        const noteMap: Record<string, AudioBuffer> = {}
        DRUM_SLOT_NOTES.forEach(n => { noteMap[n] = audioBuf })
        return new Tone.Sampler(noteMap)
      } else {
        // Audio track: pitch-mapped sampler (C3 = original pitch)
        return new Tone.Sampler({ C3: audioBuf })
      }
    }

    // ── Synth fallbacks ──────────────────────────────────────────────────────
    switch (track.type) {
      case 'midi': {
        const oscType = (track.synthType ?? 'sawtooth') as SynthType
        return new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: oscType as any },
          envelope: { attack: 0.02, decay: 0.1, sustain: 0.5, release: 0.8 },
        })
      }
      case 'drum':
        return new Tone.MembraneSynth({
          pitchDecay: 0.05, octaves: 6,
          envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 },
        })
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
      default:
        return null
    }
  }

  // ── Build FX node ───────────────────────────────────────────────────────────
  function makeFXNode(Tone: ToneModule, name: string): any | null {
    const n = name.toLowerCase()
    if (n.includes('reverb'))     return new Tone.Reverb({ decay: 2.5, wet: 0.3 })
    if (n.includes('delay'))      return new Tone.FeedbackDelay('8n', 0.3)
    if (n.includes('compressor') || n === 'ott' || n === 'sidechain')
                                  return new Tone.Compressor(-24, 4)
    if (n.includes('filter'))     return new Tone.AutoFilter('4n').start()
    if (n.includes('chorus'))     return new Tone.Chorus(4, 2.5, 0.5).start()
    if (n.includes('distortion') || n.includes('saturator') || n.includes('redux'))
                                  return new Tone.Distortion(0.4)
    if (n.includes('phaser'))     return new Tone.Phaser({ frequency: 0.5, octaves: 3, baseFrequency: 1000 })
    if (n.includes('eq'))         return new Tone.EQ3(0, 0, 0)
    if (n.includes('limiter'))    return new Tone.Limiter(-6)
    return null
  }

  // ── Rebuild instrument + FX chain + sequencer for one track ────────────────
  const syncTrack = useCallback(async (track: Track) => {
    const Tone = await getTone()
    if (!masterRef.current) return

    // Tear down old nodes
    const oldInstr = instrumentMap.current.get(track.id)
    if (oldInstr) { try { oldInstr.dispose() } catch {} }
    ;(fxMap.current.get(track.id) ?? []).forEach(n => { try { n.dispose() } catch {} })
    const oldSeq = seqMap.current.get(track.id)
    if (oldSeq) { try { oldSeq.dispose() } catch {} }

    if (track.type === 'group') return

    const instr = await makeInstrument(Tone, track)
    if (!instr) return
    instrumentMap.current.set(track.id, instr)

    // Build + connect FX chain
    const fxNodes: any[] = []
    for (const device of track.fx) {
      const node = makeFXNode(Tone, device.name)
      if (node) fxNodes.push(node)
    }
    fxMap.current.set(track.id, fxNodes)

    const chain: any[] = [instr, ...fxNodes, masterRef.current]
    for (let i = 0; i < chain.length - 1; i++) {
      try { chain[i].connect(chain[i + 1]) } catch {}
    }

    // ── Step sequencer ────────────────────────────────────────────────────────
    const clip = track.clips.find(c => c.steps && c.steps.length === 16)
    if (clip) {
      const steps = clip.steps
      const isDrum = track.type === 'drum'
      let stepIdx = 0
      const seq = new Tone.Sequence(
        (time: number) => {
          const i = stepIdx % 16
          const step = steps[i]
          if (step.active) {
            // Drum: each of the 16 steps fires its own slot note
            // so pad 0 = C1, pad 4 = E1, pad 8 = G#1 etc.
            // Upload a sample and every active step will trigger it.
            const note = isDrum
              ? DRUM_SLOT_NOTES[i]
              : (step.note || STEP_NOTES[i % STEP_NOTES.length])
            try {
              instr.triggerAttackRelease(note, isDrum ? '32n' : '16n', time, step.velocity / 127)
            } catch {}
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

  useEffect(() => {
    if (!toneRef.current) return
    toneRef.current.getTransport().bpm.value = bpm
  }, [bpm])

  useEffect(() => {
    if (!toneRef.current) return
    tracks.forEach(syncTrack)
  }, [tracks, syncTrack])

  useEffect(() => {
    if (transportState === 'stopped') return
    const id = setInterval(() => {
      if (!toneRef.current) return
      setPosition(toneRef.current.getTransport().position as string)
    }, 100)
    return () => clearInterval(id)
  }, [transportState])

  useEffect(() => {
    return () => {
      instrumentMap.current.forEach(i => { try { i.dispose() } catch {} })
      fxMap.current.forEach(nodes => nodes.forEach(n => { try { n.dispose() } catch {} }))
      seqMap.current.forEach(s => { try { s.dispose() } catch {} })
    }
  }, [])

  const play = useCallback(async () => {
    const Tone = await getTone()
    await Tone.start()
    const transport = Tone.getTransport()
    transport.bpm.value = bpm
    await Promise.all(tracks.map(syncTrack))
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

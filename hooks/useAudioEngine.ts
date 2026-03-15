'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useProjectStore, Track, SynthType } from '@/store/projectStore'

type ToneModule = typeof import('tone')

const DRUM_SLOT_NOTES = [
  'C1','C#1','D1','D#1','E1','F1','F#1','G1',
  'G#1','A1','A#1','B1','C2','C#2','D2','D#2',
]
const STEP_NOTES = ['C3','E3','G3','A3','C4','E4','G4','A4']
const MIDI_SAMPLE_NOTE = 'C3'
const DRUM_SAMPLE_NOTE = 'C1'
const AUDIO_SAMPLE_NOTE = 'C3'

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

export const sampleBufferMap = new Map<string, ArrayBuffer>()

export async function storeSample(trackId: string, file: File): Promise<void> {
  const buf = await file.arrayBuffer()
  sampleBufferMap.set(trackId, buf)
}

export function clearSample(trackId: string) {
  sampleBufferMap.delete(trackId)
}

export function useAudioEngine(): AudioEngine {
  const toneRef = useRef<ToneModule | null>(null)
  const masterRef = useRef<InstanceType<ToneModule['Volume']> | null>(null)
  const instrumentMap = useRef<Map<string, any>>(new Map())
  const fxMap = useRef<Map<string, any[]>>(new Map())
  const seqMap = useRef<Map<string, any>>(new Map())
  const partMap = useRef<Map<string, any>>(new Map())

  const [transportState, setTransportState] = useState<TransportState>('stopped')
  const [position, setPosition] = useState('1:0:0')
  const [masterVolume, setMasterVolumeState] = useState(0)

  const { tracks, bpm, bars } = useProjectStore()

  const getTone = useCallback(async (): Promise<ToneModule> => {
    if (toneRef.current) return toneRef.current
    const Tone = await import('tone')
    toneRef.current = Tone
    masterRef.current = new Tone.Volume(0).toDestination()
    return Tone
  }, [])

  async function makeInstrument(Tone: ToneModule, track: Track): Promise<any> {
    const hasSample = sampleBufferMap.has(track.id)

    if (hasSample && (track.type === 'audio' || track.type === 'drum' || track.type === 'midi')) {
      const rawBuf = sampleBufferMap.get(track.id)!
      const audioBuf = await Tone.getContext().rawContext.decodeAudioData(rawBuf.slice(0))

      if (track.type === 'drum') {
        const noteMap: Record<string, AudioBuffer> = {}
        DRUM_SLOT_NOTES.forEach(n => { noteMap[n] = audioBuf })
        noteMap[DRUM_SAMPLE_NOTE] = audioBuf
        return new Tone.Sampler(noteMap)
      }
      // midi or audio: map C3 + all step notes so any trigger works
      const noteMap: Record<string, AudioBuffer> = {}
      ;[MIDI_SAMPLE_NOTE, ...DRUM_SLOT_NOTES].forEach(n => { noteMap[n] = audioBuf })
      return new Tone.Sampler(noteMap)
    }

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

  function makeFXNode(Tone: ToneModule, name: string): any | null {
    const n = name.toLowerCase()
    if (n.includes('reverb'))     return new Tone.Reverb({ decay: 2.5, wet: 0.3 })
    if (n.includes('delay'))      return new Tone.FeedbackDelay('8n', 0.3)
    if (n.includes('compressor') || n === 'ott' || n === 'sidechain') return new Tone.Compressor(-24, 4)
    if (n.includes('filter'))     return new Tone.AutoFilter('4n').start()
    if (n.includes('chorus'))     return new Tone.Chorus(4, 2.5, 0.5).start()
    if (n.includes('distortion') || n.includes('saturator') || n.includes('redux')) return new Tone.Distortion(0.4)
    if (n.includes('phaser'))     return new Tone.Phaser({ frequency: 0.5, octaves: 3, baseFrequency: 1000 })
    if (n.includes('eq'))         return new Tone.EQ3(0, 0, 0)
    if (n.includes('limiter'))    return new Tone.Limiter(-6)
    return null
  }

  const syncTrack = useCallback(async (track: Track) => {
    const Tone = await getTone()
    if (!masterRef.current) return

    const oldInstr = instrumentMap.current.get(track.id)
    if (oldInstr) { try { oldInstr.dispose() } catch {} }
    ;(fxMap.current.get(track.id) ?? []).forEach(n => { try { n.dispose() } catch {} })
    const oldSeq = seqMap.current.get(track.id)
    if (oldSeq) { try { oldSeq.dispose() } catch {} }
    const oldPart = partMap.current.get(track.id)
    if (oldPart) { try { oldPart.dispose() } catch {} }

    instrumentMap.current.delete(track.id)
    fxMap.current.delete(track.id)
    seqMap.current.delete(track.id)
    partMap.current.delete(track.id)

    if (track.type === 'group') return

    const instr = await makeInstrument(Tone, track)
    if (!instr) return
    instrumentMap.current.set(track.id, instr)

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

    const hasSample = sampleBufferMap.has(track.id)

    // Audio track: schedule clips on Transport via Part
    if (track.type === 'audio') {
      const events = track.clips.map(clip => ({
        time: `${Math.max(0, clip.startBar - 1)}:0:0`,
        duration: `${Math.max(1, clip.lengthBars)}m`,
      }))
      if (events.length > 0) {
        const part = new Tone.Part((time: number, ev: { duration: string }) => {
          try { instr.triggerAttackRelease(AUDIO_SAMPLE_NOTE, ev.duration, time) } catch {}
        }, events)
        part.loop = true
        part.loopEnd = `${Math.max(1, bars)}m`
        partMap.current.set(track.id, part)
      }
      return
    }

    // MIDI / Drum: step sequencer — duration comes from each step
    const clip = track.clips.find(c => c.steps && c.steps.length === 16)
    if (!clip) return

    const steps = clip.steps
    const isDrum = track.type === 'drum'

    const seq = new Tone.Sequence((time: number, stepIndex: number) => {
      const i = Number(stepIndex) % 16
      const step = steps[i]
      if (!step?.active) return

      const velocity = Math.max(0.05, (step.velocity ?? 100) / 127)
      // Use step duration; fall back to 16n (MIDI) or 32n (drum/sample)
      const duration = step.duration ?? (hasSample || isDrum ? '32n' : '16n')

      const note = hasSample
        ? (isDrum ? DRUM_SAMPLE_NOTE : MIDI_SAMPLE_NOTE)
        : (isDrum ? DRUM_SLOT_NOTES[i] : (step.note || STEP_NOTES[i % STEP_NOTES.length]))

      try { instr.triggerAttackRelease(note, duration, time, velocity) } catch {}
    }, Array.from({ length: 16 }, (_, i) => i), '16n')

    seq.loop = true
    seqMap.current.set(track.id, seq)
  }, [bars, getTone])

  useEffect(() => {
    if (!toneRef.current) return
    const transport = toneRef.current.getTransport()
    transport.bpm.value = bpm
    transport.loop = true
    transport.loopEnd = `${Math.max(1, bars)}m`
  }, [bpm, bars])

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
      partMap.current.forEach(p => { try { p.dispose() } catch {} })
    }
  }, [])

  const play = useCallback(async () => {
    const Tone = await getTone()
    await Tone.start()
    const transport = Tone.getTransport()
    transport.bpm.value = bpm
    transport.loop = true
    transport.loopEnd = `${Math.max(1, bars)}m`

    if (transportState === 'paused') {
      transport.start()
      setTransportState('started')
      return
    }

    await Promise.all(tracks.map(syncTrack))

    seqMap.current.forEach(seq => { try { seq.stop(0) } catch {}; try { seq.start(0) } catch {} })
    partMap.current.forEach(part => { try { part.stop(0) } catch {}; try { part.start(0) } catch {} })

    transport.position = 0
    transport.start()
    setTransportState('started')
  }, [bars, bpm, getTone, syncTrack, tracks, transportState])

  const pause = useCallback(() => {
    if (!toneRef.current) return
    toneRef.current.getTransport().pause()
    setTransportState('paused')
  }, [])

  const stop = useCallback(() => {
    if (!toneRef.current) return
    const transport = toneRef.current.getTransport()
    transport.stop()
    transport.position = 0
    seqMap.current.forEach(seq => { try { seq.stop(0) } catch {} })
    partMap.current.forEach(part => { try { part.stop(0) } catch {} })
    setTransportState('stopped')
    setPosition('1:0:0')
  }, [])

  const setMasterVolume = useCallback(async (db: number) => {
    setMasterVolumeState(db)
    await getTone()
    if (masterRef.current) masterRef.current.volume.value = db
  }, [getTone])

  return { transportState, position, masterVolume, play, pause, stop, setMasterVolume }
}

'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useProjectStore, Track, SynthType, DrumSlot, DrumKit } from '@/store/projectStore'

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
  updateFXParam: (trackId: string, deviceId: string, param: string, value: number) => void
}

export const sampleBufferMap = new Map<string, ArrayBuffer>()

export async function storeSample(trackId: string, file: File): Promise<void> {
  const buf = await file.arrayBuffer()
  sampleBufferMap.set(trackId, buf)
}

export function clearSample(trackId: string) {
  sampleBufferMap.delete(trackId)
}

const fxParamMap = new Map<string, any>()

// Sidechain state: per deviceId, store { gainNode, analyser, rafId, amount, attack, release }
const sidechainMap = new Map<string, {
  gainNode: any
  analyser: AnalyserNode
  rafId: number
  amount: number
  attack: number
  release: number
  currentGain: number
}>()

function stopSidechain(deviceId: string) {
  const sc = sidechainMap.get(deviceId)
  if (!sc) return
  cancelAnimationFrame(sc.rafId)
  try { sc.gainNode.disconnect() } catch {}
  try { sc.analyser.disconnect() } catch {}
  sidechainMap.delete(deviceId)
}

function applyFXParam(node: any, param: string, value: number) {
  try {
    const n = param.toLowerCase()
    if (n === 'wet' || n === 'mix') { if (node.wet) node.wet.value = value }
    else if (n === 'decay') { if (node.decay !== undefined) node.decay = value }
    else if (n === 'feedback') { if (node.feedback) node.feedback.value = value }
    else if (n === 'delaytime' || n === 'time') { if (node.delayTime) node.delayTime.value = value }
    else if (n === 'threshold') { if (node.threshold) node.threshold.value = value }
    else if (n === 'ratio') { if (node.ratio) node.ratio.value = value }
    else if (n === 'frequency' || n === 'freq') { if (node.frequency) node.frequency.value = value }
    else if (n === 'depth') { if (node.depth !== undefined) node.depth = value }
    else if (n === 'distortion' || n === 'drive') { if (node.distortion !== undefined) node.distortion = value }
    else if (n === 'low') { if (node.low) node.low.value = value }
    else if (n === 'mid') { if (node.mid) node.mid.value = value }
    else if (n === 'high') { if (node.high) node.high.value = value }
    else if (n === 'attack') { if (node.attack !== undefined) node.attack = value }
    else if (n === 'sustain') { if (node.sustain !== undefined) node.sustain = value }
    else if (n === 'release') { if (node.release !== undefined) node.release = value }
  } catch {}
}

function make808Voice(Tone: ToneModule, slot: DrumSlot): any {
  switch (slot) {
    case 'kick':         return new Tone.MembraneSynth({ pitchDecay: 0.12, octaves: 8, envelope: { attack: 0.001, decay: 0.6, sustain: 0, release: 0.2 } })
    case 'snare':        return new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.18, sustain: 0, release: 0.05 } })
    case 'clap':         return new Tone.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: 0.005, decay: 0.3, sustain: 0, release: 0.1 } })
    case 'hihat_closed': { const s = new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.04, release: 0.01 }, harmonicity: 5.1, modulationIndex: 32, resonance: 3500, octaves: 1.2 }); s.frequency.value = 600; return s }
    case 'hihat_open':   { const s = new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.35, release: 0.2 }, harmonicity: 5.1, modulationIndex: 32, resonance: 3500, octaves: 1.2 }); s.frequency.value = 600; return s }
    case 'tom':          return new Tone.MembraneSynth({ pitchDecay: 0.08, octaves: 5, envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 } })
    default:             { const s = new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.08, release: 0.01 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5 }); s.frequency.value = 400; return s }
  }
}

function make909Voice(Tone: ToneModule, slot: DrumSlot): any {
  switch (slot) {
    case 'kick':         return new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 6, envelope: { attack: 0.001, decay: 0.28, sustain: 0, release: 0.1 } })
    case 'snare':        return new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.03 } })
    case 'clap':         return new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.04 } })
    case 'hihat_closed': { const s = new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.025, release: 0.005 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4200, octaves: 1.5 }); s.frequency.value = 800; return s }
    case 'hihat_open':   { const s = new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.22, release: 0.12 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4200, octaves: 1.5 }); s.frequency.value = 800; return s }
    case 'tom':          return new Tone.MembraneSynth({ pitchDecay: 0.04, octaves: 4, envelope: { attack: 0.001, decay: 0.18, sustain: 0, release: 0.06 } })
    default:             { const s = new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.06, release: 0.01 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4500, octaves: 1.5 }); s.frequency.value = 500; return s }
  }
}

const kitInstrMap = new Map<string, Map<DrumSlot, any>>()

// Exposed so sidechain can tap source instrument output node
export const instrumentOutputMap = new Map<string, any>()

export function useAudioEngine(): AudioEngine {
  const toneRef = useRef<ToneModule | null>(null)
  const masterRef = useRef<InstanceType<ToneModule['Volume']> | null>(null)
  const instrumentMap = useRef<Map<string, any>>(new Map())
  const fxMap = useRef<Map<string, any[]>>(new Map())
  const fxIdMap = useRef<Map<string, string[]>>(new Map())
  const seqMap = useRef<Map<string, any>>(new Map())
  const partMap = useRef<Map<string, any>>(new Map())
  // Tone.Volume node inserted before master for per-track mute/solo/sidechain
  const sidechainGainMap = useRef<Map<string, any>>(new Map())

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
      const noteMap: Record<string, AudioBuffer> = {}
      ;[MIDI_SAMPLE_NOTE, ...DRUM_SLOT_NOTES].forEach(n => { noteMap[n] = audioBuf })
      return new Tone.Sampler(noteMap)
    }

    if (track.type === 'drum' && (track.drumVoice ?? 'membrane') === 'rimshot' && (track.drumKit ?? 'none') === 'none') {
      const synth = new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.08, release: 0.01 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5 })
      synth.frequency.value = 400
      return synth
    }

    switch (track.type) {
      case 'midi':   return new Tone.PolySynth(Tone.Synth, { oscillator: { type: (track.synthType ?? 'sawtooth') as any }, envelope: { attack: 0.02, decay: 0.1, sustain: 0.5, release: 0.8 } })
      case 'drum':   return new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 6, envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 } })
      case 'audio':  return new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.05, decay: 0.2, sustain: 0.6, release: 1 } })
      case 'return': return new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.1, decay: 0.3, sustain: 0.4, release: 2 } })
      default:       return null
    }
  }

  function makeFXNode(Tone: ToneModule, name: string, params: Record<string, string>): any | null {
    const n = name.toLowerCase()
    if (n === 'adsr' || n === 'sidechain') return null
    const wet = params.wet !== undefined ? parseFloat(params.wet) : undefined
    let node: any = null
    if (n.includes('reverb'))       node = new Tone.Reverb({ decay: params.decay !== undefined ? parseFloat(params.decay) : 2.5, wet: wet ?? 0.3 })
    else if (n.includes('delay'))   node = new Tone.FeedbackDelay(params.time ?? '8n', params.feedback !== undefined ? parseFloat(params.feedback) : 0.3)
    else if (n.includes('compressor') || n === 'ott') node = new Tone.Compressor(params.threshold !== undefined ? parseFloat(params.threshold) : -24, params.ratio !== undefined ? parseFloat(params.ratio) : 4)
    else if (n.includes('filter'))  node = new Tone.AutoFilter('4n').start()
    else if (n.includes('chorus'))  node = new Tone.Chorus(4, 2.5, 0.5).start()
    else if (n.includes('distortion') || n.includes('saturator') || n.includes('redux')) node = new Tone.Distortion(params.distortion !== undefined ? parseFloat(params.distortion) : 0.4)
    else if (n.includes('phaser'))  node = new Tone.Phaser({ frequency: 0.5, octaves: 3, baseFrequency: 1000 })
    else if (n.includes('eq'))      node = new Tone.EQ3(params.low !== undefined ? parseFloat(params.low) : 0, params.mid !== undefined ? parseFloat(params.mid) : 0, params.high !== undefined ? parseFloat(params.high) : 0)
    else if (n.includes('limiter')) node = new Tone.Limiter(params.threshold !== undefined ? parseFloat(params.threshold) : -6)
    if (node && wet !== undefined && node.wet) node.wet.value = wet
    return node
  }

  function applyADSR(instr: any, params: Record<string, string>) {
    try {
      const env = instr?.envelope ?? instr?._envelope
      if (!env) return
      if (params.attack  !== undefined) env.attack  = parseFloat(params.attack)
      if (params.decay   !== undefined) env.decay   = parseFloat(params.decay)
      if (params.sustain !== undefined) env.sustain = parseFloat(params.sustain)
      if (params.release !== undefined) env.release = parseFloat(params.release)
    } catch {}
  }

  // Start a rAF-based sidechain follower: taps source instrument, ducks dest Tone.Volume node
  function startSidechain(
    deviceId: string,
    sourceTrackId: string,
    destGainNode: any,
    audioCtx: AudioContext,
    params: Record<string, string>
  ) {
    stopSidechain(deviceId)
    const sourceInstr = instrumentOutputMap.get(sourceTrackId)
    if (!sourceInstr) return

    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 256
    const dataArr = new Float32Array(analyser.fftSize)

    try {
      const sourceNode: AudioNode = sourceInstr.output ?? sourceInstr._gainNode ?? (sourceInstr as any)
      sourceNode.connect(analyser)
    } catch { return }

    const amount  = params.amount  !== undefined ? parseFloat(params.amount)  : 0.8
    const attack  = params.attack  !== undefined ? parseFloat(params.attack)  : 0.01
    const release = params.release !== undefined ? parseFloat(params.release) : 0.2
    const sampleRate = audioCtx.sampleRate
    const attackCoef  = Math.exp(-1 / (attack  * sampleRate / analyser.fftSize))
    const releaseCoef = Math.exp(-1 / (release * sampleRate / analyser.fftSize))

    let currentGain = 1

    const sc = { gainNode: destGainNode, analyser, rafId: 0, amount, attack, release, currentGain }
    sidechainMap.set(deviceId, sc)

    function tick() {
      analyser.getFloatTimeDomainData(dataArr)
      let peak = 0
      for (let i = 0; i < dataArr.length; i++) {
        const v = Math.abs(dataArr[i])
        if (v > peak) peak = v
      }
      const target = 1 - peak * sc.amount
      const coef = target < sc.currentGain ? attackCoef : releaseCoef
      sc.currentGain = sc.currentGain * coef + target * (1 - coef)
      try {
        const linearGain = Math.max(0.0001, Math.min(1, sc.currentGain))
        destGainNode.volume.value = 20 * Math.log10(linearGain)
      } catch {}
      sc.rafId = requestAnimationFrame(tick)
    }
    sc.rafId = requestAnimationFrame(tick)
  }

  const syncTrack = useCallback(async (track: Track) => {
    const Tone = await getTone()
    if (!masterRef.current) return

    // Stop any active sidechain on this track
    track.fx.forEach(d => { if (d.name === 'Sidechain') stopSidechain(d.id) })

    const oldKit = kitInstrMap.get(track.id)
    if (oldKit) { oldKit.forEach(v => { try { v.dispose() } catch {} }); kitInstrMap.delete(track.id) }
    const oldInstr = instrumentMap.current.get(track.id)
    if (oldInstr) { try { oldInstr.dispose() } catch {} }
    ;(fxMap.current.get(track.id) ?? []).forEach(n => { try { n.dispose() } catch {} })
    const oldSeq = seqMap.current.get(track.id)
    if (oldSeq) { try { oldSeq.dispose() } catch {} }
    const oldPart = partMap.current.get(track.id)
    if (oldPart) { try { oldPart.dispose() } catch {} }
    const oldGain = sidechainGainMap.current.get(track.id)
    if (oldGain) { try { oldGain.dispose() } catch {} }

    instrumentMap.current.delete(track.id)
    fxMap.current.delete(track.id)
    fxIdMap.current.delete(track.id)
    seqMap.current.delete(track.id)
    partMap.current.delete(track.id)
    instrumentOutputMap.delete(track.id)

    if (track.type === 'group') return

    const kit = track.drumKit ?? 'none'
    const hasSample = sampleBufferMap.has(track.id)
    const isKitTrack = track.type === 'drum' && kit !== 'none' && !hasSample

    const fxNodes: any[] = []
    const fxIds: string[] = []
    let adsrParams: Record<string, string> | null = null
    let sidechainDevice: typeof track.fx[0] | null = null
    for (const device of track.fx) {
      if (device.name.toLowerCase() === 'adsr') {
        adsrParams = device.params
        fxParamMap.set(device.id, { _isADSR: true, trackId: track.id })
        continue
      }
      if (device.name === 'Sidechain') {
        sidechainDevice = device
        fxParamMap.set(device.id, { _isSidechain: true, trackId: track.id, deviceId: device.id })
        continue
      }
      const node = makeFXNode(Tone, device.name, device.params)
      if (node) { fxNodes.push(node); fxIds.push(device.id); fxParamMap.set(device.id, node) }
    }
    fxMap.current.set(track.id, fxNodes)
    fxIdMap.current.set(track.id, fxIds)

    // Tone.Volume node for mute/solo/sidechain ducking, chained into master
    const scGain = new Tone.Volume(0)
    scGain.connect(masterRef.current)
    // Apply mute state immediately
    if (track.muted) scGain.volume.value = -Infinity
    sidechainGainMap.current.set(track.id, scGain)

    if (isKitTrack) {
      const slotMap = new Map<DrumSlot, any>()
      const slots: DrumSlot[] = ['kick','snare','clap','hihat_closed','hihat_open','tom','rimshot']
      for (const slot of slots) {
        const voice = kit === '808' ? make808Voice(Tone, slot) : make909Voice(Tone, slot)
        const chain: any[] = [voice, ...fxNodes]
        for (let i = 0; i < chain.length - 1; i++) { try { chain[i].connect(chain[i+1]) } catch {} }
        const last = chain[chain.length - 1]
        try { last.connect(scGain) } catch {}
        if (adsrParams) applyADSR(voice, adsrParams)
        slotMap.set(slot, voice)
      }
      kitInstrMap.set(track.id, slotMap)
      instrumentOutputMap.set(track.id, slotMap.get('kick'))

      const clip = track.clips.find(c => c.steps && c.steps.length === 16)
      if (!clip) {
        if (sidechainDevice?.params.sourceTrackId) {
          const audioCtx = Tone.getContext().rawContext as AudioContext
          startSidechain(sidechainDevice.id, sidechainDevice.params.sourceTrackId, scGain, audioCtx, sidechainDevice.params)
        }
        return
      }
      const steps = clip.steps
      const seq = new Tone.Sequence((time: number, stepIndex: number) => {
        const i = Number(stepIndex) % 16
        const step = steps[i]
        if (!step?.active) return
        const velocity = Math.max(0.05, (step.velocity ?? 100) / 127)
        const slot: DrumSlot = step.drumSlot ?? 'kick'
        const voice = slotMap.get(slot)
        if (!voice) return
        try {
          const vtype = voice.constructor?.name ?? ''
          if (vtype === 'NoiseSynth' || vtype === 'MetalSynth') {
            voice.triggerAttackRelease('16n', time, velocity)
          } else {
            const note = slot === 'kick' ? 'C1' : slot === 'tom' ? 'G1' : 'C2'
            voice.triggerAttackRelease(note, '16n', time, velocity)
          }
        } catch {}
      }, Array.from({ length: 16 }, (_, i) => i), '16n')
      seq.loop = true
      seqMap.current.set(track.id, seq)

      if (sidechainDevice?.params.sourceTrackId) {
        const audioCtx = Tone.getContext().rawContext as AudioContext
        startSidechain(sidechainDevice.id, sidechainDevice.params.sourceTrackId, scGain, audioCtx, sidechainDevice.params)
      }
      return
    }

    // Non-kit path
    const instr = await makeInstrument(Tone, track)
    if (!instr) return
    instrumentMap.current.set(track.id, instr)
    instrumentOutputMap.set(track.id, instr)
    if (adsrParams) applyADSR(instr, adsrParams)

    const chain: any[] = [instr, ...fxNodes]
    for (let i = 0; i < chain.length - 1; i++) { try { chain[i].connect(chain[i + 1]) } catch {} }
    const last = chain[chain.length - 1]
    try { last.connect(scGain) } catch {}

    if (sidechainDevice?.params.sourceTrackId) {
      const audioCtx = Tone.getContext().rawContext as AudioContext
      startSidechain(sidechainDevice.id, sidechainDevice.params.sourceTrackId, scGain, audioCtx, sidechainDevice.params)
    }

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

    const clip = track.clips.find(c => c.steps && c.steps.length === 16)
    if (!clip) return
    const steps = clip.steps
    const isDrum = track.type === 'drum'
    const isRimshot = isDrum && (track.drumVoice ?? 'membrane') === 'rimshot'

    const seq = new Tone.Sequence((time: number, stepIndex: number) => {
      const i = Number(stepIndex) % 16
      const step = steps[i]
      if (!step?.active) return
      const velocity = Math.max(0.05, (step.velocity ?? 100) / 127)
      const duration = step.duration ?? (hasSample || isDrum ? '32n' : '16n')
      if (isRimshot) { try { instr.triggerAttackRelease('16n', time, velocity) } catch {}; return }
      const note = hasSample
        ? (isDrum ? DRUM_SAMPLE_NOTE : MIDI_SAMPLE_NOTE)
        : (isDrum ? DRUM_SLOT_NOTES[i] : (step.note || STEP_NOTES[i % STEP_NOTES.length]))
      try { instr.triggerAttackRelease(note, duration, time, velocity) } catch {}
    }, Array.from({ length: 16 }, (_, i) => i), '16n')

    seq.loop = true
    seqMap.current.set(track.id, seq)
  }, [bars, getTone])

  // Apply mute/solo changes live without full resync
  useEffect(() => {
    if (!toneRef.current) return
    const soloedTracks = tracks.filter(t => t.soloed)
    const hasSolo = soloedTracks.length > 0
    tracks.forEach(track => {
      const scGain = sidechainGainMap.current.get(track.id)
      if (!scGain) return
      const shouldMute = track.muted || (hasSolo && !track.soloed)
      scGain.volume.value = shouldMute ? -Infinity : 0
    })
  }, [tracks])

  const updateFXParam = useCallback((trackId: string, deviceId: string, param: string, value: number) => {
    const node = fxParamMap.get(deviceId)
    if (node?._isADSR) {
      const instr = instrumentMap.current.get(trackId)
      const kit = kitInstrMap.get(trackId)
      if (kit) kit.forEach(v => applyFXParam(v?.envelope ?? v, param, value))
      else if (instr) applyFXParam(instr?.envelope ?? instr, param, value)
    } else if (node?._isSidechain) {
      const sc = sidechainMap.get(deviceId)
      if (sc) {
        if (param === 'amount')  sc.amount  = value
        if (param === 'attack')  sc.attack  = value
        if (param === 'release') sc.release = value
      }
    } else if (node) {
      applyFXParam(node, param, value)
    }
    useProjectStore.getState().updateFXParam(trackId, deviceId, param, String(value))
  }, [])

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
      kitInstrMap.forEach(kit => kit.forEach(v => { try { v.dispose() } catch {} }))
      kitInstrMap.clear()
      sidechainMap.forEach((_, id) => stopSidechain(id))
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

  return { transportState, position, masterVolume, play, pause, stop, setMasterVolume, updateFXParam }
}

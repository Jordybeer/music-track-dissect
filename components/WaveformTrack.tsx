'use client'

import { useEffect, useRef, useState } from 'react'
import { HEADER_W } from '@/store/projectStore'

interface Props {
  barWidth: number
  bars: number
  bpm: number
  scrollLeft?: number
}

const AUDIO_ACCEPT = 'audio/*,.mp3,.wav,.flac,.aac,.ogg,.m4a,.aiff,.aif'

export default function WaveformTrack({ barWidth, bars, bpm, scrollLeft = 0 }: Props) {
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null)
  const [fileName, setFileName] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const totalWidth = bars * barWidth

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const arrayBuf = await file.arrayBuffer()
    const ctx = new AudioContext()
    const decoded = await ctx.decodeAudioData(arrayBuf)
    setAudioBuffer(decoded)
    ctx.close()
    e.target.value = ''
  }

  useEffect(() => {
    if (!audioBuffer || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width
    const H = canvas.height
    ctx.clearRect(0, 0, W, H)

    // Draw background grid (bar lines)
    ctx.strokeStyle = '#2a2a2a'
    ctx.lineWidth = 1
    for (let b = 0; b <= bars; b++) {
      const x = b * barWidth
      if (x > W) break
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, H)
      ctx.stroke()
    }

    const secondsPerBar = (60 / bpm) * 4
    const totalSeconds = bars * secondsPerBar
    const sampleRate = audioBuffer.sampleRate
    const channelData = audioBuffer.getChannelData(0)
    const totalSamples = audioBuffer.length
    const samplesPerPixel = (Math.min(totalSamples, Math.floor(totalSeconds * sampleRate))) / W

    ctx.beginPath()
    ctx.strokeStyle = '#22c55e'
    ctx.lineWidth = 1

    for (let px = 0; px < W; px++) {
      const startSample = Math.floor(px * samplesPerPixel)
      const endSample = Math.min(Math.floor((px + 1) * samplesPerPixel), totalSamples)
      if (startSample >= totalSamples) break

      let max = 0
      for (let s = startSample; s < endSample; s++) {
        const v = Math.abs(channelData[s])
        if (v > max) max = v
      }

      const amp = Math.min(max, 1) * (H / 2 - 2)
      const mid = H / 2
      ctx.moveTo(px, mid - amp)
      ctx.lineTo(px, mid + amp)
    }
    ctx.stroke()

    ctx.beginPath()
    ctx.strokeStyle = '#3a3a3a'
    ctx.lineWidth = 1
    ctx.moveTo(0, H / 2)
    ctx.lineTo(W, H / 2)
    ctx.stroke()
  }, [audioBuffer, bars, barWidth, bpm])

  return (
    <div className="flex shrink-0 border-b border-[#2a2a2a] bg-[#111]" style={{ height: 56 }}>
      {/* Fixed header */}
      <div
        className="shrink-0 flex items-center gap-2 px-2 border-r border-[#3a3a3a]"
        style={{ width: HEADER_W, borderLeft: '3px solid #22c55e' }}
      >
        <input ref={fileRef} type="file" accept={AUDIO_ACCEPT} className="hidden" onChange={handleFile} />
        <button
          onClick={() => fileRef.current?.click()}
          className="text-[10px] text-[#22c55e] hover:text-white border border-[#22c55e]/40 hover:border-[#22c55e] rounded px-2 py-1 transition-colors touch-manipulation shrink-0"
        >
          {fileName ? '⟳' : '↑ Ref'}
        </button>
        <span className="text-[10px] text-gray-500 truncate flex-1">
          {fileName || 'Upload reference audio'}
        </span>
        {fileName && (
          <button
            onClick={() => { setAudioBuffer(null); setFileName('') }}
            className="text-gray-600 hover:text-red-400 text-[10px] shrink-0 touch-manipulation"
          >×</button>
        )}
      </div>

      {/* Waveform canvas — scrolls in sync via transform */}
      <div className="flex-1 overflow-hidden relative">
        {audioBuffer ? (
          <canvas
            ref={canvasRef}
            width={totalWidth}
            height={56}
            className="absolute top-0 left-0 h-full"
            style={{
              width: totalWidth,
              transform: `translateX(-${scrollLeft}px)`,
              imageRendering: 'pixelated',
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center px-4">
            <div className="w-full h-px border-t border-dashed border-[#2a2a2a]" />
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Clip, StepNote, useProjectStore } from '@/store/projectStore'

const NOTES = [
  'C2','C#2','D2','D#2','E2','F2','F#2','G2','G#2','A2','A#2','B2',
  'C3','C#3','D3','D#3','E3','F3','F#3','G3','G#3','A3','A#3','B3',
  'C4','C#4','D4','D#4','E4','F4','F#4','G4','G#4','A4','A#4','B4',
  'C5','C#5','D5','D#5','E5','F5','F#5','G5','G#5','A5',
]

// 2 rows of 8 for touch friendliness
const ROW1 = [0,1,2,3,4,5,6,7]
const ROW2 = [8,9,10,11,12,13,14,15]
const BEAT_LABELS: Record<number, string> = { 0:'1', 4:'2', 8:'3', 12:'4' }

interface Props {
  clip: Clip
  trackId: string
  color: string
  isDrum?: boolean
}

export default function StepEditor({ clip, trackId, color, isDrum }: Props) {
  const { updateStep, updateClip } = useProjectStore()
  const [activeStep, setActiveStep] = useState<number | null>(null)

  const steps: StepNote[] = clip.steps?.length === 16
    ? clip.steps
    : Array.from({ length: 16 }, (_, i) => clip.steps?.[i] ?? { active: false, note: 'C3', velocity: 100 })

  function toggleStep(i: number) {
    updateStep(trackId, clip.id, i, { active: !steps[i].active })
    setActiveStep(i)
  }

  const activeCount = steps.filter(s => s.active).length

  function StepButton({ i }: { i: number }) {
    const step = steps[i]
    const isSel = activeStep === i
    const beatLabel = BEAT_LABELS[i]
    return (
      <div className="flex-1 flex flex-col items-center gap-0.5">
        {beatLabel
          ? <span className="text-[9px] text-gray-500 leading-none">{beatLabel}</span>
          : <span className="text-[9px] leading-none opacity-0">.</span>
        }
        <button
          onPointerDown={(e) => { e.preventDefault(); toggleStep(i) }}
          className={`
            w-full rounded transition-all duration-100 touch-manipulation select-none
            ${ step.active ? 'active:scale-90' : 'bg-[#1a1a1a] hover:bg-[#2a2a2a] active:bg-[#333]' }
            ${ isSel ? 'ring-1 ring-white' : '' }
            ${ step.active ? 'animate-step-on' : '' }
          `}
          style={{
            height: 36,
            background: step.active ? color + 'dd' : undefined,
            border: step.active ? `1px solid ${color}` : '1px solid #2a2a2a',
            boxShadow: step.active ? `0 0 6px ${color}66` : undefined,
          }}
        >
          <span className="text-[9px] font-bold text-white/90">
            {step.active && !isDrum ? step.note.replace(/[0-9]/g, '') : ''}
          </span>
        </button>
        {/* Velocity bar */}
        <div className="w-full h-1.5 bg-[#1a1a1a] rounded-sm overflow-hidden">
          {step.active && (
            <div
              className="h-full rounded-sm transition-all"
              style={{ width: `${(step.velocity / 127) * 100}%`, background: color + '99' }}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">16-Step Pattern</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-600">{activeCount}/16</span>
          <button
            onPointerDown={() => updateClip(trackId, clip.id, { steps: steps.map(s => ({ ...s, active: false })) })}
            className="text-[10px] text-gray-600 hover:text-red-400 active:text-red-300 touch-manipulation px-1 py-1"
          >clear</button>
        </div>
      </div>

      {/* Row 1: steps 1–8 */}
      <div className="flex gap-1">
        {ROW1.map(i => <StepButton key={i} i={i} />)}
      </div>

      {/* Row 2: steps 9–16 */}
      <div className="flex gap-1">
        {ROW2.map(i => <StepButton key={i} i={i} />)}
      </div>

      {/* Selected step detail */}
      {activeStep !== null && (
        <div className="bg-[#1a1a1a] border border-[#3a3a3a] rounded p-3 space-y-2 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray-400">Step {activeStep + 1}</span>
            <button onClick={() => setActiveStep(null)} className="text-gray-600 hover:text-white p-1 touch-manipulation">×</button>
          </div>

          {!isDrum && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-500 w-10 shrink-0">Note</span>
              <select
                className="flex-1 bg-[#242424] border border-[#3a3a3a] rounded px-2 py-1.5 text-sm text-white touch-manipulation"
                value={steps[activeStep].note}
                onChange={(e) => updateStep(trackId, clip.id, activeStep, { note: e.target.value })}
              >
                {NOTES.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-500 w-10 shrink-0">Vel</span>
            <input
              type="range" min={1} max={127}
              value={steps[activeStep].velocity}
              onChange={(e) => updateStep(trackId, clip.id, activeStep, { velocity: Number(e.target.value) })}
              className="flex-1 accent-[#e8a020] h-3 touch-manipulation"
            />
            <span className="text-[11px] text-gray-400 w-6 text-right">{steps[activeStep].velocity}</span>
          </div>
        </div>
      )}
    </div>
  )
}

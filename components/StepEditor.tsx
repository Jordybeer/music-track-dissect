'use client'

import { useState } from 'react'
import { Clip, StepNote, useProjectStore } from '@/store/projectStore'

const NOTES = [
  'C2','C#2','D2','D#2','E2','F2','F#2','G2','G#2','A2','A#2','B2',
  'C3','C#3','D3','D#3','E3','F3','F#3','G3','G#3','A3','A#3','B3',
  'C4','C#4','D4','D#4','E4','F4','F#4','G4','G#4','A4','A#4','B4',
  'C5','C#5','D5','D#5','E5','F5','F#5','G5','G#5','A5',
]

const BEAT_GROUPS = [0, 4, 8, 12] // which steps start a beat group

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

  function setNote(i: number, note: string) {
    updateStep(trackId, clip.id, i, { note })
  }

  function setVelocity(i: number, velocity: number) {
    updateStep(trackId, clip.id, i, { velocity })
  }

  const activeCount = steps.filter(s => s.active).length

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">16-Step Pattern</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-600">{activeCount}/16 hits</span>
          <button
            onClick={() => {
              const cleared = steps.map(s => ({ ...s, active: false }))
              updateClip(trackId, clip.id, { steps: cleared })
              setActiveStep(null)
            }}
            className="text-[9px] text-gray-600 hover:text-red-400 transition-colors"
          >
            clear
          </button>
        </div>
      </div>

      {/* Beat labels */}
      <div className="flex gap-0.5">
        {Array.from({ length: 16 }, (_, i) => (
          <div key={i} className="flex-1 text-center">
            {BEAT_GROUPS.includes(i) && (
              <span className="text-[8px] text-gray-600">{i / 4 + 1}</span>
            )}
          </div>
        ))}
      </div>

      {/* Step buttons */}
      <div className="flex gap-0.5">
        {steps.map((step, i) => {
          const isBeat = BEAT_GROUPS.includes(i)
          const isSelected = activeStep === i
          return (
            <button
              key={i}
              onClick={() => toggleStep(i)}
              onContextMenu={(e) => { e.preventDefault(); setActiveStep(i) }}
              className={`
                flex-1 h-7 rounded-sm text-[8px] font-bold transition-all border
                ${step.active
                  ? 'text-white shadow-sm'
                  : 'bg-[#1a1a1a] text-gray-700 hover:bg-[#2a2a2a]'
                }
                ${isSelected ? 'ring-1 ring-white' : ''}
                ${isBeat ? 'border-[#3a3a3a]' : 'border-[#2a2a2a]'}
              `}
              style={step.active ? { background: color + 'cc', borderColor: color } : {}}
              title={`Step ${i + 1}: ${step.note} vel:${step.velocity}`}
            >
              {step.active && !isDrum ? step.note.replace(/[0-9]/g, '') : ''}
            </button>
          )
        })}
      </div>

      {/* Velocity micro bars */}
      <div className="flex gap-0.5 h-3">
        {steps.map((step, i) => (
          <div key={i} className="flex-1 bg-[#1a1a1a] rounded-sm overflow-hidden flex items-end">
            {step.active && (
              <div
                className="w-full rounded-sm"
                style={{ height: `${(step.velocity / 127) * 100}%`, background: color + '99' }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Selected step detail */}
      {activeStep !== null && (
        <div className="bg-[#1a1a1a] border border-[#3a3a3a] rounded p-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-400">Step {activeStep + 1}</span>
            <button onClick={() => setActiveStep(null)} className="text-[10px] text-gray-600 hover:text-white">×</button>
          </div>

          {!isDrum && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500 w-10 shrink-0">Note</span>
              <select
                className="flex-1 bg-[#242424] border border-[#3a3a3a] rounded px-1 py-0.5 text-[10px] text-white"
                value={steps[activeStep].note}
                onChange={(e) => setNote(activeStep, e.target.value)}
              >
                {NOTES.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 w-10 shrink-0">Vel</span>
            <input
              type="range" min={1} max={127}
              value={steps[activeStep].velocity}
              onChange={(e) => setVelocity(activeStep, Number(e.target.value))}
              className="flex-1 accent-[#e8a020] h-1"
            />
            <span className="text-[10px] text-gray-400 w-6 text-right">{steps[activeStep].velocity}</span>
          </div>
        </div>
      )}
    </div>
  )
}

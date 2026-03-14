# 🎛️ Track Dissect

A DAW-style webapp for dissecting music tracks by ear. Inspired by Ableton Live's arrangement view.

## Features

- **Drag & drop** track types from browser panel (Audio, MIDI, Drum, Group, Return)
- **Timeline** with BPM ruler and bar grid
- **Clip blocks** — add clips with label, start bar, length
- **Inspector panel** — key, scale, layer role, notes, sends (A/B/C/D), FX chain
- **FX rack** — add/remove mock devices per track (Reverb, Delay, ABL3, Slippery Slope, etc.)
- **Export JSON** — save your full dissection session
- **PWA** — add to home screen on iPhone, landscape-first
- **Persisted state** — auto-saved in localStorage

## Stack

- Next.js 15 + TypeScript
- Tailwind CSS
- @dnd-kit for drag & drop
- Zustand for state management

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy

Deploy to Vercel — connect this repo and hit deploy.

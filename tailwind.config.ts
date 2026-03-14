import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      keyframes: {
        'step-on': {
          '0%': { transform: 'scale(1)', boxShadow: 'none' },
          '50%': { transform: 'scale(1.15)', boxShadow: '0 0 8px var(--step-color)' },
          '100%': { transform: 'scale(1.05)', boxShadow: '0 0 4px var(--step-color)' },
        },
        'clip-select': {
          '0%': { boxShadow: '0 0 0 0px rgba(255,255,255,0.6)' },
          '100%': { boxShadow: '0 0 0 3px rgba(255,255,255,0)' },
        },
        'slide-in-left': {
          '0%': { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'undo-flash': {
          '0%': { background: '#e8a020' },
          '100%': { background: 'transparent' },
        },
        'sheet-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
      animation: {
        'step-on': 'step-on 0.15s ease-out forwards',
        'clip-select': 'clip-select 0.3s ease-out forwards',
        'slide-in-left': 'slide-in-left 0.2s ease-out forwards',
        'fade-in': 'fade-in 0.15s ease-out forwards',
        'undo-flash': 'undo-flash 0.4s ease-out forwards',
        'sheet-up': 'sheet-up 0.25s cubic-bezier(0.32,0.72,0,1) forwards',
      },
    },
  },
  plugins: [],
}

export default config

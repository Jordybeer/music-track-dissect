/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        daw: {
          bg: '#1a1a1a',
          surface: '#242424',
          panel: '#2a2a2a',
          border: '#3a3a3a',
          accent: '#e8a020',
          clip: '#3b82f6',
          drum: '#ef4444',
          midi: '#22c55e',
          audio: '#3b82f6',
          group: '#a855f7',
          returns: '#f59e0b',
        }
      }
    },
  },
  plugins: [],
}

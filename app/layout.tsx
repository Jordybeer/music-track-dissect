import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Track Dissect',
  description: 'DAW-style track dissection tool for analyzing arrangements, layers and FX by ear',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Track Dissect',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      {/* safe-bottom only: pads home indicator. Left/right NOT applied globally
          to avoid right-side cutoff — the app fills edge-to-edge in landscape. */}
      <body className="h-full bg-[#1a1a1a] text-white safe-bottom">{children}</body>
    </html>
  )
}

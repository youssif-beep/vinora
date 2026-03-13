import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Vinora – Wine Intelligence Platform',
  description: 'KI-gestützte Weingut-Analytics & Marketing-Automation',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  )
}

import type { Metadata, Viewport } from "next"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

export const metadata: Metadata = {
  title: "Heute. — Dein Tagebuch in einer Sprachnachricht",
  description:
    "Sprich eine Sprachnachricht. Dein Tag wird automatisch in die sechs Felder des 6-Minuten-Tagebuchs strukturiert. Privat, lokal, schön.",
  applicationName: "Heute.",
  appleWebApp: { title: "Heute.", statusBarStyle: "black-translucent", capable: true },
  manifest: undefined,
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF8F3" },
    { media: "(prefers-color-scheme: dark)", color: "#0E0B08" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  )
}

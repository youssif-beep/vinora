'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const SUPABASE_CONFIGURED =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project.supabase.co'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    setError('')

    // Demo-Modus: Supabase nicht konfiguriert → direkt zum Dashboard
    if (!SUPABASE_CONFIGURED) {
      router.push('/dashboard')
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback` },
      })
      setLoading(false)
      if (error) { setError(error.message); return }
      setSent(true)
    } catch {
      setLoading(false)
      setError('Verbindung fehlgeschlagen. Supabase prüfen.')
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #1C0A0F 0%, #4A1825 40%, #6B2737 70%, #8B3348 100%)' }}
    >
      {/* Decorative wine glass silhouettes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute top-10 right-20 w-64 h-64 rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #C9A84C, transparent)' }} />
        <div className="absolute bottom-20 left-10 w-96 h-96 rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #C9A84C, transparent)' }} />
        <svg className="absolute bottom-0 left-0 w-full opacity-[0.04]" viewBox="0 0 1440 200" fill="none">
          <path d="M0 100 Q360 0 720 100 Q1080 200 1440 100 L1440 200 L0 200 Z" fill="#C9A84C" />
        </svg>
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C96A)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1C0A0F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 22h8M12 11v11M4 6l2-2h12l2 2-7 5H11L4 6z"/>
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Playfair Display, Georgia, serif', letterSpacing: '-0.5px' }}>
              Vinora
            </h1>
          </div>
          <p className="text-white/60 text-sm tracking-widest uppercase font-medium">
            Wine Intelligence Platform
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-8">
          {!sent ? (
            <>
              <h2 className="text-xl font-semibold text-[#1C0A0F] mb-1" style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>
                Willkommen zurück
              </h2>
              <p className="text-sm text-[#6B4A50] mb-6">
                Gib deine E-Mail ein – du erhältst einen Magic Link zum Einloggen. Kein Passwort nötig.
              </p>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-[#1C0A0F] mb-1.5">
                    E-Mail Adresse
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@weingut.de"
                    className="w-full px-4 py-3 rounded-xl border border-[#E8D5C0] bg-[#FAFAF7] text-[#1C0A0F] placeholder-[#C9B9A8] focus:outline-none focus:ring-2 focus:border-transparent transition-all text-sm"
                    style={{ '--tw-ring-color': '#6B2737' } as React.CSSProperties}
                  />
                </div>
                {error && (
                  <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg" role="alert">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  style={{ background: loading ? '#8B3348' : 'linear-gradient(135deg, #6B2737, #8B3348)' }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.25"/>
                        <path d="M21 12a9 9 0 00-9-9" />
                      </svg>
                      Sende Link…
                    </span>
                  ) : SUPABASE_CONFIGURED ? 'Magic Link senden →' : 'Demo: Direkt einloggen →'}
                </button>
              </form>
              <p className="text-xs text-center text-[#A08080] mt-5">
                {SUPABASE_CONFIGURED ? 'Nur für autorisierte Weingut-Partner' : '🧪 Demo-Modus – kein Supabase erforderlich'}
              </p>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'linear-gradient(135deg, #C6EFCE, #A8D8B0)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e5e2e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-[#1C0A0F] mb-2" style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>
                Link gesendet!
              </h2>
              <p className="text-sm text-[#6B4A50] leading-relaxed">
                Schau in dein E-Mail Postfach (<strong>{email}</strong>) und klick auf den Link zum Einloggen.
              </p>
              <button
                onClick={() => setSent(false)}
                className="mt-5 text-sm text-[#6B2737] hover:underline cursor-pointer"
              >
                Andere E-Mail verwenden
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-white/30 text-xs mt-6">
          Vinora © {new Date().getFullYear()} · Simon × Youssif × Marco
        </p>
      </div>
    </div>
  )
}

'use client'

import { VinoraProvider } from '@/components/vinora-provider'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, Users, Megaphone, CalendarDays, Settings,
  LogOut, Wine, BarChart3
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard',              label: 'Übersicht',    icon: LayoutDashboard },
  { href: '/dashboard/kunden',       label: 'Kunden',       icon: Users },
  { href: '/dashboard/marketing',    label: 'Marketing',    icon: Megaphone },
  { href: '/dashboard/events',       label: 'Events',       icon: CalendarDays },
  { href: '/dashboard/einstellungen',label: 'Einstellungen',icon: Settings },
]

const PAGE_NAMES: Record<string, string> = {
  '/dashboard':              'Übersicht',
  '/dashboard/kunden':       'Kunden',
  '/dashboard/marketing':    'Marketing',
  '/dashboard/events':       'Events',
  '/dashboard/einstellungen':'Einstellungen',
}

function getPageName(pathname: string): string {
  if (PAGE_NAMES[pathname]) return PAGE_NAMES[pathname]
  for (const key of Object.keys(PAGE_NAMES).reverse()) {
    if (pathname.startsWith(key) && key !== '/dashboard') return PAGE_NAMES[key]
  }
  return 'Dashboard'
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <VinoraProvider><DashboardShell>{children}</DashboardShell></VinoraProvider>
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const pageName = getPageName(pathname)
  const dateStr = new Date().toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  async function handleLogout() {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
    } catch { /* ignore if Supabase not configured */ }
    router.push('/')
  }

  return (
    <div className="flex min-h-screen" style={{ background: '#FAFAF7' }}>
      {/* Sidebar */}
      <motion.aside
        className="w-60 flex-shrink-0 flex flex-col"
        style={{ background: 'linear-gradient(180deg, #1C0A0F 0%, #2D1018 60%, #4A1825 100%)' }}
        initial={{ x: -240, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0, 0, 0.2, 1] }}
      >

        {/* Logo */}
        <div className="px-6 py-6 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C96A)' }}>
              <Wine size={16} color="#1C0A0F" />
            </div>
            <div>
              <div className="text-white font-bold text-lg leading-none"
                style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>
                Vinora
              </div>
              <div className="text-white/40 text-[10px] tracking-widest uppercase mt-0.5">
                Wine Intelligence
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(href)
            return (
              <motion.div
                key={href}
                whileHover={{ x: 3 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                <Link
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'text-white'
                      : 'text-white/50 hover:text-white/80 hover:bg-white/8'
                  }`}
                  style={isActive ? { background: 'rgba(201,168,76,0.15)', color: '#E8C96A' } : {}}
                >
                  <Icon size={16} className="flex-shrink-0" />
                  {label}
                  {isActive && (
                    <div className="ml-auto w-1.5 h-5 rounded-full" style={{ background: 'linear-gradient(180deg, #E8C96A, #C9A84C)' }} />
                  )}
                </Link>
              </motion.div>
            )
          })}
        </nav>

        {/* Analytics badge */}
        <div className="px-4 pb-2">
          <div className="rounded-xl p-3" style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.15)' }}>
            <div className="flex items-center gap-2 mb-1.5">
              <BarChart3 size={14} style={{ color: '#C9A84C' }} />
              <span className="text-xs font-semibold" style={{ color: '#C9A84C' }}>RFM Analytics</span>
            </div>
            <p className="text-white/40 text-[11px] leading-relaxed">
              Powered by RFM+CLV Segmentierung & KI-Marketing
            </p>
          </div>
        </div>

        {/* Logout */}
        <div className="px-3 pb-5 pt-1 border-t border-white/10 mt-1">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/40 hover:text-white/70 hover:bg-white/5 transition-all cursor-pointer"
          >
            <LogOut size={16} />
            Abmelden
          </button>
        </div>
      </motion.aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto flex flex-col">
        {/* Top Header Bar */}
        <motion.div
          className="flex-shrink-0 flex items-center justify-between px-8 py-3.5 border-b shadow-sm"
          style={{ background: 'white', borderColor: '#E8D5C0' }}
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2, ease: [0, 0, 0.2, 1] }}
        >
          <div className="flex items-center gap-3">
            <h2
              className="text-base font-bold text-[#1C0A0F]"
              style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
            >
              {pageName}
            </h2>
            <span className="text-xs text-[#B09090]">·</span>
            <span className="text-xs text-[#8B6070] capitalize">{dateStr}</span>
          </div>
          {/* User Avatar */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #6B2737, #8B3348)' }}
            title="Profil"
          >
            N
          </div>
        </motion.div>

        {/* Page content */}
        <motion.div
          className="flex-1 overflow-auto"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  )
}

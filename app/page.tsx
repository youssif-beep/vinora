'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, useAnimation, useInView, AnimatePresence } from 'framer-motion'
import {
  BarChart3, Sparkles, TrendingUp, CalendarDays, Upload, Settings2,
  CheckCircle, Send, ArrowRight, Wine, Star,
} from 'lucide-react'

interface Particle {
  id: number; x: number; y: number; size: number
  duration: number; delay: number; gold: boolean
}

function SectionLabel({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <p className="text-xs font-semibold tracking-[0.2em] uppercase mb-4"
      style={{ color: dark ? 'rgba(201,168,76,0.7)' : '#C9A84C' }}>
      {children}
    </p>
  )
}

function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-50px' })
  useEffect(() => {
    if (!inView) return
    let start = 0
    const duration = 1200, step = 16
    const increment = target / (duration / step)
    const timer = setInterval(() => {
      start += increment
      if (start >= target) { setCount(target); clearInterval(timer) }
      else setCount(Math.floor(start))
    }, step)
    return () => clearInterval(timer)
  }, [inView, target])
  return <span ref={ref}>{count}{suffix}</span>
}

function WineGlass() {
  const controls = useAnimation()
  const fillControls = useAnimation()
  const glowControls = useAnimation()
  useEffect(() => {
    const sequence = async () => {
      await controls.start({ strokeDashoffset: 0, transition: { duration: 1.5, ease: 'easeInOut' } })
      await fillControls.start({ y: '40%', transition: { duration: 1, ease: 'easeOut' } })
      glowControls.start({ opacity: [0.3, 0.7, 0.3], scale: [1, 1.1, 1], transition: { repeat: Infinity, duration: 3 } })
    }
    sequence()
  }, [controls, fillControls, glowControls])
  return (
    <div className="relative flex items-center justify-center" style={{ width: 160, height: 240 }}>
      <motion.div animate={glowControls}
        style={{ position: 'absolute', width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle, rgba(107,39,55,0.5) 0%, transparent 70%)', top: '30%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }} />
      <svg width="120" height="200" viewBox="0 0 120 200" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: 'relative', zIndex: 1 }}>
        <defs>
          <clipPath id="wineClip">
            <motion.rect x="0" y="100%" width="120" height="200" animate={fillControls} initial={{ y: '100%' }} />
          </clipPath>
        </defs>
        <path d="M 60,40 C 20,40 10,100 10,120 L 50,140 L 50,170 L 30,180 L 90,180 L 70,170 L 70,140 L 110,120 C 110,100 100,40 60,40 Z" fill="#6B2737" clipPath="url(#wineClip)" opacity={0.85} />
        <motion.path d="M 60,40 C 20,40 10,100 10,120 L 50,140 L 50,170 L 30,180 L 90,180 L 70,170 L 70,140 L 110,120 C 110,100 100,40 60,40 Z" stroke="#C9A84C" strokeWidth={2} fill="none" initial={{ strokeDashoffset: 500, strokeDasharray: 500 }} animate={controls} />
        <motion.line x1="40" y1="60" x2="35" y2="110" stroke="rgba(232,201,106,0.3)" strokeWidth={3} strokeLinecap="round" initial={{ opacity: 0 }} animate={{ opacity: [0, 0.6, 0] }} transition={{ delay: 2.5, repeat: Infinity, duration: 2.5 }} />
      </svg>
    </div>
  )
}

function FloatingParticles() {
  const [particles, setParticles] = useState<Particle[]>([])
  useEffect(() => {
    setParticles(Array.from({ length: 15 }, (_, i) => ({
      id: i, x: Math.random() * 100, y: Math.random() * 100,
      size: Math.random() * 4 + 2, duration: Math.random() * 4 + 3,
      delay: Math.random() * 2, gold: i % 2 === 0,
    })))
  }, [])
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden suppressHydrationWarning>
      <AnimatePresence>
        {particles.map(p => (
          <motion.div key={p.id}
            style={{ position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, borderRadius: '50%', background: p.gold ? '#C9A84C' : '#8B3348' }}
            animate={{ y: [0, -30, 0], opacity: [0.3, 0.8, 0.3] }}
            transition={{ repeat: Infinity, duration: p.duration, delay: p.delay }} />
        ))}
      </AnimatePresence>
    </div>
  )
}

function Nav() {
  return (
    <motion.nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b"
      style={{ background: 'rgba(28, 10, 15, 0.85)', borderColor: 'rgba(255,255,255,0.08)' }}
      initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0, 0, 0.2, 1] }}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C96A)' }}>
            <Wine size={17} color="#1C0A0F" strokeWidth={2.2} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-white text-lg font-bold tracking-tight" style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>Vinora</span>
            <span className="text-[10px] font-medium tracking-widest uppercase" style={{ color: '#C9A84C' }}>Wine Intelligence</span>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          {[{ label: 'Features', href: '#features' }, { label: 'Preise', href: '#preise' }, { label: 'Demo', href: '#demo' }].map(({ label, href }) => (
            <a key={label} href={href} className="text-sm font-medium transition-colors duration-200" style={{ color: 'rgba(255,255,255,0.6)' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#ffffff')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)')}>
              {label}
            </a>
          ))}
        </nav>
        <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
          <Link href="/login" className="flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C96A)', color: '#1C0A0F' }}>
            Einloggen <ArrowRight size={13} strokeWidth={2.5} />
          </Link>
        </motion.div>
      </div>
    </motion.nav>
  )
}

const wordVariants = {
  hidden: { y: 40, opacity: 0 },
  visible: (i: number) => ({ y: 0, opacity: 1, transition: { duration: 0.5, ease: [0, 0, 0.2, 1] as [number,number,number,number], delay: i * 0.08 } }),
}

function Hero() {
  const words = ['Verwandle', 'Weingut-Daten', 'in', 'Umsatz']
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-16" style={{ background: '#1C0A0F' }} suppressHydrationWarning>
      <FloatingParticles />
      <motion.div className="absolute pointer-events-none rounded-full"
        style={{ width: 500, height: 500, top: '10%', left: '-5%', background: 'radial-gradient(circle, rgba(201,168,76,0.14) 0%, transparent 70%)' }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.12, 0.2, 0.12] }} transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }} aria-hidden />
      <motion.div className="absolute pointer-events-none rounded-full"
        style={{ width: 420, height: 420, bottom: '10%', right: '-5%', background: 'radial-gradient(circle, rgba(107,39,55,0.35) 0%, transparent 70%)' }}
        animate={{ scale: [1, 1.12, 1], opacity: [0.15, 0.25, 0.15] }} transition={{ repeat: Infinity, duration: 7, ease: 'easeInOut', delay: 2 }} aria-hidden />
      <div className="relative z-10 max-w-6xl mx-auto px-6 w-full flex flex-col lg:flex-row items-center gap-16 py-16">
        <div className="flex-1 max-w-2xl text-center lg:text-left">
          <motion.div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 border text-sm font-medium"
            style={{ background: 'rgba(201,168,76,0.1)', borderColor: 'rgba(201,168,76,0.3)', color: '#C9A84C' }}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
            <Sparkles size={13} strokeWidth={2} /> KI-gestützte Weingut-Analytics
          </motion.div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-[1.05] tracking-tight"
            style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>
            {words.map((word, i) => (
              <motion.span key={word} className="inline-block mr-[0.2em]" custom={i} initial="hidden" animate="visible" variants={wordVariants}
                style={i >= 2 ? { background: 'linear-gradient(135deg, #C9A84C, #E8C96A)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' } : {}}>
                {word}
              </motion.span>
            ))}
          </h1>
          <motion.p className="text-lg md:text-xl mb-10 leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }}>
            Analysiere jeden Kunden mit RFM+CLV, lass KI personalisierte Marketing-Maßnahmen vorschlagen und verfolge den Erfolg – alles in einem eleganten Dashboard.
          </motion.p>
          <motion.div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.8 }}>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link href="/login" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-base transition-opacity hover:opacity-90 shadow-lg"
                style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C96A)', color: '#1C0A0F', boxShadow: '0 8px 32px rgba(201,168,76,0.35)' }}>
                Kostenlos starten <ArrowRight size={17} strokeWidth={2.5} />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <a href="#demo" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-base transition-all hover:bg-white/10 border"
                style={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.8)' }}>Live Demo ansehen</a>
            </motion.div>
          </motion.div>
        </div>
        <motion.div className="flex-shrink-0 hidden lg:flex items-center justify-center"
          initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.4, ease: [0, 0, 0.2, 1] }}>
          <WineGlass />
        </motion.div>
      </div>
      <motion.div className="relative z-10 w-full max-w-6xl mx-auto px-6 pb-10"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 1 }}>
        <div className="grid grid-cols-3 rounded-2xl overflow-hidden border" style={{ borderColor: 'rgba(201,168,76,0.2)', background: 'rgba(201,168,76,0.15)' }}>
          {[
            { numericTarget: 10, suffix: '+', label: 'Weingüter', displayOverride: null },
            { numericTarget: 50, suffix: '.000+', label: 'Kunden analysiert', displayOverride: null },
            { numericTarget: 24, suffix: '%', label: 'CLV-Steigerung', displayOverride: 'Ø +24%' },
          ].map((stat, i) => (
            <div key={stat.label} className="px-6 py-5 text-center" style={{ background: 'rgba(28,10,15,0.85)', borderLeft: i > 0 ? '1px solid rgba(201,168,76,0.15)' : 'none' }}>
              <div className="text-2xl font-bold mb-0.5" style={{ fontFamily: 'Playfair Display, Georgia, serif', color: '#C9A84C' }}>
                {stat.displayOverride ?? <><AnimatedCounter target={stat.numericTarget} />{stat.suffix}</>}
              </div>
              <div className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </motion.div>
      <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent, #FAFAF7)' }} aria-hidden />
    </section>
  )
}

function Features() {
  const mainFeatures = [
    { icon: <BarChart3 size={24} strokeWidth={1.8} />, title: 'RFM+CLV Analyse', desc: 'Segmentiere Kunden automatisch in 7 Gruppen: Top-Kunden, Gefährdete, Eingeschlafene und mehr. Mit Customer Lifetime Value pro Segment.' },
    { icon: <Sparkles size={24} strokeWidth={1.8} />, title: 'KI-Marketing Workflow', desc: 'Claude KI schlägt personalisierte Maßnahmen vor: E-Mail-Texte, Probe-Angebote, VIP-Events – basierend auf Segment und Kaufhistorie.' },
    { icon: <TrendingUp size={24} strokeWidth={1.8} />, title: 'Feedback-Loop & Tracking', desc: 'Markiere Maßnahmen als „gesendet“, tracke ob der Kunde reagiert hat, und miss den tatsächlichen Erfolg deiner Kampagnen.' },
  ]
  const minorFeatures = [
    { icon: <CalendarDays size={18} strokeWidth={1.8} />, title: 'Eventkalender', desc: 'Verknüpfe Events mit relevanten Kunden in der Region' },
    { icon: <Upload size={18} strokeWidth={1.8} />, title: 'CSV Import', desc: 'Lade Kundendaten per CSV-Upload hoch, keine Datenbank nötig' },
    { icon: <Settings2 size={18} strokeWidth={1.8} />, title: 'Anpassbare Schwellwerte', desc: 'RFM-Schwellwerte, CLV-Grenzen und Nachrichtenvorlagen selbst definieren' },
  ]
  return (
    <section id="features" className="py-32 px-6" style={{ background: '#FAFAF7' }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <SectionLabel>Funktionen</SectionLabel>
          <motion.h2 className="text-4xl md:text-5xl font-bold" style={{ fontFamily: 'Playfair Display, Georgia, serif', color: '#1C0A0F' }}
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: [0, 0, 0.2, 1] }} viewport={{ once: true, margin: '-60px' }}>
            Alles was ein modernes Weingut braucht
          </motion.h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {mainFeatures.map((f, index) => (
            <motion.div key={f.title} className="bg-white rounded-2xl p-8 border" style={{ borderColor: '#E8D5C0' }}
              initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.15, duration: 0.5, ease: [0, 0, 0.2, 1] }} viewport={{ once: true, margin: '-50px' }}
              whileHover={{ y: -6, boxShadow: '0 20px 60px rgba(107,39,55,0.15)' }}>
              <motion.div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.2), rgba(232,201,106,0.12))', color: '#C9A84C' }}
                whileHover={{ rotate: 5, scale: 1.1 }} transition={{ type: 'spring', stiffness: 300 }}>
                {f.icon}
              </motion.div>
              <h3 className="text-lg font-semibold mb-3" style={{ fontFamily: 'Playfair Display, Georgia, serif', color: '#1C0A0F' }}>{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#8B6070' }}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
        <div className="grid md:grid-cols-3 gap-4 rounded-2xl p-6 border bg-white" style={{ borderColor: 'rgba(201,168,76,0.12)' }}>
          {minorFeatures.map((f, i) => (
            <motion.div key={f.title} className="flex items-start gap-4 p-4"
              initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }} viewport={{ once: true, margin: '-30px' }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(201,168,76,0.1)', color: '#C9A84C' }}>{f.icon}</div>
              <div>
                <h4 className="text-sm font-semibold mb-1" style={{ color: '#1C0A0F' }}>{f.title}</h4>
                <p className="text-xs leading-relaxed" style={{ color: '#8B6070' }}>{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    { num: '01', icon: <Upload size={22} strokeWidth={1.8} />, title: 'CSV hochladen', desc: 'Exportiere deine Kundendaten aus deinem Warenwirtschaftssystem als CSV und lade sie in Vinora hoch.' },
    { num: '02', icon: <Sparkles size={22} strokeWidth={1.8} />, title: 'KI analysiert & segmentiert', desc: 'Vinora berechnet automatisch RFM-Scores, CLV-Werte und weist jeden Kunden dem richtigen Segment zu.' },
    { num: '03', icon: <Send size={22} strokeWidth={1.8} />, title: 'Maßnahmen versenden & tracken', desc: 'Erhalte KI-generierte Nachrichtenvorlagen pro Kunde, sende sie aus und verfolge den Erfolg im Feedback-Loop.' },
  ]
  return (
    <section id="demo" className="py-32 px-6" style={{ background: '#F0EDE8' }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <SectionLabel>So funktioniert es</SectionLabel>
          <motion.h2 className="text-4xl md:text-5xl font-bold" style={{ fontFamily: 'Playfair Display, Georgia, serif', color: '#1C0A0F' }}
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }} viewport={{ once: true }}>
            In 3 Schritten zur vollständigen Kunden-Analyse
          </motion.h2>
        </div>
        <div className="relative grid md:grid-cols-3 gap-6">
          <div className="hidden md:block absolute top-10 left-[16.66%] right-[16.66%] h-px pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
            <svg width="100%" height="2" viewBox="0 0 600 2" preserveAspectRatio="none">
              <motion.path d="M0,1 L600,1" stroke="#C9A84C" strokeWidth={1.5} strokeDasharray="6 4" fill="none"
                initial={{ pathLength: 0, opacity: 0 }} whileInView={{ pathLength: 1, opacity: 0.5 }}
                transition={{ duration: 1.5, ease: 'easeInOut' }} viewport={{ once: true }} />
            </svg>
          </div>
          {steps.map((step, i) => (
            <motion.div key={step.num} className="relative z-10"
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15, duration: 0.5 }} viewport={{ once: true, margin: '-40px' }}>
              <div className="bg-white rounded-2xl p-8 shadow-sm border relative overflow-hidden hover:-translate-y-1 transition-transform duration-200" style={{ borderColor: 'rgba(201,168,76,0.15)' }}>
                <div className="absolute -top-2 -right-2 text-8xl font-bold leading-none select-none pointer-events-none"
                  style={{ fontFamily: 'Playfair Display, Georgia, serif', color: '#C9A84C', opacity: 0.12 }} aria-hidden>{step.num}</div>
                <div className="text-7xl font-bold leading-none mb-4 select-none" style={{ fontFamily: 'Playfair Display, Georgia, serif', color: '#C9A84C', opacity: 0.35 }}>{step.num}</div>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(107,39,55,0.08)', color: '#6B2737' }}>{step.icon}</div>
                <h3 className="text-lg font-semibold mb-3" style={{ fontFamily: 'Playfair Display, Georgia, serif', color: '#1C0A0F' }}>{step.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#8B6070' }}>{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function DashboardPreview() {
  const floatingLabels = [
    { label: 'RFM Score', value: '12/15', pos: { top: '20%', left: '-5%' } as React.CSSProperties, delay: 0.5 },
    { label: 'CLV Tier', value: 'Gold', pos: { top: '50%', right: '-5%' } as React.CSSProperties, delay: 0.7 },
    { label: 'KI-Maßnahme', value: 'Reaktivierung', pos: { bottom: '15%', left: '10%' } as React.CSSProperties, delay: 0.9 },
  ]
  return (
    <section className="py-32 px-6" style={{ background: '#1C0A0F' }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <SectionLabel dark>Dashboard</SectionLabel>
          <motion.h2 className="text-4xl md:text-5xl font-bold text-white" style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }} viewport={{ once: true }}>
            Alles in einem eleganten Dashboard
          </motion.h2>
        </div>
        <div className="relative max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, scale: 0.85, y: 40 }} whileInView={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0, 0, 0.2, 1] }} viewport={{ once: true }}
            style={{ borderRadius: 12, overflow: 'visible', boxShadow: '0 40px 100px rgba(0,0,0,0.6)', position: 'relative' }}>
            <div style={{ background: '#2D1018', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ background: '#1C0A0F', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', gap: 5 }}>
                  {['#C0392B','#E67E22','#27AE60'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />)}
                </div>
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 4, height: 20, display: 'flex', alignItems: 'center', paddingLeft: 8 }}>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>vinora.app/dashboard</span>
                </div>
              </div>
              <div style={{ background: '#FAFAF7', minHeight: 280, position: 'relative', display: 'flex' }}>
                <div style={{ width: 60, background: '#1C0A0F', height: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 16, gap: 10 }}>
                  {['#C9A84C','rgba(255,255,255,0.2)','rgba(255,255,255,0.2)','rgba(255,255,255,0.2)'].map((bg, i) => (
                    <div key={i} style={{ width: 32, height: 32, borderRadius: 8, background: bg, opacity: i === 0 ? 1 : 0.5 }} />
                  ))}
                </div>
                <div style={{ flex: 1, padding: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#1C0A0F', marginBottom: 12, fontFamily: 'Playfair Display, Georgia, serif' }}>Kunden-Dashboard</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
                    {([['#6B2737','10','Kunden'],['#C9A84C','21.359€','Umsatz'],['#27AE60','3','Aktionen']] as [string,string,string][]).map(([color,val,lbl]) => (
                      <div key={lbl} style={{ background: 'white', borderRadius: 8, padding: '8px 10px', borderTop: `3px solid ${color}`, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#1C0A0F', lineHeight: 1.2 }}>{val}</div>
                        <div style={{ fontSize: 9, color: '#8B6070', marginTop: 2 }}>{lbl}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 9, fontWeight: 600, color: '#8B6070', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Segmente</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
                    {(['Top-Kunde','Loyal','Gefährdet','Wachsend'] as const).map((seg, i) => (
                      <div key={seg} style={{ background: ['#FFF3CD','#C6EFCE','#FFCCCC','#D4EDDA'][i], borderRadius: 6, padding: '6px 8px', fontSize: 9, fontWeight: 600, color: '#1C0A0F', textAlign: 'center' }}>{seg}</div>
                    ))}
                  </div>
                  <div style={{ marginTop: 14, display: 'flex', alignItems: 'flex-end', gap: 4, height: 48 }}>
                    {[60,80,45,90,70,55,85,40,75,95].map((h, i) => (
                      <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: 2, background: i === 9 ? '#C9A84C' : 'rgba(107,39,55,0.25)' }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
          {floatingLabels.map(({ label, value, pos, delay }) => (
            <motion.div key={label} style={{ position: 'absolute', ...pos, background: 'white', borderRadius: 8, padding: '6px 12px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', zIndex: 10, whiteSpace: 'nowrap' }}
              initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay, duration: 0.4, type: 'spring', stiffness: 200 }} viewport={{ once: true }}>
              <div style={{ fontSize: 10, color: '#8B6070' }}>{label}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1C0A0F' }}>{value}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Testimonial() {
  return (
    <section className="py-24 px-6 relative overflow-hidden" style={{ background: '#1C0A0F' }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(ellipse at 30% 50%, rgba(107,39,55,0.25) 0%, transparent 60%), radial-gradient(ellipse at 70% 50%, rgba(201,168,76,0.07) 0%, transparent 60%)' }} aria-hidden />
      <div className="max-w-3xl mx-auto text-center relative z-10">
        <motion.div className="text-9xl leading-none mb-2 select-none"
          style={{ fontFamily: 'Playfair Display, Georgia, serif', color: '#C9A84C', lineHeight: '0.7', opacity: 0.3 }}
          initial={{ x: -60, opacity: 0 }} whileInView={{ x: 0, opacity: 0.3 }}
          transition={{ duration: 0.6, ease: [0, 0, 0.2, 1] }} viewport={{ once: true }} aria-hidden>
          &ldquo;
        </motion.div>
        <motion.blockquote className="text-xl md:text-2xl font-medium leading-relaxed mb-8 mt-4"
          style={{ fontFamily: 'Playfair Display, Georgia, serif', color: 'rgba(255,255,255,0.9)' }}
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }} viewport={{ once: true }}>
          Vinora hat uns gezeigt, dass 3 unserer Top-Kunden kurz vor dem Abwandern waren. Mit der KI-Maßnahme haben wir alle 3 zurückgewonnen – Umsatzsteigerung in einem Monat:{' '}
          <span style={{ color: '#C9A84C' }}>+18%.</span>
        </motion.blockquote>
        <div className="flex justify-center gap-1 mb-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <motion.svg key={i} width="18" height="18" viewBox="0 0 24 24" fill="#C9A84C" stroke="#C9A84C" strokeWidth={1}
              initial={{ opacity: 0, scale: 0 }} whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1, type: 'spring', stiffness: 300 }} viewport={{ once: true }}>
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </motion.svg>
          ))}
        </div>
        <motion.div className="flex items-center justify-center gap-3" initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }} viewport={{ once: true }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ background: 'linear-gradient(135deg, #6B2737, #8B3348)', color: '#E8C96A' }}>ML</div>
          <div className="text-left">
            <p className="text-sm font-semibold text-white">Markus Lehmann</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>Weingut Lehmann, Rheinhessen</p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function Pricing() {
  const features = [
    'Unbegrenzte Kunden & CSV-Importe', 'RFM+CLV Segmentierung & Analyse',
    'KI-Marketing mit Claude API', 'Feedback-Loop & Tracking',
    'Eventkalender & Kunden-Matching', 'Anpassbare Nachrichtenvorlagen', 'JSON/CSV Export',
  ]
  return (
    <section id="preise" className="py-32 px-6" style={{ background: '#FAFAF7' }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <SectionLabel>Preise</SectionLabel>
          <motion.h2 className="text-4xl md:text-5xl font-bold" style={{ fontFamily: 'Playfair Display, Georgia, serif', color: '#1C0A0F' }}
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }} viewport={{ once: true }}>
            Transparent. Keine versteckten Kosten.
          </motion.h2>
        </div>
        <div className="flex justify-center">
          <motion.div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full" style={{ border: '2px solid #C9A84C' }}
            initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }} viewport={{ once: true }}>
            <div className="flex justify-center mb-6">
              <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase"
                style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C96A)', color: '#1C0A0F' }}>Beliebtester Plan</span>
            </div>
            <h3 className="text-2xl font-bold text-center mb-1" style={{ fontFamily: 'Playfair Display, Georgia, serif', color: '#1C0A0F' }}>Vinora Pro</h3>
            <div className="text-center mb-2">
              <span className="text-6xl font-bold" style={{ fontFamily: 'Playfair Display, Georgia, serif', color: '#1C0A0F' }}>€79</span>
              <span className="text-base font-medium ml-1" style={{ color: '#8B6070' }}>/ Monat</span>
            </div>
            <p className="text-center text-sm mb-8" style={{ color: '#8B6070' }}>Alles inklusive – kein Jahresabo nötig</p>
            <div className="border-t mb-8" style={{ borderColor: 'rgba(201,168,76,0.2)' }} />
            <ul className="space-y-3 mb-8">
              {features.map((feat, i) => (
                <motion.li key={feat} className="flex items-center gap-3 text-sm" style={{ color: '#1C0A0F' }}
                  initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.35 }} viewport={{ once: true }}>
                  <CheckCircle size={17} strokeWidth={2} style={{ color: '#C9A84C', flexShrink: 0 }} />{feat}
                </motion.li>
              ))}
            </ul>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link href="/login" className="block w-full text-center py-4 rounded-2xl font-bold text-base transition-opacity hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #6B2737, #8B3348)', color: 'white', boxShadow: '0 6px 24px rgba(107,39,55,0.3)' }}>
                Jetzt kostenlos testen →
              </Link>
            </motion.div>
            <p className="text-center text-xs mt-4" style={{ color: '#8B6070' }}>14 Tage kostenlos, danach €79/Monat. Jederzeit kündbar.</p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

function CtaSection() {
  return (
    <section className="py-24 px-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #6B2737 0%, #1C0A0F 60%, #6B2737 100%)' }}>
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(201,168,76,0.2) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} aria-hidden />
      <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(201,168,76,0.1) 0%, transparent 70%)', transform: 'translate(-30%, 30%)' }} aria-hidden />
      <div className="max-w-3xl mx-auto text-center relative z-10">
        <motion.h2 className="text-4xl md:text-5xl font-bold text-white mb-6" style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }} viewport={{ once: true }}>
          Bereit, dein Weingut auf das nächste Level zu bringen?
        </motion.h2>
        <motion.p className="text-lg mb-10 max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.7)' }}
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.5 }} viewport={{ once: true }}>
          Lade deine ersten Kundendaten hoch und sieh in Minuten, wer deine besten Kunden sind.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }} viewport={{ once: true }}
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="inline-block">
          <Link href="/login" className="inline-flex items-center gap-2 px-10 py-4 rounded-full font-bold text-base transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C96A)', color: '#1C0A0F' }}>
            <motion.span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
              animate={{ boxShadow: ['0 0 0 0 rgba(201,168,76,0.4)','0 0 0 20px rgba(201,168,76,0)','0 0 0 0 rgba(201,168,76,0)'] }}
              transition={{ repeat: Infinity, duration: 2 }}>
              Kostenlos starten <ArrowRight size={18} strokeWidth={2.5} />
            </motion.span>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="py-12 px-6" style={{ background: '#0D0507' }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C96A)' }}>
              <Wine size={15} color="#1C0A0F" strokeWidth={2.2} />
            </div>
            <span className="text-white text-base font-bold" style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>Vinora</span>
          </div>
          <nav className="flex items-center gap-6">
            {[{ label: 'Impressum', href: '#' }, { label: 'Datenschutz', href: '#' }, { label: 'Kontakt', href: '#' }].map(link => (
              <a key={link.label} href={link.href} className="text-xs font-medium transition-colors duration-200" style={{ color: 'rgba(255,255,255,0.35)' }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#C9A84C')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.35)')}>
                {link.label}
              </a>
            ))}
          </nav>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>Vinora © 2026 · Simon × Youssif × Marco</p>
        </div>
      </div>
    </footer>
  )
}

export default function LandingPage() {
  return (
    <div suppressHydrationWarning>
      <Nav />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <DashboardPreview />
        <Testimonial />
        <Pricing />
        <CtaSection />
      </main>
      <Footer />
    </div>
  )
}

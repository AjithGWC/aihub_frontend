import { useEffect, useState, useRef } from 'react'
import {
  Activity,
  Zap,
  Users,
  RefreshCw,
  Clock,
  TrendingUp,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Cpu,
  BarChart3,
  ArrowUpRight,
  ShieldCheck,
  Server,
  ArrowLeft,
  Crown
} from 'lucide-react'
import { api } from '@/api'
import type { AuditLogEntry } from '../types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

/* ─── Animated Ring Gauge Component ─── */
interface RingGaugeProps {
  value: number
  max: number
  label: string
  sublabel: string
  color: string
  glow: string
  icon: React.ElementType
  delay?: number
  unit?: string
}

function RingGauge({ value, max, label, sublabel, color, glow, icon: Icon, delay = 0, unit = '' }: RingGaugeProps) {
  const [drawn, setDrawn] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const r = 44
  const circumference = 2 * Math.PI * r
  const pct = Math.min(value / max, 1)
  const offset = circumference * (1 - pct)

  useEffect(() => {
    const t = setTimeout(() => setDrawn(true), delay + 200)
    return () => clearTimeout(t)
  }, [delay])

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  return (
    <div
      onMouseMove={handleMouseMove}
      className="spotlight-card motion-spring-card animate-float-slow rounded-2xl p-4 flex flex-col items-center justify-between gap-3 relative overflow-hidden group shadow-lg border-slate-200 transition-all duration-300 hover:-translate-y-2 hover:scale-[1.03] hover:shadow-2xl cursor-pointer"
      style={{
        animationDelay: `${delay * 6}ms`,
        background: `radial-gradient(circle 220px at var(--mouse-x, 50%) var(--mouse-y, 30%), ${color}25, transparent 75%), linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)`,
        border: `1.5px solid ${color}50`,
        borderTop: `4px solid ${color}`,
        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)'
      }}
    >
      <div className="scanner-sweep-line" />
      <div className="absolute -right-4 -bottom-4 size-20 rounded-full blur-xl opacity-35 animate-float-gentle pointer-events-none" style={{ background: color }} />

      {/* Shimmer sweep effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

      {/* Top status indicator pill */}
      <div className="w-full flex items-center justify-between text-[10px] font-extrabold z-10">
        <Badge variant="outline" className="px-2 py-0.5 rounded-full font-mono text-[9.5px] border-slate-200 bg-slate-100 text-slate-700 shadow-xs">
          HEALTHY
        </Badge>
        <span className="flex items-center gap-1 font-mono font-extrabold" style={{ color }}>
          <span className="size-1.5 rounded-full animate-ping" style={{ background: color }} />
          LIVE
        </span>
      </div>

      {/* Center SVG Ring Gauge */}
      <div className="relative flex items-center justify-center my-1 z-10">
        <svg width="114" height="114" className="-rotate-90">
          {/* Dual spinning dashed orbit rings */}
          <circle
            cx="57" cy="57" r="52"
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeDasharray="4 6"
            opacity="0.4"
            className="animate-spin"
            style={{ animationDuration: '12s' }}
          />
          <circle
            cx="57" cy="57" r="36"
            fill="none"
            stroke={color}
            strokeWidth="1"
            strokeDasharray="2 4"
            opacity="0.25"
            className="animate-spin"
            style={{ animationDuration: '7s', animationDirection: 'reverse' }}
          />

          {/* Track ring */}
          <circle cx="57" cy="57" r={r} fill="none" stroke="rgba(226, 232, 240, 0.8)" strokeWidth="8" />

          {/* Animated main arc */}
          <circle
            cx="57" cy="57" r={r}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={drawn ? offset : circumference}
            style={{
              transition: `stroke-dashoffset 1.4s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
              filter: `drop-shadow(0 0 6px ${color}66)`
            }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute flex flex-col items-center justify-center">
          <Icon className="size-4 mb-0.5 icon-spring transition-transform group-hover:scale-125 duration-300" style={{ color }} />
          <span className="text-2xl font-black font-mono leading-none tracking-tight text-slate-900 transition-transform duration-300 group-hover:scale-105">
            {value}{unit}
          </span>
        </div>
      </div>

      {/* High-Contrast Bottom Labels */}
      <div className="text-center z-10 w-full pt-1">
        <p className="text-xs font-black uppercase tracking-widest text-slate-900 group-hover:text-[#0891b2] transition-colors">{label}</p>
        <p className="text-[11px] text-slate-600 font-semibold mt-0.5 truncate">{sublabel}</p>
      </div>
    </div>
  )
}

/* ─── Activity Timeline Item ─── */
function TimelineEvent({ event, delay }: { event: AuditLogEntry; delay: number }) {
  const isPassed = event.outcome === 'passed'
  const isDenied = event.outcome === 'denied'
  const StatusIcon = isPassed ? CheckCircle2 : isDenied ? AlertCircle : XCircle
  const dotColor = isPassed ? '#22c55e' : isDenied ? '#f59e0b' : '#f43f5e'
  const bgColor = isPassed ? 'rgba(34,197,94,0.1)' : isDenied ? 'rgba(245,158,11,0.1)' : 'rgba(244,63,94,0.1)'
  const borderColor = isPassed ? 'rgba(34,197,94,0.3)' : isDenied ? 'rgba(245,158,11,0.3)' : 'rgba(244,63,94,0.3)'

  function handleNavigateAudit() {
    window.dispatchEvent(new CustomEvent('hexagon-hub-select-sector', { detail: 'audit' }))
  }

  const actorName = event.actorEmail || 'System'
  const initial = actorName.charAt(0).toUpperCase()

  return (
    <div
      onClick={handleNavigateAudit}
      className="flex items-center gap-3 animate-slide-left group cursor-pointer relative"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Node Badge Circle (solid background perfectly covers vertical track line behind it) */}
      <div className="flex flex-col items-center flex-none z-10 relative">
        <div
          className="relative flex items-center justify-center size-7 rounded-full bg-white transition-all duration-300 group-hover:scale-125 shadow-2xs"
          style={{
            background: '#ffffff',
            border: `2px solid ${dotColor}`,
            boxShadow: `0 0 10px ${dotColor}35`
          }}
        >
          {/* Internal Pulse Ring */}
          <div
            className="size-2.5 rounded-full animate-ping absolute opacity-30 pointer-events-none"
            style={{ background: dotColor }}
          />

          {/* Status Icon */}
          <StatusIcon className="size-3.5 relative z-10 transition-transform group-hover:scale-110" style={{ color: dotColor }} />
        </div>
      </div>

      {/* Clean Horizontal Connector Arm */}
      <div
        className="w-4 h-[1.5px] flex-none z-0 relative overflow-hidden rounded-full -mx-0.5"
        style={{ background: `linear-gradient(90deg, ${dotColor}, ${dotColor}30)` }}
      >
        <div
          className="absolute inset-y-0 w-2 rounded-full animate-comet-slide"
          style={{
            background: '#ffffff',
            boxShadow: `0 0 6px ${dotColor}`,
            animationDuration: '2s'
          }}
        />
      </div>

      {/* Main Event Content Card */}
      <div
        className="flex-1 min-w-0 rounded-2xl px-4 py-2.5 transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-0.5 border-slate-200/90 group-hover:border-slate-300 shadow-2xs group-hover:shadow-md relative overflow-hidden bg-white/90 backdrop-blur-md"
        style={{
          borderLeft: `3.5px solid ${dotColor}`,
          boxShadow: '0 3px 12px rgba(15, 23, 42, 0.03)'
        }}
      >
        {/* Subtle background hover glow */}
        <div
          className="absolute -right-6 -bottom-6 size-24 rounded-full blur-xl opacity-0 group-hover:opacity-15 transition-opacity duration-500 pointer-events-none"
          style={{ background: dotColor }}
        />

        {/* Top Line: Event Name + Outcome Badge */}
        <div className="flex items-center justify-between gap-2 z-10 relative">
          <span className="text-[12px] font-black font-mono text-slate-900 group-hover:text-blue-600 transition-colors truncate">
            {event.event}
          </span>

          <Badge
            variant="outline"
            className="text-[9.5px] px-2.5 py-0.5 font-mono font-extrabold flex-none capitalize tracking-wider flex items-center gap-1.5 shadow-2xs transition-transform group-hover:scale-105"
            style={{ borderColor, color: dotColor, background: bgColor }}
          >
            <span className="size-1.5 rounded-full animate-ping" style={{ background: dotColor }} />
            {event.outcome}
          </Badge>
        </div>

        {/* Bottom Line: Actor Avatar + Email + Timestamp + Layer */}
        <div className="flex items-center justify-between gap-2 mt-1.5 text-[11px] text-slate-600 font-mono z-10 relative flex-wrap">
          <div className="flex items-center gap-1.5 truncate">
            <span
              className="size-4 rounded-full flex items-center justify-center text-[9px] font-black text-white flex-none"
              style={{ background: `linear-gradient(135deg, ${dotColor}, #3b82f6)` }}
            >
              {initial}
            </span>
            <span className="truncate font-bold text-slate-800">{actorName}</span>
          </div>

          <div className="flex items-center gap-2 flex-none text-[10px]">
            <span className="flex items-center gap-1 text-slate-500 font-medium">
              <Clock className="size-3 text-slate-400" />
              {new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="text-slate-300">•</span>
            <span className="uppercase border border-slate-200 px-1.5 py-0.2 rounded text-slate-700 bg-slate-100 font-extrabold text-[9px]">
              {event.layer}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Quick Shortcut Tile ─── */
interface QuickTileProps {
  label: string
  color: string
  sublabel: string
  icon: React.ElementType
  sectorKey: string
  isActive: boolean
  stepNumber: number
  onHover: () => void
}

function QuickTile({ label, color, sublabel, icon: Icon, sectorKey, isActive, stepNumber, onHover }: QuickTileProps) {
  function handleClick() {
    window.dispatchEvent(new CustomEvent('hexagon-hub-select-sector', { detail: sectorKey }))
  }

  return (
    <button
      onClick={handleClick}
      onMouseEnter={onHover}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`)
        e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`)
      }}
      className={`spotlight-card motion-spring-card flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl transition-all duration-500 group relative overflow-hidden cursor-pointer bg-white ${
        isActive
          ? 'z-20 -translate-y-1.5 scale-[1.03] shadow-lg'
          : 'z-10 hover:-translate-y-0.5 hover:scale-[1.01] shadow-xs'
      }`}
      style={{
        background: isActive
          ? `radial-gradient(circle 180px at var(--mouse-x, 50%) var(--mouse-y, 20%), ${color}08, #ffffff 85%)`
          : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        border: isActive ? `1.5px solid ${color}60` : '1px solid rgba(226, 232, 240, 0.8)',
        borderTop: `2.5px solid ${color}`,
        boxShadow: isActive
          ? `0 10px 24px -4px rgba(15, 23, 42, 0.08), 0 0 12px ${color}15`
          : '0 2px 8px rgba(15, 23, 42, 0.03)'
      }}
    >
      <div className="scanner-sweep-line opacity-40" />
      
      {/* Soft subtle corner glow */}
      <div
        className={`absolute -right-4 -bottom-4 size-16 rounded-full blur-xl pointer-events-none transition-opacity duration-500 ${
          isActive ? 'opacity-15 scale-110' : 'opacity-0'
        }`}
        style={{ background: color }}
      />

      {/* Active Top Step Badge */}
      <div className="w-full flex items-center justify-between text-[9px] font-mono font-extrabold z-10">
        <span
          className={`px-1.5 py-0.2 rounded-full border transition-all duration-300 ${
            isActive
              ? 'bg-slate-100 text-slate-800 border-slate-300 shadow-2xs'
              : 'bg-slate-50 text-slate-400 border-slate-200'
          }`}
        >
          0{stepNumber}
        </span>
        {isActive && (
          <span className="flex items-center gap-1 text-[8.5px] font-mono font-extrabold" style={{ color }}>
            <span className="size-1.5 rounded-full animate-ping" style={{ background: color }} />
            ACTIVE
          </span>
        )}
      </div>

      {/* Rotating Circle Container */}
      <div className="relative flex items-center justify-center size-14 flex-none my-0.5 z-10">
        {/* Soft Background Radial Glow Pulse */}
        <div
          className={`absolute inset-1 rounded-full pointer-events-none blur-xs transition-all duration-500 ${
            isActive ? 'animate-pulse opacity-15' : 'opacity-0'
          }`}
          style={{ background: color }}
        />

        {/* Outer Clockwise Rotating Dashed Orbit Ring */}
        <svg
          viewBox="0 0 56 56"
          className="absolute inset-0 size-full pointer-events-none animate-spin"
          style={{ animationDuration: isActive ? '2s' : '10s' }}
        >
          <circle
            cx="28"
            cy="28"
            r="25"
            fill="none"
            stroke={color}
            strokeWidth={isActive ? '1.5' : '1'}
            strokeDasharray={isActive ? '5 5' : '3 6'}
            opacity={isActive ? '0.7' : '0.35'}
          />
        </svg>

        {/* Inner Counter-Clockwise Rotating Orbit Ring */}
        <svg
          viewBox="0 0 56 56"
          className="absolute inset-0 size-full pointer-events-none animate-spin"
          style={{ animationDuration: isActive ? '1.4s' : '7s', animationDirection: 'reverse' }}
        >
          <circle
            cx="28"
            cy="28"
            r="20"
            fill="none"
            stroke={color}
            strokeWidth="1"
            strokeDasharray="2 4"
            opacity={isActive ? '0.5' : '0.25'}
          />
        </svg>

        {/* Orbiting Glowing Particle Dot */}
        <div
          className="absolute inset-0 pointer-events-none animate-spin"
          style={{ animationDuration: isActive ? '1.4s' : '5s' }}
        >
          <div
            className={`rounded-full absolute top-[2px] left-[27px] transition-all duration-300 ${
              isActive ? 'size-2 scale-110' : 'size-1.5'
            }`}
            style={{
              background: color,
              boxShadow: isActive ? `0 0 6px ${color}` : 'none'
            }}
          />
        </div>

        {/* Center Circular Icon Badge */}
        <div
          className={`size-10 rounded-full flex items-center justify-center transition-all duration-500 shadow-xs relative z-10 ${
            isActive ? 'scale-105 rotate-3 shadow-sm' : 'group-hover:scale-105'
          }`}
          style={{
            background: isActive ? `${color}12` : `${color}0a`,
            border: isActive ? `1.5px solid ${color}40` : `1px solid ${color}25`,
            boxShadow: isActive ? `0 0 10px ${color}15` : 'none'
          }}
        >
          <Icon className={`size-4.5 icon-spring transition-transform duration-300 ${isActive ? 'scale-105' : ''}`} style={{ color }} />
        </div>
      </div>

      {/* Label and Sublabel */}
      <div className="text-center z-10 relative">
        <span
          className={`text-[11.5px] font-black uppercase tracking-widest transition-colors block ${
            isActive ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-900'
          }`}
        >
          {label}
        </span>
        <span className="text-[9.5px] font-bold text-slate-500 font-mono block mt-0.5">
          {sublabel}
        </span>
      </div>
    </button>
  )
}

const RING_DATA = [
  { label: 'Req / sec', sublabel: 'Gateway throughput', value: 43, max: 100, unit: '', color: '#3b82f6', glow: 'rgba(59,130,246,0.7)', icon: Zap, delay: 0 },
  { label: 'Cache Hit', sublabel: 'Provider cache layer', value: 61, max: 100, unit: '%', color: '#06b6d4', glow: 'rgba(6,182,212,0.7)', icon: Activity, delay: 120 },
  { label: 'Latency', sublabel: 'Avg inference ms', value: 142, max: 400, unit: 'ms', color: '#a855f7', glow: 'rgba(168,85,247,0.7)', icon: TrendingUp, delay: 240 },
  { label: 'Active Users', sublabel: 'Concurrent sessions', value: 128, max: 500, unit: '', color: '#22c55e', glow: 'rgba(34,197,94,0.7)', icon: Users, delay: 360 },
]

const QUICK_TILES = [
  { label: 'Users', sublabel: 'Directory', icon: Users, color: '#06b6d4', sectorKey: 'users' },
  { label: 'API Keys', sublabel: 'AES Vault', icon: Zap, color: '#f97316', sectorKey: 'apikeys' },
  { label: 'Models', sublabel: 'Registry', icon: Cpu, color: '#f59e0b', sectorKey: 'models' },
  { label: 'Audit Log', sublabel: 'Telemetry', icon: BarChart3, color: '#22c55e', sectorKey: 'audit' },
]

/* ─── Quick Access Container with Sequential Auto-Rotating Cards ─── */
function QuickAccessWidget() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)

  useEffect(() => {
    if (!isPlaying) return
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % QUICK_TILES.length)
    }, 2000)
    return () => clearInterval(interval)
  }, [isPlaying])

  return (
    <div
      onMouseEnter={() => setIsPlaying(false)}
      onMouseLeave={() => setIsPlaying(true)}
      className="rounded-2xl p-4 shadow-lg border-slate-200 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #ffffff, #f8fafc)',
        border: '1.5px solid rgba(59, 130, 246, 0.3)',
        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)'
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
          <Zap className="size-3.5 text-[#3b82f6]" />
          Quick Access
        </h2>

        {/* Sequential Step Progress & Auto-Play Control */}
        <div className="flex items-center gap-2 z-10">
          <div className="flex items-center gap-1">
            {QUICK_TILES.map((t, idx) => (
              <button
                key={t.label}
                onClick={() => setActiveIndex(idx)}
                title={`Rotate to ${t.label}`}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  activeIndex === idx ? 'w-5' : 'w-1.5 opacity-40 hover:opacity-80'
                }`}
                style={{ background: activeIndex === idx ? t.color : '#94a3b8' }}
              />
            ))}
          </div>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="text-[9.5px] font-mono font-extrabold px-2 py-0.5 rounded-full border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            {isPlaying ? '⏸ Cycle' : '▶ Play'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 relative">
        {QUICK_TILES.map((tile, i) => (
          <QuickTile
            key={tile.label}
            {...tile}
            stepNumber={i + 1}
            isActive={activeIndex === i}
            onHover={() => setActiveIndex(i)}
          />
        ))}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [auditEvents, setAuditEvents] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const timelineRef = useRef<HTMLDivElement>(null)

  function fetchAuditLogs() {
    setRefreshing(true)
    api
      .get('/audit-log')
      .then(({ data }: { data: any }) => {
        const events = data?.events ?? data?.logs ?? (Array.isArray(data) ? data : [])
        setAuditEvents(events)
      })
      .catch(() => setAuditEvents([]))
      .finally(() => {
        setLoading(false)
        setRefreshing(false)
      })
  }

  useEffect(() => {
    fetchAuditLogs()
  }, [])

  return (
    <div className="page sector-blue space-y-6 animate-slide-up">
      {/* Header */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-[#3b82f6]/40 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="cyber-pulse-dot cyber-pulse-dot-blue" />
            <h1 className="text-2xl font-black tracking-tight sector-header-title">
              Platform Overview
            </h1>
            <Badge variant="outline" className="sector-badge text-xs font-mono font-bold flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-ping" />
              Gateway Online • 99.98% Uptime
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-700 font-bold">
            Live health telemetry across inference routing, provider rate limits, and administrative events.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.dispatchEvent(new CustomEvent('hexagon-hub-back'))}
            className="border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 font-extrabold shadow-sm cursor-pointer"
          >
            <ArrowLeft className="size-3.5 mr-1" />
            All Sectors
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchAuditLogs}
            disabled={refreshing}
            className="gap-2 border-[#3b82f6]/50 bg-[#3b82f6]/10 hover:bg-[#3b82f6]/25 transition-all text-[#2563eb] font-extrabold shadow-md cursor-pointer"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Stream
          </Button>
        </div>
      </header>

      {/* Ring Gauges */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {RING_DATA.map((ring) => (
          <RingGauge key={ring.label} {...ring} />
        ))}
      </div>

      {/* Bottom grid: Timeline + Quick Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Timeline */}
        <div
          className="lg:col-span-2 rounded-2xl p-5 shadow-lg border-slate-200/80 backdrop-blur-md"
          style={{
            background: 'rgba(255, 255, 255, 0.45)',
            border: '1.5px solid rgba(59, 130, 246, 0.25)',
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)'
          }}
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Activity className="size-4 text-[#3b82f6] animate-pulse" />
                Live Audit Stream
              </h2>
              <p className="text-[11px] text-slate-600 mt-0.5 font-bold">Realtime security decision telemetry</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] font-mono font-extrabold text-slate-800 bg-slate-100 border-slate-300 px-2.5 py-0.5">
                {auditEvents.length} events
              </Badge>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('hexagon-hub-select-sector', { detail: 'audit' }))}
                className="text-xs font-extrabold text-[#2563eb] hover:text-[#1d4ed8] flex items-center gap-1 cursor-pointer transition-colors"
              >
                View Stream →
              </button>
            </div>
          </div>

          <div ref={timelineRef} className="relative space-y-0">
            {/* Animated vertical track line perfectly centered behind 28px node circles (at left 13px) */}
            {auditEvents.length > 0 && (
              <>
                <div
                  className="absolute left-[13px] top-3 bottom-3 w-[2px] rounded-full z-0 pointer-events-none"
                  style={{
                    background: 'linear-gradient(to bottom, #22c55e 0%, #3b82f6 50%, #a855f7 100%)',
                    boxShadow: '0 0 8px rgba(34, 197, 94, 0.4)',
                    animation: 'timelineDraw 1.2s ease-out 0.2s both'
                  }}
                />
                <div
                  className="absolute left-[13px] w-0.5 h-8 rounded-full z-0 pointer-events-none animate-comet-slide"
                  style={{
                    background: 'linear-gradient(to bottom, transparent, #22c55e, #ffffff)',
                    boxShadow: '0 0 14px #22c55e, 0 0 24px #3b82f6',
                  }}
                />
              </>
            )}

            <div className="space-y-3.5 pl-0 relative z-10">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-lg bg-slate-100 animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
                ))
              ) : auditEvents.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-600 flex flex-col items-center gap-2 font-medium">
                  <CheckCircle2 className="size-8 text-slate-400" />
                  No audit events recorded yet.
                </div>
              ) : (
                auditEvents.slice(0, 6).map((e, idx) => (
                  <TimelineEvent key={e.id} event={e} delay={idx * 80} />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right column: Quick Tiles + Status */}
        <div className="flex flex-col gap-4">
          {/* Quick Access */}
          <QuickAccessWidget />

          {/* System health strip */}
          <div
            className="rounded-2xl p-4 space-y-3 shadow-lg border-slate-200"
            style={{
              background: 'linear-gradient(135deg, #ffffff, #f8fafc)',
              border: '1.5px solid rgba(59, 130, 246, 0.3)',
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)'
            }}
          >
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
              <Cpu className="size-3.5 text-[#3b82f6]" />
              System Status
            </h2>
            {[
              { label: 'API Gateway', pct: 98, lat: '12ms', color: '#22c55e' },
              { label: 'Model Router', pct: 87, lat: '45ms', color: '#3b82f6' },
              { label: 'Auth Service', pct: 100, lat: '4ms', color: '#22c55e' },
              { label: 'Key Vault', pct: 94, lat: '18ms', color: '#06b6d4' },
            ].map(({ label, pct, lat, color }, i) => (
              <div key={label} className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-800 font-extrabold flex items-center gap-1.5">
                    <span className="size-2 rounded-full animate-ping" style={{ background: color }} />
                    {label}
                  </span>
                  <span style={{ color }} className="font-mono font-extrabold">{pct}% <span className="text-[9.5px] text-slate-500 font-normal">({lat})</span></span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100 border border-slate-300 overflow-hidden relative">
                  <div
                    className="h-full rounded-full transition-all relative overflow-hidden"
                    style={{
                      width: 0,
                      background: `linear-gradient(90deg, ${color}bb, ${color})`,
                      boxShadow: `0 0 10px ${color}aa`,
                      transition: `width 1.2s cubic-bezier(0.16, 1, 0.3, 1) ${i * 100 + 400}ms`,
                    }}
                    ref={(el) => {
                      if (el) setTimeout(() => { el.style.width = `${pct}%` }, 50)
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Stats summary 4-grid */}
          <div
            className="rounded-2xl p-4 shadow-lg border-slate-200"
            style={{
              background: 'linear-gradient(135deg, #ffffff, #f8fafc)',
              border: '1.5px solid rgba(59, 130, 246, 0.3)',
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)'
            }}
          >
            <div className="grid grid-cols-2 gap-3 text-center">
              {[
                { label: 'Providers', value: '5', icon: ArrowUpRight, color: '#f97316', sectorKey: 'models' },
                { label: 'Models', value: '12', icon: Cpu, color: '#f59e0b', sectorKey: 'models' },
                { label: 'Req Today', value: '48k', icon: TrendingUp, color: '#3b82f6', sectorKey: 'audit' },
                { label: 'Errors', value: '0.2%', icon: AlertCircle, color: '#f43f5e', sectorKey: 'audit' },
              ].map(({ label, value, icon: Icon, color, sectorKey }) => (
                <div
                  key={label}
                  onClick={() => window.dispatchEvent(new CustomEvent('hexagon-hub-select-sector', { detail: sectorKey }))}
                  className="spotlight-card rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-pointer group relative overflow-hidden"
                  style={{
                    background: `radial-gradient(circle at 90% 10%, ${color}15, transparent 65%), linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)`,
                    border: `1.5px solid ${color}40`,
                    borderTop: `3px solid ${color}`
                  }}
                >
                  {/* Shimmer overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

                  <div className="size-8 rounded-lg flex items-center justify-center text-white transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 shadow-xs" style={{ background: color, boxShadow: `0 0 12px ${color}44` }}>
                    <Icon className="size-4 text-white" />
                  </div>
                  <span className="text-xl font-black font-mono text-slate-900 transition-transform duration-300 group-hover:scale-105 group-hover:translate-x-0.5">{value}</span>
                  <span className="text-[9.5px] font-black uppercase tracking-widest text-slate-600 group-hover:text-slate-900 transition-colors">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

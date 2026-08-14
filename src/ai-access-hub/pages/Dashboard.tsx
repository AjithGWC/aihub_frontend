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
  Server
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
  const r = 44
  const circumference = 2 * Math.PI * r
  const pct = Math.min(value / max, 1)
  const offset = circumference * (1 - pct)

  useEffect(() => {
    const t = setTimeout(() => setDrawn(true), delay + 200)
    return () => clearTimeout(t)
  }, [delay])

  return (
    <div
      className="spotlight-card card-hover-lift rounded-2xl flex flex-col items-center justify-between p-5 animate-stagger-1 group relative overflow-hidden shadow-lg border-slate-200 transition-all duration-300 hover:shadow-xl"
      style={{
        animationDelay: `${delay}ms`,
        background: `radial-gradient(circle at 50% 0%, ${color}10, transparent 75%), linear-gradient(135deg, #ffffff, #f8fafc)`,
        border: `1.5px solid rgba(226, 232, 240, 0.9)`,
        borderTop: `4px solid ${color}`,
        boxShadow: `0 8px 24px rgba(15, 23, 42, 0.06), 0 0 16px ${color}12`,
        minHeight: '210px'
      }}
    >
      {/* Top status indicator pill */}
      <div className="w-full flex items-center justify-between text-[10px] font-extrabold">
        <Badge variant="outline" className="px-2 py-0.5 rounded-full font-mono text-[9.5px] border-slate-200 bg-slate-100 text-slate-700">
          HEALTHY
        </Badge>
        <span className="flex items-center gap-1 font-mono font-bold" style={{ color }}>
          <span className="size-1.5 rounded-full animate-ping" style={{ background: color }} />
          LIVE
        </span>
      </div>

      {/* Center SVG Ring Gauge */}
      <div className="relative flex items-center justify-center my-1">
        <svg width="114" height="114" className="-rotate-90">
          {/* Spinning dashed orbit ring */}
          <circle
            cx="57" cy="57" r="52"
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeDasharray="4 6"
            opacity="0.35"
            className="animate-spin"
            style={{ animationDuration: '14s' }}
          />

          {/* Light Track ring */}
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
          <Icon className="size-4 mb-0.5 icon-spring transition-transform group-hover:scale-110" style={{ color }} />
          <span className="text-2xl font-black font-mono leading-none tracking-tight text-slate-900">
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
  const bgColor = isPassed ? 'rgba(34,197,94,0.18)' : isDenied ? 'rgba(245,158,11,0.18)' : 'rgba(244,63,94,0.18)'
  const borderColor = isPassed ? 'rgba(34,197,94,0.45)' : isDenied ? 'rgba(245,158,11,0.45)' : 'rgba(244,63,94,0.45)'

  return (
    <div
      className="flex items-start gap-3 animate-slide-left group cursor-pointer"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Dot + ping */}
      <div className="flex flex-col items-center flex-none mt-1">
        <div className="relative flex items-center justify-center size-7 rounded-full transition-transform group-hover:scale-110" style={{ background: bgColor, border: `1.5px solid ${borderColor}`, boxShadow: `0 0 12px ${dotColor}55` }}>
          <StatusIcon className="size-3.5" style={{ color: dotColor }} />
          <span className="absolute inset-0 rounded-full animate-dot-ping" style={{ background: dotColor, opacity: 0.4 }} />
        </div>
      </div>

      {/* Content */}
      <div
        className="flex-1 min-w-0 rounded-xl px-3.5 py-2.5 transition-all duration-200 group-hover:scale-[1.02]"
        style={{
          background: 'linear-gradient(135deg, #ffffff, #f8fafc)',
          border: `1px solid ${borderColor}`,
          borderLeft: `3.5px solid ${dotColor}`,
          boxShadow: '0 4px 15px rgba(15, 23, 42, 0.06)'
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-extrabold font-mono text-slate-900 group-hover:text-[#0284c7] transition-colors truncate">{event.event}</span>
          <Badge variant="outline" className="text-[9px] px-2 py-0.5 font-mono font-bold flex-none capitalize tracking-wider" style={{ borderColor, color: dotColor, background: bgColor }}>
            {event.outcome}
          </Badge>
        </div>
        <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-600 font-mono">
          <span className="truncate font-semibold">{event.actorEmail || 'System'}</span>
          <span className="flex-none text-slate-400">·</span>
          <span className="flex-none font-medium">{new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <span className="flex-none uppercase border border-slate-300 px-1.5 py-0.2 rounded text-slate-700 bg-slate-100 font-bold">{event.layer}</span>
        </div>
      </div>
    </div>
  )
}

/* ─── Quick Shortcut Tile ─── */
function QuickTile({ label, color, icon: Icon, onClick }: { label: string; color: string; glow: string; icon: React.ElementType; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="spotlight-card card-hover-lift magnetic-btn flex flex-col items-center justify-center gap-2.5 p-4 rounded-xl transition-all group relative overflow-hidden shadow-md"
      style={{
        background: `radial-gradient(circle at 50% 0%, ${color}12, transparent 70%), linear-gradient(135deg, #ffffff, #f8fafc)`,
        border: `1.5px solid ${color}35`,
        boxShadow: `0 6px 18px rgba(15, 23, 42, 0.06)`
      }}
    >
      <div className="p-3 rounded-xl transition-transform group-hover:scale-110" style={{ background: `${color}18`, border: `1.5px solid ${color}44` }}>
        <Icon className="size-5 icon-spring" style={{ color }} />
      </div>
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-800">{label}</span>
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
  { label: 'Users', icon: Users, color: '#06b6d4', glow: 'rgba(6,182,212,0.5)' },
  { label: 'API Keys', icon: Zap, color: '#f97316', glow: 'rgba(249,115,22,0.5)' },
  { label: 'Models', icon: Cpu, color: '#f59e0b', glow: 'rgba(245,158,11,0.5)' },
  { label: 'Audit Log', icon: BarChart3, color: '#22c55e', glow: 'rgba(34,197,94,0.5)' },
]

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
            <Badge variant="outline" className="sector-badge text-xs font-mono font-bold">
              Gateway Online • 99.98% Uptime
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-700 font-bold">
            Live health telemetry across inference routing, provider rate limits, and administrative events.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchAuditLogs}
          disabled={refreshing}
          className="gap-2 border-[#3b82f6]/50 bg-[#3b82f6]/10 hover:bg-[#3b82f6]/25 transition-all text-[#60a5fa] font-bold shadow-md magnetic-btn"
        >
          <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Stream
        </Button>
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
          className="lg:col-span-2 rounded-2xl p-5 shadow-lg border-slate-200"
          style={{
            background: 'linear-gradient(135deg, #ffffff, #f8fafc)',
            border: '1.5px solid rgba(59, 130, 246, 0.3)',
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)'
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
            <Badge variant="outline" className="text-[10px] font-mono font-extrabold text-slate-800 bg-slate-100 border-slate-300 px-2.5 py-0.5">
              {auditEvents.length} events
            </Badge>
          </div>

          <div ref={timelineRef} className="relative space-y-0">
            {/* Animated vertical track line */}
            {auditEvents.length > 0 && (
              <div
                className="absolute left-[13px] top-0 bottom-0 w-0.5 rounded-full"
                style={{
                  background: 'linear-gradient(to bottom, #3b82f6, #a855f7, #22c55e)',
                  boxShadow: '0 0 10px rgba(59, 130, 246, 0.4)',
                  animation: 'timelineDraw 1.2s ease-out 0.2s both'
                }}
              />
            )}

            <div className="space-y-3 pl-0">
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
          <div
            className="rounded-2xl p-4 shadow-lg border-slate-200"
            style={{
              background: 'linear-gradient(135deg, #ffffff, #f8fafc)',
              border: '1.5px solid rgba(59, 130, 246, 0.3)',
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)'
            }}
          >
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Zap className="size-3.5 text-[#3b82f6]" />
              Quick Access
            </h2>
            <div className="grid grid-cols-2 gap-2.5">
              {QUICK_TILES.map((tile) => (
                <QuickTile key={tile.label} {...tile} />
              ))}
            </div>
          </div>

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
              { label: 'API Gateway', pct: 98, color: '#22c55e' },
              { label: 'Model Router', pct: 87, color: '#3b82f6' },
              { label: 'Auth Service', pct: 100, color: '#22c55e' },
              { label: 'Key Vault', pct: 94, color: '#06b6d4' },
            ].map(({ label, pct, color }, i) => (
              <div key={label} className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-800 font-bold flex items-center gap-1.5">
                    <span className="size-2 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
                    {label}
                  </span>
                  <span style={{ color }} className="font-mono font-extrabold">{pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 border border-slate-300 overflow-hidden relative">
                  <div
                    className="h-full rounded-full transition-all relative overflow-hidden"
                    style={{
                      width: 0,
                      background: `linear-gradient(90deg, ${color}bb, ${color})`,
                      boxShadow: `0 0 8px ${color}aa`,
                      transition: `width 1.2s cubic-bezier(0.16, 1, 0.3, 1) ${i * 100 + 400}ms`,
                    }}
                    ref={(el) => {
                      if (el) setTimeout(() => { el.style.width = `${pct}%` }, 50)
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Stats summary */}
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
                { label: 'Providers', value: '5', icon: ArrowUpRight, color: '#f97316' },
                { label: 'Models', value: '12', icon: Cpu, color: '#f59e0b' },
                { label: 'Req Today', value: '48k', icon: TrendingUp, color: '#3b82f6' },
                { label: 'Errors', value: '0.2%', icon: AlertCircle, color: '#f43f5e' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="card-hover-lift flex flex-col items-center gap-1 p-2.5 rounded-xl bg-slate-50 border border-slate-200 group cursor-pointer shadow-sm">
                  <Icon className="size-4 icon-spring" style={{ color }} />
                  <span className="text-lg font-black font-mono text-slate-900">{value}</span>
                  <span className="text-[9px] text-slate-600 font-extrabold uppercase tracking-wider">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

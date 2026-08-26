import { useEffect, useState, useRef } from 'react'
import {
  Activity,
  Zap,
  Users,
  RefreshCw,
  TrendingUp,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Cpu,
  BarChart3,
  ArrowUpRight,
  ArrowLeft,
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
  icon: React.ElementType
  delay?: number
  unit?: string
}

function RingGauge({ value, max, label, sublabel, color, icon: Icon, delay = 0, unit = '' }: RingGaugeProps) {
  const [drawn, setDrawn] = useState(false)
  const r = 40
  const circumference = 2 * Math.PI * r
  const pct = Math.min(value / max, 1)
  const offset = circumference * (1 - pct)

  useEffect(() => {
    const t = setTimeout(() => setDrawn(true), delay + 200)
    return () => clearTimeout(t)
  }, [delay])

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm hover:shadow-lg transition-all duration-300 hover:border-primary/30 cursor-pointer flex flex-col"
      style={{ animationDelay: `${delay}ms`, minHeight: '200px' }}
    >
      {/* Subtle color wash in top-right */}
      <div
        className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none opacity-[0.07] blur-2xl transition-opacity duration-300 group-hover:opacity-[0.13]"
        style={{ background: color, transform: 'translate(30%, -30%)' }}
      />

      {/* Top row: label + status pill */}
      <div className="flex items-start justify-between px-5 pt-5 pb-3 z-10">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
          <p className="text-[11px] font-semibold text-muted-foreground/70 mt-0.5 truncate max-w-[120px]">{sublabel}</p>
        </div>
        <span
          className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full border"
          style={{ color, background: `${color}15`, borderColor: `${color}30` }}
        >
          <span className="size-1.5 rounded-full animate-pulse" style={{ background: color }} />
          LIVE
        </span>
      </div>

      {/* Center: Ring + Value */}
      <div className="flex items-center justify-center flex-1 pb-2 z-10">
        <div className="relative flex items-center justify-center">
          <svg width="108" height="108" className="-rotate-90">
            {/* Background track */}
            <circle cx="54" cy="54" r={r} fill="none" stroke="var(--border)" strokeWidth="6" opacity="0.5" />
            {/* Colored fill arc */}
            <circle
              cx="54" cy="54" r={r}
              fill="none"
              stroke={color}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={drawn ? offset : circumference}
              style={{
                transition: `stroke-dashoffset 1.4s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
                filter: `drop-shadow(0 0 6px ${color}66)`,
              }}
            />
          </svg>

          {/* Center value */}
          <div className="absolute flex flex-col items-center justify-center">
            <Icon className="size-3.5 mb-0.5 transition-transform duration-300 group-hover:scale-110" style={{ color }} />
            <span className="text-[22px] font-black font-mono leading-none tracking-tight text-foreground">
              {value}{unit}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom: percent bar */}
      <div className="px-5 pb-5 z-10">
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: drawn ? `${pct * 100}%` : '0%',
              background: color,
              boxShadow: `0 0 8px ${color}66`,
              transitionDelay: `${delay}ms`,
            }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] text-muted-foreground font-medium">0</span>
          <span className="text-[10px] font-black" style={{ color }}>{Math.round(pct * 100)}%</span>
          <span className="text-[10px] text-muted-foreground font-medium">{max}{unit}</span>
        </div>
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

  return (
    <div
      onClick={handleNavigateAudit}
      className="flex items-center gap-3 group cursor-pointer"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Node */}
      <div className="flex-none z-10">
        <div
          className="relative flex items-center justify-center size-7 rounded-full transition-all duration-300 group-hover:scale-110 shadow-xs"
          style={{ background: 'var(--card)', border: `2px solid ${dotColor}`, boxShadow: `0 0 10px ${dotColor}33` }}
        >
          <div className="size-2 rounded-full animate-ping absolute" style={{ background: dotColor, opacity: 0.2 }} />
          <StatusIcon className="size-3.5 relative z-10" style={{ color: dotColor }} />
        </div>
      </div>

      {/* Content card */}
      <div
        className="flex-1 min-w-0 rounded-xl px-3.5 py-2.5 transition-all duration-300 group-hover:scale-[1.01] group-hover:-translate-y-0.5 border border-border group-hover:border-primary/30 shadow-xs relative overflow-hidden"
        style={{ background: 'var(--card)', borderLeft: `3px solid ${dotColor}` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
        <div className="flex items-center justify-between gap-2 relative z-10">
          <span className="text-xs font-black font-mono text-foreground truncate">{event.event}</span>
          <Badge
            variant="outline"
            className="text-[9.5px] px-2 py-0.5 font-mono font-extrabold flex-none capitalize tracking-wider flex items-center gap-1 shadow-xs"
            style={{ borderColor, color: dotColor, background: bgColor }}
          >
            <span className="size-1 rounded-full animate-ping" style={{ background: dotColor }} />
            {event.outcome}
          </Badge>
        </div>
        <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground font-mono relative z-10">
          <span className="truncate font-bold text-foreground">{event.actorEmail || 'System'}</span>
          <span className="flex-none text-muted-foreground">·</span>
          <span className="flex-none font-medium">{new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <span className="flex-none uppercase border border-border px-1.5 rounded text-muted-foreground bg-secondary/50 font-extrabold text-[9px]">{event.layer}</span>
        </div>
      </div>
    </div>
  )
}

/* ─── Quick Shortcut Tile ─── */
function QuickTile({ label, color, sublabel, icon: Icon, sectorKey }: { label: string; color: string; sublabel: string; icon: React.ElementType; sectorKey: string }) {
  function handleClick() {
    window.dispatchEvent(new CustomEvent('hexagon-hub-select-sector', { detail: sectorKey }))
  }

  return (
    <button
      onClick={handleClick}
      className="group flex flex-col items-center justify-center gap-2.5 p-4 rounded-xl border border-border hover:border-primary/40 transition-all duration-300 relative overflow-hidden shadow-xs cursor-pointer hover:-translate-y-0.5 hover:shadow-md bg-card"
    >
      {/* Subtle radial wash */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: `radial-gradient(circle at 50% 0%, ${color}15, transparent 70%)` }}
      />
      <div
        className="size-9 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shadow-xs flex-none"
        style={{ background: `${color}18`, border: `1.5px solid ${color}35` }}
      >
        <Icon className="size-4" style={{ color }} />
      </div>
      <div className="text-center relative z-10">
        <span className="text-[11px] font-black uppercase tracking-widest text-foreground block">{label}</span>
        <span className="text-[9.5px] font-semibold text-muted-foreground font-mono block mt-0.5">{sublabel}</span>
      </div>
    </button>
  )
}

const RING_DATA = [
  { label: 'Req / sec', sublabel: 'Gateway throughput', value: 43, max: 100, unit: '', color: '#3b82f6', icon: Zap, delay: 0 },
  { label: 'Cache Hit', sublabel: 'Provider cache layer', value: 61, max: 100, unit: '%', color: '#06b6d4', icon: Activity, delay: 120 },
  { label: 'Latency', sublabel: 'Avg inference ms', value: 142, max: 400, unit: 'ms', color: '#a855f7', icon: TrendingUp, delay: 240 },
  { label: 'Active Users', sublabel: 'Concurrent sessions', value: 128, max: 500, unit: '', color: '#22c55e', icon: Users, delay: 360 },
]

const QUICK_TILES = [
  { label: 'Users', sublabel: 'Directory', icon: Users, color: '#06b6d4', sectorKey: 'users' },
  { label: 'API Keys', sublabel: 'AES Vault', icon: Zap, color: '#f97316', sectorKey: 'apikeys' },
  { label: 'Models', sublabel: 'Registry', icon: Cpu, color: '#f59e0b', sectorKey: 'models' },
  { label: 'Audit Log', sublabel: 'Telemetry', icon: BarChart3, color: '#22c55e', sectorKey: 'audit' },
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
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="cyber-pulse-dot cyber-pulse-dot-blue" />
            <h1 className="text-2xl font-black tracking-tight sector-header-title">
              Platform Overview
            </h1>
            <Badge variant="outline" className="sector-badge text-xs font-mono font-bold flex items-center gap-1 border-border">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-ping" />
              Gateway Online • 99.98% Uptime
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground font-semibold">
            Live health telemetry across inference routing, provider rate limits, and administrative events.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.dispatchEvent(new CustomEvent('hexagon-hub-back'))}
            className="border-border bg-secondary text-foreground hover:bg-secondary/80 font-extrabold shadow-sm cursor-pointer"
          >
            <ArrowLeft className="size-3.5 mr-1" />
            All Sectors
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchAuditLogs}
            disabled={refreshing}
            className="gap-2 border-border bg-secondary text-foreground hover:bg-secondary/80 transition-all font-extrabold shadow-sm cursor-pointer"
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
        <div className="lg:col-span-2 rounded-2xl shadow-sm border border-border bg-card">
          <div className="px-5 pt-5 pb-4 flex items-center justify-between border-b border-border">
            <div>
              <h2 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                <Activity className="size-4 text-primary animate-pulse" />
                Live Audit Stream
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">Realtime security decision telemetry</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] font-mono font-extrabold text-foreground bg-secondary/50 border-border px-2.5 py-0.5">
                {auditEvents.length} events
              </Badge>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('hexagon-hub-select-sector', { detail: 'audit' }))}
                className="text-xs font-extrabold text-primary hover:text-primary-hover flex items-center gap-1 cursor-pointer transition-colors"
              >
                View Stream →
              </button>
            </div>
          </div>

          <div ref={timelineRef} className="relative p-5">
            {auditEvents.length > 0 && (
              <div
                className="absolute left-[33px] top-8 bottom-8 w-[2px] rounded-full z-0 pointer-events-none opacity-30"
                style={{
                  background: 'linear-gradient(to bottom, var(--primary) 0%, var(--primary-hover) 100%)',
                }}
              />
            )}

            <div className="space-y-3.5 relative z-10">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-xl bg-secondary animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
                ))
              ) : auditEvents.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground flex flex-col items-center gap-2 font-medium">
                  <CheckCircle2 className="size-8 text-muted-foreground/60" />
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

        {/* Right column: Quick Tiles + Status + Stats */}
        <div className="flex flex-col gap-4">
          {/* Quick Access */}
          <div className="rounded-2xl shadow-sm border border-border bg-card">
            <div className="px-4 pt-4 pb-3 border-b border-border flex items-center gap-1.5">
              <Zap className="size-3.5 text-primary" />
              <h2 className="text-xs font-black text-foreground uppercase tracking-widest">Quick Access</h2>
            </div>
            <div className="p-3 grid grid-cols-2 gap-2.5">
              {QUICK_TILES.map((tile) => (
                <QuickTile key={tile.label} {...tile} />
              ))}
            </div>
          </div>

          {/* System Status */}
          <div className="rounded-2xl shadow-sm border border-border bg-card">
            <div className="px-4 pt-4 pb-3 border-b border-border flex items-center gap-1.5">
              <Cpu className="size-3.5 text-primary" />
              <h2 className="text-xs font-black text-foreground uppercase tracking-widest">System Status</h2>
            </div>
            <div className="p-4 space-y-4">
              {[
                { label: 'API Gateway', pct: 98, lat: '12ms', color: '#22c55e' },
                { label: 'Model Router', pct: 87, lat: '45ms', color: '#3b82f6' },
                { label: 'Auth Service', pct: 100, lat: '4ms', color: '#22c55e' },
                { label: 'Key Vault', pct: 94, lat: '18ms', color: '#06b6d4' },
              ].map(({ label, pct, lat, color }, i) => (
                <div key={label} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-foreground font-extrabold flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full flex-none" style={{ background: color }} />
                      {label}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span style={{ color }} className="font-mono font-black text-[11px]">{pct}%</span>
                      <span className="text-[9.5px] text-muted-foreground font-medium border border-border px-1.5 py-0.5 rounded bg-secondary/50 font-mono">{lat}</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: 0,
                        background: `linear-gradient(90deg, ${color}99, ${color})`,
                        boxShadow: `0 0 6px ${color}66`,
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
          </div>

          {/* Stats 4-grid */}
          <div className="rounded-2xl shadow-sm border border-border bg-card">
            <div className="p-3 grid grid-cols-2 gap-3">
              {[
                { label: 'Providers', value: '5', icon: ArrowUpRight, color: '#f97316', sectorKey: 'models' },
                { label: 'Models', value: '12', icon: Cpu, color: '#f59e0b', sectorKey: 'models' },
                { label: 'Req Today', value: '48k', icon: TrendingUp, color: '#3b82f6', sectorKey: 'audit' },
                { label: 'Errors', value: '0.2%', icon: AlertCircle, color: '#f43f5e', sectorKey: 'audit' },
              ].map(({ label, value, icon: Icon, color, sectorKey }) => (
                <div
                  key={label}
                  onClick={() => window.dispatchEvent(new CustomEvent('hexagon-hub-select-sector', { detail: sectorKey }))}
                  className="group relative overflow-hidden rounded-xl p-3.5 flex flex-col gap-2 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md cursor-pointer border border-border bg-secondary/30 hover:border-primary/30"
                >
                  {/* Subtle color wash */}
                  <div
                    className="absolute top-0 right-0 w-16 h-16 rounded-full pointer-events-none opacity-[0.08] blur-xl group-hover:opacity-[0.15] transition-opacity duration-300"
                    style={{ background: color, transform: 'translate(25%, -25%)' }}
                  />
                  {/* Shimmer */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

                  <div
                    className="size-8 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105 flex-none relative z-10"
                    style={{ background: `${color}18`, border: `1.5px solid ${color}35` }}
                  >
                    <Icon className="size-4" style={{ color }} />
                  </div>
                  <div className="relative z-10">
                    <span className="text-xl font-black font-mono text-foreground block leading-none">{value}</span>
                    <span className="text-[9.5px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5 block group-hover:text-foreground transition-colors">{label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

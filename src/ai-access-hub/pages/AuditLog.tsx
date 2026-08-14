import { useEffect, useState } from 'react'
import {
  Search,
  ScrollText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Filter,
  Copy,
  Check,
  User,
  Terminal,
  Layers,
  Shield,
  X,
  Clock,
  ArrowLeft
} from 'lucide-react'
import { api } from '@/api'
import type { AuditLogEntry } from '../types'
import { Pagination } from '../components/Pagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const PAGE_SIZE = 12

const OUTCOME_CONFIG: Record<AuditLogEntry['outcome'], { icon: any; color: string; bg: string; border: string; label: string; text: string }> = {
  passed: { icon: CheckCircle2, color: '#22c55e', bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.4)', label: 'Passed', text: '#22c55e' },
  denied: { icon: AlertCircle, color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.4)', label: 'Denied', text: '#f59e0b' },
  error: { icon: XCircle, color: '#f43f5e', bg: 'rgba(244,63,94,0.15)', border: 'rgba(244,63,94,0.4)', label: 'Error', text: '#f43f5e' },
}

const LAYER_ICONS: Record<string, any> = {
  gateway: Shield,
  auth: User,
  rbac: Layers,
  routing: Filter,
}

/* ── Timeline Event Card ── */
function TimelineEventCard({ event, index, onSelect }: { event: AuditLogEntry; index: number; onSelect: () => void }) {
  const conf = OUTCOME_CONFIG[event.outcome] || OUTCOME_CONFIG.passed
  const StatusIcon = conf.icon
  const LayerIcon = LAYER_ICONS[event.layer?.toLowerCase()] || Terminal
  const isLeft = index % 2 === 0

  const cardContent = (
    <div
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`)
        e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`)
      }}
      className="w-full max-w-md p-4 rounded-2xl card-hover-lift cursor-pointer group shadow-md hover:shadow-xl relative overflow-hidden transition-all duration-300 border-slate-200"
      style={{
        background: `radial-gradient(circle 220px at var(--mouse-x, 50%) var(--mouse-y, 0%), ${conf.color}20, transparent 75%), linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)`,
        border: `1.5px solid ${conf.color}45`,
        borderLeft: `4px solid ${conf.color}`,
        boxShadow: `0 6px 20px rgba(15, 23, 42, 0.05), 0 0 12px ${conf.color}15`
      }}
      onClick={onSelect}
    >
      {/* Shimmer sweep effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

      <div className="flex items-center justify-between gap-2 mb-2 z-10 relative">
        <span className="font-mono text-xs font-black text-slate-900 group-hover:text-[#0284c7] transition-colors truncate">
          {event.event}
        </span>
        <Badge
          variant="outline"
          className="text-[10px] px-2.5 py-0.5 font-mono font-extrabold flex-none capitalize tracking-wider flex items-center gap-1 shadow-xs"
          style={{ borderColor: conf.border, color: conf.text, background: conf.bg }}
        >
          <span className="size-1.5 rounded-full animate-ping" style={{ background: conf.color }} />
          {conf.label}
        </Badge>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-slate-700 font-mono z-10 relative">
        <User className="size-3.5 text-[#22c55e] flex-none icon-spring" />
        <span className="truncate font-bold text-slate-800">{event.actorEmail || 'System'}</span>
      </div>

      <div className="flex items-center gap-2.5 mt-2.5 pt-2 border-t border-slate-200 text-[10px] text-slate-600 font-mono z-10 relative">
        <div className="flex items-center gap-1 font-extrabold text-slate-700">
          <LayerIcon className="size-3 text-slate-500" />
          <span className="uppercase">{event.layer}</span>
        </div>
        <span className="text-slate-300">·</span>
        <div className="flex items-center gap-1 font-semibold text-slate-600">
          <Clock className="size-3 text-slate-400" />
          <span>{new Date(event.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
        </div>
      </div>
    </div>
  )

  return (
    <div
      className="relative flex items-center w-full animate-slide-left"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Left Column */}
      <div className="flex-1 flex justify-end pr-6">
        {isLeft ? cardContent : <div className="w-full max-w-md" />}
      </div>

      {/* Center Circle Node with Spinning Orbit */}
      <div className="flex flex-col items-center flex-none z-10">
        <div className="relative flex items-center justify-center">
          <svg width="48" height="48" className="absolute -rotate-90 pointer-events-none">
            <circle
              cx="24" cy="24" r="22"
              fill="none" stroke={conf.color} strokeWidth="1.5" strokeDasharray="3 4" opacity="0.45" className="animate-spin" style={{ animationDuration: '10s' }}
            />
          </svg>
          <div
            className="flex items-center justify-center size-10 rounded-full border-2 transition-all duration-300 group-hover:scale-125 bg-white shadow-md"
            style={{
              background: '#ffffff',
              borderColor: conf.color,
              boxShadow: `0 0 14px ${conf.color}44`
            }}
          >
            <StatusIcon className="size-5 icon-spring relative z-10" style={{ color: conf.color }} />
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div className="flex-1 flex justify-start pl-6">
        {!isLeft ? cardContent : <div className="w-full max-w-md" />}
      </div>
    </div>
  )
}

export default function AuditLog() {
  const [events, setEvents] = useState<AuditLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [query, setQuery] = useState('')
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all')
  const [layerFilter, setLayerFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<AuditLogEntry | null>(null)
  const [copiedId, setCopiedId] = useState(false)

  async function load(q: string, off: number) {
    setLoading(true)
    try {
      const { data } = await api.get('/audit-log', {
        params: { q: q || undefined, offset: off, limit: 10 },
      })
      const loaded = data?.events ?? data?.logs ?? (Array.isArray(data) ? data : [])
      setEvents(loaded)
      setTotal(data?.total ?? loaded.length)
    } catch (err) {
      console.error('Failed to load audit logs', err)
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load('', 0) }, [])

  useEffect(() => {
    const t = setTimeout(() => { setOffset(0); load(query, 0) }, 300)
    return () => clearTimeout(t)
  }, [query])

  function handleCopyTrace(id: string) {
    navigator.clipboard.writeText(id)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }

  const safeEvents = Array.isArray(events) ? events : []
  const passedCount = safeEvents.filter((e) => e.outcome === 'passed').length
  const deniedCount = safeEvents.filter((e) => e.outcome === 'denied').length
  const errorCount = safeEvents.filter((e) => e.outcome === 'error').length

  const filteredEvents = safeEvents.filter((e) => {
    return (outcomeFilter === 'all' || e.outcome === outcomeFilter) &&
           (layerFilter === 'all' || e.layer === layerFilter)
  })

  return (
    <div className="page sector-green space-y-6 animate-slide-up">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#22c55e]/30 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="cyber-pulse-dot cyber-pulse-dot-green" />
            <h1 className="text-2xl font-bold tracking-tight sector-header-title">
              System Audit Stream
            </h1>
            <Badge variant="outline" className="sector-badge text-xs font-mono">Immutable Trace Log</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete security trail recording authentication, policy evaluations, and API key usages.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => window.dispatchEvent(new CustomEvent('hexagon-hub-back'))}
          className="border-green-300 bg-green-50 text-green-700 hover:bg-green-100 font-extrabold shadow-sm cursor-pointer"
        >
          <ArrowLeft className="size-3.5 mr-1" />
          All Sectors
        </Button>
      </header>

      {/* KPI Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Events', value: total, color: '#22c55e', icon: ScrollText, chip: 'Audit Feed' },
          { label: 'Passed Requests', value: passedCount, color: '#16a34a', icon: CheckCircle2, chip: 'Passed' },
          { label: 'Policy Denied', value: deniedCount, color: '#f59e0b', icon: AlertCircle, chip: 'Denied' },
          { label: 'System Errors', value: errorCount, color: '#f43f5e', icon: XCircle, chip: 'Errors' },
        ].map(({ label, value, color, icon: Icon, chip }, i) => (
          <div
            key={label}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`)
              e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`)
            }}
            className="spotlight-card rounded-2xl p-5 flex items-center justify-between gap-4 relative overflow-hidden group shadow-lg border-slate-200 transition-all duration-300 hover:-translate-y-1.5 hover:scale-[1.02] hover:shadow-2xl cursor-pointer"
            style={{
              animationDelay: `${i * 80}ms`,
              background: `radial-gradient(circle 220px at var(--mouse-x, 90%) var(--mouse-y, 10%), ${color}25, transparent 75%), linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)`,
              border: `1.5px solid ${color}50`,
              borderTop: `4px solid ${color}`,
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)'
            }}
          >
            {/* Ambient Corner Energy Glow */}
            <div className="absolute -right-4 -bottom-4 size-20 rounded-full blur-xl opacity-30 animate-pulse pointer-events-none" style={{ background: color }} />

            {/* Shimmer sweep effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

            <div className="flex items-center gap-3.5 z-10">
              <div className="relative flex items-center justify-center">
                {/* Inner spinning dashed orbit */}
                <svg width="52" height="52" className="absolute -rotate-90 pointer-events-none">
                  <circle
                    cx="26" cy="26" r="23"
                    fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="4 5" opacity="0.6" className="animate-spin" style={{ animationDuration: '10s' }}
                  />
                  <circle
                    cx="26" cy="26" r="18"
                    fill="none" stroke={color} strokeWidth="1" strokeDasharray="2 3" opacity="0.35" className="animate-spin" style={{ animationDuration: '6s', animationDirection: 'reverse' }}
                  />
                </svg>
                <div className="size-11 rounded-xl flex items-center justify-center text-white flex-none transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 shadow-md" style={{ background: color, boxShadow: `0 0 20px ${color}55` }}>
                  <Icon className="size-5 text-white" />
                </div>
              </div>
              <div>
                <p className="text-3xl font-black font-mono text-slate-900 tracking-tight transition-transform duration-300 group-hover:scale-105 group-hover:translate-x-0.5">{value}</p>
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-600 mt-0.5">{label}</p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1.5 z-10">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold shadow-xs flex items-center gap-1.5 border transition-all duration-300 group-hover:scale-105" style={{ color, background: `${color}18`, borderColor: `${color}45` }}>
                <span className="size-1.5 rounded-full animate-ping" style={{ background: color }} />
                {chip}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search event, user..." className="pl-9 bg-white border-[#22c55e]/50 text-slate-900 font-semibold placeholder:text-slate-400 text-xs shadow-sm" />
        </div>
        <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
          <SelectTrigger className="w-[130px] bg-white border-[#22c55e]/50 text-slate-900 text-xs font-bold">
            <SelectValue placeholder="Outcome" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Outcomes</SelectItem>
            <SelectItem value="passed">✓ Passed</SelectItem>
            <SelectItem value="denied">⚠ Denied</SelectItem>
            <SelectItem value="error">✕ Error</SelectItem>
          </SelectContent>
        </Select>
        <Select value={layerFilter} onValueChange={setLayerFilter}>
          <SelectTrigger className="w-[130px] bg-white border-[#22c55e]/50 text-slate-900 text-xs font-bold">
            <SelectValue placeholder="Layer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Layers</SelectItem>
            <SelectItem value="gateway">Gateway</SelectItem>
            <SelectItem value="auth">Auth</SelectItem>
            <SelectItem value="rbac">RBAC</SelectItem>
            <SelectItem value="routing">Routing</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Central Alternating Timeline */}
      {loading ? (
        <div className="space-y-4 py-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
          <ScrollText className="size-8 text-muted-foreground/30" />
          No matching security audit events found.
        </div>
      ) : (
        <div className="relative py-4">
          {/* Central Vertical Timeline Track Line */}
          <div
            className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-1 rounded-full pointer-events-none"
            style={{
              background: 'linear-gradient(to bottom, #22c55e, #06b6d4, #8b5cf6, #22c55e)',
              boxShadow: '0 0 12px rgba(34, 197, 94, 0.5)',
              animation: 'timelineDraw 1.2s ease-out 0.2s both',
            }}
          />
          <div className="space-y-6 relative">
            {filteredEvents.map((event, idx) => (
              <TimelineEventCard key={event.id} event={event} index={idx} onSelect={() => setSelectedEvent(event)} />
            ))}
          </div>
        </div>
      )}

      <Pagination offset={offset} limit={PAGE_SIZE} total={total} onChange={(off) => { setOffset(off); load(query, off) }} />

      {/* Event Inspector Modal */}
      {selectedEvent && (
        <Dialog open onOpenChange={(next) => !next && setSelectedEvent(null)}>
          <DialogContent className="sm:max-w-xl border-t-4 border-t-[#22c55e] shadow-2xl rounded-2xl bg-white p-6 border-slate-200 animate-in fade-in-50 zoom-in-95 duration-200">
            <DialogHeader>
              <div className="flex items-center justify-between pr-4">
                <DialogTitle className="flex items-center gap-2.5 text-lg font-black text-slate-900 tracking-tight">
                  <div className="size-8 rounded-lg bg-green-500/15 border border-green-500/30 flex items-center justify-center flex-none">
                    <Terminal className="size-4 text-[#16a34a]" />
                  </div>
                  Event Trace Telemetry
                </DialogTitle>
                <Badge variant="outline" className="text-[10px] capitalize font-extrabold flex items-center gap-1 shadow-xs" style={{ borderColor: OUTCOME_CONFIG[selectedEvent.outcome]?.border, color: OUTCOME_CONFIG[selectedEvent.outcome]?.color, background: OUTCOME_CONFIG[selectedEvent.outcome]?.bg }}>
                  <span className="size-1.5 rounded-full animate-ping" style={{ background: OUTCOME_CONFIG[selectedEvent.outcome]?.color }} />
                  {selectedEvent.outcome}
                </Badge>
              </div>
            </DialogHeader>
            <div className="space-y-3 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 font-mono">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-extrabold">Trace ID</span>
                  <div className="flex items-center gap-1.5 mt-1 text-white">
                    <span className="truncate text-[11px] font-bold text-cyan-400">{selectedEvent.id}</span>
                    <button type="button" onClick={() => handleCopyTrace(selectedEvent.id)} className="text-slate-400 hover:text-white cursor-pointer" title="Copy Trace ID">
                      {copiedId ? <Check className="size-3.5 text-[#22c55e]" /> : <Copy className="size-3.5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-extrabold">Action</span>
                  <span className="text-white font-bold mt-1 block">{selectedEvent.event}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-extrabold">Principal</span>
                  <span className="text-slate-200 mt-1 block font-semibold">{selectedEvent.actorEmail || 'System'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-extrabold">Layer</span>
                  <span className="text-amber-400 mt-1 block uppercase font-bold">{selectedEvent.layer}</span>
                </div>
              </div>
              <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-[#4ade80] overflow-x-auto max-h-[220px] shadow-inner">
                {JSON.stringify({ id: selectedEvent.id, event: selectedEvent.event, actorEmail: selectedEvent.actorEmail, layer: selectedEvent.layer, outcome: selectedEvent.outcome, createdAt: selectedEvent.createdAt }, null, 2)}
              </pre>
            </div>
            <DialogFooter className="pt-2">
              <DialogClose asChild>
                <Button variant="outline" size="sm" className="text-xs font-extrabold bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200 cursor-pointer rounded-xl px-5">Close Trace</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

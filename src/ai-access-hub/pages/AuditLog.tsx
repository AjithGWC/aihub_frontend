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
  Clock
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
      className="w-full max-w-md p-4 rounded-2xl card-hover-lift cursor-pointer group shadow-lg relative overflow-hidden"
      style={{
        background: `radial-gradient(circle at 50% 0%, ${conf.color}15, transparent 70%), rgba(20, 26, 38, 0.94)`,
        border: `1px solid ${conf.border}`,
        borderLeft: `3.5px solid ${conf.color}`,
        boxShadow: `0 8px 30px rgba(0,0,0,0.35), 0 0 15px ${conf.color}25`
      }}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="font-mono text-xs font-extrabold text-white group-hover:text-[#4ade80] transition-colors truncate">
          {event.event}
        </span>
        <Badge
          variant="outline"
          className="text-[10px] px-2 py-0.5 font-bold flex-none capitalize tracking-wider"
          style={{ borderColor: conf.border, color: conf.text, background: conf.bg }}
        >
          {conf.label}
        </Badge>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-slate-300 font-mono">
        <User className="size-3.5 text-[#22c55e] flex-none icon-spring" />
        <span className="truncate font-medium">{event.actorEmail || 'System'}</span>
      </div>

      <div className="flex items-center gap-2.5 mt-2.5 pt-2 border-t border-white/10 text-[10px] text-slate-400 font-mono">
        <div className="flex items-center gap-1">
          <LayerIcon className="size-3 text-slate-400" />
          <span className="uppercase font-bold text-slate-300">{event.layer}</span>
        </div>
        <span>·</span>
        <div className="flex items-center gap-1">
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
            className="flex items-center justify-center size-10 rounded-full border-2 transition-all duration-300 group-hover:scale-125"
            style={{
              background: 'rgba(15, 20, 30, 0.95)',
              borderColor: conf.color,
              boxShadow: `0 0 16px ${conf.color}88, inset 0 0 8px ${conf.color}44`
            }}
          >
            <StatusIcon className="size-5 icon-spring" style={{ color: conf.color }} />
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
        params: { q: q || undefined, offset: off, limit: PAGE_SIZE },
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
      </header>

      {/* KPI Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Events', value: total, color: '#22c55e', icon: ScrollText },
          { label: 'Passed', value: passedCount, color: '#22c55e', icon: CheckCircle2 },
          { label: 'Denied', value: deniedCount, color: '#f59e0b', icon: AlertCircle },
          { label: 'Errors', value: errorCount, color: '#f43f5e', icon: XCircle },
        ].map(({ label, value, color, icon: Icon }, i) => (
          <div key={label} className="sector-card spotlight-card card-hover-lift p-4 flex items-center gap-3 rounded-xl animate-stagger-1 group border-slate-200" style={{ animationDelay: `${i * 80}ms`, background: `radial-gradient(circle at 50% 0%, ${color}12, transparent 70%), linear-gradient(135deg, #ffffff, #f8fafc)`, borderTop: `3.5px solid ${color}`, boxShadow: '0 6px 18px rgba(15, 23, 42, 0.06)' }}>
            <div className="p-2.5 rounded-lg flex-none transition-transform group-hover:scale-110" style={{ background: `${color}18`, border: `1px solid ${color}35` }}>
              <Icon className="size-5 icon-spring" style={{ color }} />
            </div>
            <div>
              <p className="text-2xl font-extrabold font-mono text-slate-900 animate-counter-up">{value}</p>
              <p className="text-[10px] text-slate-600 font-extrabold uppercase tracking-wider">{label}</p>
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
          <DialogContent className="sm:max-w-xl sector-card">
            <DialogHeader>
              <div className="flex items-center justify-between pr-4">
                <DialogTitle className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Terminal className="size-4 text-[#22c55e]" />
                  Event Trace Telemetry
                </DialogTitle>
                <Badge variant="outline" className="text-[10px] capitalize font-bold" style={{ borderColor: OUTCOME_CONFIG[selectedEvent.outcome]?.border, color: OUTCOME_CONFIG[selectedEvent.outcome]?.color, background: OUTCOME_CONFIG[selectedEvent.outcome]?.bg }}>
                  {selectedEvent.outcome}
                </Badge>
              </div>
            </DialogHeader>
            <div className="space-y-3 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-black/40 border border-[#22c55e]/30 font-mono">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Trace ID</span>
                  <div className="flex items-center gap-1.5 mt-0.5 text-white">
                    <span className="truncate text-[11px] font-semibold">{selectedEvent.id}</span>
                    <button type="button" onClick={() => handleCopyTrace(selectedEvent.id)} className="text-slate-400 hover:text-white">
                      {copiedId ? <Check className="size-3 text-[#4ade80]" /> : <Copy className="size-3" />}
                    </button>
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Action</span>
                  <span className="text-white font-semibold mt-0.5 block">{selectedEvent.event}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Principal</span>
                  <span className="text-white mt-0.5 block">{selectedEvent.actorEmail || 'System'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Layer</span>
                  <span className="text-white mt-0.5 block uppercase">{selectedEvent.layer}</span>
                </div>
              </div>
              <pre className="p-3 rounded-lg bg-black/60 border border-[#22c55e]/30 font-mono text-[11px] text-[#4ade80] overflow-x-auto max-h-[200px]">
                {JSON.stringify({ id: selectedEvent.id, event: selectedEvent.event, actorEmail: selectedEvent.actorEmail, layer: selectedEvent.layer, outcome: selectedEvent.outcome, createdAt: selectedEvent.createdAt }, null, 2)}
              </pre>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" size="sm" className="text-xs font-bold bg-slate-800 text-white border-slate-600 hover:bg-slate-700">Close Trace</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

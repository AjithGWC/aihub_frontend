import { useEffect, useMemo, useState } from 'react'
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
  Clock,
  ArrowLeft,
} from 'lucide-react'
import { getGovernanceSummary, listAuditEvents } from '@/api/portal'
import { normalizeAuditEvent } from '../lib/audit'
import type { AuditLogEntry } from '../types'
import { Pagination } from '../components/Pagination'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'

const PAGE_SIZE = 12
const FETCH_LIMIT = 200

const OUTCOME_CONFIG: Record<string, { icon: any; color: string; bg: string; border: string; label: string; text: string }> = {
  passed: { icon: CheckCircle2, color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)', label: 'Passed', text: '#22c55e' },
  denied: { icon: AlertCircle, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', label: 'Denied', text: '#f59e0b' },
  error: { icon: XCircle, color: '#f43f5e', bg: 'rgba(244,63,94,0.1)', border: 'rgba(244,63,94,0.25)', label: 'Error', text: '#f43f5e' },
}
const DEFAULT_OUTCOME_CONFIG = OUTCOME_CONFIG.passed

const LAYER_ICONS: Record<string, any> = {
  gateway: Shield,
  auth: User,
  rbac: Layers,
  routing: Filter,
}

/* ── Audit Event Row ── */
function AuditRow({ event, index, onSelect }: { event: AuditLogEntry; index: number; onSelect: () => void }) {
  const conf = OUTCOME_CONFIG[event.outcome] || DEFAULT_OUTCOME_CONFIG
  const StatusIcon = conf.icon
  const LayerIcon = LAYER_ICONS[event.layer?.toLowerCase()] || Terminal

  return (
    <TableRow
      onClick={onSelect}
      className="group border-border hover:bg-secondary/40 transition-colors cursor-pointer animate-slide-up"
      style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
    >
      <TableCell className="py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="size-8 rounded-full flex items-center justify-center flex-none bg-background border"
            style={{ borderColor: conf.color, boxShadow: `0 0 10px ${conf.color}20` }}
          >
            <StatusIcon className="size-4" style={{ color: conf.color }} />
          </div>
          <span className="font-mono text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
            {event.event}
          </span>
        </div>
      </TableCell>

      <TableCell className="whitespace-nowrap">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <User className="size-3.5 text-primary flex-none" />
          <span className="truncate max-w-[180px]">{event.actorEmail || 'System'}</span>
        </span>
      </TableCell>

      <TableCell className="whitespace-nowrap">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-muted-foreground uppercase">
          <LayerIcon className="size-3.5 text-muted-foreground" />
          {event.layer}
        </span>
      </TableCell>

      <TableCell className="whitespace-nowrap">
        <Badge
          variant="outline"
          className="text-[10px] px-2 py-0.5 font-mono font-extrabold capitalize"
          style={{ borderColor: conf.border, color: conf.text, background: conf.bg }}
        >
          {conf.label}
        </Badge>
      </TableCell>

      <TableCell className="text-right whitespace-nowrap">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground font-mono">
          <Clock className="size-3 text-muted-foreground" />
          {new Date(event.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
        </span>
      </TableCell>
    </TableRow>
  )
}

export default function AuditLog() {
  const [allEvents, setAllEvents] = useState<AuditLogEntry[]>([])
  const [outcomeCounts, setOutcomeCounts] = useState<Record<string, number>>({})
  const [offset, setOffset] = useState(0)
  const [query, setQuery] = useState('')
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all')
  const [layerFilter, setLayerFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<AuditLogEntry | null>(null)
  const [copiedId, setCopiedId] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const [rawEvents, governance] = await Promise.all([
        listAuditEvents({ limit: FETCH_LIMIT }),
        getGovernanceSummary().catch(() => null),
      ])
      setAllEvents(rawEvents.map(normalizeAuditEvent))
      setOutcomeCounts(governance?.by_outcome ?? {})
    } catch (err) {
      console.error('Failed to load audit logs', err)
      setAllEvents([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])
  useEffect(() => { setOffset(0) }, [query, outcomeFilter, layerFilter])

  const layers = useMemo(() => Array.from(new Set(allEvents.map((e) => e.layer).filter(Boolean))), [allEvents])

  const filteredEvents = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allEvents.filter((e) => {
      if (outcomeFilter !== 'all' && e.outcome !== outcomeFilter) return false
      if (layerFilter !== 'all' && e.layer !== layerFilter) return false
      if (q && !e.event.toLowerCase().includes(q) && !e.actorEmail.toLowerCase().includes(q)) return false
      return true
    })
  }, [allEvents, query, outcomeFilter, layerFilter])

  const total = filteredEvents.length
  const pagedEvents = filteredEvents.slice(offset, offset + PAGE_SIZE)

  const passedCount = outcomeCounts['passed'] ?? allEvents.filter((e) => e.outcome === 'passed').length
  const deniedCount = outcomeCounts['denied'] ?? allEvents.filter((e) => e.outcome === 'denied').length
  const errorCount = outcomeCounts['error'] ?? allEvents.filter((e) => e.outcome === 'error').length

  function handleCopyTrace(id: string) {
    navigator.clipboard.writeText(id)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }

  return (
    <div className="page sector-green space-y-6 animate-slide-up">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="cyber-pulse-dot cyber-pulse-dot-green" />
            <h1 className="text-2xl font-bold tracking-tight sector-header-title">
              System Audit Stream
            </h1>
            <Badge variant="outline" className="sector-badge text-xs font-mono border-border">Most Recent {FETCH_LIMIT}</Badge>
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
          className="border-border bg-secondary text-foreground hover:bg-secondary/80 font-extrabold shadow-sm cursor-pointer"
        >
          <ArrowLeft className="size-3.5 mr-1" />
          All Sectors
        </Button>
      </header>

      {/* KPI Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Loaded Events', value: allEvents.length, color: '#22c55e', icon: ScrollText, chip: 'Audit Feed' },
          { label: 'Passed Requests', value: passedCount, color: '#16a34a', icon: CheckCircle2, chip: 'Passed' },
          { label: 'Policy Denied', value: deniedCount, color: '#f59e0b', icon: AlertCircle, chip: 'Denied' },
          { label: 'System Errors', value: errorCount, color: '#f43f5e', icon: XCircle, chip: 'Errors' },
        ].map(({ label, value, color, icon: Icon, chip }, i) => (
          <div
            key={label}
            className="group relative overflow-hidden border border-border hover:border-primary/40 bg-card hover:bg-card/90 transition-all duration-300 rounded-xl p-5 flex items-center justify-between gap-4 shadow-sm hover:shadow-md cursor-pointer animate-slide-up"
            style={{
              animationDelay: `${i * 80}ms`,
              background: `radial-gradient(circle 120px at 90% 10%, ${color}08, transparent 75%), var(--panel)`,
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
            <div className="flex items-center gap-4 z-10">
              <div className="relative size-11 rounded-lg flex items-center justify-center flex-none bg-secondary/50 border border-border group-hover:border-primary/30 transition-colors">
                <Icon className="size-5 transition-transform duration-300 group-hover:scale-110" style={{ color }} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
                <p className="text-3xl font-black font-mono tracking-tight text-foreground mt-1 group-hover:text-primary transition-colors">{value}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5 z-10">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold shadow-xs flex items-center gap-1.5 border transition-all duration-300" style={{ color, background: `${color}15`, borderColor: `${color}25` }}>
                <span className="size-1.5 rounded-full animate-pulse" style={{ background: color }} />
                {chip}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-border bg-secondary/30">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search event, user..." className="pl-9 bg-background border-border text-foreground font-semibold placeholder:text-muted-foreground text-xs shadow-sm" />
        </div>
        <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
          <SelectTrigger className="w-[130px] bg-background border-border text-foreground text-xs font-bold">
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
          <SelectTrigger className="w-[130px] bg-background border-border text-foreground text-xs font-bold">
            <SelectValue placeholder="Layer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Layers</SelectItem>
            {layers.map((l) => (
              <SelectItem key={l} value={l} className="capitalize">{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Audit Event Table */}
      <div className="sector-card rounded-xl overflow-hidden shadow-sm border border-border bg-card">
        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-11 rounded-xl bg-secondary animate-pulse" style={{ animationDelay: `${i * 40}ms` }} />
            ))}
          </div>
        ) : pagedEvents.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
            <ScrollText className="size-8 text-muted-foreground/30" />
            No matching security audit events found.
          </div>
        ) : (
          <div className="px-4">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent bg-secondary/20">
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Event</TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Actor</TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Layer</TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Outcome</TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-muted-foreground text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedEvents.map((event, idx) => (
                  <AuditRow key={event.id} event={event} index={idx} onSelect={() => setSelectedEvent(event)} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <Pagination offset={offset} limit={PAGE_SIZE} total={total} onChange={setOffset} />
      </div>

      {/* Event Inspector Modal */}
      {selectedEvent && (
        <Dialog open onOpenChange={(next) => !next && setSelectedEvent(null)}>
          <DialogContent className="sm:max-w-xl border-t-4 border-t-primary shadow-lg rounded-xl bg-card p-6 border-border animate-in fade-in-50 zoom-in-95 duration-200">
            <DialogHeader>
              <div className="flex items-center justify-between pr-4">
                <DialogTitle className="flex items-center gap-2.5 text-lg font-black text-foreground tracking-tight">
                  <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-none">
                    <Terminal className="size-4 text-primary" />
                  </div>
                  Event Trace Telemetry
                </DialogTitle>
                <Badge variant="outline" className="text-[10px] capitalize font-extrabold flex items-center gap-1 shadow-xs" style={{ borderColor: (OUTCOME_CONFIG[selectedEvent.outcome] || DEFAULT_OUTCOME_CONFIG).border, color: (OUTCOME_CONFIG[selectedEvent.outcome] || DEFAULT_OUTCOME_CONFIG).color, background: (OUTCOME_CONFIG[selectedEvent.outcome] || DEFAULT_OUTCOME_CONFIG).bg }}>
                  <span className="size-1.5 rounded-full animate-ping" style={{ background: (OUTCOME_CONFIG[selectedEvent.outcome] || DEFAULT_OUTCOME_CONFIG).color }} />
                  {selectedEvent.outcome}
                </Badge>
              </div>
            </DialogHeader>
            <div className="space-y-3 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-background border border-border font-mono">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-extrabold">Trace ID</span>
                  <div className="flex items-center gap-1.5 mt-1 text-foreground">
                    <span className="truncate text-[11px] font-bold text-primary">{selectedEvent.id}</span>
                    <button type="button" onClick={() => handleCopyTrace(selectedEvent.id)} className="text-muted-foreground hover:text-foreground cursor-pointer" title="Copy Trace ID">
                      {copiedId ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-extrabold">Action</span>
                  <span className="text-foreground font-bold mt-1 block">{selectedEvent.event}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-extrabold">Principal</span>
                  <span className="text-foreground mt-1 block font-semibold">{selectedEvent.actorEmail || 'System'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-extrabold">Layer</span>
                  <span className="text-primary mt-1 block uppercase font-bold">{selectedEvent.layer}</span>
                </div>
              </div>
              <pre className="p-3.5 rounded-xl bg-background border border-border font-mono text-[11px] text-[#22c55e] dark:text-[#4ade80] overflow-x-auto max-h-[220px] shadow-inner">
                {JSON.stringify({ id: selectedEvent.id, event: selectedEvent.event, actorEmail: selectedEvent.actorEmail, layer: selectedEvent.layer, outcome: selectedEvent.outcome, createdAt: selectedEvent.createdAt }, null, 2)}
              </pre>
            </div>
            <DialogFooter className="pt-2">
              <DialogClose asChild>
                <Button variant="outline" size="sm" className="text-xs font-extrabold bg-secondary text-foreground border-border hover:bg-secondary/80 cursor-pointer rounded-xl px-5">Close Trace</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

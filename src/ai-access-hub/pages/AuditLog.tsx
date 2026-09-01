import { useEffect, useMemo, useState } from 'react'
import {
  Search,
  ScrollText,
  CheckCircle2,
  XCircle,
  ShieldOff,
  Copy,
  Check,
  User,
  Terminal,
  Layers,
  Shield,
  Router,
  Clock,
  ArrowLeft,
  Cpu,
  Timer,
  Fingerprint,
  ShieldAlert,
  Info,
} from 'lucide-react'
import { getAuditByRequest, getGovernanceSummary, listAuditEvents, type GovernanceSummary } from '@/api/portal'
import { labelizeEvent, normalizeAuditEvent } from '../lib/audit'
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
// The API's own cap on `limit` (see admin.json) — the widest window we can pull
// in one call to filter/search over client-side (it has no server-side
// outcome/layer/text filter of its own).
const FILTER_WINDOW_SIZE = 200

const OUTCOME_CONFIG: Record<string, { icon: any; color: string; bg: string; border: string; label: string; text: string }> = {
  pass: { icon: CheckCircle2, color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)', label: 'Passed', text: '#22c55e' },
  block: { icon: ShieldOff, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', label: 'Blocked', text: '#f59e0b' },
  error: { icon: XCircle, color: '#f43f5e', bg: 'rgba(244,63,94,0.1)', border: 'rgba(244,63,94,0.25)', label: 'Error', text: '#f43f5e' },
}
const DEFAULT_OUTCOME_CONFIG = OUTCOME_CONFIG.pass

const LAYER_ICONS: Record<string, any> = {
  api_gateway: Shield,
  router: Router,
  security: ShieldAlert,
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
            {labelizeEvent(event.eventType)}
          </span>
        </div>
      </TableCell>

      <TableCell className="whitespace-nowrap">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <User className="size-3.5 text-primary flex-none" />
          <span className="truncate max-w-[180px] font-mono">{event.userId || 'System'}</span>
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
  // Unfiltered mode: exactly one server-paginated page (real offset/limit).
  const [pageEvents, setPageEvents] = useState<AuditLogEntry[]>([])
  // Filtered mode: the widest window the API allows in one call (200), then
  // filtered/paginated client-side — the API has no server-side outcome/
  // layer/text filter to push this down to.
  const [filterWindow, setFilterWindow] = useState<AuditLogEntry[] | null>(null)

  const [governance, setGovernance] = useState<GovernanceSummary | null>(null)
  const [offset, setOffset] = useState(0)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all')
  const [layerFilter, setLayerFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<AuditLogEntry | null>(null)
  const [copiedId, setCopiedId] = useState(false)
  const [relatedEvents, setRelatedEvents] = useState<AuditLogEntry[] | null>(null)
  const [loadingRelated, setLoadingRelated] = useState(false)

  const hasFilter = outcomeFilter !== 'all' || layerFilter !== 'all' || debouncedQuery.trim() !== ''

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    getGovernanceSummary().then(setGovernance).catch(() => {})
  }, [])

  // A new filter (or clearing the last one) always starts back at page 1.
  useEffect(() => { setOffset(0) }, [debouncedQuery, outcomeFilter, layerFilter])

  // Filtered mode: (re)fetch the 200-event window whenever the filter changes.
  useEffect(() => {
    if (!hasFilter) { setFilterWindow(null); return }
    let cancelled = false
    setLoading(true)
    listAuditEvents({ limit: FILTER_WINDOW_SIZE })
      .then((raw) => { if (!cancelled) setFilterWindow(raw.map(normalizeAuditEvent)) })
      .catch(() => { if (!cancelled) setFilterWindow([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [hasFilter, debouncedQuery, outcomeFilter, layerFilter])

  // Unfiltered mode: fetch exactly the requested page straight from the server.
  useEffect(() => {
    if (hasFilter) return
    let cancelled = false
    setLoading(true)
    listAuditEvents({ limit: PAGE_SIZE, offset })
      .then((raw) => { if (!cancelled) setPageEvents(raw.map(normalizeAuditEvent)) })
      .catch(() => { if (!cancelled) setPageEvents([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [offset, hasFilter])

  const layers = useMemo(() => Object.keys(governance?.by_layer ?? {}), [governance])

  const matchedFiltered = useMemo(() => {
    if (!filterWindow) return []
    const q = debouncedQuery.trim().toLowerCase()
    return filterWindow.filter((e) => {
      if (outcomeFilter !== 'all' && e.outcome !== outcomeFilter) return false
      if (layerFilter !== 'all' && e.layer !== layerFilter) return false
      if (q && !e.eventType.toLowerCase().includes(q) && !(e.userId || '').toLowerCase().includes(q)) return false
      return true
    })
  }, [filterWindow, debouncedQuery, outcomeFilter, layerFilter])

  const displayedEvents = hasFilter ? matchedFiltered.slice(offset, offset + PAGE_SIZE) : pageEvents
  const total = hasFilter ? matchedFiltered.length : (governance?.total_events ?? 0)

  const passCount = governance?.by_outcome?.['pass'] ?? 0
  const blockCount = governance?.by_outcome?.['block'] ?? 0
  const errorCount = governance?.by_outcome?.['error'] ?? 0

  function handleCopyTrace(id: string) {
    navigator.clipboard.writeText(id)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }

  function openEvent(event: AuditLogEntry) {
    setSelectedEvent(event)
    setRelatedEvents(null)
    setLoadingRelated(true)
    getAuditByRequest(event.requestId)
      .then((raw) => setRelatedEvents(raw.map(normalizeAuditEvent)))
      .catch(() => setRelatedEvents(null))
      .finally(() => setLoadingRelated(false))
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
            <Badge variant="outline" className="sector-badge text-xs font-mono border-border">{governance?.total_events ?? '—'} Total</Badge>
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
          className="border-1.5 border-border bg-secondary text-foreground hover:bg-secondary/80 hover:border-primary/50 font-extrabold shadow-xs cursor-pointer rounded-xl px-3.5 h-9 text-xs transition-all"
        >
          <ArrowLeft className="size-3.5 mr-1" />
          All Sectors
        </Button>
      </header>

      {/* KPI Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Events', value: governance?.total_events ?? 0, color: '#22c55e', icon: ScrollText, chip: 'Audit Feed' },
          { label: 'Passed Requests', value: passCount, color: '#16a34a', icon: CheckCircle2, chip: 'Pass' },
          { label: 'Blocked Requests', value: blockCount, color: '#f59e0b', icon: ShieldOff, chip: 'Block' },
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
            <SelectItem value="pass">✓ Passed</SelectItem>
            <SelectItem value="block">⚠ Blocked</SelectItem>
            <SelectItem value="error">✕ Error</SelectItem>
          </SelectContent>
        </Select>
        <Select value={layerFilter} onValueChange={setLayerFilter}>
          <SelectTrigger className="w-[150px] bg-background border-border text-foreground text-xs font-bold">
            <SelectValue placeholder="Layer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Layers</SelectItem>
            {layers.map((l) => (
              <SelectItem key={l} value={l} className="capitalize">{l.replace(/_/g, ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilter && (
          <span className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground font-medium">
            <Info className="size-3.5 flex-none" />
            Searching the most recent {FILTER_WINDOW_SIZE} events
          </span>
        )}
      </div>

      {/* Audit Event Table */}
      <div className="sector-card rounded-xl overflow-hidden shadow-sm border border-border bg-card">
        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-11 rounded-xl bg-secondary animate-pulse" style={{ animationDelay: `${i * 40}ms` }} />
            ))}
          </div>
        ) : displayedEvents.length === 0 ? (
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
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">User</TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Layer</TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Outcome</TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-muted-foreground text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedEvents.map((event, idx) => (
                  <AuditRow key={event.id} event={event} index={idx} onSelect={() => openEvent(event)} />
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
                  {labelizeEvent(selectedEvent.eventType)}
                </DialogTitle>
                <Badge variant="outline" className="text-[10px] capitalize font-extrabold flex items-center gap-1 shadow-xs" style={{ borderColor: (OUTCOME_CONFIG[selectedEvent.outcome] || DEFAULT_OUTCOME_CONFIG).border, color: (OUTCOME_CONFIG[selectedEvent.outcome] || DEFAULT_OUTCOME_CONFIG).color, background: (OUTCOME_CONFIG[selectedEvent.outcome] || DEFAULT_OUTCOME_CONFIG).bg }}>
                  <span className="size-1.5 rounded-full animate-ping" style={{ background: (OUTCOME_CONFIG[selectedEvent.outcome] || DEFAULT_OUTCOME_CONFIG).color }} />
                  {(OUTCOME_CONFIG[selectedEvent.outcome] || DEFAULT_OUTCOME_CONFIG).label}
                </Badge>
              </div>
            </DialogHeader>
            <div className="space-y-3 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-background border border-border font-mono">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-extrabold">Audit ID</span>
                  <div className="flex items-center gap-1.5 mt-1 text-foreground">
                    <span className="truncate text-[11px] font-bold text-primary">{selectedEvent.id}</span>
                    <button type="button" onClick={() => handleCopyTrace(selectedEvent.id)} className="text-muted-foreground hover:text-foreground cursor-pointer" title="Copy Audit ID">
                      {copiedId ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-extrabold">Request ID</span>
                  <span className="truncate text-[11px] font-bold text-foreground mt-1 block">{selectedEvent.requestId}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-extrabold">User</span>
                  <span className="text-foreground mt-1 block font-semibold">{selectedEvent.userId || 'System'}{selectedEvent.department ? ` · ${selectedEvent.department}` : ''}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-extrabold">Layer</span>
                  <span className="text-primary mt-1 block uppercase font-bold">{selectedEvent.layer}</span>
                </div>
                {selectedEvent.errorCode && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground block text-[10px] uppercase font-extrabold">Error Code</span>
                    <span className="text-danger mt-1 block font-bold">{selectedEvent.errorCode}</span>
                  </div>
                )}
              </div>

              {/* Model / tokens / latency — only meaningful for requests that reached inference */}
              {(selectedEvent.modelUsed || selectedEvent.promptTokens > 0 || selectedEvent.latencyMs > 0) && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-secondary/30">
                    <Cpu className="size-3.5 text-primary flex-none" />
                    <div className="min-w-0">
                      <span className="block text-[9.5px] uppercase font-extrabold text-muted-foreground">Model</span>
                      <span className="block font-bold text-foreground truncate">{selectedEvent.modelUsed || '—'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-secondary/30">
                    <Fingerprint className="size-3.5 text-primary flex-none" />
                    <div className="min-w-0">
                      <span className="block text-[9.5px] uppercase font-extrabold text-muted-foreground">Tokens</span>
                      <span className="block font-bold text-foreground">{selectedEvent.promptTokens} / {selectedEvent.completionTokens}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-secondary/30">
                    <Timer className="size-3.5 text-primary flex-none" />
                    <div className="min-w-0">
                      <span className="block text-[9.5px] uppercase font-extrabold text-muted-foreground">Latency</span>
                      <span className="block font-bold text-foreground">{selectedEvent.latencyMs}ms</span>
                    </div>
                  </div>
                </div>
              )}

              {(selectedEvent.piiActions.length > 0 || selectedEvent.policyDecisions.length > 0) && (
                <div className="grid grid-cols-2 gap-3">
                  {selectedEvent.piiActions.length > 0 && (
                    <div className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10">
                      <span className="block text-[9.5px] uppercase font-extrabold text-amber-600">PII Actions</span>
                      <span className="block font-semibold text-foreground mt-0.5">{selectedEvent.piiActions.join(', ')}</span>
                    </div>
                  )}
                  {selectedEvent.policyDecisions.length > 0 && (
                    <div className="p-2.5 rounded-lg border border-primary/30 bg-primary/10">
                      <span className="block text-[9.5px] uppercase font-extrabold text-primary">Policy Decisions</span>
                      <span className="block font-semibold text-foreground mt-0.5">{selectedEvent.policyDecisions.join(', ')}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Other events sharing this request_id — the full lifecycle of one call across layers */}
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-extrabold mb-1.5">Request Timeline</span>
                {loadingRelated ? (
                  <div className="h-8 rounded-lg bg-secondary animate-pulse" />
                ) : relatedEvents && relatedEvents.length > 1 ? (
                  <div className="space-y-1.5">
                    {relatedEvents
                      .slice()
                      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
                      .map((re) => {
                        const c = OUTCOME_CONFIG[re.outcome] || DEFAULT_OUTCOME_CONFIG
                        return (
                          <div key={re.id} className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border ${re.id === selectedEvent.id ? 'border-primary bg-primary/10' : 'border-border bg-secondary/20'}`}>
                            <span className="font-mono font-bold text-foreground">{labelizeEvent(re.eventType)}</span>
                            <span className="flex items-center gap-1.5">
                              <span className="uppercase text-[9.5px] font-extrabold" style={{ color: c.color }}>{c.label}</span>
                              <span className="text-muted-foreground">{new Date(re.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                            </span>
                          </div>
                        )
                      })}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No other events recorded for this request.</p>
                )}
              </div>
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

import { useEffect, useState } from 'react'
import {
  Search,
  ScrollText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Copy,
  Check,
  User,
  Terminal,
  Clock,
  Shield,
  Layers,
  Filter,
  ChevronDown
} from 'lucide-react'
import { api } from '@/api'
import type { AuditLogEntry } from '../types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const PAGE_SIZE = 12

const OUTCOME_CONFIG: Record<AuditLogEntry['outcome'], { icon: any; color: string; bg: string; border: string; label: string; text: string }> = {
  passed: { icon: CheckCircle2, color: '#22c55e', bg: '#dcfce7', border: '#bbf7d0', label: 'Passed', text: '#15803d' },
  denied: { icon: AlertCircle, color: '#f59e0b', bg: '#fef3c7', border: '#fde68a', label: 'Denied', text: '#b45309' },
  error: { icon: XCircle, color: '#f43f5e', bg: '#ffe4e6', border: '#fecdd3', label: 'Error', text: '#be123c' },
}

const LAYER_ICONS: Record<string, any> = {
  gateway: Shield,
  auth: User,
  rbac: Layers,
  routing: Filter,
}

/* ── Expandable Accordion Row ── */
function ExpandableLogCard({ 
  event, 
  isExpanded, 
  onToggle 
}: { 
  event: AuditLogEntry; 
  isExpanded: boolean; 
  onToggle: () => void 
}) {
  const [copiedId, setCopiedId] = useState(false)
  const conf = OUTCOME_CONFIG[event.outcome] || OUTCOME_CONFIG.passed
  const StatusIcon = conf.icon
  const LayerIcon = LAYER_ICONS[event.layer?.toLowerCase()] || Terminal

  function handleCopyTrace(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    navigator.clipboard.writeText(id)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }

  return (
    <div className={`flex flex-col bg-white rounded-2xl border transition-all duration-300 shadow-sm overflow-hidden ${
      isExpanded ? 'border-slate-300 shadow-md my-4' : 'border-slate-200 hover:border-slate-300 hover:shadow-md mb-3'
    }`}>
      
      {/* Visible Summary Header (Always shown) */}
      <div 
        onClick={onToggle}
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 cursor-pointer transition-colors ${
          isExpanded ? 'bg-slate-50/80 border-b border-slate-100' : 'bg-white'
        }`}
      >
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div 
            className="size-10 rounded-full flex items-center justify-center flex-none border-2"
            style={{ backgroundColor: conf.bg, borderColor: conf.border, color: conf.text }}
          >
            <StatusIcon className="size-5" />
          </div>
          
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-mono text-sm font-bold text-slate-900 truncate">
                {event.event}
              </h3>
              <Badge
                variant="outline"
                className="text-[9px] px-2 py-0 rounded-full font-bold capitalize hidden sm:inline-flex"
                style={{ borderColor: conf.border, color: conf.text, background: conf.bg }}
              >
                {conf.label}
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs font-medium text-slate-500">
              <span className="inline-flex items-center gap-1.5 truncate">
                <User className="size-3 text-slate-400" />
                {event.actorEmail || 'System'}
              </span>
              <span className="size-1 rounded-full bg-slate-300 flex-none hidden sm:block" />
              <span className="inline-flex items-center gap-1.5 uppercase tracking-wider text-[10px] font-bold">
                <LayerIcon className="size-3 text-slate-400" />
                {event.layer || 'API GATEWAY'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-1/4">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-400 font-mono">
            <Clock className="size-3.5" />
            {new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <div className={`p-1.5 rounded-full transition-transform duration-300 ${isExpanded ? 'bg-slate-200 rotate-180' : 'bg-slate-100'}`}>
            <ChevronDown className="size-4 text-slate-600" />
          </div>
        </div>
      </div>

      {/* Expanded Inline Detail Body */}
      {isExpanded && (
        <div className="p-4 sm:p-6 bg-slate-50/30 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 items-start">
            
            {/* Trace ID */}
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Security Trace ID</h4>
              <div className="flex items-center gap-2">
                <code className="text-xs font-bold text-slate-800 bg-white border border-slate-200 px-3 py-1.5 rounded-md shadow-sm break-all">
                  {event.id}
                </code>
                <button 
                  type="button" 
                  onClick={(e) => handleCopyTrace(e, event.id)} 
                  className="text-slate-400 hover:text-green-600 transition-colors p-2 rounded-md border border-slate-200 bg-white shadow-sm shrink-0 cursor-pointer" 
                  title="Copy Trace ID"
                >
                  {copiedId ? <Check className="size-3.5 text-green-600" /> : <Copy className="size-3.5" />}
                </button>
              </div>
            </div>
            
            {/* Timestamp */}
            <div className="flex flex-col gap-1.5">
              <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Timestamp</h4>
              <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-md shadow-sm h-[32px] flex items-center">
                <p className="text-xs font-semibold text-slate-700">
                  {new Date(event.createdAt).toLocaleDateString()} {new Date(event.createdAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
            
            {/* Outcome */}
            <div className="flex flex-col gap-1.5">
              <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Outcome</h4>
              <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-md shadow-sm h-[32px] flex items-center">
                <p className="text-xs font-bold capitalize flex items-center gap-1.5" style={{ color: conf.text }}>
                  <StatusIcon className="size-3.5" />
                  {event.outcome}
                </p>
              </div>
            </div>

          </div>

          {/* Policy Layer Info Box */}
          <div className="mt-6 p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center gap-3 text-slate-600 font-medium text-xs">
            <Shield className="size-5 text-slate-400 flex-none" />
            <p>Policy evaluation verified and executed at the <span className="font-bold text-slate-800 uppercase tracking-wide px-1">{event.layer || 'API GATEWAY'}</span> security layer.</p>
          </div>
        </div>
      )}
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
  const [expandedId, setExpandedId] = useState<string | null>(null)
  
  async function load(q: string, off: number, outcome: string, layer: string) {
    setLoading(true)
    try {
      const { data } = await api.get('/audit-log', {
        params: { q: q || undefined, outcome, layer, offset: off, limit: PAGE_SIZE },
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

  useEffect(() => { load('', 0, 'all', 'all') }, [])

  useEffect(() => {
    const t = setTimeout(() => { setOffset(0); load(query, 0, outcomeFilter, layerFilter) }, 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    setOffset(0)
    load(query, 0, outcomeFilter, layerFilter)
  }, [outcomeFilter, layerFilter])

  const filteredEvents = Array.isArray(events) ? events : []

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id)
  }

  return (
    <div className="page space-y-6 animate-slide-up p-4 sm:p-6 lg:p-8 min-h-screen bg-slate-50/50">
      
      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row items-center gap-4 w-full bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
            placeholder="Search trace id, event, user..." 
            className="pl-11 h-12 w-full rounded-xl border-slate-200 bg-slate-50 text-slate-900 font-medium placeholder:text-slate-400 text-sm focus-visible:ring-green-500/30 transition-all" 
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
            <SelectTrigger className="flex-1 sm:w-[160px] h-12 rounded-xl bg-slate-50 border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors">
              <SelectValue placeholder="All Outcomes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Outcomes</SelectItem>
              <SelectItem value="passed">Passed</SelectItem>
              <SelectItem value="denied">Denied</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
          <Select value={layerFilter} onValueChange={setLayerFilter}>
            <SelectTrigger className="flex-1 sm:w-[160px] h-12 rounded-xl bg-slate-50 border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors">
              <SelectValue placeholder="All Layers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Layers</SelectItem>
              <SelectItem value="gateway">API Gateway</SelectItem>
              <SelectItem value="auth">Auth</SelectItem>
              <SelectItem value="rbac">RBAC</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Accordion List Container */}
      <div className="max-w-5xl mx-auto w-full">
        {loading ? (
          <div className="space-y-3 py-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-[88px] rounded-2xl bg-white border border-slate-200 shadow-sm animate-pulse" style={{ animationDelay: `${i * 40}ms` }} />
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="py-24 text-center text-sm text-slate-500 flex flex-col items-center gap-4 bg-white rounded-3xl border border-slate-200 border-dashed">
            <div className="size-16 rounded-full bg-slate-50 flex items-center justify-center">
              <ScrollText className="size-8 text-slate-300" />
            </div>
            <p className="font-medium text-slate-600">No telemetry traces found for this filter.</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {filteredEvents.map((event) => (
              <ExpandableLogCard 
                key={event.id} 
                event={event} 
                isExpanded={expandedId === event.id}
                onToggle={() => toggleExpand(event.id)}
              />
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-medium text-slate-500 text-center sm:text-left">
             Showing <span className="text-slate-900 font-bold">{total === 0 ? 0 : offset + 1}-{Math.min(offset + PAGE_SIZE, total)}</span> of <span className="text-slate-900 font-bold">{total}</span> events
          </div>
          <div className="flex items-center gap-2">
            <Button 
              type="button"
              variant="outline" 
              size="sm" 
              className="h-9 px-4 rounded-xl text-xs font-bold border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 disabled:bg-slate-50 cursor-pointer"
              disabled={offset === 0}
              onClick={() => { 
                setExpandedId(null); 
                setOffset(Math.max(0, offset - PAGE_SIZE)); 
                load(query, Math.max(0, offset - PAGE_SIZE), outcomeFilter, layerFilter); 
              }}
            >
              Previous
            </Button>
            <Button 
              type="button"
              variant="outline" 
              size="sm" 
              className="h-9 px-4 rounded-xl text-xs font-bold border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 disabled:bg-slate-50 cursor-pointer"
              disabled={offset + PAGE_SIZE >= total}
              onClick={() => { 
                setExpandedId(null); 
                setOffset(offset + PAGE_SIZE); 
                load(query, offset + PAGE_SIZE, outcomeFilter, layerFilter); 
              }}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
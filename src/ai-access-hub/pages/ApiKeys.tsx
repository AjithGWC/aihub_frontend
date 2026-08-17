import { useEffect, useState, type FormEvent } from 'react'
import {
  KeyRound,
  ShieldCheck,
  Clock,
  Copy,
  Check,
  Search,
  Eye,
  EyeOff,
  User,
  Zap,
  Trash2,
  Lock,
  AlertCircle,
  Plus,
  Vault,
  X,
  ShieldAlert,
  ArrowLeft,
} from 'lucide-react'
import { api } from '@/api'
import type { ApiKeyRecord } from '../types'
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { Pagination } from '../components/Pagination'

const PAGE_SIZE = 9

const PROVIDER_META: Record<string, { color: string; glow: string; bg: string; gradient: string; symbol: string }> = {
  openai:    { color: '#10b981', glow: 'rgba(16,185,129,0.5)',  bg: 'rgba(16,185,129,0.15)',  gradient: 'linear-gradient(135deg, #10b981, #065f46)', symbol: 'OA' },
  anthropic: { color: '#8b5cf6', glow: 'rgba(139,92,246,0.5)',  bg: 'rgba(139,92,246,0.15)',  gradient: 'linear-gradient(135deg, #8b5cf6, #4c1d95)', symbol: 'AN' },
  azure:     { color: '#3b82f6', glow: 'rgba(59,130,246,0.5)',  bg: 'rgba(59,130,246,0.15)',  gradient: 'linear-gradient(135deg, #3b82f6, #1e3a8a)', symbol: 'AZ' },
  cohere:    { color: '#f59e0b', glow: 'rgba(245,158,11,0.5)',  bg: 'rgba(245,158,11,0.15)',  gradient: 'linear-gradient(135deg, #f59e0b, #78350f)', symbol: 'CO' },
  google:    { color: '#f97316', glow: 'rgba(249,115,22,0.5)',  bg: 'rgba(249,115,22,0.15)',  gradient: 'linear-gradient(135deg, #f97316, #7c2d12)', symbol: 'GG' },
  mistral:   { color: '#e11d48', glow: 'rgba(225,29,72,0.5)',   bg: 'rgba(225,29,72,0.15)',   gradient: 'linear-gradient(135deg, #e11d48, #4c0519)', symbol: 'MS' },
}
const DEFAULT_META = { color: '#64748b', glow: 'rgba(100,116,139,0.4)', bg: 'rgba(100,116,139,0.15)', gradient: 'linear-gradient(135deg, #64748b, #1e293b)', symbol: '??' }

function getProviderMeta(name?: string) {
  if (!name) return DEFAULT_META
  const lower = name.toLowerCase().trim()
  for (const key in PROVIDER_META) {
    if (lower.includes(key)) return PROVIDER_META[key]
  }

  // Dynamic symbol generator for custom providers (e.g. Ollama -> OL, Mixtral -> MX)
  const clean = name.replace(/[^a-zA-Z0-9\s]/g, ' ').trim()
  const words = clean.split(/\s+/).filter(Boolean)
  const symbol = words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : (name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2) || 'KEY').toUpperCase()

  const fallbackColors = [
    { color: '#06b6d4', glow: 'rgba(6,182,212,0.5)',  gradient: 'linear-gradient(135deg, #06b6d4, #155e75)' },
    { color: '#a855f7', glow: 'rgba(168,85,247,0.5)', gradient: 'linear-gradient(135deg, #a855f7, #6b21a8)' },
    { color: '#f97316', glow: 'rgba(249,115,22,0.5)', gradient: 'linear-gradient(135deg, #f97316, #9a3412)' },
    { color: '#22c55e', glow: 'rgba(34,197,94,0.5)',  gradient: 'linear-gradient(135deg, #22c55e, #166534)' },
  ]
  const theme = fallbackColors[Math.abs(name.length) % fallbackColors.length]

  return {
    ...theme,
    bg: `${theme.color}25`,
    symbol
  }
}

function getOwnerEmail(owner: ApiKeyRecord['owner']): string {
  if (!owner) return '—'
  if (typeof owner === 'string') return owner
  return owner.email || owner.name || '—'
}

/* ── API Key Vault Row ── */
function VaultRow({ apiKey, onDelete, index }: { apiKey: ApiKeyRecord; onDelete: (k: ApiKeyRecord) => void; index: number }) {
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(false)
  const meta = getProviderMeta(apiKey.llmName || (apiKey as any).provider || apiKey.label)
  const isActive = apiKey.status === 'active'

  function handleCopy() {
    navigator.clipboard.writeText(apiKey.masked)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const expiresAt = apiKey.expiresAt ? new Date(apiKey.expiresAt) : null
  const isExpiringSoon = expiresAt && (expiresAt.getTime() - Date.now()) < 7 * 24 * 60 * 60 * 1000
  const isExpired = expiresAt && expiresAt < new Date()

  return (
    <TableRow
      className="group border-slate-100 hover:bg-orange-50/50 transition-colors animate-slide-up"
      style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
    >
      {/* Provider + Label */}
      <TableCell className="py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="size-9 rounded-xl flex items-center justify-center text-xs font-black text-white flex-none"
            style={{ background: meta.gradient, boxShadow: `0 0 0 3px #fff, 0 0 10px ${meta.glow}` }}
          >
            {meta.symbol}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 capitalize truncate group-hover:text-[#ea580c] transition-colors">
              {apiKey.llmName || (apiKey as any).provider || 'Unknown Provider'}
            </p>
            <p className="text-[11px] text-slate-500 font-semibold truncate">{apiKey.label}</p>
          </div>
        </div>
      </TableCell>

      {/* Key */}
      <TableCell className="whitespace-nowrap">
        <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-[11px] text-slate-800 bg-slate-50 border border-slate-200 w-fit">
          <span className="tracking-wide font-semibold">{revealed ? apiKey.masked : '••••••••••••'}</span>
          <button onClick={() => setRevealed(!revealed)} className="p-1 rounded hover:bg-slate-200 transition-colors cursor-pointer" title={revealed ? 'Hide Secret' : 'Reveal Secret'}>
            {revealed ? <EyeOff className="size-3 text-slate-600" /> : <Eye className="size-3 text-slate-600" />}
          </button>
          <button onClick={handleCopy} className="p-1 rounded hover:bg-slate-200 transition-colors cursor-pointer" title="Copy Key">
            {copied ? <Check className="size-3 text-[#16a34a]" /> : <Copy className="size-3 text-slate-600" />}
          </button>
        </div>
      </TableCell>

      {/* Owner */}
      <TableCell className="whitespace-nowrap">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <User className="size-3.5 text-[#ea580c]" />
          {getOwnerEmail(apiKey.owner)}
        </span>
      </TableCell>

      {/* Expiry */}
      <TableCell className="whitespace-nowrap">
        {expiresAt ? (
          <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${isExpired ? 'text-red-600' : isExpiringSoon ? 'text-amber-600' : 'text-slate-600'}`}>
            <Clock className="size-3.5 flex-none" />
            {isExpired ? 'Expired ' : ''}{expiresAt.toLocaleDateString()}
            {isExpired && <AlertCircle className="size-3.5 text-red-600" />}
          </span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )}
      </TableCell>

      {/* Status */}
      <TableCell className="whitespace-nowrap">
        <Badge
          variant="outline"
          className="text-[10px] px-2 py-0.5 font-bold"
          style={{
            color: isActive ? '#16a34a' : '#dc2626',
            borderColor: isActive ? 'rgba(34,197,94,0.4)' : 'rgba(244,63,94,0.4)',
            background: isActive ? 'rgba(34,197,94,0.12)' : 'rgba(244,63,94,0.12)',
          }}
        >
          {isActive ? '● Active' : '○ Revoked'}
        </Badge>
      </TableCell>

      {/* Actions */}
      <TableCell className="text-right whitespace-nowrap">
        <button
          onClick={() => onDelete(apiKey)}
          className="magnetic-btn inline-flex items-center justify-center size-8 rounded-lg bg-red-500/10 border border-red-500/40 hover:bg-red-500/20 transition-all text-red-600 cursor-pointer opacity-70 group-hover:opacity-100"
          title="Revoke Key"
        >
          <Trash2 className="size-3.5 icon-spring" />
        </button>
      </TableCell>
    </TableRow>
  )
}

export default function ApiKeys() {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [deleteKey, setDeleteKey] = useState<ApiKeyRecord | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ label: '', llmName: '', key: '', expiresAt: '', user: '', status: 'active' as 'active' | 'inactive' })

  async function loadKeys(q: string, off: number) {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get('/api-keys', { params: { q: q || undefined, offset: off, limit: PAGE_SIZE } })
      const loaded = data?.keys ?? data?.apiKeys ?? (Array.isArray(data) ? data : [])
      setKeys(loaded)
      setTotal(data?.total ?? loaded.length)
    } catch { setError('Failed to load API keys.') }
    finally { setLoading(false) }
  }

  useEffect(() => { loadKeys('', 0) }, [])
  useEffect(() => {
    const t = setTimeout(() => { setOffset(0); loadKeys(query, 0) }, 300)
    return () => clearTimeout(t)
  }, [query])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/api-keys', { ...form, expiresAt: form.expiresAt || undefined })
      setShowCreate(false)
      setForm({ label: '', llmName: '', key: '', expiresAt: '', user: '', status: 'active' })
      loadKeys(query, offset)
    } catch { setError('Failed to create API key.') }
    finally { setSubmitting(false) }
  }

  async function handleDelete(k: ApiKeyRecord) {
    setSubmitting(true)
    try {
      await api.delete(`/api-keys/${k.id}`)
      setDeleteKey(null)
      loadKeys(query, offset)
    } catch { setError('Failed to revoke API key.') }
    finally { setSubmitting(false) }
  }

  const safeKeys = Array.isArray(keys) ? keys : []
  const activeCount = safeKeys.filter((k) => k.status === 'active').length
  const providerSet = new Set(safeKeys.map((k) => k.llmName).filter(Boolean))

  return (
    <div className="page sector-orange space-y-6 animate-slide-up">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#f97316]/30 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="cyber-pulse-dot cyber-pulse-dot-amber" />
            <h1 className="text-2xl font-bold tracking-tight sector-header-title">API Key Vault</h1>
            <Badge variant="outline" className="sector-badge text-xs font-mono"><Lock className="size-3 mr-1 inline" />Encrypted at Rest</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Manage provider credentials across inference routes. Keys are AES-256 encrypted.</p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.dispatchEvent(new CustomEvent('hexagon-hub-back'))}
            className="border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 font-extrabold shadow-sm cursor-pointer"
          >
            <ArrowLeft className="size-3.5 mr-1" />
            All Sectors
          </Button>

          <Button onClick={() => setShowCreate(true)} size="sm" className="gap-2 text-xs font-bold magnetic-btn cursor-pointer" style={{ background: 'linear-gradient(135deg, #f97316, #b45309)', boxShadow: '0 0 20px rgba(249,115,22,0.3)' }}>
            <Plus className="size-3.5" />Add API Key
          </Button>
        </div>
      </header>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
          <ShieldAlert className="size-4 flex-none" /><span className="flex-1">{error}</span>
          <button onClick={() => setError(null)}><X className="size-3.5" /></button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Vault Keys', value: total, icon: KeyRound, color: '#f97316', chip: 'AES-256', glow: 'rgba(249,115,22,0.45)' },
          { label: 'Active Credentials', value: activeCount, icon: ShieldCheck, color: '#22c55e', chip: 'Healthy', glow: 'rgba(34,197,94,0.45)' },
          { label: 'Connected LLMs', value: providerSet.size, icon: Zap, color: '#8b5cf6', chip: 'Live Providers', glow: 'rgba(139,92,246,0.45)' },
        ].map(({ label, value, icon: Icon, color, chip, glow }, i) => (
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
                <div className="size-11 rounded-xl flex items-center justify-center text-white flex-none transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 shadow-md" style={{ background: color, boxShadow: `0 0 20px ${glow}` }}>
                  <Icon className="size-5 text-white" />
                </div>
              </div>
              <div>
                <p className="text-3xl font-black font-mono tracking-tight transition-transform duration-300 group-hover:scale-105 group-hover:translate-x-0.5" style={{ color, textShadow: `0 0 18px ${color}45` }}>{value}</p>
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

      {total > 0 && (
        <div className="sector-card rounded-xl p-4 space-y-2 border-slate-200 relative overflow-hidden group shadow-md" style={{ background: 'linear-gradient(135deg, #ffffff, #f8fafc)' }}>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-800 font-extrabold flex items-center gap-1.5"><Vault className="size-3.5 text-[#ea580c] animate-pulse" /> Vault Capacity</span>
            <span className="font-mono font-extrabold text-[#ea580c]">{activeCount}/{total} active</span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-100 border border-slate-300 overflow-hidden relative">
            <div className="h-full rounded-full transition-all duration-1000 relative overflow-hidden" style={{ width: 0, background: 'linear-gradient(90deg, #ea580c, #f59e0b, #fb923c)', boxShadow: '0 0 12px rgba(234,88,12,0.5)' }}
              ref={(el) => { if (el) setTimeout(() => { el.style.width = `${(activeCount / total) * 100}%` }, 50) }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse" />
            </div>
          </div>
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by label or provider…" className="pl-9 bg-white border-[#f97316]/50 text-slate-900 font-semibold placeholder:text-slate-400 text-sm shadow-sm" />
        {query && <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"><X className="size-3.5 text-slate-400 hover:text-slate-700" /></button>}
      </div>

      <div className="sector-card rounded-2xl overflow-hidden shadow-xl border-slate-200" style={{ background: 'linear-gradient(135deg, #ffffff, #f8fafc)' }}>
        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-11 rounded-xl bg-slate-100 animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />)}
          </div>
        ) : safeKeys.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
            <KeyRound className="size-8 text-muted-foreground/30" />No API keys found.
          </div>
        ) : (
          <div className="px-4">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200 hover:bg-transparent bg-slate-50/80">
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-slate-600">Provider</TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-slate-600">Key</TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-slate-600">Owner</TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-slate-600">Expires</TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-slate-600">Status</TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-slate-600 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {safeKeys.map((key, i) => <VaultRow key={key.id} apiKey={key} onDelete={setDeleteKey} index={i} />)}
              </TableBody>
            </Table>
          </div>
        )}

        <Pagination offset={offset} limit={PAGE_SIZE} total={total} onChange={(off) => { setOffset(off); loadKeys(query, off) }} />
      </div>

      {showCreate && (
        <Dialog open onOpenChange={(n) => !n && setShowCreate(false)}>
          <DialogContent className="sm:max-w-lg border-t-4 border-t-[#f97316] shadow-2xl rounded-2xl bg-white p-6 border-slate-200 animate-in fade-in-50 zoom-in-95 duration-200">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5 text-lg font-black text-slate-900 tracking-tight">
                <div className="size-8 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center flex-none">
                  <KeyRound className="size-4 text-[#ea580c]" />
                </div>
                Add API Key to Vault
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black uppercase tracking-wider text-slate-700">Key Label</Label>
                  <Input value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="Production OpenAI" required className="bg-slate-50 border-slate-300 text-slate-900 font-semibold text-xs shadow-xs focus:bg-white focus:border-[#f97316] focus:ring-2 focus:ring-[#f97316]/20 transition-all rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black uppercase tracking-wider text-slate-700">Provider (LLM Name)</Label>
                  <Select value={form.llmName} onValueChange={(v) => setForm((f) => ({ ...f, llmName: v }))}>
                    <SelectTrigger className="bg-slate-50 border-slate-300 text-slate-900 font-semibold text-xs shadow-xs focus:bg-white focus:border-[#f97316] focus:ring-2 focus:ring-[#f97316]/20 transition-all rounded-xl"><SelectValue placeholder="Select provider" /></SelectTrigger>
                    <SelectContent className="bg-white text-slate-900 border-slate-200 shadow-xl rounded-xl">
                      {['openai', 'anthropic', 'azure', 'cohere', 'google', 'mistral'].map((p) => (
                        <SelectItem key={p} value={p} className="capitalize text-slate-900 font-medium cursor-pointer">{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase tracking-wider text-slate-700">API Key Secret</Label>
                <Input type="password" value={form.key} onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))} placeholder="sk-..." required className="bg-slate-50 border-slate-300 text-slate-900 font-semibold font-mono text-xs shadow-xs focus:bg-white focus:border-[#f97316] focus:ring-2 focus:ring-[#f97316]/20 transition-all rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black uppercase tracking-wider text-slate-700">Assigned User</Label>
                  <Input value={form.user} onChange={(e) => setForm((f) => ({ ...f, user: e.target.value }))} placeholder="alice@co.com" className="bg-slate-50 border-slate-300 text-slate-900 font-semibold text-xs shadow-xs focus:bg-white focus:border-[#f97316] focus:ring-2 focus:ring-[#f97316]/20 transition-all rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black uppercase tracking-wider text-slate-700">Expires At</Label>
                  <Input type="date" value={form.expiresAt} onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))} className="bg-slate-50 border-slate-300 text-slate-900 font-semibold text-xs shadow-xs focus:bg-white focus:border-[#f97316] focus:ring-2 focus:ring-[#f97316]/20 transition-all rounded-xl" />
                </div>
              </div>
              <DialogFooter className="pt-3 gap-2">
                <DialogClose asChild><Button variant="outline" size="sm" className="text-xs font-extrabold bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200 cursor-pointer rounded-xl px-4">Cancel</Button></DialogClose>
                <Button type="submit" size="sm" disabled={submitting} className="text-xs font-extrabold text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer rounded-xl px-5" style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}>
                  <Lock className="size-3.5 mr-1.5" />Store in Vault
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {deleteKey && (
        <Dialog open onOpenChange={(n) => !n && setDeleteKey(null)}>
          <DialogContent className="sm:max-w-md border-t-4 border-t-red-500 shadow-2xl rounded-2xl bg-white p-6 border-slate-200 animate-in fade-in-50 zoom-in-95 duration-200">
            <DialogHeader>
              <DialogTitle className="text-base font-black text-red-600 flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center justify-center flex-none">
                  <Trash2 className="size-4 text-red-600" />
                </div>
                Revoke API Key
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-slate-700 py-2 font-medium">Permanently revoke <span className="font-extrabold text-slate-900">{deleteKey.label}</span>? Applications using this key will immediately lose access.</p>
            <DialogFooter className="mt-3 gap-2">
              <DialogClose asChild><Button variant="outline" size="sm" className="text-xs font-extrabold bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200 cursor-pointer rounded-xl px-4">Cancel</Button></DialogClose>
              <Button variant="destructive" size="sm" disabled={submitting} onClick={() => handleDelete(deleteKey)} className="text-xs font-extrabold cursor-pointer rounded-xl px-5 shadow-md hover:shadow-lg">
                <Trash2 className="size-3.5 mr-1" />Revoke Key
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

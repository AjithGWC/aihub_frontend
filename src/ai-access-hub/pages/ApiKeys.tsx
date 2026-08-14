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
  ShieldAlert
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

/* ── API Key Vault Card ── */
function VaultCard({ apiKey, onDelete, index }: { apiKey: ApiKeyRecord; onDelete: (k: ApiKeyRecord) => void; index: number }) {
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
    <div
      className="spotlight-card sector-card card-hover-lift rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden animate-slide-left group shadow-lg border-slate-200"
      style={{
        animationDelay: `${index * 60}ms`,
        background: `radial-gradient(circle at 50% 0%, ${meta.color}10, transparent 75%), linear-gradient(135deg, #ffffff, #f8fafc)`,
        border: `1.5px solid ${meta.color}35`,
        boxShadow: `0 8px 24px rgba(15, 23, 42, 0.06)`
      }}
    >
      {/* Provider watermark */}
      <div className="absolute top-0 right-0 text-[85px] font-extrabold leading-none select-none pointer-events-none opacity-[0.05]" style={{ color: meta.color, top: '-12px', right: '10px' }}>
        {meta.symbol}
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-2 z-10">
        <div className="flex items-center gap-3">
          {/* Provider badge with orbit ring */}
          <div className="relative flex items-center justify-center">
            <svg width="50" height="50" className="absolute -rotate-90 pointer-events-none">
              <circle
                cx="25" cy="25" r="23"
                fill="none" stroke={meta.color} strokeWidth="1.5" strokeDasharray="3 4" opacity="0.4" className="animate-spin" style={{ animationDuration: '10s' }}
              />
            </svg>
            <div className="size-10 rounded-xl flex items-center justify-center text-xs font-black text-white flex-none transition-transform group-hover:scale-105" style={{ background: meta.gradient, boxShadow: `0 0 16px ${meta.glow}` }}>
              {meta.symbol}
            </div>
          </div>

          <div className="min-w-0">
            <p className="text-sm font-extrabold text-slate-900 capitalize group-hover:text-[#ea580c] transition-colors">{apiKey.llmName || (apiKey as any).provider || 'Unknown Provider'}</p>
            <p className="text-[11px] text-slate-600 font-bold truncate max-w-[140px]">{apiKey.label}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border shadow-sm" style={{ background: isActive ? 'rgba(34,197,94,0.12)' : 'rgba(244,63,94,0.12)', borderColor: isActive ? 'rgba(34,197,94,0.35)' : 'rgba(244,63,94,0.35)' }}>
          <span className="size-2 rounded-full" style={{ background: isActive ? '#22c55e' : '#f43f5e', boxShadow: isActive ? '0 0 8px #22c55e' : '0 0 8px #f43f5e' }} />
          <span className="text-[10px] font-extrabold" style={{ color: isActive ? '#16a34a' : '#dc2626' }}>{isActive ? 'Active' : 'Revoked'}</span>
        </div>
      </div>

      {/* Key display */}
      <div className="rounded-xl px-3.5 py-2.5 font-mono text-[11px] text-slate-900 flex items-center justify-between gap-2 z-10 bg-slate-50 border border-slate-200">
        <span className="truncate tracking-wide font-semibold">{revealed ? apiKey.masked : '••••••••••••••••••'}</span>
        <div className="flex items-center gap-1 flex-none">
          <button onClick={() => setRevealed(!revealed)} className="p-1.5 rounded hover:bg-slate-200 transition-colors">
            {revealed ? <EyeOff className="size-3.5 text-slate-600" /> : <Eye className="size-3.5 text-slate-600" />}
          </button>
          <button onClick={handleCopy} className="p-1.5 rounded hover:bg-slate-200 transition-colors">
            {copied ? <Check className="size-3.5 text-[#16a34a]" /> : <Copy className="size-3.5 text-slate-600" />}
          </button>
        </div>
      </div>

      {/* Owner */}
      <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-semibold z-10">
        <User className="size-3.5 text-[#ea580c]" /><span className="truncate">{getOwnerEmail(apiKey.owner)}</span>
      </div>

      {/* Expiry */}
      {expiresAt && (
        <div className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-bold z-10 ${isExpired ? 'bg-red-50 border border-red-200 text-red-700' : isExpiringSoon ? 'bg-amber-50 border border-amber-200 text-amber-700' : 'bg-slate-100 border border-slate-200 text-slate-700'}`}>
          <Clock className="size-3.5 flex-none" />
          {isExpired ? 'Expired on ' : 'Expires '}{expiresAt.toLocaleDateString()}
          {isExpired && <AlertCircle className="size-3.5 ml-auto text-red-600" />}
        </div>
      )}

      {/* Created at */}
      <p className="text-[10px] text-slate-400 font-mono z-10">Created {new Date(apiKey.createdAt).toLocaleDateString()}</p>

      {/* Delete */}
      <div className="flex justify-end mt-auto z-10">
        <button onClick={() => onDelete(apiKey)} className="magnetic-btn flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-extrabold text-red-300 bg-red-500/20 border border-red-500/50 hover:bg-red-500/35 transition-all shadow-sm">
          <Trash2 className="size-3.5 icon-spring" />Revoke
        </button>
      </div>
    </div>
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
        <Button onClick={() => setShowCreate(true)} size="sm" className="gap-2 text-xs font-bold" style={{ background: 'linear-gradient(135deg, #f97316, #b45309)', boxShadow: '0 0 20px rgba(249,115,22,0.3)' }}>
          <Plus className="size-3.5" />Add API Key
        </Button>
      </header>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
          <ShieldAlert className="size-4 flex-none" /><span className="flex-1">{error}</span>
          <button onClick={() => setError(null)}><X className="size-3.5" /></button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Keys', value: total, icon: KeyRound, color: '#f97316' },
          { label: 'Active Keys', value: activeCount, icon: ShieldCheck, color: '#22c55e' },
          { label: 'Providers', value: providerSet.size, icon: Zap, color: '#8b5cf6' },
        ].map(({ label, value, icon: Icon, color }, i) => (
          <div key={label} className="sector-card spotlight-card card-hover-lift p-4 flex items-center gap-3 rounded-xl animate-stagger-1 group border-slate-200" style={{ animationDelay: `${i * 80}ms`, background: `radial-gradient(circle at 50% 0%, ${color}12, transparent 70%), linear-gradient(135deg, #ffffff, #f8fafc)`, borderTop: `3.5px solid ${color}`, boxShadow: '0 6px 18px rgba(15, 23, 42, 0.06)' }}>
            <div className="p-2.5 rounded-lg flex-none transition-transform group-hover:scale-110" style={{ background: `${color}18`, border: `1px solid ${color}35` }}><Icon className="size-5 icon-spring" style={{ color }} /></div>
            <div>
              <p className="text-2xl font-extrabold font-mono text-slate-900">{value}</p>
              <p className="text-[10px] text-slate-600 font-extrabold uppercase tracking-wider">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {total > 0 && (
        <div className="sector-card rounded-xl p-4 space-y-2 border-slate-200" style={{ background: 'linear-gradient(135deg, #ffffff, #f8fafc)', boxShadow: '0 6px 18px rgba(15, 23, 42, 0.06)' }}>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-800 font-extrabold flex items-center gap-1.5"><Vault className="size-3.5 text-[#ea580c]" /> Vault Capacity</span>
            <span className="font-mono font-bold text-slate-900">{activeCount}/{total} active</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 border border-slate-300 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: 0, background: 'linear-gradient(90deg, #ea580c, #f59e0b)', boxShadow: '0 0 8px rgba(234,88,12,0.4)', transition: 'width 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.3s' }}
              ref={(el) => { if (el) setTimeout(() => { el.style.width = `${(activeCount / total) * 100}%` }, 50) }} />
          </div>
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by label or provider…" className="pl-9 bg-white border-[#f97316]/50 text-slate-900 font-semibold placeholder:text-slate-400 text-sm shadow-sm" />
        {query && <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="size-3.5 text-slate-400 hover:text-slate-700" /></button>}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-[260px] rounded-2xl bg-white/5 animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />)}
        </div>
      ) : safeKeys.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
          <KeyRound className="size-8 text-muted-foreground/30" />No API keys found.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {safeKeys.map((key, i) => <VaultCard key={key.id} apiKey={key} onDelete={setDeleteKey} index={i} />)}
        </div>
      )}

      <Pagination offset={offset} limit={PAGE_SIZE} total={total} onChange={(off) => { setOffset(off); loadKeys(query, off) }} />

      {showCreate && (
        <Dialog open onOpenChange={(n) => !n && setShowCreate(false)}>
          <DialogContent className="sm:max-w-lg sector-card animate-vault-open">
            <DialogHeader><DialogTitle className="flex items-center gap-2 text-base font-extrabold text-slate-900"><KeyRound className="size-4 text-[#ea580c]" />Add API Key to Vault</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Key Label</Label>
                  <Input value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="Production OpenAI" required className="bg-slate-50 border-slate-300 text-slate-900 font-semibold text-xs shadow-xs focus:bg-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Provider (LLM Name)</Label>
                  <Select value={form.llmName} onValueChange={(v) => setForm((f) => ({ ...f, llmName: v }))}>
                    <SelectTrigger className="bg-slate-50 border-slate-300 text-slate-900 font-semibold text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent className="bg-white text-slate-900 border-slate-200 shadow-xl">
                      {['openai', 'anthropic', 'azure', 'cohere', 'google', 'mistral'].map((p) => (
                        <SelectItem key={p} value={p} className="capitalize text-slate-900 font-medium">{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">API Key Secret</Label>
                <Input type="password" value={form.key} onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))} placeholder="sk-..." required className="bg-slate-50 border-slate-300 text-slate-900 font-semibold font-mono text-xs shadow-xs focus:bg-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Assigned User</Label>
                  <Input value={form.user} onChange={(e) => setForm((f) => ({ ...f, user: e.target.value }))} placeholder="alice@co.com" className="bg-slate-50 border-slate-300 text-slate-900 font-semibold text-xs shadow-xs focus:bg-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Expires At</Label>
                  <Input type="date" value={form.expiresAt} onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))} className="bg-slate-50 border-slate-300 text-slate-900 font-semibold text-xs shadow-xs focus:bg-white" />
                </div>
              </div>
              <DialogFooter className="pt-2">
                <DialogClose asChild><Button variant="outline" size="sm" className="text-xs font-bold bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200">Cancel</Button></DialogClose>
                <Button type="submit" size="sm" disabled={submitting} className="text-xs font-extrabold text-white shadow-md" style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)' }}>
                  <Lock className="size-3 mr-1.5" />Store in Vault
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {deleteKey && (
        <Dialog open onOpenChange={(n) => !n && setDeleteKey(null)}>
          <DialogContent className="sm:max-w-sm sector-card">
            <DialogHeader><DialogTitle className="text-base font-extrabold text-red-600 flex items-center gap-2"><Trash2 className="size-4" />Revoke API Key</DialogTitle></DialogHeader>
            <p className="text-sm text-slate-700 py-2 font-medium">Permanently revoke <span className="font-extrabold text-slate-900">{deleteKey.label}</span>? Applications using this key will immediately lose access.</p>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline" size="sm" className="text-xs font-bold bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200">Cancel</Button></DialogClose>
              <Button variant="destructive" size="sm" disabled={submitting} onClick={() => handleDelete(deleteKey)} className="text-xs font-bold">
                <Trash2 className="size-3 mr-1" />Revoke Key
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

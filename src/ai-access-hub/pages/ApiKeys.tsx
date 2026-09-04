import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  KeyRound,
  ShieldCheck,
  Clock,
  Copy,
  Check,
  Search,
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
  RefreshCw,
} from 'lucide-react'
import {
  createUserKey,
  listAllKeys,
  listModels,
  listUsers,
  revokeUserKey,
  type ApiKeyCreated,
  type ApiKeyWithOwner,
  type PortalModel,
  type PortalUserOut,
} from '@/api/portal'
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
import { MultiSelect } from '../components/MultiSelect'
import { Combobox } from '../components/Combobox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  openai:    { color: '#10b981', glow: 'rgba(16,185,129,0.4)',  bg: 'rgba(16,185,129,0.1)',  gradient: 'linear-gradient(135deg, #10b981, #059669)', symbol: 'OA' },
  anthropic: { color: '#8b5cf6', glow: 'rgba(139,92,246,0.4)',  bg: 'rgba(139,92,246,0.1)',  gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', symbol: 'AN' },
  azure:     { color: '#3b82f6', glow: 'rgba(59,130,246,0.4)',  bg: 'rgba(59,130,246,0.1)',  gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)', symbol: 'AZ' },
  cohere:    { color: '#f59e0b', glow: 'rgba(245,158,11,0.4)',  bg: 'rgba(245,158,11,0.1)',  gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', symbol: 'CO' },
  google:    { color: '#f97316', glow: 'rgba(249,115,22,0.4)',  bg: 'rgba(249,115,22,0.1)',  gradient: 'linear-gradient(135deg, #f97316, #ea580c)', symbol: 'GG' },
  mistral:   { color: '#e11d48', glow: 'rgba(225,29,72,0.4)',   bg: 'rgba(225,29,72,0.1)',   gradient: 'linear-gradient(135deg, #e11d48, #e11d48)', symbol: 'MS' },
  ollama:    { color: '#22c55e', glow: 'rgba(34,197,94,0.4)',   bg: 'rgba(34,197,94,0.1)',   gradient: 'linear-gradient(135deg, #22c55e, #16a34a)', symbol: 'OL' },
}
const DEFAULT_META = { color: 'var(--muted)', glow: 'var(--primary-soft)', bg: 'var(--primary-soft)', gradient: 'linear-gradient(135deg, var(--muted), var(--foreground))', symbol: '??' }

function getProviderMeta(name?: string) {
  if (!name) return DEFAULT_META
  const lower = name.toLowerCase().trim()
  for (const key in PROVIDER_META) {
    if (lower.includes(key)) return PROVIDER_META[key]
  }

  const clean = name.replace(/[^a-zA-Z0-9\s]/g, ' ').trim()
  const words = clean.split(/\s+/).filter(Boolean)
  const symbol = words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : (name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2) || 'KEY').toUpperCase()

  const fallbackColors = [
    { color: '#06b6d4', glow: 'rgba(6,182,212,0.4)',  gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)' },
    { color: '#a855f7', glow: 'rgba(168,85,247,0.4)', gradient: 'linear-gradient(135deg, #a855f7, #7c3aed)' },
    { color: '#f97316', glow: 'rgba(249,115,22,0.4)', gradient: 'linear-gradient(135deg, #f97316, #ea580c)' },
    { color: '#22c55e', glow: 'rgba(34,197,94,0.4)',  gradient: 'linear-gradient(135deg, #22c55e, #16a34a)' },
  ]
  const theme = fallbackColors[Math.abs(name.length) % fallbackColors.length]

  return { ...theme, bg: `${theme.color}15`, symbol }
}

function toApiKeyRecord(k: ApiKeyWithOwner): ApiKeyRecord {
  return {
    id: k.key_id,
    label: k.label,
    keyPrefix: k.key_prefix,
    modelEntitlements: k.model_entitlements ?? [],
    owner: { id: k.user_id, name: k.owner_username },
    expiresAt: k.expires_at,
    rateLimitRpm: k.rate_limit_rpm,
    status: k.status,
    createdAt: k.created_at,
  }
}

/* ── API Key Vault Row ── */
function VaultRow({ apiKey, onDelete, index }: { apiKey: ApiKeyRecord; onDelete: (k: ApiKeyRecord) => void; index: number }) {
  const [copied, setCopied] = useState(false)
  const meta = getProviderMeta(apiKey.modelEntitlements[0] || apiKey.label || undefined)
  const isActive = apiKey.status === 'active'

  function handleCopy() {
    navigator.clipboard.writeText(apiKey.keyPrefix)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const expiresAt = apiKey.expiresAt ? new Date(apiKey.expiresAt) : null
  const isExpiringSoon = expiresAt && (expiresAt.getTime() - Date.now()) < 7 * 24 * 60 * 60 * 1000
  const isExpired = expiresAt && expiresAt < new Date()

  return (
    <TableRow
      className="group border-border hover:bg-secondary/40 transition-colors animate-slide-up"
      style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
    >
      {/* Models + Label */}
      <TableCell className="py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="size-9 rounded-xl flex items-center justify-center text-xs font-black text-white flex-none shadow-sm"
            style={{ background: meta.gradient, boxShadow: `0 0 0 2px var(--background), 0 0 8px ${meta.glow}` }}
          >
            {meta.symbol}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground truncate transition-colors">
              {apiKey.label || 'Untitled Key'}
            </p>
            <p className="text-[11px] text-muted-foreground font-semibold truncate">
              {apiKey.modelEntitlements.length > 0 ? apiKey.modelEntitlements.join(', ') : 'All models'}
            </p>
          </div>
        </div>
      </TableCell>

      {/* Key prefix */}
      <TableCell className="whitespace-nowrap">
        <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-[11px] text-foreground bg-secondary/50 border border-border w-fit">
          <span className="tracking-wide font-semibold">{apiKey.keyPrefix}…</span>
          <button onClick={handleCopy} className="p-1 rounded hover:bg-secondary transition-colors cursor-pointer" title="Copy prefix">
            {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3 text-muted-foreground" />}
          </button>
        </div>
      </TableCell>

      {/* Owner */}
      <TableCell className="whitespace-nowrap">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <User className="size-3.5 text-primary" />
          {apiKey.owner.name || '—'}
        </span>
      </TableCell>

      {/* Expiry */}
      <TableCell className="whitespace-nowrap">
        {expiresAt ? (
          <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${isExpired ? 'text-danger' : isExpiringSoon ? 'text-amber-500' : 'text-muted-foreground'}`}>
            <Clock className="size-3.5 flex-none" />
            {isExpired ? 'Expired ' : ''}{expiresAt.toLocaleDateString()}
            {isExpired && <AlertCircle className="size-3.5 text-danger" />}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>

      {/* Status */}
      <TableCell className="whitespace-nowrap">
        <Badge
          variant="outline"
          className="text-[10px] px-2 py-0.5 font-bold capitalize"
          style={{
            color: isActive ? '#16a34a' : 'var(--danger)',
            borderColor: isActive ? 'rgba(34,197,94,0.3)' : 'var(--border)',
            background: isActive ? 'rgba(34,197,94,0.1)' : 'var(--secondary)',
          }}
        >
          {isActive ? '● Active' : `○ ${apiKey.status}`}
        </Badge>
      </TableCell>

      {/* Actions */}
      <TableCell className="text-right whitespace-nowrap">
        <button onClick={() => onDelete(apiKey)} className="table-action-btn table-action-btn-danger" title="Revoke Key">
          <Trash2 className="size-4" />
        </button>
      </TableCell>
    </TableRow>
  )
}

export default function ApiKeys() {
  const [allKeys, setAllKeys] = useState<ApiKeyRecord[]>([])
  const [users, setUsers] = useState<PortalUserOut[]>([])
  const [models, setModels] = useState<PortalModel[]>([])
  const [offset, setOffset] = useState(0)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [deleteKey, setDeleteKey] = useState<ApiKeyRecord | null>(null)
  const [createdKey, setCreatedKey] = useState<ApiKeyCreated | null>(null)
  const [rawCopied, setRawCopied] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ label: '', userId: '', modelEntitlements: [] as string[], expiresAt: '', rateLimitRpm: 60 })

  async function loadAll() {
    setLoading(true)
    setError(null)
    try {
      const [keys, userList, modelList] = await Promise.all([listAllKeys(), listUsers(), listModels()])
      setAllKeys(keys.map(toApiKeyRecord))
      setUsers(userList)
      setModels(modelList)
    } catch { setError('Failed to load API keys.') }
    finally { setLoading(false) }
  }

  useEffect(() => { loadAll() }, [])
  useEffect(() => { setOffset(0) }, [query])

  const filteredKeys = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allKeys
    return allKeys.filter((k) =>
      (k.label || '').toLowerCase().includes(q) ||
      k.owner.name.toLowerCase().includes(q) ||
      k.modelEntitlements.some((m) => m.toLowerCase().includes(q))
    )
  }, [allKeys, query])

  const total = filteredKeys.length
  const pagedKeys = filteredKeys.slice(offset, offset + PAGE_SIZE)

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!form.userId) { setError('Pick a user to issue the key to.'); return }
    setSubmitting(true)
    try {
      const created = await createUserKey(form.userId, {
        label: form.label || undefined,
        model_entitlements: form.modelEntitlements,
        expires_at: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
        rate_limit_rpm: form.rateLimitRpm,
      })
      setShowCreate(false)
      setForm({ label: '', userId: '', modelEntitlements: [], expiresAt: '', rateLimitRpm: 60 })
      setCreatedKey(created)
      loadAll()
    } catch { setError('Failed to create API key.') }
    finally { setSubmitting(false) }
  }

  async function handleDelete(k: ApiKeyRecord) {
    setSubmitting(true)
    try {
      await revokeUserKey(k.owner.id, k.id)
      setDeleteKey(null)
      loadAll()
    } catch { setError('Failed to revoke API key.') }
    finally { setSubmitting(false) }
  }

  function handleCopyRaw() {
    if (!createdKey) return
    navigator.clipboard.writeText(createdKey.raw_key)
    setRawCopied(true)
    setTimeout(() => setRawCopied(false), 2000)
  }

  const activeCount = allKeys.filter((k) => k.status === 'active').length
  const providerSet = new Set(allKeys.flatMap((k) => k.modelEntitlements))

  return (
    <div className="page sector-orange space-y-6 animate-slide-up">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="cyber-pulse-dot cyber-pulse-dot-amber" />
            <h1 className="text-2xl font-bold tracking-tight sector-header-title">API Key Vault</h1>
            <Badge variant="outline" className="sector-badge text-xs font-mono border-border"><Lock className="size-3 mr-1 inline" />Server-Generated</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Issue and revoke per-user gateway credentials. The raw key is shown once, at creation.</p>
        </div>

        <div className="flex items-center gap-2.5">
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

          <Button
            type="button"
            onClick={() => setShowCreate(true)}
            size="sm"
            className="gap-2 text-xs font-extrabold bg-primary hover:bg-primary-hover text-primary-foreground border-1.5 border-primary/40 hover:border-primary rounded-xl h-9 px-4 shadow-sm hover:shadow-md cursor-pointer transition-all"
          >
            <Plus className="size-3.5" />Issue API Key
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
          { label: 'Total Vault Keys', value: allKeys.length, icon: KeyRound, color: '#f97316', chip: 'Issued' },
          { label: 'Active Credentials', value: activeCount, icon: ShieldCheck, color: '#22c55e', chip: 'Healthy' },
          { label: 'Entitled Models', value: providerSet.size, icon: Zap, color: '#8b5cf6', chip: 'In Use' },
        ].map(({ label, value, icon: Icon, color, chip }, i) => (
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

      {allKeys.length > 0 && (
        <div className="sector-card rounded-xl p-4 space-y-2 border border-border shadow-xs" style={{ background: 'var(--panel)' }}>
          <div className="flex items-center justify-between text-xs">
            <span className="text-foreground font-extrabold flex items-center gap-1.5"><Vault className="size-3.5 text-primary animate-pulse" /> Vault Capacity</span>
            <span className="font-mono font-extrabold text-primary">{activeCount}/{allKeys.length} active</span>
          </div>
          <div className="h-2 rounded-full bg-secondary border border-border overflow-hidden relative">
            <div className="h-full rounded-full transition-all duration-1000 relative overflow-hidden" style={{ width: 0, background: 'var(--primary)', boxShadow: '0 0 8px var(--primary-soft)' }}
              ref={(el) => { if (el) setTimeout(() => { el.style.width = `${(activeCount / allKeys.length) * 100}%` }, 50) }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
            </div>
          </div>
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by label, owner, or model…" className="pl-9 bg-background border-border text-foreground font-semibold placeholder:text-muted-foreground text-sm shadow-xs rounded-lg" />
        {query && <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"><X className="size-3.5 text-muted-foreground hover:text-foreground" /></button>}
      </div>

      <div className="sector-card rounded-xl overflow-hidden shadow-sm border border-border bg-card">
        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-11 rounded-xl bg-secondary animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />)}
          </div>
        ) : pagedKeys.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
            <KeyRound className="size-8 text-muted-foreground/30" />No API keys found.
          </div>
        ) : (
          <div className="px-4">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent bg-secondary/20">
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Key</TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Prefix</TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Owner</TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Expires</TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Status</TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedKeys.map((key, i) => <VaultRow key={key.id} apiKey={key} onDelete={setDeleteKey} index={i} />)}
              </TableBody>
            </Table>
          </div>
        )}

        <Pagination offset={offset} limit={PAGE_SIZE} total={total} onChange={setOffset} />
      </div>

      {showCreate && (
        <Dialog open onOpenChange={(n) => !n && setShowCreate(false)}>
          <DialogContent className="sm:max-w-lg shadow-2xl rounded-2xl bg-card p-6 sm:p-7 border border-border animate-in fade-in-50 zoom-in-95 duration-200">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-none text-primary shadow-xs">
                  <KeyRound className="size-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-black text-foreground tracking-tight">
                    Issue API Key
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                    Generate a new gateway token with fine-grained model access.
                  </p>
                </div>
              </div>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 py-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Key Label</Label>
                  <Input
                    value={form.label}
                    onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                    placeholder="Production access"
                    className="h-10 px-3.5 rounded-xl border border-border bg-secondary/40 hover:bg-secondary/60 focus:bg-background text-foreground font-semibold text-xs shadow-2xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Assign To</Label>
                  <Combobox
                    options={users.map((u) => ({ value: u.user_id, label: u.username }))}
                    value={form.userId}
                    onChange={(v) => setForm((f) => ({ ...f, userId: v }))}
                    placeholder="Select user"
                    searchPlaceholder="Search users…"
                    emptyText="No users found."
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Model Entitlements</Label>
                {models.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No models registered yet — the key will default to all active models.</p>
                ) : (
                  <MultiSelect
                    options={models.map((m) => ({ value: m.name, label: m.name }))}
                    selected={form.modelEntitlements}
                    onChange={(next) => setForm((f) => ({ ...f, modelEntitlements: next }))}
                    placeholder="All active models"
                    searchPlaceholder="Search models…"
                    emptyText="No models found."
                  />
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Rate Limit (req/min)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.rateLimitRpm}
                    onChange={(e) => setForm((f) => ({ ...f, rateLimitRpm: Number(e.target.value) || 1 }))}
                    className="h-10 px-3.5 rounded-xl border border-border bg-secondary/40 hover:bg-secondary/60 focus:bg-background text-foreground font-semibold text-xs shadow-2xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Expires At</Label>
                  <Input
                    type="date"
                    value={form.expiresAt}
                    onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                    className="h-10 px-3.5 rounded-xl border border-border bg-secondary/40 hover:bg-secondary/60 focus:bg-background text-foreground font-semibold text-xs shadow-2xs"
                  />
                </div>
              </div>
              <DialogFooter className="pt-4 gap-2.5">
                <DialogClose asChild>
                  <Button variant="outline" size="sm" className="h-10 px-4 text-xs font-extrabold bg-secondary text-foreground border-border hover:bg-secondary/80 cursor-pointer rounded-xl shadow-2xs">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" size="sm" disabled={submitting} className="h-10 px-6 text-xs font-extrabold text-primary-foreground shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer rounded-xl bg-primary hover:bg-primary-hover">
                  {submitting ? <RefreshCw className="size-3.5 animate-spin mr-1.5" /> : <Lock className="size-3.5 mr-1.5" />}Issue Key
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Raw key reveal — shown exactly once, right after creation */}
      {createdKey && (
        <Dialog open onOpenChange={(n) => !n && setCreatedKey(null)}>
          <DialogContent className="sm:max-w-lg shadow-2xl rounded-2xl bg-card p-6 sm:p-7 border border-border animate-in fade-in-50 zoom-in-95 duration-200">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-none text-emerald-500 shadow-xs">
                  <KeyRound className="size-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-black text-foreground tracking-tight">
                    API Key Created
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                    Store this key in a secure location.
                  </p>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-3 py-3">
              <p className="text-xs text-danger font-bold flex items-center gap-1.5">
                <AlertCircle className="size-3.5 flex-none" />
                Copy this key now — it will never be displayed again.
              </p>
              <div className="flex items-center gap-2 rounded-xl p-3 font-mono text-xs bg-secondary/60 border border-border break-all">
                <span className="flex-1 font-bold text-foreground select-all">{createdKey.raw_key}</span>
                <button onClick={handleCopyRaw} className="p-1.5 rounded-lg hover:bg-secondary transition-colors cursor-pointer flex-none border border-border/70" title="Copy key">
                  {rawCopied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4 text-muted-foreground" />}
                </button>
              </div>
            </div>
            <DialogFooter className="pt-2">
              <DialogClose asChild>
                <Button size="sm" className="h-10 px-6 text-xs font-extrabold text-primary-foreground bg-primary hover:bg-primary-hover cursor-pointer rounded-xl shadow-md">
                  Done
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {deleteKey && (
        <Dialog open onOpenChange={(n) => !n && setDeleteKey(null)}>
          <DialogContent className="sm:max-w-md shadow-2xl rounded-2xl bg-card p-6 sm:p-7 border border-border animate-in fade-in-50 zoom-in-95 duration-200">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-danger/10 border border-danger/20 flex items-center justify-center flex-none text-danger shadow-xs">
                  <Trash2 className="size-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-black text-danger tracking-tight">
                    Revoke API Key
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                    This action will immediately disable access.
                  </p>
                </div>
              </div>
            </DialogHeader>
            <p className="text-sm text-foreground py-3 font-medium">
              Permanently revoke <span className="font-extrabold">{deleteKey.label || deleteKey.keyPrefix}</span>? Applications using this key will immediately lose access.
            </p>
            <DialogFooter className="pt-2 gap-2.5">
              <DialogClose asChild>
                <Button variant="outline" size="sm" className="h-10 px-4 text-xs font-extrabold bg-secondary text-foreground border-border hover:bg-secondary/80 cursor-pointer rounded-xl shadow-2xs">
                  Cancel
                </Button>
              </DialogClose>
              <Button variant="destructive" size="sm" disabled={submitting} onClick={() => handleDelete(deleteKey)} className="h-10 px-6 text-xs font-extrabold cursor-pointer rounded-xl shadow-md hover:shadow-lg">
                <Trash2 className="size-3.5 mr-1.5" />Revoke Key
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

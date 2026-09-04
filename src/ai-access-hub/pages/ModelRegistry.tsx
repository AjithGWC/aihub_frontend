import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Boxes,
  Cloud,
  Server,
  Search,
  Key,
  Archive,
  Zap,
  AlertCircle,
  CheckCircle2,
  Plus,
  Lock,
  MemoryStick,
  X,
  ChevronRight,
  ShieldAlert,
  ArrowLeft,
  RefreshCw,
  Download,
} from 'lucide-react'
import { listModels, registerModel, setModelApiKey, syncOllama, updateModelStatus, type PortalModel } from '@/api/portal'
import type { ModelRecord } from '../types'
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

const CLOUD_BACKENDS = new Set(['openai', 'anthropic', 'azure', 'google', 'cohere', 'mistral'])

const PROVIDER_COLORS: Record<string, { color: string; glow: string; gradient: string }> = {
  openai:    { color: '#10b981', glow: 'rgba(16,185,129,0.4)',  gradient: 'linear-gradient(135deg, #10b981, #059669)' },
  anthropic: { color: '#8b5cf6', glow: 'rgba(139,92,246,0.4)',  gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' },
  azure:     { color: '#3b82f6', glow: 'rgba(59,130,246,0.4)',  gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)' },
  google:    { color: '#f97316', glow: 'rgba(249,115,22,0.4)',  gradient: 'linear-gradient(135deg, #f97316, #ea580c)' },
  cohere:    { color: '#f59e0b', glow: 'rgba(245,158,11,0.4)',  gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
  mistral:   { color: '#e11d48', glow: 'rgba(225,29,72,0.4)',   gradient: 'linear-gradient(135deg, #e11d48, #e11d48)' },
  ollama:    { color: '#22c55e', glow: 'rgba(34,197,94,0.4)',   gradient: 'linear-gradient(135deg, #22c55e, #16a34a)' },
}
const DEFAULT_PROVIDER = { color: 'var(--muted)', glow: 'var(--primary-soft)', gradient: 'linear-gradient(135deg, var(--muted), var(--foreground))' }

const TASK_COLORS: Record<string, { color: string; bg: string }> = {
  chat:           { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  code:           { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  reasoning:      { color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
  summarization:  { color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
  translation:    { color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
}

function getModelProviderMeta(name?: string) {
  if (!name) return { ...DEFAULT_PROVIDER, symbol: 'AI' }
  const lower = name.toLowerCase().trim()
  for (const key in PROVIDER_COLORS) {
    if (lower.includes(key)) return { ...PROVIDER_COLORS[key], symbol: key.slice(0, 2).toUpperCase() }
  }
  const clean = name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase() || 'AI'
  return { color: '#f59e0b', glow: 'rgba(245,158,11,0.4)', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', symbol: clean }
}

function toModelRecord(m: PortalModel): ModelRecord {
  return {
    id: m.name,
    name: m.name,
    version: m.version,
    backend: m.backend,
    endpoint: m.endpoint,
    tasks: m.tasks ?? [],
    status: m.status,
    maxContextLength: m.max_context_length ?? null,
    vramRequiredGb: m.vram_required_gb ?? null,
    fallbackModel: m.fallback_model ?? null,
    notes: m.notes ?? null,
    isCloud: CLOUD_BACKENDS.has((m.backend || '').toLowerCase()),
    apiKeySet: !!m.api_key_set,
  }
}

/* ── Model Registry Row ── */
function ModelRow({ model, onSetKey, onRetire, index }: { model: ModelRecord; onSetKey: (m: ModelRecord) => void; onRetire: (m: ModelRecord) => void; index: number }) {
  const provMeta = getModelProviderMeta(model.backend || model.name)
  const DeployIcon = model.isCloud ? Cloud : Server
  const statusColors: Record<string, string> = { active: '#22c55e', staging: '#f59e0b', retired: '#f43f5e' }
  const statusColor = statusColors[model.status] || '#22c55e'

  return (
    <TableRow
      className="group border-border hover:bg-secondary/40 transition-colors animate-slide-up"
      style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
    >
      {/* Model + Backend */}
      <TableCell className="py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="size-9 rounded-xl flex items-center justify-center text-xs font-black text-white flex-none shadow-sm"
            style={{ background: provMeta.gradient, boxShadow: `0 0 0 2px var(--background), 0 0 8px ${provMeta.glow}` }}
          >
            {provMeta.symbol}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground truncate transition-colors">{model.name}</p>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-semibold">
              <span className="capitalize truncate">{model.backend} · v{model.version}</span>
              <span className="text-muted-foreground/40">·</span>
              <DeployIcon className="size-3 flex-none" style={{ color: model.isCloud ? '#2563eb' : '#16a34a' }} />
              <span>{model.isCloud ? 'Cloud' : 'Local'}</span>
            </div>
          </div>
        </div>
      </TableCell>

      {/* Context */}
      <TableCell className="whitespace-nowrap">
        {model.maxContextLength ? (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-foreground">
            <MemoryStick className="size-3.5 text-primary" />
            {model.maxContextLength.toLocaleString()}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>

      {/* Tasks */}
      <TableCell className="max-w-[220px]">
        <div className="flex flex-wrap gap-1">
          {model.tasks.length > 0 ? model.tasks.map((t) => {
            const tc = TASK_COLORS[t?.toLowerCase()] || { color: 'var(--muted)', bg: 'var(--secondary)' }
            return (
              <span key={t} className="px-2 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase tracking-wide" style={{ color: tc.color, background: tc.bg, border: `1px solid ${tc.color}33` }}>
                {t}
              </span>
            )
          }) : <span className="text-xs text-muted-foreground">—</span>}
        </div>
      </TableCell>

      {/* API Key */}
      <TableCell className="whitespace-nowrap">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold" style={{ color: model.apiKeySet ? '#16a34a' : 'var(--danger)' }}>
          <Key className="size-3.5 flex-none" />
          {model.apiKeySet ? 'Set' : 'Not set'}
        </span>
      </TableCell>

      {/* Status */}
      <TableCell className="whitespace-nowrap">
        <Badge variant="outline" className="text-[10px] px-2 py-0.5 capitalize font-bold" style={{ color: statusColor, borderColor: `${statusColor}44`, background: `${statusColor}10` }}>
          {model.status}
        </Badge>
      </TableCell>

      {/* Actions */}
      <TableCell className="text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-1.5">
          <button onClick={() => onSetKey(model)} className="table-action-btn table-action-btn-purple" title="Set API Key">
            <Key className="size-4" />
          </button>
          {model.status !== 'retired' && (
            <button onClick={() => onRetire(model)} className="table-action-btn table-action-btn-danger" title="Retire Model">
              <Archive className="size-4" />
            </button>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}

export default function ModelRegistry() {
  const [allModels, setAllModels] = useState<ModelRecord[]>([])
  const [offset, setOffset] = useState(0)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [setKeyModel, setSetKeyModel] = useState<ModelRecord | null>(null)
  const [retireModel, setRetireModel] = useState<ModelRecord | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '', version: '', backend: '', endpoint: '', isCloud: true, maxContextLength: '', tasks: '', apiKey: '', status: 'staging' as 'active' | 'staging' | 'retired',
  })
  const [keyValue, setKeyValue] = useState('')

  async function loadModels() {
    setLoading(true)
    setError(null)
    try {
      const models = await listModels()
      setAllModels(models.map(toModelRecord))
    } catch { setError('Failed to load model registry.') }
    finally { setLoading(false) }
  }

  useEffect(() => { loadModels() }, [])
  useEffect(() => { setOffset(0) }, [query])

  const [selectedBackend, setSelectedBackend] = useState<string>('all')

  const filteredModels = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allModels.filter((m) => {
      const matchesQuery = !q || m.name.toLowerCase().includes(q) || m.backend.toLowerCase().includes(q)
      const matchesBackend = selectedBackend === 'all' || (m.backend || '').toLowerCase() === selectedBackend.toLowerCase()
      return matchesQuery && matchesBackend
    })
  }, [allModels, query, selectedBackend])

  const total = filteredModels.length
  const pagedModels = filteredModels.slice(offset, offset + PAGE_SIZE)

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await registerModel({
        name: createForm.name,
        version: createForm.version,
        backend: createForm.backend,
        endpoint: createForm.endpoint,
        tasks: createForm.tasks.split(',').map((t) => t.trim()).filter(Boolean),
        status: createForm.status,
        max_context_length: createForm.maxContextLength ? Number(createForm.maxContextLength) : undefined,
        api_key: createForm.isCloud && createForm.apiKey ? createForm.apiKey : undefined,
      })
      setShowCreate(false)
      setCreateForm({ name: '', version: '', backend: '', endpoint: '', isCloud: true, maxContextLength: '', tasks: '', apiKey: '', status: 'staging' })
      loadModels()
    } catch { setError('Failed to register model.') }
    finally { setSubmitting(false) }
  }

  async function handleSetKey(e: FormEvent) {
    e.preventDefault()
    if (!setKeyModel) return
    setSubmitting(true)
    try {
      await setModelApiKey(setKeyModel.name, keyValue)
      setSetKeyModel(null)
      setKeyValue('')
      loadModels()
    } catch { setError('Failed to assign model API key.') }
    finally { setSubmitting(false) }
  }

  async function handleRetire(m: ModelRecord) {
    setSubmitting(true)
    try {
      await updateModelStatus(m.name, 'retired')
      setRetireModel(null)
      loadModels()
    } catch { setError('Failed to retire model.') }
    finally { setSubmitting(false) }
  }

  async function handleSyncOllama() {
    setSyncing(true)
    setError(null)
    try {
      const result = await syncOllama()
      setNotice(`Synced Ollama: ${result.registered.length} newly registered, ${result.already_registered.length} already present.`)
      loadModels()
    } catch { setError('Failed to sync models from Ollama.') }
    finally { setSyncing(false) }
  }

  const cloudCount = allModels.filter((m) => m.isCloud).length
  const backendList = useMemo(() => {
    const list = Array.from(new Set(allModels.map((m) => (m.backend || '').toLowerCase()).filter(Boolean)))
    return list.sort()
  }, [allModels])

  return (
    <div className="page sector-amber space-y-6 animate-slide-up">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="cyber-pulse-dot cyber-pulse-dot-amber" />
            <h1 className="text-2xl font-bold tracking-tight sector-header-title">Model Registry</h1>
            <Badge variant="outline" className="sector-badge text-xs font-mono border-border">{total} Models</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Centralized AI model inventory with provider routing and context windows.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.dispatchEvent(new CustomEvent('hexagon-hub-back'))}
            className="border-border bg-secondary text-foreground hover:bg-secondary/80 font-extrabold shadow-xs cursor-pointer rounded-lg text-xs"
          >
            <ArrowLeft className="size-3.5 mr-1" />
            All Sectors
          </Button>
          <Button
            type="button"
            onClick={handleSyncOllama}
            disabled={syncing}
            variant="outline"
            size="sm"
            className="gap-2 text-xs font-extrabold border-border bg-card text-foreground hover:bg-secondary hover:text-foreground shadow-xs cursor-pointer rounded-lg transition-colors"
          >
            {syncing ? <RefreshCw className="size-3.5 animate-spin text-amber-500" /> : <Download className="size-3.5 text-primary" />}
            Sync from Ollama
          </Button>
          <Button
            type="button"
            onClick={() => setShowCreate(true)}
            size="sm"
            className="gap-2 text-xs font-extrabold bg-primary hover:bg-primary-hover text-primary-foreground rounded-lg shadow-sm cursor-pointer"
          >
            <Plus className="size-3.5" />
            Register Model
          </Button>
        </div>
      </header>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
          <ShieldAlert className="size-4 flex-none" /><span className="flex-1">{error}</span>
          <button onClick={() => setError(null)}><X className="size-3.5" /></button>
        </div>
      )}
      {notice && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs">
          <CheckCircle2 className="size-4 flex-none" /><span className="flex-1">{notice}</span>
          <button onClick={() => setNotice(null)}><X className="size-3.5" /></button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Registered Models', value: allModels.length, icon: Boxes, color: '#f59e0b', chip: 'Registry' },
          { label: 'Cloud-Hosted Instances', value: cloudCount, icon: Cloud, color: '#3b82f6', chip: 'Cloud ML' },
          { label: 'Inference Providers', value: backendList.length, icon: Zap, color: '#8b5cf6', chip: 'Active Routers' },
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

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search models or providers…" className="pl-9 bg-background border-border text-foreground font-semibold placeholder:text-muted-foreground text-sm shadow-xs rounded-lg" />
          {query && <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"><X className="size-3.5 text-muted-foreground hover:text-foreground" /></button>}
        </div>

        {/* Quick Backend Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => { setSelectedBackend('all'); setOffset(0); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer border ${
              selectedBackend === 'all'
                ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                : 'bg-card text-muted-foreground border-border hover:bg-secondary hover:text-foreground'
            }`}
          >
            All
          </button>
          {backendList.map((backend) => {
            const isSelected = selectedBackend === backend
            return (
              <button
                key={backend}
                onClick={() => { setSelectedBackend(backend); setOffset(0); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold capitalize transition-all cursor-pointer border whitespace-nowrap ${
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                    : 'bg-card text-muted-foreground border-border hover:bg-secondary hover:text-foreground'
                }`}
              >
                {backend}
              </button>
            )
          })}
        </div>
      </div>

      {/* Model Table */}
      <div className="sector-card rounded-xl overflow-hidden shadow-sm border border-border bg-card">
        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-11 rounded-xl bg-secondary animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />)}
          </div>
        ) : pagedModels.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
            <Boxes className="size-8 text-muted-foreground/30" />No models match your query.
          </div>
        ) : (
          <div className="px-4">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent bg-secondary/20">
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Model</TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Context</TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Tasks</TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">API Key</TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Status</TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedModels.map((model, i) => <ModelRow key={model.id} model={model} onSetKey={setSetKeyModel} onRetire={setRetireModel} index={i} />)}
              </TableBody>
            </Table>
          </div>
        )}

        <Pagination offset={offset} limit={PAGE_SIZE} total={total} onChange={setOffset} />
      </div>

      {/* Register New Model Modal */}
      {showCreate && (
        <Dialog open onOpenChange={(n) => !n && setShowCreate(false)}>
          <DialogContent className="sm:max-w-2xl shadow-2xl rounded-2xl bg-card p-6 sm:p-7 border border-border animate-in fade-in-50 zoom-in-95 duration-200">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-none text-primary shadow-xs">
                  <Boxes className="size-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-black text-foreground tracking-tight">
                    Register New Model
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                    Configure model provider, context window, and inference endpoint.
                  </p>
                </div>
              </div>
            </DialogHeader>

            <form onSubmit={handleCreate} className="space-y-4 py-2">
              {/* Section 1: General Info */}
              <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-3">
                <p className="text-[11px] font-black uppercase tracking-wider text-primary">Model Specification</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Model Name</Label>
                    <Input
                      value={createForm.name}
                      onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="gpt-4o"
                      required
                      className="h-10 px-3.5 rounded-xl border border-border bg-background hover:border-primary/50 text-foreground font-semibold text-xs font-mono shadow-2xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Version</Label>
                    <Input
                      value={createForm.version}
                      onChange={(e) => setCreateForm((f) => ({ ...f, version: e.target.value }))}
                      placeholder="2024-08-06"
                      required
                      className="h-10 px-3.5 rounded-xl border border-border bg-background hover:border-primary/50 text-foreground font-semibold text-xs font-mono shadow-2xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Backend Provider</Label>
                    <Select value={createForm.backend} onValueChange={(v) => setCreateForm((f) => ({ ...f, backend: v, isCloud: CLOUD_BACKENDS.has(v) }))}>
                      <SelectTrigger className="w-full h-10 px-3.5 rounded-xl border border-border bg-background hover:border-primary/50 text-foreground font-semibold text-xs shadow-2xs">
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent className="bg-card text-foreground border-border shadow-xl rounded-xl z-[999999]">
                        {['openai', 'anthropic', 'azure', 'google', 'cohere', 'mistral', 'ollama'].map((p) => (
                          <SelectItem key={p} value={p} className="capitalize text-foreground font-medium cursor-pointer">{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Max Context Length</Label>
                    <Input
                      type="number"
                      value={createForm.maxContextLength}
                      onChange={(e) => setCreateForm((f) => ({ ...f, maxContextLength: e.target.value }))}
                      placeholder="128000"
                      className="h-10 px-3.5 rounded-xl border border-border bg-background hover:border-primary/50 text-foreground font-semibold text-xs font-mono shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Endpoint & Tasks */}
              <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-3">
                <p className="text-[11px] font-black uppercase tracking-wider text-primary">Routing & Endpoints</p>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Endpoint URL</Label>
                    <Input
                      value={createForm.endpoint}
                      onChange={(e) => setCreateForm((f) => ({ ...f, endpoint: e.target.value }))}
                      placeholder="https://api.openai.com/v1"
                      required
                      className="h-10 px-3.5 rounded-xl border border-border bg-background hover:border-primary/50 text-foreground font-semibold text-xs font-mono shadow-2xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Supported Task Types</Label>
                    <Input
                      value={createForm.tasks}
                      onChange={(e) => setCreateForm((f) => ({ ...f, tasks: e.target.value }))}
                      placeholder="chat, code, reasoning"
                      required
                      className="h-10 px-3.5 rounded-xl border border-border bg-background hover:border-primary/50 text-foreground font-semibold text-xs font-mono shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Credentials & Status */}
              <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-3">
                <p className="text-[11px] font-black uppercase tracking-wider text-primary">Authentication & Lifecycle</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {createForm.isCloud && (
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Provider API Key</Label>
                      <Input
                        type="password"
                        value={createForm.apiKey}
                        onChange={(e) => setCreateForm((f) => ({ ...f, apiKey: e.target.value }))}
                        placeholder="sk-..."
                        className="h-10 px-3.5 rounded-xl border border-border bg-background hover:border-primary/50 text-foreground font-semibold font-mono text-xs shadow-2xs"
                      />
                    </div>
                  )}
                  <div className={`space-y-1.5 ${!createForm.isCloud ? 'sm:col-span-2' : ''}`}>
                    <Label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Status</Label>
                    <Select value={createForm.status} onValueChange={(v) => setCreateForm((f) => ({ ...f, status: v as 'active' | 'staging' | 'retired' }))}>
                      <SelectTrigger className="w-full h-10 px-3.5 rounded-xl border border-border bg-background hover:border-primary/50 text-foreground font-semibold text-xs shadow-2xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card text-foreground border-border shadow-xl rounded-xl z-[999999]">
                        <SelectItem value="staging" className="text-foreground font-medium cursor-pointer">Staging</SelectItem>
                        <SelectItem value="active" className="text-foreground font-medium cursor-pointer">Active</SelectItem>
                        <SelectItem value="retired" className="text-foreground font-medium cursor-pointer">Retired</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-3 gap-2.5">
                <DialogClose asChild>
                  <Button variant="outline" size="sm" className="h-10 px-5 text-xs font-extrabold bg-secondary text-foreground border-border hover:bg-secondary/80 cursor-pointer rounded-xl shadow-xs transition-colors">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" size="sm" disabled={submitting} className="h-10 px-6 text-xs font-extrabold text-primary-foreground shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer rounded-xl bg-primary hover:bg-primary-hover flex items-center gap-2">
                  {submitting ? <RefreshCw className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                  Register Model
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {setKeyModel && (
        <Dialog open onOpenChange={(n) => !n && setSetKeyModel(null)}>
          <DialogContent className="sm:max-w-md shadow-2xl rounded-2xl bg-card p-6 sm:p-7 border border-border animate-in fade-in-50 zoom-in-95 duration-200">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-none text-primary shadow-xs">
                  <Lock className="size-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-black text-foreground tracking-tight">
                    Assign API Key
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                    {setKeyModel.name}
                  </p>
                </div>
              </div>
            </DialogHeader>
            <form onSubmit={handleSetKey} className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">API Key Secret</Label>
                <Input
                  type="password"
                  value={keyValue}
                  onChange={(e) => setKeyValue(e.target.value)}
                  placeholder="sk-..."
                  required
                  className="h-10 px-3.5 rounded-xl border border-border bg-secondary/40 hover:bg-secondary/60 focus:bg-background text-foreground font-semibold font-mono text-xs shadow-2xs"
                />
              </div>
              <DialogFooter className="pt-4 gap-2.5">
                <DialogClose asChild>
                  <Button variant="outline" size="sm" className="h-10 px-5 text-xs font-extrabold bg-secondary text-foreground border-border hover:bg-secondary/80 cursor-pointer rounded-xl shadow-xs transition-colors">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" size="sm" disabled={submitting} className="h-10 px-6 text-xs font-extrabold text-primary-foreground shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer rounded-xl bg-primary hover:bg-primary-hover flex items-center gap-2">
                  {submitting ? <RefreshCw className="size-3.5 animate-spin" /> : <Key className="size-3.5" />}
                  Save Key
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {retireModel && (
        <Dialog open onOpenChange={(n) => !n && setRetireModel(null)}>
          <DialogContent className="sm:max-w-md shadow-2xl rounded-2xl bg-card p-6 sm:p-7 border border-border animate-in fade-in-50 zoom-in-95 duration-200">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-danger/10 border border-danger/20 flex items-center justify-center flex-none text-danger shadow-xs">
                  <Archive className="size-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-black text-danger tracking-tight">
                    Retire Model
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                    This will disable routing for this model.
                  </p>
                </div>
              </div>
            </DialogHeader>
            <p className="text-sm text-foreground py-3 font-medium">
              Are you sure you want to retire <span className="font-extrabold">{retireModel.name}</span>?
            </p>
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs font-bold">
              <AlertCircle className="size-4 flex-none" />Routes using this model will be immediately disabled.
            </div>
            <DialogFooter className="mt-4 gap-2.5">
              <DialogClose asChild>
                <Button variant="outline" size="sm" className="h-10 px-4 text-xs font-extrabold bg-secondary text-foreground border-border hover:bg-secondary/80 cursor-pointer rounded-xl shadow-2xs">
                  Cancel
                </Button>
              </DialogClose>
              <Button variant="destructive" size="sm" disabled={submitting} onClick={() => handleRetire(retireModel)} className="h-10 px-6 text-xs font-extrabold cursor-pointer rounded-xl shadow-md hover:shadow-lg">
                <Archive className="size-3.5 mr-1.5" />Retire Model
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

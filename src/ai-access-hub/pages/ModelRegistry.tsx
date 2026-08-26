import { useEffect, useState, type FormEvent } from 'react'
import {
  Boxes,
  Cloud,
  Server,
  Search,
  Key,
  Trash2,
  Zap,
  AlertCircle,
  Plus,
  Lock,
  MemoryStick,
  X,
  ChevronRight,
  ShieldAlert,
  ArrowLeft
} from 'lucide-react'
import { api } from '@/api'
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
import { COLOR, FONT_HEADING } from '@/components/atlasTheme'

const PAGE_SIZE = 9

const PROVIDER_COLORS: Record<string, { color: string; glow: string; gradient: string }> = {
  openai:    { color: '#10b981', glow: 'rgba(16,185,129,0.4)',  gradient: 'linear-gradient(135deg, #10b981, #059669)' },
  anthropic: { color: '#8b5cf6', glow: 'rgba(139,92,246,0.4)',  gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' },
  azure:     { color: '#3b82f6', glow: 'rgba(59,130,246,0.4)',  gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)' },
  google:    { color: '#f97316', glow: 'rgba(249,115,22,0.4)',  gradient: 'linear-gradient(135deg, #f97316, #ea580c)' },
  cohere:    { color: '#f59e0b', glow: 'rgba(245,158,11,0.4)',  gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
  mistral:   { color: '#e11d48', glow: 'rgba(225,29,72,0.4)',   gradient: 'linear-gradient(135deg, #e11d48, #e11d48)' },
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
  return {
    color: '#f59e0b',
    glow: 'rgba(245,158,11,0.4)',
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    symbol: clean
  }
}

/* ── Model Registry Row ── */
function ModelRow({ model, onSetKey, onDelete, index }: { model: ModelRecord; onSetKey: (m: ModelRecord) => void; onDelete: (m: ModelRecord) => void; index: number }) {
  const backend = model.backend?.toLowerCase() || ''
  const provMeta = getModelProviderMeta(backend || model.name)
  const DeployIcon = model.isCloud ? Cloud : Server
  const statusColors: Record<string, string> = { active: '#22c55e', staging: '#f59e0b', inactive: '#f43f5e' }
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
              <span className="capitalize truncate">{model.backend}</span>
              <span className="text-muted-foreground/40">·</span>
              <DeployIcon className="size-3 flex-none" style={{ color: model.isCloud ? '#2563eb' : '#16a34a' }} />
              <span>{model.isCloud ? 'Cloud' : 'Local'}</span>
            </div>
          </div>
        </div>
      </TableCell>

      {/* Context */}
      <TableCell className="whitespace-nowrap">
        {model.context ? (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-foreground">
            <MemoryStick className="size-3.5 text-primary" />
            {model.context}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>

      {/* Tasks */}
      <TableCell className="max-w-[220px]">
        <div className="flex flex-wrap gap-1">
          {(model.tasks ?? []).length > 0 ? model.tasks.map((t) => {
            const tc = TASK_COLORS[t?.toLowerCase()] || { color: 'var(--muted)', bg: 'var(--secondary)' }
            return (
              <span key={t} className="px-2 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase tracking-wide" style={{ color: tc.color, background: tc.bg, border: `1px solid ${tc.color}33` }}>
                {t}
              </span>
            )
          }) : <span className="text-xs text-muted-foreground">—</span>}
        </div>
      </TableCell>

      {/* Allowed Roles */}
      <TableCell className="max-w-[160px]">
        <div className="flex flex-wrap gap-1">
          {(model.allowedRoles ?? []).length > 0 ? model.allowedRoles.map((r) => (
            <span key={r} className="px-1.5 py-0.5 rounded text-[9.5px] font-mono capitalize bg-secondary text-muted-foreground border border-border font-extrabold">{r}</span>
          )) : <span className="text-xs text-muted-foreground">—</span>}
        </div>
      </TableCell>

      {/* API Key */}
      <TableCell className="whitespace-nowrap">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold" style={{ color: model.apiKeyMasked ? '#16a34a' : 'var(--danger)' }}>
          <Key className="size-3.5 flex-none" />
          {model.apiKeyMasked ? 'Set' : 'Not set'}
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
          <button
            onClick={() => onSetKey(model)}
            className="table-action-btn table-action-btn-purple"
            title="Set API Key"
          >
            <Key className="size-4" />
          </button>
          <button
            onClick={() => onDelete(model)}
            className="table-action-btn table-action-btn-danger"
            title="Delete Model"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </TableCell>
    </TableRow>
  )
}

export default function ModelRegistry() {
  const [models, setModels] = useState<ModelRecord[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [setKeyModel, setSetKeyModel] = useState<ModelRecord | null>(null)
  const [deleteModel, setDeleteModel] = useState<ModelRecord | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '', backend: '', isCloud: true, context: '', tasks: '', allowedRoles: '', status: 'active' as 'active' | 'staging' | 'inactive',
  })
  const [keyValue, setKeyValue] = useState('')

  async function loadModels(q: string, off: number) {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get('/models', { params: { q: q || undefined, offset: off, limit: PAGE_SIZE } })
      const loaded = data?.models ?? (Array.isArray(data) ? data : [])
      setModels(loaded)
      setTotal(data?.total ?? loaded.length)
    } catch { setError('Failed to load model registry.') }
    finally { setLoading(false) }
  }

  useEffect(() => { loadModels('', 0) }, [])
  useEffect(() => {
    const t = setTimeout(() => { setOffset(0); loadModels(query, 0) }, 300)
    return () => clearTimeout(t)
  }, [query])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/models', {
        ...createForm,
        tasks: createForm.tasks.split(',').map((t) => t.trim()).filter(Boolean),
        allowedRoles: createForm.allowedRoles.split(',').map((r) => r.trim()).filter(Boolean),
      })
      setShowCreate(false)
      loadModels(query, offset)
    } catch { setError('Failed to register model.') }
    finally { setSubmitting(false) }
  }

  async function handleSetKey(e: FormEvent) {
    e.preventDefault()
    if (!setKeyModel) return
    setSubmitting(true)
    try {
      await api.post(`/models/${setKeyModel.id}/api-key`, { key: keyValue })
      setSetKeyModel(null)
      setKeyValue('')
    } catch { setError('Failed to assign model API key.') }
    finally { setSubmitting(false) }
  }

  async function handleDelete(m: ModelRecord) {
    setSubmitting(true)
    try {
      await api.delete(`/models/${m.id}`)
      setDeleteModel(null)
      loadModels(query, offset)
    } catch { setError('Failed to remove model.') }
    finally { setSubmitting(false) }
  }

  const safeModels = Array.isArray(models) ? models : []
  const cloudCount = safeModels.filter((m) => m.isCloud).length
  const backendSet = new Set(safeModels.map((m) => m.backend).filter(Boolean))

  return (
    <div className="page sector-amber space-y-6 animate-slide-up">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="cyber-pulse-dot cyber-pulse-dot-amber" />
            <h1 className="text-2xl font-bold tracking-tight sector-header-title">Model Registry</h1>
            <Badge variant="outline" className="sector-badge text-xs font-mono border-border">{total} Models</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Centralized AI model inventory with provider routing, context windows, and access roles.</p>
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
          <Button onClick={() => setShowCreate(true)} size="sm" className="gap-2 text-xs font-bold bg-primary hover:bg-primary-hover text-primary-foreground rounded-lg shadow-sm">
            <Plus className="size-3.5" />Register Model
          </Button>
        </div>
      </header>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
          <ShieldAlert className="size-4 flex-none" /><span className="flex-1">{error}</span>
          <button onClick={() => setError(null)}><X className="size-3.5" /></button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Registered Models', value: total, icon: Boxes, color: '#f59e0b', chip: 'Registry', glow: 'rgba(245,158,11,0.45)' },
          { label: 'Cloud-Hosted Instances', value: cloudCount, icon: Cloud, color: '#3b82f6', chip: 'Cloud ML', glow: 'rgba(59,130,246,0.45)' },
          { label: 'Inference Providers', value: backendSet.size, icon: Zap, color: '#8b5cf6', chip: 'Active Routers', glow: 'rgba(139,92,246,0.45)' },
        ].map(({ label, value, icon: Icon, color, chip }, i) => (
          <div
            key={label}
            className="group relative overflow-hidden border border-border hover:border-primary/40 bg-card hover:bg-card/90 transition-all duration-300 rounded-xl p-5 flex items-center justify-between gap-4 shadow-sm hover:shadow-md cursor-pointer animate-slide-up"
            style={{
              animationDelay: `${i * 80}ms`,
              background: `radial-gradient(circle 120px at 90% 10%, ${color}08, transparent 75%), var(--panel)`,
            }}
          >
            {/* Shimmer sweep */}
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

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search models…" className="pl-9 bg-background border-border text-foreground font-semibold placeholder:text-muted-foreground text-sm shadow-xs rounded-lg" />
        {query && <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"><X className="size-3.5 text-muted-foreground hover:text-foreground" /></button>}
      </div>

      <div className="sector-card rounded-xl overflow-hidden shadow-sm border border-border bg-card">
        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-11 rounded-xl bg-secondary animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />)}
          </div>
        ) : safeModels.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
            <Boxes className="size-8 text-muted-foreground/30" />No models registered.
          </div>
        ) : (
          <div className="px-4">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent bg-secondary/20">
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Model</TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Context</TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Tasks</TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Roles</TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">API Key</TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Status</TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {safeModels.map((model, i) => <ModelRow key={model.id} model={model} onSetKey={setSetKeyModel} onDelete={setDeleteModel} index={i} />)}
              </TableBody>
            </Table>
          </div>
        )}

        <Pagination offset={offset} limit={PAGE_SIZE} total={total} onChange={(off) => { setOffset(off); loadModels(query, off) }} />
      </div>

      {showCreate && (
        <Dialog open onOpenChange={(n) => !n && setShowCreate(false)}>
          <DialogContent className="sm:max-w-lg border-t-4 border-t-primary shadow-lg rounded-xl bg-card p-6 border-border animate-in fade-in-50 zoom-in-95 duration-200">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5 text-lg font-black text-foreground tracking-tight">
                <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-none">
                  <Boxes className="size-4 text-primary" />
                </div>
                Register New Model
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Model Name</Label>
                  <Input value={createForm.name} onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))} placeholder="gpt-4o" required className="bg-background border-border text-foreground font-semibold text-xs font-mono shadow-xs focus:border-primary transition-all rounded-lg" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Backend Provider</Label>
                  <Select value={createForm.backend} onValueChange={(v) => setCreateForm((f) => ({ ...f, backend: v }))}>
                    <SelectTrigger className="bg-background border-border text-foreground font-semibold text-xs shadow-xs focus:border-primary transition-all rounded-lg"><SelectValue placeholder="Select provider" /></SelectTrigger>
                    <SelectContent className="bg-card text-foreground border-border shadow-md rounded-lg">
                      {['openai', 'anthropic', 'azure', 'google', 'cohere', 'mistral'].map((p) => (
                        <SelectItem key={p} value={p} className="capitalize text-foreground font-medium cursor-pointer">{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Deployment</Label>
                  <Select value={createForm.isCloud ? 'cloud' : 'local'} onValueChange={(v) => setCreateForm((f) => ({ ...f, isCloud: v === 'cloud' }))}>
                    <SelectTrigger className="bg-background border-border text-foreground font-semibold text-xs shadow-xs focus:border-primary transition-all rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-card text-foreground border-border shadow-md rounded-lg">
                      <SelectItem value="cloud" className="text-foreground font-medium cursor-pointer">Cloud</SelectItem>
                      <SelectItem value="local" className="text-foreground font-medium cursor-pointer">Local / On-prem</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Context Window</Label>
                  <Input value={createForm.context} onChange={(e) => setCreateForm((f) => ({ ...f, context: e.target.value }))} placeholder="128k" className="bg-background border-border text-foreground font-semibold text-xs font-mono shadow-xs focus:border-primary transition-all rounded-lg" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Task Types (comma-separated)</Label>
                <Input value={createForm.tasks} onChange={(e) => setCreateForm((f) => ({ ...f, tasks: e.target.value }))} placeholder="chat, code, reasoning" className="bg-background border-border text-foreground font-semibold text-xs font-mono shadow-xs focus:border-primary transition-all rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Allowed Roles (comma-separated)</Label>
                <Input value={createForm.allowedRoles} onChange={(e) => setCreateForm((f) => ({ ...f, allowedRoles: e.target.value }))} placeholder="admin, editor" className="bg-background border-border text-foreground font-semibold text-xs font-mono shadow-xs focus:border-primary transition-all rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Status</Label>
                <Select value={createForm.status} onValueChange={(v) => setCreateForm((f) => ({ ...f, status: v as 'active' | 'staging' | 'inactive' }))}>
                  <SelectTrigger className="bg-background border-border text-foreground font-semibold text-xs shadow-xs focus:border-primary transition-all rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card text-foreground border-border shadow-md rounded-lg">
                    <SelectItem value="active" className="text-foreground font-medium cursor-pointer">Active</SelectItem>
                    <SelectItem value="staging" className="text-foreground font-medium cursor-pointer">Staging</SelectItem>
                    <SelectItem value="inactive" className="text-foreground font-medium cursor-pointer">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="pt-3 gap-2">
                <DialogClose asChild><Button variant="outline" size="sm" className="text-xs font-extrabold bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200 cursor-pointer rounded-lg px-4">Cancel</Button></DialogClose>
                <Button type="submit" size="sm" disabled={submitting} className="text-xs font-extrabold text-primary-foreground shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer rounded-lg px-5 bg-primary hover:bg-primary-hover">
                  <ChevronRight className="size-3.5 mr-1" />Register Model
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {setKeyModel && (
        <Dialog open onOpenChange={(n) => !n && setSetKeyModel(null)}>
          <DialogContent className="sm:max-w-md border-t-4 border-t-primary shadow-lg rounded-xl bg-card p-6 border-border animate-in fade-in-50 zoom-in-95 duration-200">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5 text-base font-black text-foreground tracking-tight">
                <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-none">
                  <Lock className="size-4 text-primary" />
                </div>
                Assign API Key — {setKeyModel.name}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSetKey} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">API Key Secret</Label>
                <Input type="password" value={keyValue} onChange={(e) => setKeyValue(e.target.value)} placeholder="sk-..." required className="bg-background border-border text-foreground font-semibold font-mono text-xs shadow-xs focus:border-primary transition-all rounded-lg" />
              </div>
              <DialogFooter className="pt-3 gap-2">
                <DialogClose asChild><Button variant="outline" size="sm" className="text-xs font-extrabold bg-secondary text-foreground border-border hover:bg-secondary/80 cursor-pointer rounded-lg px-4">Cancel</Button></DialogClose>
                <Button type="submit" size="sm" disabled={submitting} className="text-xs font-extrabold text-primary-foreground shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer rounded-lg px-5 bg-primary hover:bg-primary-hover">
                  <Key className="size-3.5 mr-1" />Save Key
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {deleteModel && (
        <Dialog open onOpenChange={(n) => !n && setDeleteModel(null)}>
          <DialogContent className="sm:max-w-md border-t-4 border-t-danger shadow-lg rounded-xl bg-card p-6 border-border animate-in fade-in-50 zoom-in-95 duration-200">
            <DialogHeader>
              <DialogTitle className="text-base font-black text-danger flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-danger/10 border border-danger/20 flex items-center justify-center flex-none">
                  <Trash2 className="size-4 text-danger" />
                </div>
                Remove Model
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-foreground py-2 font-medium">Remove <span className="font-extrabold">{deleteModel.name}</span> from the registry?</p>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs font-bold">
              <AlertCircle className="size-4 flex-none" />Active routes using this model will be immediately disabled.
            </div>
            <DialogFooter className="mt-4 gap-2">
              <DialogClose asChild><Button variant="outline" size="sm" className="text-xs font-extrabold bg-secondary text-foreground border-border hover:bg-secondary/80 cursor-pointer rounded-lg px-4">Cancel</Button></DialogClose>
              <Button variant="destructive" size="sm" disabled={submitting} onClick={() => handleDelete(deleteModel)} className="text-xs font-extrabold cursor-pointer rounded-lg px-5 shadow-sm hover:shadow-md">
                <Trash2 className="size-3.5 mr-1" />Remove Model
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

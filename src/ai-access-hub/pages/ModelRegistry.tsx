import { useEffect, useState, type FormEvent } from 'react'
import {
  Boxes,
  Cloud,
  Server,
  Search,
  Key,
  Shield,
  Trash2,
  Cpu,
  Zap,
  AlertCircle,
  Plus,
  Lock,
  Globe,
  MemoryStick,
  X,
  ChevronRight,
  ShieldAlert
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
import { Pagination } from '../components/Pagination'

const PAGE_SIZE = 9

const PROVIDER_COLORS: Record<string, { color: string; glow: string; gradient: string }> = {
  openai:    { color: '#10b981', glow: 'rgba(16,185,129,0.5)',  gradient: 'linear-gradient(135deg, #10b981, #065f46)' },
  anthropic: { color: '#8b5cf6', glow: 'rgba(139,92,246,0.5)',  gradient: 'linear-gradient(135deg, #8b5cf6, #4c1d95)' },
  azure:     { color: '#3b82f6', glow: 'rgba(59,130,246,0.5)',  gradient: 'linear-gradient(135deg, #3b82f6, #1e3a8a)' },
  google:    { color: '#f97316', glow: 'rgba(249,115,22,0.5)',  gradient: 'linear-gradient(135deg, #f97316, #7c2d12)' },
  cohere:    { color: '#f59e0b', glow: 'rgba(245,158,11,0.5)',  gradient: 'linear-gradient(135deg, #f59e0b, #78350f)' },
  mistral:   { color: '#e11d48', glow: 'rgba(225,29,72,0.5)',   gradient: 'linear-gradient(135deg, #e11d48, #4c0519)' },
}
const DEFAULT_PROVIDER = { color: '#64748b', glow: 'rgba(100,116,139,0.4)', gradient: 'linear-gradient(135deg, #64748b, #1e293b)' }

const TASK_COLORS: Record<string, { color: string; bg: string }> = {
  chat:           { color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  code:           { color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
  reasoning:      { color: '#06b6d4', bg: 'rgba(6,182,212,0.15)' },
  summarization:  { color: '#f97316', bg: 'rgba(249,115,22,0.15)' },
  translation:    { color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
}

/* Animated context ring with spinning orbit */
function ContextRing({ context, color, glow, size = 65, delay = 0 }: { context: string; color: string; glow: string; size?: number; delay?: number }) {
  const [drawn, setDrawn] = useState(false)
  const r = size * 0.35
  const circumference = 2 * Math.PI * r
  const center = size / 2
  const numTokens = parseFloat(context?.replace(/[^0-9.]/g, '') || '0') * (context?.toLowerCase().includes('k') ? 1000 : 1)
  const maxTokens = 200000
  const pct = Math.min(numTokens / maxTokens, 1)
  const offset = circumference * (1 - pct)

  useEffect(() => {
    const t = setTimeout(() => setDrawn(true), delay + 400)
    return () => clearTimeout(t)
  }, [delay])

  return (
    <div className="relative flex-none flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Spinning dashed orbit ring */}
        <circle
          cx={center} cy={center} r={r + 6}
          fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="3 5" opacity="0.35" className="animate-spin" style={{ animationDuration: '10s' }}
        />
        <circle cx={center} cy={center} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
        <circle cx={center} cy={center} r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={drawn ? offset : circumference}
          style={{ transition: `stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`, filter: `drop-shadow(0 0 6px ${glow})` }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <Cpu className="size-4 icon-spring" style={{ color }} />
      </div>
    </div>
  )
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
    glow: 'rgba(245,158,11,0.5)',
    gradient: 'linear-gradient(135deg, #f59e0b, #92400e)',
    symbol: clean
  }
}

/* ── Model Spec Card ── */
function ModelCard({ model, onSetKey, onDelete, index }: { model: ModelRecord; onSetKey: (m: ModelRecord) => void; onDelete: (m: ModelRecord) => void; index: number }) {
  const backend = model.backend?.toLowerCase() || ''
  const provMeta = getModelProviderMeta(backend || model.name)
  const DeployIcon = model.isCloud ? Cloud : Server
  const statusColors: Record<string, string> = { active: '#22c55e', staging: '#f59e0b', inactive: '#f43f5e' }
  const statusColor = statusColors[model.status] || '#22c55e'

  return (
    <div
      className="spotlight-card sector-card card-hover-lift rounded-2xl p-5 flex flex-col gap-4 animate-slide-left group shadow-lg border-slate-200"
      style={{
        animationDelay: `${index * 60}ms`,
        background: `radial-gradient(circle at 50% 0%, ${provMeta.color}10, transparent 75%), linear-gradient(135deg, #ffffff, #f8fafc)`,
        border: `1.5px solid ${provMeta.color}35`,
        boxShadow: `0 8px 24px rgba(15, 23, 42, 0.06)`
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <ContextRing context={model.context || '0'} color={provMeta.color} glow={provMeta.glow} delay={index * 60} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-extrabold text-slate-900 group-hover:text-[#d97706] transition-colors truncate">{model.name}</p>
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 capitalize font-extrabold shadow-sm" style={{ color: statusColor, borderColor: `${statusColor}66`, background: `${statusColor}18` }}>
              {model.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="size-5 rounded flex items-center justify-center text-[9px] font-black text-white flex-none shadow-sm" style={{ background: provMeta.gradient, boxShadow: `0 0 8px ${provMeta.glow}` }}>
              {provMeta.symbol}
            </div>
            <span className="text-[11px] text-slate-700 font-bold capitalize">{model.backend}</span>
            <span className="text-slate-400">·</span>
            <DeployIcon className="size-3.5 flex-none" style={{ color: model.isCloud ? '#2563eb' : '#16a34a' }} />
            <span className="text-[11px] text-slate-700 font-bold">{model.isCloud ? 'Cloud' : 'Local'}</span>
          </div>
        </div>
      </div>

      {/* Context label */}
      {model.context && (
        <div className="flex items-center gap-1.5 text-[11px] text-slate-300 font-medium">
          <MemoryStick className="size-3.5 text-[#f59e0b]" />
          <span className="font-mono font-extrabold text-white">{model.context}</span>
          <span>context window</span>
        </div>
      )}

      {/* Task badges */}
      {model.tasks && model.tasks.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {model.tasks.map((t) => {
            const tc = TASK_COLORS[t?.toLowerCase()] || { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' }
            return (
              <span key={t} className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide shadow-sm" style={{ color: tc.color, background: tc.bg, border: `1px solid ${tc.color}40` }}>
                {t}
              </span>
            )
          })}
        </div>
      )}

      {/* Allowed roles */}
      {model.allowedRoles && model.allowedRoles.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {model.allowedRoles.map((r) => (
            <span key={r} className="px-2 py-0.5 rounded text-[9px] font-mono capitalize bg-black/40 text-slate-300 border border-white/10">{r}</span>
          ))}
        </div>
      )}

      {/* API key status */}
      <div className="flex items-center gap-1.5 text-[11px] bg-black/40 p-2 rounded-lg border border-white/10">
        <Key className="size-3.5" style={{ color: model.apiKeyMasked ? '#22c55e' : '#64748b' }} />
        <span className="text-slate-300 font-medium">API Key:</span>
        <span className="font-mono font-extrabold" style={{ color: model.apiKeyMasked ? '#22c55e' : '#f43f5e' }}>
          {model.apiKeyMasked ? model.apiKeyMasked : 'Not set'}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-auto pt-1">
        <button onClick={() => onSetKey(model)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-extrabold transition-all hover:scale-105" style={{ background: `${provMeta.color}22`, border: `1px solid ${provMeta.color}44`, color: provMeta.color }}>
          <Key className="size-3.5 icon-spring" />Set Key
        </button>
        <button onClick={() => onDelete(model)} className="flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl text-[10px] text-red-400 bg-red-500/15 border border-red-500/30 hover:bg-red-500/30 transition-all">
          <Trash2 className="size-3.5 icon-spring" />
        </button>
      </div>
    </div>
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
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#f59e0b]/30 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="cyber-pulse-dot cyber-pulse-dot-amber" />
            <h1 className="text-2xl font-bold tracking-tight sector-header-title">Model Registry</h1>
            <Badge variant="outline" className="sector-badge text-xs font-mono">{total} Models</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Centralized AI model inventory with provider routing, context windows, and access roles.</p>
        </div>
        <Button onClick={() => setShowCreate(true)} size="sm" className="gap-2 text-xs font-bold" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 0 20px rgba(245,158,11,0.3)' }}>
          <Plus className="size-3.5" />Register Model
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
          { label: 'Total Models', value: total, icon: Boxes, color: '#f59e0b' },
          { label: 'Cloud Hosted', value: cloudCount, icon: Cloud, color: '#3b82f6' },
          { label: 'Backends', value: backendSet.size, icon: Zap, color: '#8b5cf6' },
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

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search models…" className="pl-9 bg-white border-[#f59e0b]/50 text-slate-900 font-semibold placeholder:text-slate-400 text-sm shadow-sm" />
        {query && <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="size-3.5 text-slate-400 hover:text-slate-700" /></button>}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-[280px] rounded-2xl bg-white/5 animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />)}
        </div>
      ) : safeModels.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
          <Boxes className="size-8 text-muted-foreground/30" />No models registered.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {safeModels.map((model, i) => <ModelCard key={model.id} model={model} onSetKey={setSetKeyModel} onDelete={setDeleteModel} index={i} />)}
        </div>
      )}

      <Pagination offset={offset} limit={PAGE_SIZE} total={total} onChange={(off) => { setOffset(off); loadModels(query, off) }} />

      {showCreate && (
        <Dialog open onOpenChange={(n) => !n && setShowCreate(false)}>
          <DialogContent className="sm:max-w-lg sector-card animate-vault-open">
            <DialogHeader><DialogTitle className="flex items-center gap-2 text-base font-extrabold text-slate-900"><Boxes className="size-4 text-[#d97706]" />Register New Model</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Model Name</Label>
                  <Input value={createForm.name} onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))} placeholder="gpt-4o" required className="bg-slate-50 border-slate-300 text-slate-900 font-semibold text-xs font-mono shadow-xs focus:bg-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Backend Provider</Label>
                  <Select value={createForm.backend} onValueChange={(v) => setCreateForm((f) => ({ ...f, backend: v }))}>
                    <SelectTrigger className="bg-slate-50 border-slate-300 text-slate-900 font-semibold text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent className="bg-white text-slate-900 border-slate-200 shadow-xl">
                      {['openai', 'anthropic', 'azure', 'google', 'cohere', 'mistral'].map((p) => (
                        <SelectItem key={p} value={p} className="capitalize text-slate-900 font-medium">{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Deployment</Label>
                  <Select value={createForm.isCloud ? 'cloud' : 'local'} onValueChange={(v) => setCreateForm((f) => ({ ...f, isCloud: v === 'cloud' }))}>
                    <SelectTrigger className="bg-slate-50 border-slate-300 text-slate-900 font-semibold text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white text-slate-900 border-slate-200 shadow-xl">
                      <SelectItem value="cloud" className="text-slate-900 font-medium">Cloud</SelectItem>
                      <SelectItem value="local" className="text-slate-900 font-medium">Local / On-prem</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Context Window</Label>
                  <Input value={createForm.context} onChange={(e) => setCreateForm((f) => ({ ...f, context: e.target.value }))} placeholder="128k" className="bg-slate-50 border-slate-300 text-slate-900 font-semibold text-xs font-mono shadow-xs focus:bg-white" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Task Types (comma-separated)</Label>
                <Input value={createForm.tasks} onChange={(e) => setCreateForm((f) => ({ ...f, tasks: e.target.value }))} placeholder="chat, code, reasoning" className="bg-slate-50 border-slate-300 text-slate-900 font-semibold text-xs font-mono shadow-xs focus:bg-white" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Allowed Roles (comma-separated)</Label>
                <Input value={createForm.allowedRoles} onChange={(e) => setCreateForm((f) => ({ ...f, allowedRoles: e.target.value }))} placeholder="admin, editor" className="bg-slate-50 border-slate-300 text-slate-900 font-semibold text-xs font-mono shadow-xs focus:bg-white" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Status</Label>
                <Select value={createForm.status} onValueChange={(v) => setCreateForm((f) => ({ ...f, status: v as 'active' | 'staging' | 'inactive' }))}>
                  <SelectTrigger className="bg-slate-50 border-slate-300 text-slate-900 font-semibold text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white text-slate-900 border-slate-200 shadow-xl">
                    <SelectItem value="active" className="text-slate-900 font-medium">Active</SelectItem>
                    <SelectItem value="staging" className="text-slate-900 font-medium">Staging</SelectItem>
                    <SelectItem value="inactive" className="text-slate-900 font-medium">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="pt-2">
                <DialogClose asChild><Button variant="outline" size="sm" className="text-xs font-bold bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200">Cancel</Button></DialogClose>
                <Button type="submit" size="sm" disabled={submitting} className="text-xs font-extrabold text-white shadow-md" style={{ background: 'linear-gradient(135deg, #d97706, #b45309)' }}>
                  <ChevronRight className="size-3 mr-1" />Register
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {setKeyModel && (
        <Dialog open onOpenChange={(n) => !n && setSetKeyModel(null)}>
          <DialogContent className="sm:max-w-sm sector-card">
            <DialogHeader><DialogTitle className="flex items-center gap-2 text-base font-extrabold text-slate-900"><Lock className="size-4 text-[#d97706]" />Assign API Key — {setKeyModel.name}</DialogTitle></DialogHeader>
            <form onSubmit={handleSetKey} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">API Key Secret</Label>
                <Input type="password" value={keyValue} onChange={(e) => setKeyValue(e.target.value)} placeholder="sk-..." required className="bg-slate-50 border-slate-300 text-slate-900 font-semibold font-mono text-xs shadow-xs focus:bg-white" />
              </div>
              <DialogFooter className="pt-2">
                <DialogClose asChild><Button variant="outline" size="sm" className="text-xs font-bold bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200">Cancel</Button></DialogClose>
                <Button type="submit" size="sm" disabled={submitting} className="text-xs font-extrabold text-white shadow-md" style={{ background: 'linear-gradient(135deg, #d97706, #b45309)' }}>
                  <Key className="size-3 mr-1" />Save Key
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {deleteModel && (
        <Dialog open onOpenChange={(n) => !n && setDeleteModel(null)}>
          <DialogContent className="sm:max-w-sm sector-card">
            <DialogHeader><DialogTitle className="text-base font-extrabold text-red-600 flex items-center gap-2"><Trash2 className="size-4" />Remove Model</DialogTitle></DialogHeader>
            <p className="text-sm text-slate-700 py-2 font-medium">Remove <span className="font-extrabold text-slate-900">{deleteModel.name}</span> from the registry?</p>
            <div className="flex items-center gap-1.5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
              <AlertCircle className="size-3.5 flex-none text-amber-600" />Active routes using this model will be immediately disabled.
            </div>
            <DialogFooter className="mt-2">
              <DialogClose asChild><Button variant="outline" size="sm" className="text-xs font-bold bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200">Cancel</Button></DialogClose>
              <Button variant="destructive" size="sm" disabled={submitting} onClick={() => handleDelete(deleteModel)} className="text-xs font-bold">
                <Trash2 className="size-3 mr-1" />Remove
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

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

/* ── Model Registry Row ── */
function ModelRow({ model, onSetKey, onDelete, index }: { model: ModelRecord; onSetKey: (m: ModelRecord) => void; onDelete: (m: ModelRecord) => void; index: number }) {
  const backend = model.backend?.toLowerCase() || ''
  const provMeta = getModelProviderMeta(backend || model.name)
  const DeployIcon = model.isCloud ? Cloud : Server
  const statusColors: Record<string, string> = { active: '#22c55e', staging: '#f59e0b', inactive: '#f43f5e' }
  const statusColor = statusColors[model.status] || '#22c55e'

  return (
    <TableRow
      className="group border-slate-100 hover:bg-amber-50/50 transition-colors animate-slide-up"
      style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
    >
      {/* Model + Backend */}
      <TableCell className="py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="size-9 rounded-xl flex items-center justify-center text-xs font-black text-white flex-none"
            style={{ background: provMeta.gradient, boxShadow: `0 0 0 3px #fff, 0 0 10px ${provMeta.glow}` }}
          >
            {provMeta.symbol}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate group-hover:text-[#d97706] transition-colors">{model.name}</p>
            <div className="flex items-center gap-1 text-[11px] text-slate-500 font-semibold">
              <span className="capitalize truncate">{model.backend}</span>
              <span className="text-slate-300">·</span>
              <DeployIcon className="size-3 flex-none" style={{ color: model.isCloud ? '#2563eb' : '#16a34a' }} />
              <span>{model.isCloud ? 'Cloud' : 'Local'}</span>
            </div>
          </div>
        </div>
      </TableCell>

      {/* Context */}
      <TableCell className="whitespace-nowrap">
        {model.context ? (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700">
            <MemoryStick className="size-3.5 text-[#d97706]" />
            {model.context}
          </span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )}
      </TableCell>

      {/* Tasks */}
      <TableCell className="max-w-[220px]">
        <div className="flex flex-wrap gap-1">
          {(model.tasks ?? []).length > 0 ? model.tasks.map((t) => {
            const tc = TASK_COLORS[t?.toLowerCase()] || { color: '#64748b', bg: 'rgba(100,116,139,0.15)' }
            return (
              <span key={t} className="px-2 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase tracking-wide" style={{ color: tc.color, background: tc.bg, border: `1px solid ${tc.color}45` }}>
                {t}
              </span>
            )
          }) : <span className="text-xs text-slate-400">—</span>}
        </div>
      </TableCell>

      {/* Allowed Roles */}
      <TableCell className="max-w-[160px]">
        <div className="flex flex-wrap gap-1">
          {(model.allowedRoles ?? []).length > 0 ? model.allowedRoles.map((r) => (
            <span key={r} className="px-1.5 py-0.5 rounded text-[9.5px] font-mono capitalize bg-slate-100 text-slate-700 border border-slate-200 font-extrabold">{r}</span>
          )) : <span className="text-xs text-slate-400">—</span>}
        </div>
      </TableCell>

      {/* API Key */}
      <TableCell className="whitespace-nowrap">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold" style={{ color: model.apiKeyMasked ? '#16a34a' : '#dc2626' }}>
          <Key className="size-3.5 flex-none" />
          {model.apiKeyMasked ? 'Set' : 'Not set'}
        </span>
      </TableCell>

      {/* Status */}
      <TableCell className="whitespace-nowrap">
        <Badge variant="outline" className="text-[10px] px-2 py-0.5 capitalize font-bold" style={{ color: statusColor, borderColor: `${statusColor}66`, background: `${statusColor}18` }}>
          {model.status}
        </Badge>
      </TableCell>

      {/* Actions */}
      <TableCell className="text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onSetKey(model)}
            className="magnetic-btn flex items-center justify-center size-8 rounded-lg transition-all cursor-pointer"
            style={{ background: `${provMeta.color}18`, border: `1.5px solid ${provMeta.color}50`, color: provMeta.color }}
            title="Set API Key"
          >
            <Key className="size-3.5 icon-spring" />
          </button>
          <button
            onClick={() => onDelete(model)}
            className="magnetic-btn flex items-center justify-center size-8 rounded-lg bg-red-500/10 border border-red-500/40 hover:bg-red-500/20 transition-all text-red-600 cursor-pointer"
            title="Delete Model"
          >
            <Trash2 className="size-3.5 icon-spring" />
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
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#f59e0b]/30 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="cyber-pulse-dot cyber-pulse-dot-amber" />
            <h1 className="text-2xl font-bold tracking-tight sector-header-title">Model Registry</h1>
            <Badge variant="outline" className="sector-badge text-xs font-mono">{total} Models</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Centralized AI model inventory with provider routing, context windows, and access roles.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.dispatchEvent(new CustomEvent('hexagon-hub-back'))}
            className="border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 font-extrabold shadow-sm cursor-pointer"
          >
            <ArrowLeft className="size-3.5 mr-1" />
            All Sectors
          </Button>
          <Button onClick={() => setShowCreate(true)} size="sm" className="gap-2 text-xs font-bold" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 0 20px rgba(245,158,11,0.3)' }}>
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

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search models…" className="pl-9 bg-white border-[#f59e0b]/50 text-slate-900 font-semibold placeholder:text-slate-400 text-sm shadow-sm" />
        {query && <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"><X className="size-3.5 text-slate-400 hover:text-slate-700" /></button>}
      </div>

      <div className="sector-card rounded-2xl overflow-hidden shadow-xl border-slate-200" style={{ background: 'linear-gradient(135deg, #ffffff, #f8fafc)' }}>
        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-11 rounded-xl bg-slate-100 animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />)}
          </div>
        ) : safeModels.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
            <Boxes className="size-8 text-muted-foreground/30" />No models registered.
          </div>
        ) : (
          <div className="px-4">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200 hover:bg-transparent bg-slate-50/80">
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-slate-600">Model</TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-slate-600">Context</TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-slate-600">Tasks</TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-slate-600">Roles</TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-slate-600">API Key</TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-slate-600">Status</TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-slate-600 text-right">Actions</TableHead>
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
          <DialogContent className="sm:max-w-lg border-t-4 border-t-[#f59e0b] shadow-2xl rounded-2xl bg-white p-6 border-slate-200 animate-in fade-in-50 zoom-in-95 duration-200">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5 text-lg font-black text-slate-900 tracking-tight">
                <div className="size-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-none">
                  <Boxes className="size-4 text-[#d97706]" />
                </div>
                Register New Model
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black uppercase tracking-wider text-slate-700">Model Name</Label>
                  <Input value={createForm.name} onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))} placeholder="gpt-4o" required className="bg-slate-50 border-slate-300 text-slate-900 font-semibold text-xs font-mono shadow-xs focus:bg-white focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/20 transition-all rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black uppercase tracking-wider text-slate-700">Backend Provider</Label>
                  <Select value={createForm.backend} onValueChange={(v) => setCreateForm((f) => ({ ...f, backend: v }))}>
                    <SelectTrigger className="bg-slate-50 border-slate-300 text-slate-900 font-semibold text-xs shadow-xs focus:bg-white focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/20 transition-all rounded-xl"><SelectValue placeholder="Select provider" /></SelectTrigger>
                    <SelectContent className="bg-white text-slate-900 border-slate-200 shadow-xl rounded-xl">
                      {['openai', 'anthropic', 'azure', 'google', 'cohere', 'mistral'].map((p) => (
                        <SelectItem key={p} value={p} className="capitalize text-slate-900 font-medium cursor-pointer">{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black uppercase tracking-wider text-slate-700">Deployment</Label>
                  <Select value={createForm.isCloud ? 'cloud' : 'local'} onValueChange={(v) => setCreateForm((f) => ({ ...f, isCloud: v === 'cloud' }))}>
                    <SelectTrigger className="bg-slate-50 border-slate-300 text-slate-900 font-semibold text-xs shadow-xs focus:bg-white focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/20 transition-all rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white text-slate-900 border-slate-200 shadow-xl rounded-xl">
                      <SelectItem value="cloud" className="text-slate-900 font-medium cursor-pointer">Cloud</SelectItem>
                      <SelectItem value="local" className="text-slate-900 font-medium cursor-pointer">Local / On-prem</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black uppercase tracking-wider text-slate-700">Context Window</Label>
                  <Input value={createForm.context} onChange={(e) => setCreateForm((f) => ({ ...f, context: e.target.value }))} placeholder="128k" className="bg-slate-50 border-slate-300 text-slate-900 font-semibold text-xs font-mono shadow-xs focus:bg-white focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/20 transition-all rounded-xl" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase tracking-wider text-slate-700">Task Types (comma-separated)</Label>
                <Input value={createForm.tasks} onChange={(e) => setCreateForm((f) => ({ ...f, tasks: e.target.value }))} placeholder="chat, code, reasoning" className="bg-slate-50 border-slate-300 text-slate-900 font-semibold text-xs font-mono shadow-xs focus:bg-white focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/20 transition-all rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase tracking-wider text-slate-700">Allowed Roles (comma-separated)</Label>
                <Input value={createForm.allowedRoles} onChange={(e) => setCreateForm((f) => ({ ...f, allowedRoles: e.target.value }))} placeholder="admin, editor" className="bg-slate-50 border-slate-300 text-slate-900 font-semibold text-xs font-mono shadow-xs focus:bg-white focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/20 transition-all rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase tracking-wider text-slate-700">Status</Label>
                <Select value={createForm.status} onValueChange={(v) => setCreateForm((f) => ({ ...f, status: v as 'active' | 'staging' | 'inactive' }))}>
                  <SelectTrigger className="bg-slate-50 border-slate-300 text-slate-900 font-semibold text-xs shadow-xs focus:bg-white focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/20 transition-all rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white text-slate-900 border-slate-200 shadow-xl rounded-xl">
                    <SelectItem value="active" className="text-slate-900 font-medium cursor-pointer">Active</SelectItem>
                    <SelectItem value="staging" className="text-slate-900 font-medium cursor-pointer">Staging</SelectItem>
                    <SelectItem value="inactive" className="text-slate-900 font-medium cursor-pointer">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="pt-3 gap-2">
                <DialogClose asChild><Button variant="outline" size="sm" className="text-xs font-extrabold bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200 cursor-pointer rounded-xl px-4">Cancel</Button></DialogClose>
                <Button type="submit" size="sm" disabled={submitting} className="text-xs font-extrabold text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer rounded-xl px-5" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                  <ChevronRight className="size-3.5 mr-1" />Register Model
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {setKeyModel && (
        <Dialog open onOpenChange={(n) => !n && setSetKeyModel(null)}>
          <DialogContent className="sm:max-w-md border-t-4 border-t-[#f59e0b] shadow-2xl rounded-2xl bg-white p-6 border-slate-200 animate-in fade-in-50 zoom-in-95 duration-200">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5 text-base font-black text-slate-900 tracking-tight">
                <div className="size-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-none">
                  <Lock className="size-4 text-[#d97706]" />
                </div>
                Assign API Key — {setKeyModel.name}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSetKey} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase tracking-wider text-slate-700">API Key Secret</Label>
                <Input type="password" value={keyValue} onChange={(e) => setKeyValue(e.target.value)} placeholder="sk-..." required className="bg-slate-50 border-slate-300 text-slate-900 font-semibold font-mono text-xs shadow-xs focus:bg-white focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/20 transition-all rounded-xl" />
              </div>
              <DialogFooter className="pt-3 gap-2">
                <DialogClose asChild><Button variant="outline" size="sm" className="text-xs font-extrabold bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200 cursor-pointer rounded-xl px-4">Cancel</Button></DialogClose>
                <Button type="submit" size="sm" disabled={submitting} className="text-xs font-extrabold text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer rounded-xl px-5" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                  <Key className="size-3.5 mr-1" />Save Key
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {deleteModel && (
        <Dialog open onOpenChange={(n) => !n && setDeleteModel(null)}>
          <DialogContent className="sm:max-w-md border-t-4 border-t-red-500 shadow-2xl rounded-2xl bg-white p-6 border-slate-200 animate-in fade-in-50 zoom-in-95 duration-200">
            <DialogHeader>
              <DialogTitle className="text-base font-black text-red-600 flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center justify-center flex-none">
                  <Trash2 className="size-4 text-red-600" />
                </div>
                Remove Model
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-slate-700 py-2 font-medium">Remove <span className="font-extrabold text-slate-900">{deleteModel.name}</span> from the registry?</p>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
              <AlertCircle className="size-4 flex-none text-amber-600" />Active routes using this model will be immediately disabled.
            </div>
            <DialogFooter className="mt-4 gap-2">
              <DialogClose asChild><Button variant="outline" size="sm" className="text-xs font-extrabold bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200 cursor-pointer rounded-xl px-4">Cancel</Button></DialogClose>
              <Button variant="destructive" size="sm" disabled={submitting} onClick={() => handleDelete(deleteModel)} className="text-xs font-extrabold cursor-pointer rounded-xl px-5 shadow-md hover:shadow-lg">
                <Trash2 className="size-3.5 mr-1" />Remove Model
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

import { useEffect, useState, type FormEvent } from 'react'
import {
  Boxes,
  Cloud,
  Server,
  Search,
  Key,
  Trash2,
  AlertCircle,
  Plus,
  Lock,
  MemoryStick,
  X,
  ChevronDown,
  ShieldAlert,
  ArrowLeft,
  Settings2,
  Zap,
  Tag,
  Users
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

const PAGE_SIZE = 12

const PROVIDER_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  openai:    { color: '#10b981', bg: '#dcfce7', border: '#bbf7d0' },
  anthropic: { color: '#8b5cf6', bg: '#f3e8ff', border: '#e9d5ff' },
  azure:     { color: '#3b82f6', bg: '#dbeafe', border: '#bfdbfe' },
  google:    { color: '#f97316', bg: '#ffedd5', border: '#fed7aa' },
  cohere:    { color: '#f59e0b', bg: '#fef3c7', border: '#fde68a' },
  mistral:   { color: '#e11d48', bg: '#ffe4e6', border: '#fecdd3' },
  ollama:    { color: '#d97706', bg: '#fef3c7', border: '#fde68a' },
}
const DEFAULT_PROVIDER = { color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0' }

const TASK_COLORS: Record<string, { color: string; border: string }> = {
  chat:          { color: '#4f46e5', border: 'rgba(79,70,229,0.3)' },
  code:          { color: '#9333ea', border: 'rgba(147,51,234,0.3)' },
  reasoning:     { color: '#0891b2', border: 'rgba(8,145,178,0.3)' },
  summarization: { color: '#ea580c', border: 'rgba(234,88,12,0.3)' },
  translation:   { color: '#16a34a', border: 'rgba(22,163,74,0.3)' },
}

function getModelProviderMeta(name?: string) {
  if (!name) return { ...DEFAULT_PROVIDER, symbol: 'AI' }
  const lower = name.toLowerCase().trim()
  for (const key in PROVIDER_COLORS) {
    if (lower.includes(key)) return { ...PROVIDER_COLORS[key], symbol: key.slice(0, 2).toUpperCase() }
  }
  const clean = name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase() || 'AI'
  return { ...DEFAULT_PROVIDER, symbol: clean }
}

/* ── Expandable Accordion Row (Audit Log Style) ── */
function ExpandableModelCard({ 
  model, 
  isExpanded, 
  onToggle,
  onSetKey,
  onDelete
}: { 
  model: ModelRecord; 
  isExpanded: boolean; 
  onToggle: () => void;
  onSetKey: (m: ModelRecord) => void;
  onDelete: (m: ModelRecord) => void;
}) {
  const backend = model.backend?.toLowerCase() || ''
  const provMeta = getModelProviderMeta(backend || model.name)

  const statusColors: Record<string, { text: string, bg: string, border: string }> = { 
    active: { text: '#15803d', bg: '#dcfce7', border: '#bbf7d0' }, 
    staging: { text: '#b45309', bg: '#fef3c7', border: '#fde68a' }, 
    inactive: { text: '#be123c', bg: '#ffe4e6', border: '#fecdd3' } 
  }
  const statusTheme = statusColors[model.status] || statusColors.active

  // Format subtitle string e.g., "ANTHROPIC API - CLOUD"
  const backendLabel = backend ? `${backend.toUpperCase()} API` : 'UNIVERSAL API'
  const deploymentLabel = model.isCloud ? 'CLOUD' : (backend === 'ollama' ? 'GPU - ON-PREM' : 'ON-PREM')

  return (
    <div className={`flex flex-col bg-white rounded-2xl border transition-all duration-300 shadow-sm overflow-hidden ${
      isExpanded ? 'border-slate-300 shadow-md my-2' : 'border-slate-200 hover:border-slate-300 hover:shadow-md mb-3'
    }`}>
      
      <div 
        onClick={onToggle}
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 cursor-pointer transition-colors ${
          isExpanded ? 'bg-slate-50/80 border-b border-slate-100' : 'bg-white'
        }`}
      >
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div 
            className="size-10 rounded-full flex items-center justify-center flex-none border-2 font-black text-xs"
            style={{ backgroundColor: provMeta.bg, borderColor: provMeta.border, color: provMeta.color }}
          >
            {provMeta.symbol}
          </div>
          
          <div className="flex flex-col min-w-0 gap-0.5">
            <div className="flex items-center gap-2">
              <h3 className="font-mono text-sm font-bold text-slate-800 truncate">
                {model.name}
              </h3>
              <Badge
                variant="outline"
                className="text-[9px] px-2 py-0 rounded-full font-bold capitalize hidden sm:inline-flex"
                style={{ borderColor: statusTheme.border, color: statusTheme.text, background: statusTheme.bg }}
              >
                {model.status}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs font-medium text-slate-500">
              <span className="inline-flex items-center gap-1.5 truncate uppercase tracking-widest text-[9px] font-black text-slate-400">
                <Boxes className="size-3 text-slate-400" />
                {backendLabel} - {deploymentLabel}
              </span>
              <span className="size-1 rounded-full bg-slate-200 flex-none hidden sm:block" />
              <span className="inline-flex items-center gap-1.5 uppercase tracking-widest text-[9px] font-black text-slate-400">
                {model.isCloud ? <Cloud className="size-3 text-slate-400" /> : <Server className="size-3 text-slate-400" />}
                {model.isCloud ? 'Cloud Deployment' : 'Local Instance'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-1/4">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold font-mono uppercase tracking-widest" style={{ color: model.apiKeyMasked ? '#22c55e' : '#f43f5e' }}>
            <Key className="size-3.5" />
            {model.apiKeyMasked ? 'Secured' : 'Missing Key'}
          </span>
          <div className={`p-1.5 rounded-full transition-transform duration-300 ${isExpanded ? 'bg-slate-200 rotate-180' : 'bg-slate-100'}`}>
            <ChevronDown className="size-4 text-slate-600" />
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 sm:p-6 bg-slate-50/30 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 items-start">
            
            <div className="flex flex-col gap-1.5">
              <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Context Window</h4>
              <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-md shadow-sm h-[32px] flex items-center">
                <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <MemoryStick className="size-3.5 text-amber-500" />
                  {model.context ? `${model.context} Tokens` : 'Not specified'}
                </p>
              </div>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Routing Status</h4>
              <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-md shadow-sm h-[32px] flex items-center">
                <p className="text-xs font-bold capitalize flex items-center gap-1.5" style={{ color: statusTheme.text }}>
                  <span className="size-2 rounded-full" style={{ backgroundColor: statusTheme.text }} />
                  {model.status}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">API Credentials</h4>
              <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-md shadow-sm h-[32px] flex items-center justify-between">
                <p className="text-xs font-bold capitalize flex items-center gap-1.5" style={{ color: model.apiKeyMasked ? '#16a34a' : '#dc2626' }}>
                  <Lock className="size-3.5" />
                  {model.apiKeyMasked ? 'Encrypted' : 'Required'}
                </p>
                <button onClick={() => onSetKey(model)} className="text-indigo-600 hover:text-indigo-800 text-[10px] uppercase font-bold tracking-wider cursor-pointer flex items-center gap-1">
                  <Settings2 className="size-3" /> Update
                </button>
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-slate-200">
            <div className="flex flex-col gap-2">
              <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Enabled Tasks</h4>
              <div className="flex flex-wrap gap-2">
                {(model.tasks ?? []).length > 0 ? model.tasks.map((t) => {
                  const tc = TASK_COLORS[t?.toLowerCase()] || { color: '#64748b', border: '#e2e8f0' }
                  return (
                    <span key={t} className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border bg-white shadow-sm" style={{ color: tc.color, borderColor: tc.border }}>
                      {t}
                    </span>
                  )
                }) : <span className="text-xs font-medium text-slate-400 italic">No tasks specified</span>}
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Allowed Access Roles</h4>
              <div className="flex flex-wrap gap-2">
                {(model.allowedRoles ?? []).length > 0 ? model.allowedRoles.map((r) => (
                  <span key={r} className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-slate-200 bg-white text-slate-600 shadow-sm">
                    {r}
                  </span>
                )) : <span className="text-xs font-medium text-slate-400 italic">Unrestricted Global Access</span>}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 flex justify-end">
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => onDelete(model)}
              className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 shadow-sm transition-colors text-xs font-bold cursor-pointer"
            >
              <Trash2 className="size-3.5 mr-1.5" /> Remove Model
            </Button>
          </div>
        </div>
      )}
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
  const [expandedId, setExpandedId] = useState<string | null>(null)
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

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id)
  }

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
      // Optimistically update the UI
      setModels(models.map(m => m.id === setKeyModel.id ? { ...m, apiKeyMasked: true } : m))
      setSetKeyModel(null)
      setKeyValue('')
    } catch { setError('Failed to assign model API key.') }
    finally { setSubmitting(false) }
  }

  async function handleDelete(m: ModelRecord) {
    setSubmitting(true)
    try {
      await api.delete(`/models/${m.id}`)
      if (expandedId === m.id) setExpandedId(null)
      setDeleteModel(null)
      loadModels(query, offset)
    } catch { setError('Failed to remove model.') }
    finally { setSubmitting(false) }
  }

  const safeModels = Array.isArray(models) ? models : []
  const cloudCount = safeModels.filter((m) => m.isCloud).length
  const backendSet = new Set(safeModels.map((m) => m.backend).filter(Boolean))

  const kpis = [
    { 
      label: 'REGISTERED MODELS', value: total, icon: Boxes, chip: 'Registry',
      borderColor: '#f59e0b', iconBg: '#f59e0b', valueColor: '#f59e0b', 
      badgeBg: '#fffbeb', badgeText: '#d97706', glow: 'rgba(245,158,11,0.12)'
    },
    { 
      label: 'CLOUD-HOSTED INSTANCES', value: cloudCount, icon: Cloud, chip: 'Cloud ML',
      borderColor: '#3b82f6', iconBg: '#3b82f6', valueColor: '#3b82f6', 
      badgeBg: '#eff6ff', badgeText: '#2563eb', glow: 'rgba(59,130,246,0.12)'
    },
    { 
      label: 'INFERENCE PROVIDERS', value: backendSet.size, icon: Zap, chip: 'Active Routers',
      borderColor: '#8b5cf6', iconBg: '#8b5cf6', valueColor: '#8b5cf6', 
      badgeBg: '#f3e8ff', badgeText: '#7e22ce', glow: 'rgba(139,92,246,0.12)'
    },
  ]

  return (
    <div className="page min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8 relative selection:bg-amber-500/30">
      
      {/* Light Grid Background */}
      <div className="absolute inset-0 pointer-events-none z-0" style={{ backgroundImage: 'linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      {/* Unified Container for Perfect Alignment */}
      <div className="relative z-10 max-w-[1100px] mx-auto w-full flex flex-col gap-6 animate-slide-up">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black tracking-tight text-slate-900">Model Registry</h1>
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest text-amber-500 border-amber-200 bg-amber-50 px-2.5 py-0.5 rounded-full">
                {total} Models
              </Badge>
            </div>
            <p className="text-sm font-medium text-slate-500 mt-1">Centralized AI model inventory with provider routing, context windows, and access roles.</p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.dispatchEvent(new CustomEvent('hexagon-hub-back'))}
              className="flex-1 sm:flex-none h-9 px-4 rounded-full border-amber-200 text-amber-600 bg-white hover:bg-amber-50 font-bold shadow-sm cursor-pointer"
            >
              <ArrowLeft className="size-3.5 mr-1.5" /> All Sectors
            </Button>
            <Button 
              onClick={() => setShowCreate(true)} 
              size="sm" 
              className="flex-1 sm:flex-none h-9 px-5 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-md shadow-amber-500/20 cursor-pointer transition-colors"
            >
              <Plus className="size-4 mr-1.5" /> Register Model
            </Button>
          </div>
        </header>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-sm font-semibold shadow-sm">
            <ShieldAlert className="size-5 flex-none" /><span className="flex-1">{error}</span>
            <button onClick={() => setError(null)}><X className="size-4 hover:text-red-800" /></button>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          {kpis.map((kpi, i) => (
            <div 
              key={i} 
              className="bg-white rounded-2xl p-5 shadow-sm flex items-center justify-between relative overflow-hidden group border border-slate-100"
              style={{ borderTop: `4px solid ${kpi.borderColor}` }}
            >
              <div 
                className="absolute right-0 top-0 bottom-0 w-2/3 pointer-events-none" 
                style={{ background: `linear-gradient(to right, transparent, ${kpi.glow})` }} 
              />
              
              <div className="flex items-center gap-4 relative z-10">
                <div 
                  className="size-12 rounded-[14px] flex items-center justify-center text-white shadow-sm"
                  style={{ backgroundColor: kpi.iconBg }}
                >
                  <kpi.icon className="size-6" />
                </div>
                <div className="flex flex-col">
                  <div 
                    className="text-3xl font-black leading-none mb-1 tracking-tight"
                    style={{ color: kpi.valueColor }}
                  >
                    {kpi.value}
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                    {kpi.label}
                  </div>
                </div>
              </div>

              <div className="relative z-10">
                <span 
                  className="px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-sm border border-black/5"
                  style={{ backgroundColor: kpi.badgeBg, color: kpi.badgeText }}
                >
                  <span className="size-1.5 rounded-full" style={{ backgroundColor: kpi.badgeText }} />
                  {kpi.chip}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full bg-white rounded-full shadow-sm border border-slate-200">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
            placeholder="Search by model name or provider..." 
            className="pl-12 h-12 w-full rounded-full border-none bg-transparent text-slate-900 font-medium placeholder:text-slate-400 text-sm focus-visible:ring-0 focus-visible:outline-none" 
          />
        </div>

        {/* Model List */}
        <div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-[76px] rounded-2xl bg-white border border-slate-200 shadow-sm animate-pulse" style={{ animationDelay: `${i * 40}ms` }} />
              ))}
            </div>
          ) : safeModels.length === 0 ? (
            <div className="py-24 text-center text-sm text-slate-500 flex flex-col items-center gap-4 bg-white rounded-3xl border border-slate-200 border-dashed">
              <div className="size-16 rounded-full bg-slate-50 flex items-center justify-center">
                <Boxes className="size-8 text-slate-300" />
              </div>
              <p className="font-medium text-slate-600">No models found in the registry.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {safeModels.map((model) => (
                <ExpandableModelCard 
                  key={model.id} 
                  model={model} 
                  isExpanded={expandedId === model.id}
                  onToggle={() => toggleExpand(model.id)}
                  onSetKey={setSetKeyModel}
                  onDelete={setDeleteModel}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-medium text-slate-500 text-center sm:text-left">
               Showing <span className="text-slate-900 font-bold">{total === 0 ? 0 : offset + 1}-{Math.min(offset + PAGE_SIZE, total)}</span> of <span className="text-slate-900 font-bold">{total}</span> models
            </div>
            <div className="flex items-center gap-2">
              <Button 
                type="button"
                variant="outline" 
                size="sm" 
                className="h-9 px-4 rounded-xl text-xs font-bold border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 cursor-pointer transition-colors"
                disabled={offset === 0}
                onClick={() => { 
                  setExpandedId(null); 
                  setOffset(Math.max(0, offset - PAGE_SIZE)); 
                  loadModels(query, Math.max(0, offset - PAGE_SIZE)); 
                }}
              >
                Previous
              </Button>
              <Button 
                type="button"
                variant="outline" 
                size="sm" 
                className="h-9 px-4 rounded-xl text-xs font-bold border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 cursor-pointer transition-colors"
                disabled={offset + PAGE_SIZE >= total}
                onClick={() => { 
                  setExpandedId(null); 
                  setOffset(offset + PAGE_SIZE); 
                  loadModels(query, offset + PAGE_SIZE); 
                }}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Creation Modal */}
      {showCreate && (
        <Dialog open onOpenChange={(n) => !n && setShowCreate(false)}>
          <DialogContent className="w-[95vw] sm:max-w-lg shadow-2xl rounded-3xl bg-white p-6 border-slate-200 animate-in fade-in-50 zoom-in-95 duration-200">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-lg font-black text-slate-900 tracking-tight">
                <div className="size-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center flex-none">
                  <Boxes className="size-5 text-amber-500" />
                </div>
                Register New Model
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-600">Model Name</Label>
                  <Input value={createForm.name} onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))} placeholder="gpt-4o" required className="bg-slate-50 border-slate-200 text-slate-900 font-semibold text-xs font-mono shadow-sm focus:bg-white focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all rounded-xl h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-600">Backend Provider</Label>
                  <Select value={createForm.backend} onValueChange={(v) => setCreateForm((f) => ({ ...f, backend: v }))}>
                    <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900 font-semibold text-xs shadow-sm focus:bg-white focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all rounded-xl h-10"><SelectValue placeholder="Select provider" /></SelectTrigger>
                    <SelectContent className="bg-white text-slate-900 border-slate-200 shadow-xl rounded-xl">
                      {['openai', 'anthropic', 'azure', 'google', 'cohere', 'mistral', 'ollama'].map((p) => (
                        <SelectItem key={p} value={p} className="capitalize text-slate-900 font-medium cursor-pointer hover:bg-slate-50">{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-600">Deployment</Label>
                  <Select value={createForm.isCloud ? 'cloud' : 'local'} onValueChange={(v) => setCreateForm((f) => ({ ...f, isCloud: v === 'cloud' }))}>
                    <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900 font-semibold text-xs shadow-sm focus:bg-white focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all rounded-xl h-10"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white text-slate-900 border-slate-200 shadow-xl rounded-xl">
                      <SelectItem value="cloud" className="text-slate-900 font-medium cursor-pointer hover:bg-slate-50">Cloud</SelectItem>
                      <SelectItem value="local" className="text-slate-900 font-medium cursor-pointer hover:bg-slate-50">Local / On-prem</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-600">Context Window</Label>
                  <Input value={createForm.context} onChange={(e) => setCreateForm((f) => ({ ...f, context: e.target.value }))} placeholder="128k" className="bg-slate-50 border-slate-200 text-slate-900 font-semibold text-xs font-mono shadow-sm focus:bg-white focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all rounded-xl h-10" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-wider text-slate-600">Task Types (comma-separated)</Label>
                <Input value={createForm.tasks} onChange={(e) => setCreateForm((f) => ({ ...f, tasks: e.target.value }))} placeholder="chat, code, reasoning" className="bg-slate-50 border-slate-200 text-slate-900 font-semibold text-xs font-mono shadow-sm focus:bg-white focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all rounded-xl h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-wider text-slate-600">Allowed Roles (comma-separated)</Label>
                <Input value={createForm.allowedRoles} onChange={(e) => setCreateForm((f) => ({ ...f, allowedRoles: e.target.value }))} placeholder="admin, editor" className="bg-slate-50 border-slate-200 text-slate-900 font-semibold text-xs font-mono shadow-sm focus:bg-white focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all rounded-xl h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-wider text-slate-600">Status</Label>
                <Select value={createForm.status} onValueChange={(v) => setCreateForm((f) => ({ ...f, status: v as 'active' | 'staging' | 'inactive' }))}>
                  <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900 font-semibold text-xs shadow-sm focus:bg-white focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all rounded-xl h-10"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white text-slate-900 border-slate-200 shadow-xl rounded-xl">
                    <SelectItem value="active" className="text-slate-900 font-medium cursor-pointer hover:bg-slate-50">Active</SelectItem>
                    <SelectItem value="staging" className="text-slate-900 font-medium cursor-pointer hover:bg-slate-50">Staging</SelectItem>
                    <SelectItem value="inactive" className="text-slate-900 font-medium cursor-pointer hover:bg-slate-50">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="pt-4 border-t border-slate-100 gap-2">
                <DialogClose asChild><Button variant="outline" size="sm" className="h-10 text-xs font-bold bg-white text-slate-700 border-slate-200 hover:bg-slate-50 cursor-pointer rounded-xl px-5">Cancel</Button></DialogClose>
                <Button type="submit" size="sm" disabled={submitting} className="h-10 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 shadow-md transition-all cursor-pointer rounded-xl px-6">
                  Register Model
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Set Key Modal */}
      {setKeyModel && (
        <Dialog open onOpenChange={(n) => !n && setSetKeyModel(null)}>
          <DialogContent className="w-[95vw] sm:max-w-md shadow-2xl rounded-3xl bg-white p-6 border-slate-200 animate-in fade-in-50 zoom-in-95 duration-200">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-lg font-black text-slate-900 tracking-tight">
                <div className="size-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-none">
                  <Lock className="size-5 text-indigo-500" />
                </div>
                Assign API Key
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSetKey} className="space-y-4 py-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 font-medium mb-2">
                Updating credentials for <span className="font-bold text-slate-900">{setKeyModel.name}</span>.
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-wider text-slate-600">API Key Secret</Label>
                <Input type="password" value={keyValue} onChange={(e) => setKeyValue(e.target.value)} placeholder="sk-..." required className="bg-slate-50 border-slate-200 text-slate-900 font-semibold font-mono text-xs shadow-sm focus:bg-white focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all rounded-xl h-10" />
              </div>
              <DialogFooter className="pt-4 border-t border-slate-100 gap-2">
                <DialogClose asChild><Button variant="outline" size="sm" className="h-10 text-xs font-bold bg-white text-slate-700 border-slate-200 hover:bg-slate-50 cursor-pointer rounded-xl px-5">Cancel</Button></DialogClose>
                <Button type="submit" size="sm" disabled={submitting} className="h-10 text-xs font-bold text-white bg-indigo-500 hover:bg-indigo-600 shadow-md transition-all cursor-pointer rounded-xl px-6">
                  Save Key
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Modal */}
      {deleteModel && (
        <Dialog open onOpenChange={(n) => !n && setDeleteModel(null)}>
          <DialogContent className="w-[95vw] sm:max-w-md shadow-2xl rounded-3xl bg-white p-6 border-slate-200 animate-in fade-in-50 zoom-in-95 duration-200">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-3">
                <div className="size-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center flex-none">
                  <Trash2 className="size-5 text-red-500" />
                </div>
                Remove Model
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <p className="text-sm text-slate-600 font-medium">Are you sure you want to remove <span className="font-bold text-slate-900">{deleteModel.name}</span> from the registry?</p>
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-800 text-xs font-medium">
                <AlertCircle className="size-4 flex-none text-red-500 mt-0.5" />
                <p>Active routes using this model will immediately fail if no fallback is configured.</p>
              </div>
            </div>
            <DialogFooter className="pt-4 border-t border-slate-100 gap-2">
              <DialogClose asChild><Button variant="outline" size="sm" className="h-10 text-xs font-bold bg-white text-slate-700 border-slate-200 hover:bg-slate-50 cursor-pointer rounded-xl px-5">Cancel</Button></DialogClose>
              <Button variant="destructive" size="sm" disabled={submitting} onClick={() => handleDelete(deleteModel)} className="h-10 text-xs font-bold cursor-pointer rounded-xl px-6 shadow-md bg-red-500 hover:bg-red-600">
                Remove
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
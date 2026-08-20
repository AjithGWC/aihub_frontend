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
  ChevronDown,
  ShieldAlert,
  ArrowLeft,
  Boxes
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

const PAGE_SIZE = 12

/* ── Premium Provider Branding ── */
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

function getProviderMeta(name?: string) {
  if (!name) return { ...DEFAULT_PROVIDER, symbol: 'KY' }
  const lower = name.toLowerCase().trim()
  for (const key in PROVIDER_COLORS) {
    if (lower.includes(key)) return { ...PROVIDER_COLORS[key], symbol: key.slice(0, 2).toUpperCase() }
  }
  
  const clean = name.replace(/[^a-zA-Z0-9\s]/g, ' ').trim()
  const words = clean.split(/\s+/).filter(Boolean)
  const symbol = words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : (name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2) || 'KY').toUpperCase()

  const fallbackColors = [
    { color: '#06b6d4', bg: '#cffafe', border: '#a5f3fc' },
    { color: '#a855f7', bg: '#f3e8ff', border: '#e9d5ff' },
    { color: '#f97316', bg: '#ffedd5', border: '#fed7aa' },
    { color: '#22c55e', bg: '#dcfce7', border: '#bbf7d0' },
  ]
  const theme = fallbackColors[Math.abs(name.length) % fallbackColors.length]

  return { ...theme, symbol }
}

function getOwnerEmail(owner: ApiKeyRecord['owner']): string {
  if (!owner) return 'System'
  if (typeof owner === 'string') return owner
  return owner.email || owner.name || 'System'
}

/* ── Expandable Accordion Row (Audit Log Style) ── */
function ExpandableApiKeyCard({ 
  apiKey, 
  isExpanded, 
  onToggle,
  onDelete
}: { 
  apiKey: ApiKeyRecord; 
  isExpanded: boolean; 
  onToggle: () => void;
  onDelete: (k: ApiKeyRecord) => void;
}) {
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(false)
  
  const providerName = apiKey.llmName || (apiKey as any).provider || 'Universal API'
  const meta = getProviderMeta(providerName)
  const isActive = apiKey.status === 'active'

  const expiresAt = apiKey.expiresAt ? new Date(apiKey.expiresAt) : null
  const isExpired = expiresAt && expiresAt < new Date()

  const statusColors = { 
    active: { text: '#15803d', bg: '#dcfce7', border: '#bbf7d0' }, 
    inactive: { text: '#be123c', bg: '#ffe4e6', border: '#fecdd3' } 
  }
  const statusTheme = isActive ? statusColors.active : statusColors.inactive

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation()
    navigator.clipboard.writeText(apiKey.masked)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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
            style={{ backgroundColor: meta.bg, borderColor: meta.border, color: meta.color }}
          >
            {meta.symbol}
          </div>
          
          <div className="flex flex-col min-w-0 gap-0.5">
            <div className="flex items-center gap-2">
              <h3 className="font-mono text-sm font-bold text-slate-800 truncate">
                {apiKey.label}
              </h3>
              <Badge
                variant="outline"
                className="text-[9px] px-2 py-0 rounded-full font-bold capitalize hidden sm:inline-flex"
                style={{ borderColor: statusTheme.border, color: statusTheme.text, background: statusTheme.bg }}
              >
                {isActive ? 'Active' : 'Revoked'}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs font-medium text-slate-500">
              <span className="inline-flex items-center gap-1.5 truncate uppercase tracking-widest text-[9px] font-black text-slate-400">
                <Boxes className="size-3 text-slate-400" />
                {providerName}
              </span>
              <span className="size-1 rounded-full bg-slate-200 flex-none hidden sm:block" />
              <span className="inline-flex items-center gap-1.5 uppercase tracking-widest text-[9px] font-black text-slate-400 truncate">
                <User className="size-3 text-slate-400" />
                {getOwnerEmail(apiKey.owner)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-1/4">
          {expiresAt ? (
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold font-mono tracking-widest uppercase ${isExpired ? 'text-red-500' : 'text-slate-500'}`}>
              <Clock className="size-3.5" />
              {expiresAt.toLocaleDateString()}
            </span>
          ) : (
             <span className="inline-flex items-center gap-1.5 text-[11px] font-bold font-mono tracking-widest uppercase text-slate-400">
              <Clock className="size-3.5" />
              No Expiry
            </span>
          )}
          <div className={`p-1.5 rounded-full transition-transform duration-300 ${isExpanded ? 'bg-slate-200 rotate-180' : 'bg-slate-100'}`}>
            <ChevronDown className="size-4 text-slate-600" />
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 sm:p-6 bg-slate-50/30 animate-in fade-in slide-in-from-top-2 duration-200">
          
          <div className="flex flex-col gap-1.5 mb-6">
            <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">API Key Secret</h4>
            <div className="bg-white border border-slate-200 px-4 py-2.5 rounded-xl shadow-sm flex items-center justify-between">
              <span className="font-mono text-sm font-bold text-slate-800 tracking-[0.1em] truncate mr-4">
                {revealed ? apiKey.masked : '••••••••••••••••••••••••'}
              </span>
              <div className="flex items-center gap-2 flex-none">
                <button 
                  onClick={() => setRevealed(!revealed)} 
                  className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors border border-transparent hover:border-slate-200 cursor-pointer" 
                  title={revealed ? 'Hide Secret' : 'Reveal Secret'}
                >
                  {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
                <button 
                  onClick={handleCopy} 
                  className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors border border-transparent hover:border-slate-200 cursor-pointer" 
                  title="Copy Key"
                >
                  {copied ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 items-start border-t border-slate-200 pt-6">
            <div className="flex flex-col gap-1.5">
              <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Assigned To</h4>
              <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-md shadow-sm h-[32px] flex items-center">
                <p className="text-xs font-semibold text-slate-700 truncate">
                  {getOwnerEmail(apiKey.owner)}
                </p>
              </div>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Target Provider</h4>
              <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-md shadow-sm h-[32px] flex items-center">
                <p className="text-xs font-bold capitalize text-slate-700">
                  {providerName}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Status</h4>
              <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-md shadow-sm h-[32px] flex items-center">
                <p className="text-xs font-bold capitalize flex items-center gap-1.5" style={{ color: statusTheme.text }}>
                  <span className="size-2 rounded-full" style={{ backgroundColor: statusTheme.text }} />
                  {isActive ? 'Active' : 'Revoked'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 flex justify-end">
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => onDelete(apiKey)}
              className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 shadow-sm transition-colors text-xs font-bold cursor-pointer"
            >
              <Trash2 className="size-3.5 mr-1.5" /> Revoke Key
            </Button>
          </div>
        </div>
      )}
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
  const [expandedId, setExpandedId] = useState<string | null>(null)
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

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id)
  }

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
      if (expandedId === k.id) setExpandedId(null)
      setDeleteKey(null)
      loadKeys(query, offset)
    } catch { setError('Failed to revoke API key.') }
    finally { setSubmitting(false) }
  }

  const safeKeys = Array.isArray(keys) ? keys : []
  const activeCount = safeKeys.filter((k) => k.status === 'active').length
  const providerSet = new Set(safeKeys.map((k) => k.llmName).filter(Boolean))

  const kpis = [
    { 
      label: 'TOTAL VAULT KEYS', value: total, icon: KeyRound, chip: 'AES-256',
      borderColor: '#f97316', iconBg: '#f97316', valueColor: '#f97316', 
      badgeBg: '#fff7ed', badgeText: '#ea580c', glow: 'rgba(249,115,22,0.12)'
    },
    { 
      label: 'ACTIVE CREDENTIALS', value: activeCount, icon: ShieldCheck, chip: 'Healthy',
      borderColor: '#22c55e', iconBg: '#22c55e', valueColor: '#22c55e', 
      badgeBg: '#f0fdf4', badgeText: '#16a34a', glow: 'rgba(34,197,94,0.12)'
    },
    { 
      label: 'CONNECTED LLMS', value: providerSet.size, icon: Zap, chip: 'Live Providers',
      borderColor: '#8b5cf6', iconBg: '#8b5cf6', valueColor: '#8b5cf6', 
      badgeBg: '#f5f3ff', badgeText: '#7e22ce', glow: 'rgba(139,92,246,0.12)'
    },
  ]

  // Calculate the vault capacity percentage securely
  const capacityPercentage = total > 0 ? (activeCount / total) * 100 : 0

  return (
    <div className="page min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8 relative selection:bg-orange-500/30">
      
      {/* Light Grid Background */}
      <div className="absolute inset-0 pointer-events-none z-0" style={{ backgroundImage: 'linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      {/* Unified Container for Perfect Alignment */}
      <div className="relative z-10 max-w-[1100px] mx-auto w-full flex flex-col gap-6 animate-slide-up">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black tracking-tight text-slate-900">API Key Vault</h1>
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest text-orange-500 border-orange-200 bg-orange-50 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Lock className="size-3" /> Encrypted
              </Badge>
            </div>
            <p className="text-sm font-medium text-slate-500 mt-1">Manage provider credentials across inference routes. Keys are AES-256 encrypted.</p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.dispatchEvent(new CustomEvent('hexagon-hub-back'))}
              className="flex-1 sm:flex-none h-9 px-4 rounded-full border-orange-200 text-orange-600 bg-white hover:bg-orange-50 font-bold shadow-sm cursor-pointer"
            >
              <ArrowLeft className="size-3.5 mr-1.5" /> All Sectors
            </Button>
            <Button 
              onClick={() => setShowCreate(true)} 
              size="sm" 
              className="flex-1 sm:flex-none h-9 px-5 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-md shadow-orange-500/20 cursor-pointer transition-colors"
            >
              <Plus className="size-4 mr-1.5" /> Add API Key
            </Button>
          </div>
        </header>

        {/* Divider */}
        <div className="w-full h-px bg-orange-200/50" />

        {/* KPI Cards (Matches image_8c1045.png / image_8c799f.png) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          {kpis.map((kpi, i) => (
            <div 
              key={i} 
              className="bg-white rounded-2xl p-5 shadow-sm flex items-center justify-between relative overflow-hidden group border border-slate-100"
              style={{ borderTop: `4px solid ${kpi.borderColor}` }}
            >
              {/* Gradient Glow */}
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
                    className="text-[28px] font-black leading-none mb-1 tracking-tight"
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

        {/* Sleek Vault Capacity Tracker */}
        <div className="bg-white rounded-[20px] p-5 shadow-sm border border-slate-100 relative overflow-hidden group">
          <div className="absolute right-0 top-0 bottom-0 w-1/2 pointer-events-none bg-gradient-to-l from-orange-50/40 to-transparent" />
          
          <div className="flex items-center justify-between mb-3.5 relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="size-7 rounded-lg bg-orange-100 text-orange-500 flex items-center justify-center shadow-sm border border-orange-200">
                <Vault className="size-3.5" />
              </div>
              <span className="text-[13px] font-black text-slate-800 tracking-tight">Vault Capacity</span>
            </div>
            <div className="text-[11px] font-black tracking-widest uppercase text-orange-500">
              {activeCount}/{total} Active
            </div>
          </div>
          
          <div className="relative z-10 w-full h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner border border-slate-200/50">
            <div 
              className="h-full bg-gradient-to-r from-orange-400 via-orange-500 to-orange-400 rounded-full transition-all duration-1000 ease-out relative"
              style={{ 
                width: `${capacityPercentage}%`, 
                backgroundSize: '200% 100%' 
              }}
            >
              {/* Subtle shimmer effect along the filled track */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]" />
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-sm font-semibold shadow-sm max-w-5xl mx-auto">
            <ShieldAlert className="size-5 flex-none" /><span className="flex-1">{error}</span>
            <button onClick={() => setError(null)}><X className="size-4 hover:text-red-800" /></button>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative w-full bg-white rounded-full shadow-sm border border-slate-200">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
            placeholder="Search keys by label or provider..." 
            className="pl-12 h-12 w-full rounded-full border-none bg-transparent text-slate-900 font-medium placeholder:text-slate-400 text-sm focus-visible:ring-0 focus-visible:outline-none" 
          />
        </div>

        {/* API Key List */}
        <div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-[76px] rounded-2xl bg-white border border-slate-200 shadow-sm animate-pulse" style={{ animationDelay: `${i * 40}ms` }} />
              ))}
            </div>
          ) : safeKeys.length === 0 ? (
            <div className="py-24 text-center text-sm text-slate-500 flex flex-col items-center gap-4 bg-white rounded-3xl border border-slate-200 border-dashed">
              <div className="size-16 rounded-full bg-slate-50 flex items-center justify-center">
                <KeyRound className="size-8 text-slate-300" />
              </div>
              <p className="font-medium text-slate-600">No credentials found in the vault.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {safeKeys.map((key) => (
                <ExpandableApiKeyCard 
                  key={key.id} 
                  apiKey={key} 
                  isExpanded={expandedId === key.id}
                  onToggle={() => toggleExpand(key.id)}
                  onDelete={setDeleteKey}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-medium text-slate-500 text-center sm:text-left">
               Showing <span className="text-slate-900 font-bold">{total === 0 ? 0 : offset + 1}-{Math.min(offset + PAGE_SIZE, total)}</span> of <span className="text-slate-900 font-bold">{total}</span> keys
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
                  loadKeys(query, Math.max(0, offset - PAGE_SIZE)); 
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
                  loadKeys(query, offset + PAGE_SIZE); 
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
                <div className="size-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center flex-none">
                  <KeyRound className="size-5 text-orange-500" />
                </div>
                Add API Key to Vault
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-600">Key Label</Label>
                  <Input value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="Production OpenAI" required className="bg-slate-50 border-slate-200 text-slate-900 font-semibold text-xs shadow-sm focus:bg-white focus:border-orange-400 focus:ring-1 focus:ring-orange-400 transition-all rounded-xl h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-600">Provider</Label>
                  <Select value={form.llmName} onValueChange={(v) => setForm((f) => ({ ...f, llmName: v }))}>
                    <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900 font-semibold text-xs shadow-sm focus:bg-white focus:border-orange-400 focus:ring-1 focus:ring-orange-400 transition-all rounded-xl h-10 capitalize"><SelectValue placeholder="Select provider" /></SelectTrigger>
                    <SelectContent className="bg-white text-slate-900 border-slate-200 shadow-xl rounded-xl">
                      {['ollama', 'openai', 'anthropic', 'azure', 'cohere', 'mistral', 'google'].map((p) => (
                        <SelectItem key={p} value={p} className="capitalize text-slate-900 font-medium cursor-pointer hover:bg-slate-50">{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-wider text-slate-600">API Key Secret</Label>
                <Input type="password" value={form.key} onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))} placeholder="sk-..." required className="bg-slate-50 border-slate-200 text-slate-900 font-semibold font-mono text-xs tracking-widest shadow-sm focus:bg-white focus:border-orange-400 focus:ring-1 focus:ring-orange-400 transition-all rounded-xl h-10" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-600">Assigned User</Label>
                  <Input value={form.user} onChange={(e) => setForm((f) => ({ ...f, user: e.target.value }))} placeholder="alice@co.com" className="bg-slate-50 border-slate-200 text-slate-900 font-semibold text-xs shadow-sm focus:bg-white focus:border-orange-400 focus:ring-1 focus:ring-orange-400 transition-all rounded-xl h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-600">Expires At</Label>
                  <Input type="date" value={form.expiresAt} onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))} className="bg-slate-50 border-slate-200 text-slate-900 font-semibold text-xs shadow-sm focus:bg-white focus:border-orange-400 focus:ring-1 focus:ring-orange-400 transition-all rounded-xl h-10" />
                </div>
              </div>
              <DialogFooter className="pt-4 border-t border-slate-100 gap-2">
                <DialogClose asChild><Button variant="outline" size="sm" className="h-10 text-xs font-bold bg-white text-slate-700 border-slate-200 hover:bg-slate-50 cursor-pointer rounded-xl px-5">Cancel</Button></DialogClose>
                <Button type="submit" size="sm" disabled={submitting} className="h-10 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 shadow-md transition-all cursor-pointer rounded-xl px-6">
                  Store in Vault
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete/Revoke Modal */}
      {deleteKey && (
        <Dialog open onOpenChange={(n) => !n && setDeleteKey(null)}>
          <DialogContent className="w-[95vw] sm:max-w-md shadow-2xl rounded-3xl bg-white p-6 border-slate-200 animate-in fade-in-50 zoom-in-95 duration-200">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-3">
                <div className="size-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center flex-none">
                  <Trash2 className="size-5 text-red-500" />
                </div>
                Revoke API Key
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <p className="text-sm text-slate-600 font-medium">Are you sure you want to permanently revoke <span className="font-bold text-slate-900">{deleteKey.label}</span>?</p>
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-800 text-xs font-medium">
                <AlertCircle className="size-4 flex-none text-red-500 mt-0.5" />
                <p>Applications actively using this credential will immediately lose network access.</p>
              </div>
            </div>
            <DialogFooter className="pt-4 border-t border-slate-100 gap-2">
              <DialogClose asChild><Button variant="outline" size="sm" className="h-10 text-xs font-bold bg-white text-slate-700 border-slate-200 hover:bg-slate-50 cursor-pointer rounded-xl px-5">Cancel</Button></DialogClose>
              <Button variant="destructive" size="sm" disabled={submitting} onClick={() => handleDelete(deleteKey)} className="h-10 text-xs font-bold cursor-pointer rounded-xl px-6 shadow-md bg-red-500 hover:bg-red-600">
                Revoke Key
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
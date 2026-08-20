import { useEffect, useState, type FormEvent } from 'react'
import {
  UserPlus,
  Users,
  ShieldAlert,
  Search,
  Edit3,
  UserX,
  UserCheck,
  Trash2,
  Building2,
  Crown,
  RefreshCw,
  X,
  ArrowLeft,
  ChevronDown,
  Mail,
  Shield
} from 'lucide-react'
import { api } from '@/api'
import type { AppUser } from '../types'
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

const ROLE_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  admin: { color: '#8b5cf6', bg: '#f3e8ff', border: '#e9d5ff' },
  owner: { color: '#f97316', bg: '#ffedd5', border: '#fed7aa' },
  viewer: { color: '#06b6d4', bg: '#cffafe', border: '#a5f3fc' },
  editor: { color: '#22c55e', bg: '#dcfce7', border: '#bbf7d0' },
}

const ROLES = ['admin', 'editor', 'viewer', 'owner'] as const

function getAvatarGradient(name: string): { gradient: string; glow: string; color: string } {
  const hues = [210, 170, 270, 30, 140, 320]
  const idx = (name?.charCodeAt(0) || 65) % hues.length
  const h = hues[idx]
  return {
    gradient: `linear-gradient(135deg, hsl(${h},80%,40%), hsl(${h + 40},90%,60%))`,
    glow: `hsla(${h},80%,60%,0.3)`,
    color: `hsl(${h},80%,60%)`
  }
}

function getInitials(name: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : parts[0].slice(0, 2).toUpperCase()
}

/* ── Expandable Accordion Row ── */
function ExpandableUserCard({
  user,
  isExpanded,
  onToggle,
  onEdit,
  onStatusToggle,
  onDelete,
}: {
  user: AppUser
  isExpanded: boolean
  onToggle: () => void
  onEdit: (u: AppUser) => void
  onStatusToggle: (u: AppUser) => void
  onDelete: (u: AppUser) => void
}) {
  const { gradient, glow } = getAvatarGradient(user.name || user.email)
  const initials = getInitials(user.name || user.email)
  const roleConf = ROLE_COLORS[user.role?.toLowerCase() || ''] || { color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0' }
  const isActive = user.status === 'active'

  const statusColors = { 
    active: { text: '#15803d', bg: '#dcfce7', border: '#bbf7d0' }, 
    inactive: { text: '#be123c', bg: '#ffe4e6', border: '#fecdd3' } 
  }
  const statusTheme = isActive ? statusColors.active : statusColors.inactive

  return (
    <div className={`flex flex-col bg-white rounded-2xl border transition-all duration-300 shadow-sm overflow-hidden ${
      isExpanded ? 'border-slate-300 shadow-md my-2' : 'border-slate-200 hover:border-slate-300 hover:shadow-md mb-3'
    }`}>
      
      {/* Summary Header */}
      <div 
        onClick={onToggle}
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 cursor-pointer transition-colors ${
          isExpanded ? 'bg-slate-50/80 border-b border-slate-100' : 'bg-white'
        }`}
      >
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div 
            className="size-10 rounded-full flex items-center justify-center flex-none font-black text-xs text-white border-2 border-white shadow-sm"
            style={{ background: gradient, boxShadow: `0 0 0 2px #fff, 0 4px 10px ${glow}` }}
          >
            {initials}
          </div>
          
          <div className="flex flex-col min-w-0 gap-0.5">
            <div className="flex items-center gap-2">
              <h3 className="font-mono text-sm font-bold text-slate-800 truncate">
                {user.name || 'Unknown User'}
              </h3>
              <Badge
                variant="outline"
                className="text-[9px] px-2 py-0 rounded-full font-bold capitalize hidden sm:inline-flex"
                style={{ borderColor: statusTheme.border, color: statusTheme.text, background: statusTheme.bg }}
              >
                {isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs font-medium text-slate-500">
              <span className="inline-flex items-center gap-1.5 truncate uppercase tracking-widest text-[9px] font-black text-slate-400">
                <Mail className="size-3 text-slate-400" />
                {user.email}
              </span>
              <span className="size-1 rounded-full bg-slate-200 flex-none hidden sm:block" />
              <span className="inline-flex items-center gap-1.5 uppercase tracking-widest text-[9px] font-black" style={{ color: roleConf.color }}>
                {user.role === 'admin' ? <Crown className="size-3" /> : <Shield className="size-3" />}
                {user.role || 'No Role'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-1/4">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold font-mono uppercase tracking-widest text-slate-500 truncate max-w-[120px]">
            <Building2 className="size-3.5" />
            {user.department || 'No Dept'}
          </span>
          <div className={`p-1.5 rounded-full transition-transform duration-300 ${isExpanded ? 'bg-slate-200 rotate-180' : 'bg-slate-100'}`}>
            <ChevronDown className="size-4 text-slate-600" />
          </div>
        </div>
      </div>

      {/* Expanded Body */}
      {isExpanded && (
        <div className="p-4 sm:p-6 bg-slate-50/30 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 items-start">
            
            <div className="flex flex-col gap-1.5">
              <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Department</h4>
              <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-md shadow-sm h-[32px] flex items-center">
                <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 truncate">
                  <Building2 className="size-3.5 text-cyan-500" />
                  {user.department || 'Not Assigned'}
                </p>
              </div>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Assigned Role</h4>
              <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-md shadow-sm h-[32px] flex items-center">
                <p className="text-xs font-bold capitalize flex items-center gap-1.5" style={{ color: roleConf.color }}>
                  <span className="size-2 rounded-full" style={{ backgroundColor: roleConf.color }} />
                  {user.role || 'Unassigned'}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Account Status</h4>
              <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-md shadow-sm h-[32px] flex items-center">
                <p className="text-xs font-bold capitalize flex items-center gap-1.5" style={{ color: statusTheme.text }}>
                  <span className="size-2 rounded-full" style={{ backgroundColor: statusTheme.text }} />
                  {isActive ? 'Active & Verifed' : 'Account Disabled'}
                </p>
              </div>
            </div>

          </div>

          {/* Action Row */}
          <div className="mt-6 pt-6 border-t border-slate-200 flex flex-wrap items-center justify-end gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={(e) => { e.stopPropagation(); onEdit(user); }}
              className="bg-white text-cyan-700 border-cyan-200 hover:bg-cyan-50 shadow-sm transition-colors text-xs font-bold cursor-pointer"
            >
              <Edit3 className="size-3.5 mr-1.5" /> Edit Details
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={(e) => { e.stopPropagation(); onStatusToggle(user); }}
              className={`shadow-sm transition-colors text-xs font-bold cursor-pointer bg-white ${
                isActive 
                  ? 'text-amber-700 border-amber-200 hover:bg-amber-50' 
                  : 'text-green-700 border-green-200 hover:bg-green-50'
              }`}
            >
              {isActive ? <UserX className="size-3.5 mr-1.5" /> : <UserCheck className="size-3.5 mr-1.5" />}
              {isActive ? 'Disable Access' : 'Enable Access'}
            </Button>

            <Button 
              variant="destructive" 
              size="sm" 
              onClick={(e) => { e.stopPropagation(); onDelete(user); }}
              className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 shadow-sm transition-colors text-xs font-bold cursor-pointer"
            >
              <Trash2 className="size-3.5 mr-1.5" /> Remove User
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function UsersRoles() {
  const [users, setUsers] = useState<AppUser[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editUser, setEditUser] = useState<AppUser | null>(null)
  const [deleteUser, setDeleteUser] = useState<AppUser | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  const [form, setForm] = useState({ name: '', email: '', role: '', department: '', status: 'active' as 'active' | 'inactive' })

  async function loadData(q: string, off: number) {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get('/users', { params: { q: q || undefined, offset: off, limit: PAGE_SIZE } })
      const loaded = data?.users ?? (Array.isArray(data) ? data : [])
      setUsers(loaded)
      setTotal(data?.total ?? loaded.length)
    } catch {
      setError('Failed to load users. Check your backend connection.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData('', 0) }, [])
  useEffect(() => {
    const t = setTimeout(() => { setOffset(0); loadData(query, 0) }, 300)
    return () => clearTimeout(t)
  }, [query])

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id)
  }

  function openEdit(u: AppUser) {
    setEditUser(u)
    setForm({ name: u.name || '', email: u.email, role: u.role || '', department: u.department || '', status: u.status as 'active' | 'inactive' })
  }

  async function handleSubmitEdit(e: FormEvent) {
    e.preventDefault()
    if (!editUser) return
    setSubmitting(true)
    try {
      await api.patch(`/users/${editUser.id}`, form)
      setEditUser(null)
      loadData(query, offset)
    } catch { setError('Failed to update user.') }
    finally { setSubmitting(false) }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/users', form)
      setShowCreate(false)
      loadData(query, offset)
    } catch { setError('Failed to create user.') }
    finally { setSubmitting(false) }
  }

  async function handleToggleStatus(u: AppUser) {
    const next = u.status === 'active' ? 'inactive' : 'active'
    try {
      await api.patch(`/users/${u.id}`, { status: next })
      loadData(query, offset)
    } catch { setError('Failed to update user status.') }
  }

  async function handleDelete(u: AppUser) {
    setSubmitting(true)
    try {
      await api.delete(`/users/${u.id}`)
      if (expandedId === u.id) setExpandedId(null)
      setDeleteUser(null)
      loadData(query, offset)
    } catch { setError('Failed to delete user.') }
    finally { setSubmitting(false) }
  }

  const safeUsers = Array.isArray(users) ? users : []
  const activeCount = safeUsers.filter((u) => u.status === 'active').length
  const adminCount = safeUsers.filter((u) => u.role === 'admin' || u.role === 'owner').length

  // Always sort alphabetically by name for consistency in this view
  const sortedUsers = [...safeUsers].sort((a, b) => {
    const av = (a.name || a.email || '').toLowerCase()
    const bv = (b.name || b.email || '').toLowerCase()
    return av.localeCompare(bv)
  })

  const kpis = [
    { 
      label: 'TOTAL DIRECTORY MEMBERS', value: total, icon: Users, chip: 'Directory',
      borderColor: '#06b6d4', iconBg: '#06b6d4', valueColor: '#06b6d4', 
      badgeBg: '#ecfeff', badgeText: '#0891b2', glow: 'rgba(6,182,212,0.12)'
    },
    { 
      label: 'ACTIVE SESSIONS NOW', value: activeCount, icon: UserCheck, chip: 'Online',
      borderColor: '#22c55e', iconBg: '#22c55e', valueColor: '#22c55e', 
      badgeBg: '#f0fdf4', badgeText: '#16a34a', glow: 'rgba(34,197,94,0.12)'
    },
    { 
      label: 'SYSTEM ADMINISTRATORS', value: adminCount, icon: ShieldAlert, chip: 'Super Admin',
      borderColor: '#8b5cf6', iconBg: '#8b5cf6', valueColor: '#8b5cf6', 
      badgeBg: '#f3e8ff', badgeText: '#7e22ce', glow: 'rgba(139,92,246,0.12)'
    },
  ]

  const UserFormFields = ({ onSubmit }: { onSubmit: (e: FormEvent) => Promise<void> }) => (
    <form onSubmit={onSubmit} className="space-y-4 py-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-[10px] font-black uppercase tracking-wider text-slate-600">Full Name</Label>
          <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Alice Chen" required className="bg-slate-50 border-slate-200 text-slate-900 font-semibold placeholder:text-slate-400 text-xs shadow-sm focus:bg-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all rounded-xl h-10" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-black uppercase tracking-wider text-slate-600">Email Address</Label>
          <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="alice@co.com" required className="bg-slate-50 border-slate-200 text-slate-900 font-semibold placeholder:text-slate-400 text-xs shadow-sm focus:bg-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all rounded-xl h-10" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-black uppercase tracking-wider text-slate-600">Assigned Role</Label>
          <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}>
            <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900 font-semibold text-xs shadow-sm focus:bg-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all rounded-xl h-10"><SelectValue placeholder="Select role" /></SelectTrigger>
            <SelectContent className="bg-white text-slate-900 border-slate-200 shadow-xl rounded-xl">
              {ROLES.map((r) => <SelectItem key={r} value={r} className="capitalize text-slate-900 font-medium cursor-pointer hover:bg-slate-50">{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-black uppercase tracking-wider text-slate-600">Department</Label>
          <Input value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} placeholder="Engineering" className="bg-slate-50 border-slate-200 text-slate-900 font-semibold placeholder:text-slate-400 text-xs shadow-sm focus:bg-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all rounded-xl h-10" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-[10px] font-black uppercase tracking-wider text-slate-600">Account Status</Label>
        <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as 'active' | 'inactive' }))}>
          <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900 font-semibold text-xs shadow-sm focus:bg-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all rounded-xl h-10"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-white text-slate-900 border-slate-200 shadow-xl rounded-xl">
            <SelectItem value="active" className="text-slate-900 font-medium cursor-pointer hover:bg-slate-50">Active</SelectItem>
            <SelectItem value="inactive" className="text-slate-900 font-medium cursor-pointer hover:bg-slate-50">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DialogFooter className="pt-4 border-t border-slate-100 gap-2">
        <DialogClose asChild><Button variant="outline" size="sm" className="h-10 text-xs font-bold bg-white text-slate-700 border-slate-200 hover:bg-slate-50 cursor-pointer rounded-xl px-5">Cancel</Button></DialogClose>
        <Button type="submit" size="sm" className="h-10 text-xs font-bold text-white shadow-md bg-cyan-500 hover:bg-cyan-600 transition-all cursor-pointer rounded-xl px-6" disabled={submitting}>
          {submitting ? <RefreshCw className="size-3.5 animate-spin mr-1.5" /> : null} Save Member
        </Button>
      </DialogFooter>
    </form>
  )

  return (
    <div className="page min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8 relative selection:bg-cyan-500/30">
      
      {/* Light Grid Background */}
      <div className="absolute inset-0 pointer-events-none z-0" style={{ backgroundImage: 'linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      {/* Unified Container for Perfect Alignment */}
      <div className="relative z-10 max-w-[1100px] mx-auto w-full flex flex-col gap-6 animate-slide-up">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black tracking-tight text-slate-900">Identity Directory</h1>
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest text-cyan-500 border-cyan-200 bg-cyan-50 px-2.5 py-0.5 rounded-full">
                {total} Members
              </Badge>
            </div>
            <p className="text-sm font-medium text-slate-500 mt-1">Directory of everyone with portal access, and the roles that determine what they can do.</p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.dispatchEvent(new CustomEvent('hexagon-hub-back'))}
              className="flex-1 sm:flex-none h-9 px-4 rounded-full border-cyan-200 text-cyan-600 bg-white hover:bg-cyan-50 font-bold shadow-sm cursor-pointer"
            >
              <ArrowLeft className="size-3.5 mr-1.5" /> All Sectors
            </Button>
            <Button 
              onClick={() => setShowCreate(true)} 
              size="sm" 
              className="flex-1 sm:flex-none h-9 px-5 rounded-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold shadow-md shadow-cyan-500/20 cursor-pointer transition-colors"
            >
              <UserPlus className="size-4 mr-1.5" /> Add Member
            </Button>
          </div>
        </header>

        {/* Divider */}
        <div className="w-full h-px bg-cyan-200/50" />

        {/* KPI Cards (Matches image_993b82.jpg) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-6">
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
            placeholder="Search directory by name or email..." 
            className="pl-12 h-12 w-full rounded-full border-none bg-transparent text-slate-900 font-medium placeholder:text-slate-400 text-sm focus-visible:ring-0 focus-visible:outline-none" 
          />
        </div>

        {/* Accordion List */}
        <div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-[76px] rounded-2xl bg-white border border-slate-200 shadow-sm animate-pulse" style={{ animationDelay: `${i * 40}ms` }} />
              ))}
            </div>
          ) : sortedUsers.length === 0 ? (
            <div className="py-24 text-center text-sm text-slate-500 flex flex-col items-center gap-4 bg-white rounded-3xl border border-slate-200 border-dashed">
              <div className="size-16 rounded-full bg-slate-50 flex items-center justify-center">
                <Users className="size-8 text-slate-300" />
              </div>
              <p className="font-medium text-slate-600">No members found matching your search.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {sortedUsers.map((user) => (
                <ExpandableUserCard 
                  key={user.id} 
                  user={user} 
                  isExpanded={expandedId === user.id}
                  onToggle={() => toggleExpand(user.id)}
                  onEdit={openEdit}
                  onStatusToggle={handleToggleStatus}
                  onDelete={setDeleteUser}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-medium text-slate-500 text-center sm:text-left">
               Showing <span className="text-slate-900 font-bold">{total === 0 ? 0 : offset + 1}-{Math.min(offset + PAGE_SIZE, total)}</span> of <span className="text-slate-900 font-bold">{total}</span>
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
                  loadData(query, Math.max(0, offset - PAGE_SIZE)); 
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
                  loadData(query, offset + PAGE_SIZE); 
                }}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <Dialog open onOpenChange={(n) => !n && setShowCreate(false)}>
          <DialogContent className="w-[95vw] sm:max-w-lg shadow-2xl rounded-3xl bg-white p-6 border-slate-200 animate-in fade-in-50 zoom-in-95 duration-200">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-lg font-black text-slate-900 tracking-tight">
                <div className="size-10 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center flex-none">
                  <UserPlus className="size-5 text-cyan-500" />
                </div>
                Add New Member
              </DialogTitle>
            </DialogHeader>
            <UserFormFields onSubmit={handleCreate} />
          </DialogContent>
        </Dialog>
      )}

      {editUser && (
        <Dialog open onOpenChange={(n) => !n && setEditUser(null)}>
          <DialogContent className="w-[95vw] sm:max-w-lg shadow-2xl rounded-3xl bg-white p-6 border-slate-200 animate-in fade-in-50 zoom-in-95 duration-200">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-lg font-black text-slate-900 tracking-tight">
                <div className="size-10 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center flex-none">
                  <Edit3 className="size-5 text-cyan-500" />
                </div>
                Edit Member Details
              </DialogTitle>
            </DialogHeader>
            <UserFormFields onSubmit={handleSubmitEdit} />
          </DialogContent>
        </Dialog>
      )}

      {deleteUser && (
        <Dialog open onOpenChange={(n) => !n && setDeleteUser(null)}>
          <DialogContent className="w-[95vw] sm:max-w-md shadow-2xl rounded-3xl bg-white p-6 border-slate-200 animate-in fade-in-50 zoom-in-95 duration-200">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-lg font-black text-slate-900 tracking-tight">
                <div className="size-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center flex-none">
                  <Trash2 className="size-5 text-red-500" />
                </div>
                Remove Member
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <p className="text-sm text-slate-600 font-medium">Are you sure you want to permanently remove <span className="font-bold text-slate-900">{deleteUser.name || deleteUser.email}</span>?</p>
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-800 text-xs font-medium">
                <ShieldAlert className="size-4 flex-none text-red-500 mt-0.5" />
                <p>They will immediately lose access to all resources and workflows in this workspace.</p>
              </div>
            </div>
            <DialogFooter className="pt-4 border-t border-slate-100 gap-2">
              <DialogClose asChild><Button variant="outline" size="sm" className="h-10 text-xs font-bold bg-white text-slate-700 border-slate-200 hover:bg-slate-50 cursor-pointer rounded-xl px-5">Cancel</Button></DialogClose>
              <Button variant="destructive" size="sm" disabled={submitting} onClick={() => handleDelete(deleteUser)} className="h-10 text-xs font-bold cursor-pointer rounded-xl px-6 shadow-md bg-red-500 hover:bg-red-600">
                Remove Member
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
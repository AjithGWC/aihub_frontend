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
  ArrowUpDown,
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
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { Pagination } from '../components/Pagination'

const PAGE_SIZE = 12
const ROLE_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  admin: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.4)' },
  owner: { color: '#f97316', bg: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.4)' },
  viewer: { color: '#06b6d4', bg: 'rgba(6,182,212,0.15)', border: 'rgba(6,182,212,0.4)' },
  editor: { color: '#22c55e', bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.4)' },
}

function getAvatarGradient(name: string): { gradient: string; glow: string; color: string } {
  const hues = [210, 170, 270, 30, 140, 320]
  const idx = (name?.charCodeAt(0) || 65) % hues.length
  const h = hues[idx]
  return {
    gradient: `linear-gradient(135deg, hsl(${h},80%,40%), hsl(${h + 40},90%,60%))`,
    glow: `hsla(${h},80%,60%,0.5)`,
    color: `hsl(${h},80%,60%)`
  }
}

function getInitials(name: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : parts[0].slice(0, 2).toUpperCase()
}

const ROLES = ['admin', 'editor', 'viewer', 'owner'] as const

/* ── Enterprise Directory Row ── */
function UserRow({ user, onEdit, onToggle, onDelete, index }: {
  user: AppUser
  onEdit: (u: AppUser) => void
  onToggle: (u: AppUser) => void
  onDelete: (u: AppUser) => void
  index: number
}) {
  const { gradient, glow, color } = getAvatarGradient(user.name || user.email)
  const initials = getInitials(user.name || user.email)
  const roleConf = ROLE_COLORS[user.role?.toLowerCase() || ''] || { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.3)' }
  const isActive = user.status === 'active'

  return (
    <TableRow
      className="group border-slate-100 hover:bg-cyan-50/50 transition-colors animate-slide-up"
      style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
    >
      {/* Identity */}
      <TableCell className="py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="size-9 rounded-full flex items-center justify-center text-xs font-extrabold text-white select-none flex-none"
            style={{ background: gradient, boxShadow: `0 0 0 3px #fff, 0 0 10px ${glow}` }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate group-hover:text-[#0891b2] transition-colors">
              {user.name || '—'}
            </p>
            <p className="text-[11px] text-slate-500 font-mono truncate">{user.email}</p>
          </div>
        </div>
      </TableCell>

      {/* Department */}
      <TableCell className="whitespace-nowrap">
        {user.department ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <Building2 className="size-3.5 text-[#06b6d4]" />
            {user.department}
          </span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )}
      </TableCell>

      {/* Role */}
      <TableCell className="whitespace-nowrap">
        {user.role ? (
          <Badge variant="outline" className="text-[10px] px-2 py-0.5 capitalize font-bold" style={{ color: roleConf.color, borderColor: roleConf.border, background: roleConf.bg }}>
            {user.role === 'admin' && <Crown className="size-2.5 mr-1" />}
            {user.role}
          </Badge>
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
            color: isActive ? '#16a34a' : '#64748b',
            borderColor: isActive ? 'rgba(34,197,94,0.4)' : 'rgba(100,116,139,0.4)',
            background: isActive ? 'rgba(34,197,94,0.12)' : 'rgba(100,116,139,0.12)',
          }}
        >
          {isActive ? '● Active' : '○ Inactive'}
        </Badge>
      </TableCell>

      {/* Actions */}
      <TableCell className="text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(user)}
            className="magnetic-btn flex items-center justify-center size-8 rounded-lg bg-[#06b6d4]/10 border border-[#06b6d4]/40 hover:bg-[#06b6d4]/20 transition-all text-[#0891b2] cursor-pointer"
            title="Edit Member"
          >
            <Edit3 className="size-3.5 icon-spring" />
          </button>
          <button
            onClick={() => onToggle(user)}
            className={`magnetic-btn flex items-center justify-center size-8 rounded-lg transition-all cursor-pointer ${
              isActive
                ? 'bg-amber-500/10 border border-amber-500/40 hover:bg-amber-500/20 text-amber-700'
                : 'bg-green-500/10 border border-green-500/40 hover:bg-green-500/20 text-green-700'
            }`}
            title={isActive ? 'Disable Member' : 'Enable Member'}
          >
            {isActive ? <UserX className="size-3.5 icon-spring" /> : <UserCheck className="size-3.5 icon-spring" />}
          </button>
          <button
            onClick={() => onDelete(user)}
            className="magnetic-btn flex items-center justify-center size-8 rounded-lg bg-red-500/10 border border-red-500/40 hover:bg-red-500/20 transition-all text-red-600 cursor-pointer"
            title="Remove Member"
          >
            <Trash2 className="size-3.5 icon-spring" />
          </button>
        </div>
      </TableCell>
    </TableRow>
  )
}

export default function UsersRoles() {
  const [users, setUsers] = useState<AppUser[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editUser, setEditUser] = useState<AppUser | null>(null)
  const [deleteUser, setDeleteUser] = useState<AppUser | null>(null)
  const [form, setForm] = useState({ name: '', email: '', role: '', department: '', status: 'active' as 'active' | 'inactive' })
  const [submitting, setSubmitting] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [sortKey, setSortKey] = useState<'name' | 'department' | 'role' | 'status'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

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

  async function handleToggle(u: AppUser) {
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
      setDeleteUser(null)
      loadData(query, offset)
    } catch { setError('Failed to delete user.') }
    finally { setSubmitting(false) }
  }

  const safeUsers = Array.isArray(users) ? users : []
  const activeCount = safeUsers.filter((u) => u.status === 'active').length
  const adminCount = safeUsers.filter((u) => u.role === 'admin').length

  const sortedUsers = [...safeUsers].sort((a, b) => {
    const av = (sortKey === 'name' ? (a.name || a.email) : a[sortKey] || '').toString().toLowerCase()
    const bv = (sortKey === 'name' ? (b.name || b.email) : b[sortKey] || '').toString().toLowerCase()
    if (av < bv) return sortDir === 'asc' ? -1 : 1
    if (av > bv) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const UserFormFields = ({ onSubmit }: { onSubmit: (e: FormEvent) => Promise<void> }) => (
    <form onSubmit={onSubmit} className="space-y-4 py-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-[11px] font-black uppercase tracking-wider text-slate-700">Full Name</Label>
          <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Alice Chen" required className="bg-slate-50 border-slate-300 text-slate-900 font-semibold placeholder:text-slate-400 text-xs shadow-xs focus:bg-white focus:border-[#06b6d4] focus:ring-2 focus:ring-[#06b6d4]/20 transition-all rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] font-black uppercase tracking-wider text-slate-700">Email</Label>
          <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="alice@co.com" required className="bg-slate-50 border-slate-300 text-slate-900 font-semibold placeholder:text-slate-400 text-xs shadow-xs focus:bg-white focus:border-[#06b6d4] focus:ring-2 focus:ring-[#06b6d4]/20 transition-all rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] font-black uppercase tracking-wider text-slate-700">Role</Label>
          <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}>
            <SelectTrigger className="bg-slate-50 border-slate-300 text-slate-900 font-semibold text-xs shadow-xs focus:bg-white focus:border-[#06b6d4] focus:ring-2 focus:ring-[#06b6d4]/20 transition-all rounded-xl"><SelectValue placeholder="Select role" /></SelectTrigger>
            <SelectContent className="bg-white text-slate-900 border-slate-200 shadow-xl rounded-xl">
              {ROLES.map((r) => <SelectItem key={r} value={r} className="capitalize text-slate-900 font-medium cursor-pointer">{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] font-black uppercase tracking-wider text-slate-700">Department</Label>
          <Input value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} placeholder="Engineering" className="bg-slate-50 border-slate-300 text-slate-900 font-semibold placeholder:text-slate-400 text-xs shadow-xs focus:bg-white focus:border-[#06b6d4] focus:ring-2 focus:ring-[#06b6d4]/20 transition-all rounded-xl" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-[11px] font-black uppercase tracking-wider text-slate-700">Status</Label>
        <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as 'active' | 'inactive' }))}>
          <SelectTrigger className="bg-slate-50 border-slate-300 text-slate-900 font-semibold text-xs shadow-xs focus:bg-white focus:border-[#06b6d4] focus:ring-2 focus:ring-[#06b6d4]/20 transition-all rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-white text-slate-900 border-slate-200 shadow-xl rounded-xl">
            <SelectItem value="active" className="text-slate-900 font-medium cursor-pointer">● Active</SelectItem>
            <SelectItem value="inactive" className="text-slate-900 font-medium cursor-pointer">○ Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DialogFooter className="pt-3 gap-2">
        <DialogClose asChild><Button variant="outline" size="sm" className="text-xs font-extrabold bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200 cursor-pointer rounded-xl px-4">Cancel</Button></DialogClose>
        <Button type="submit" size="sm" className="text-xs font-extrabold text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer rounded-xl px-5" disabled={submitting} style={{ background: 'linear-gradient(135deg, #06b6d4, #0284c7)' }}>
          {submitting ? <RefreshCw className="size-3 animate-spin mr-1" /> : null}Save Member
        </Button>
      </DialogFooter>
    </form>
  )

  return (
    <div className="page sector-cyan space-y-6 animate-slide-up">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#06b6d4]/30 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="cyber-pulse-dot cyber-pulse-dot-cyan" />
            <h1 className="text-2xl font-bold tracking-tight sector-header-title">Identity Directory</h1>
            <Badge variant="outline" className="sector-badge text-xs font-mono">{total} Members</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Manage user identities, roles, and access levels.</p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.dispatchEvent(new CustomEvent('hexagon-hub-back'))}
            className="border-cyan-300 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 font-extrabold shadow-sm cursor-pointer"
          >
            <ArrowLeft className="size-3.5 mr-1" />
            All Sectors
          </Button>

          <Button onClick={() => setShowCreate(true)} size="sm" className="gap-2 text-xs font-bold magnetic-btn cursor-pointer" style={{ background: 'linear-gradient(135deg, #06b6d4, #0284c7)', boxShadow: '0 0 20px rgba(6,182,212,0.3)' }}>
            <UserPlus className="size-3.5" />Add Member
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
          { label: 'Total Directory Members', value: total, icon: Users, color: '#06b6d4', chip: 'Directory', glow: 'rgba(6,182,212,0.45)' },
          { label: 'Active Sessions Now', value: activeCount, icon: UserCheck, color: '#22c55e', chip: 'Online', glow: 'rgba(34,197,94,0.45)' },
          { label: 'System Administrators', value: adminCount, icon: ShieldAlert, color: '#8b5cf6', chip: 'Super Admin', glow: 'rgba(139,92,246,0.45)' },
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

      {/* Control bar: Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or email…" className="pl-9 bg-white border-[#06b6d4]/50 text-slate-900 font-semibold placeholder:text-slate-400 text-sm shadow-sm" />
          {query && <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"><X className="size-3.5 text-slate-400 hover:text-slate-700" /></button>}
        </div>
      </div>

      {/* Main Content Area — Enterprise Directory Table */}
      <div className="sector-card rounded-2xl overflow-hidden shadow-xl border-slate-200" style={{ background: 'linear-gradient(135deg, #ffffff, #f8fafc)' }}>
        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-11 rounded-xl bg-slate-100 animate-pulse" style={{ animationDelay: `${i * 40}ms` }} />
            ))}
          </div>
        ) : safeUsers.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
            <Users className="size-8 text-muted-foreground/30" />No members found.
          </div>
        ) : (
          <div className="px-4">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200 hover:bg-transparent bg-slate-50/80">
                  {[
                    { key: 'name', label: 'Member' },
                    { key: 'department', label: 'Department' },
                    { key: 'role', label: 'Role' },
                    { key: 'status', label: 'Status' },
                  ].map(({ key, label }) => (
                    <TableHead key={key} className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                      <button onClick={() => toggleSort(key as typeof sortKey)} className="flex items-center gap-1 cursor-pointer hover:text-[#0891b2] transition-colors">
                        {label}
                        <ArrowUpDown className={`size-3 ${sortKey === key ? 'text-[#06b6d4]' : 'text-slate-300'}`} />
                      </button>
                    </TableHead>
                  ))}
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-slate-600 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedUsers.map((user, i) => (
                  <UserRow key={user.id} user={user} onEdit={openEdit} onToggle={handleToggle} onDelete={setDeleteUser} index={i} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <Pagination offset={offset} limit={PAGE_SIZE} total={total} onChange={(off) => { setOffset(off); loadData(query, off) }} />
      </div>

      {/* Edit User Modal */}
      {editUser && (
        <Dialog open onOpenChange={(n) => !n && setEditUser(null)}>
          <DialogContent className="sm:max-w-lg border-t-4 border-t-[#06b6d4] shadow-2xl rounded-2xl bg-white p-6 border-slate-200 animate-in fade-in-50 zoom-in-95 duration-200">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5 text-lg font-black text-slate-900 tracking-tight">
                <div className="size-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center flex-none">
                  <Edit3 className="size-4 text-[#06b6d4]" />
                </div>
                Edit Member — {editUser.name || editUser.email}
              </DialogTitle>
            </DialogHeader>
            <UserFormFields onSubmit={handleSubmitEdit} />
          </DialogContent>
        </Dialog>
      )}

      {/* Create User Modal */}
      {showCreate && (
        <Dialog open onOpenChange={(n) => !n && setShowCreate(false)}>
          <DialogContent className="sm:max-w-lg border-t-4 border-t-[#06b6d4] shadow-2xl rounded-2xl bg-white p-6 border-slate-200 animate-in fade-in-50 zoom-in-95 duration-200">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5 text-lg font-black text-slate-900 tracking-tight">
                <div className="size-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center flex-none">
                  <UserPlus className="size-4 text-[#06b6d4]" />
                </div>
                Add New Member
              </DialogTitle>
            </DialogHeader>
            <UserFormFields onSubmit={handleCreate} />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete User Modal */}
      {deleteUser && (
        <Dialog open onOpenChange={(n) => !n && setDeleteUser(null)}>
          <DialogContent className="sm:max-w-md border-t-4 border-t-red-500 shadow-2xl rounded-2xl bg-white p-6 border-slate-200 animate-in fade-in-50 zoom-in-95 duration-200">
            <DialogHeader>
              <DialogTitle className="text-base font-black text-red-600 flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center justify-center flex-none">
                  <Trash2 className="size-4 text-red-600" />
                </div>
                Remove Member
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-slate-700 py-2 font-medium">Permanently remove <span className="font-extrabold text-slate-900">{deleteUser.name || deleteUser.email}</span>?</p>
            <DialogFooter className="mt-3 gap-2">
              <DialogClose asChild><Button variant="outline" size="sm" className="text-xs font-extrabold bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200 cursor-pointer rounded-xl px-4">Cancel</Button></DialogClose>
              <Button variant="destructive" size="sm" className="text-xs font-extrabold cursor-pointer rounded-xl px-5 shadow-md hover:shadow-lg" disabled={submitting} onClick={() => handleDelete(deleteUser)}>
                {submitting ? <RefreshCw className="size-3.5 animate-spin mr-1" /> : <Trash2 className="size-3.5 mr-1" />}Remove Member
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

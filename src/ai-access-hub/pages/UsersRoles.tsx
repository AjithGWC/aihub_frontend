import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  UserPlus,
  Users,
  ShieldAlert,
  Search,
  Edit3,
  UserX,
  UserCheck,
  Ban,
  Building2,
  Crown,
  KeyRound,
  RefreshCw,
  X,
  ArrowLeft,
  ArrowUpDown,
  Vault,
  Trash2,
  Clock,
  AlertCircle,
  Plus,
  Lock,
  Copy,
  Check,
} from 'lucide-react'
import {
  createUser as apiCreateUser,
  createUserKey,
  deactivateUser,
  listModels,
  listRoles,
  listUserKeys,
  listUsers,
  replaceUserRoles,
  resetUserPassword,
  revokeUserKey,
  updateUserStatus,
  type ApiKeyCreated,
  type ApiKeyOut,
  type PortalModel,
  type PortalUserOut,
  type RoleOut,
} from '@/api/portal'
import type { AppUser } from '../types'
import { MultiSelect } from '../components/MultiSelect'
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
import { Checkbox } from '@/components/ui/checkbox'
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
  admin: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.25)' },
  owner: { color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.25)' },
  viewer: { color: '#06b6d4', bg: 'rgba(6,182,212,0.1)', border: 'rgba(6,182,212,0.25)' },
  editor: { color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)' },
}
const DEFAULT_ROLE_COLOR = { color: 'var(--muted)', bg: 'var(--primary-soft)', border: 'var(--border)' }

function toAppUser(u: PortalUserOut): AppUser {
  return {
    id: u.user_id,
    name: u.username,
    email: u.email,
    roles: u.roles ?? [],
    department: u.department,
    status: u.status,
    isSystemAdmin: (u.roles ?? []).includes('admin'),
    createdAt: u.created_at,
  }
}

function getAvatarGradient(name: string): { gradient: string; glow: string; color: string } {
  const hues = [210, 170, 270, 30, 140, 320]
  const idx = (name?.charCodeAt(0) || 65) % hues.length
  const h = hues[idx]
  return {
    gradient: `linear-gradient(135deg, hsl(${h},60%,35%), hsl(${h + 40},70%,50%))`,
    glow: `hsla(${h},70%,50%,0.3)`,
    color: `hsl(${h},70%,50%)`
  }
}

function getInitials(name: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : parts[0].slice(0, 2).toUpperCase()
}

/* ── Enterprise Directory Row ── */
function UserRow({ user, onEdit, onToggle, onResetPassword, onDeactivate, onViewKeys, index }: {
  user: AppUser
  onEdit: (u: AppUser) => void
  onToggle: (u: AppUser) => void
  onResetPassword: (u: AppUser) => void
  onDeactivate: (u: AppUser) => void
  onViewKeys: (u: AppUser) => void
  index: number
}) {
  const { gradient, glow } = getAvatarGradient(user.name || user.email || '')
  const initials = getInitials(user.name || user.email || '')
  const primaryRole = user.roles[0]
  const roleConf = ROLE_COLORS[primaryRole?.toLowerCase() || ''] || DEFAULT_ROLE_COLOR
  const isActive = user.status === 'active'

  return (
    <TableRow
      className="group border-border hover:bg-secondary/40 transition-colors animate-slide-up"
      style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
    >
      {/* Identity */}
      <TableCell className="py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="size-9 rounded-full flex items-center justify-center text-xs font-extrabold text-white select-none flex-none shadow-sm"
            style={{ background: gradient, boxShadow: `0 0 0 2px var(--background), 0 0 8px ${glow}` }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
              {user.name || '—'}
            </p>
            <p className="text-[11px] text-muted-foreground font-mono truncate">{user.email || '—'}</p>
          </div>
        </div>
      </TableCell>

      {/* Department */}
      <TableCell className="whitespace-nowrap">
        {user.department ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Building2 className="size-3.5 text-primary" />
            {user.department}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>

      {/* Roles */}
      <TableCell className="whitespace-nowrap">
        {user.roles.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {user.roles.map((r) => {
              const conf = ROLE_COLORS[r.toLowerCase()] || DEFAULT_ROLE_COLOR
              return (
                <Badge key={r} variant="outline" className="text-[10px] px-2 py-0.5 capitalize font-bold" style={{ color: conf.color, borderColor: conf.border, background: conf.bg }}>
                  {r === 'admin' && <Crown className="size-2.5 mr-1" />}
                  {r}
                </Badge>
              )
            })}
          </div>
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
            color: isActive ? '#16a34a' : 'var(--muted)',
            borderColor: isActive ? 'rgba(34,197,94,0.3)' : 'var(--border)',
            background: isActive ? 'rgba(34,197,94,0.1)' : 'var(--secondary)',
          }}
        >
          {isActive ? '● Active' : `○ ${user.status || 'Inactive'}`}
        </Badge>
      </TableCell>

      {/* Actions — admins are protected from edit/enable-disable/deactivate to avoid accidental lockout */}
      <TableCell className="text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-1.5">
          {user.isSystemAdmin ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2">
              <Crown className="size-3" />
              Protected
            </span>
          ) : (
            <>
              <button onClick={() => onEdit(user)} className="table-action-btn table-action-btn-edit" title="Edit Roles & Status">
                <Edit3 className="size-4" />
              </button>
              <button
                onClick={() => onToggle(user)}
                className={`table-action-btn ${isActive ? 'table-action-btn-amber' : 'table-action-btn-success'}`}
                title={isActive ? 'Disable Member' : 'Enable Member'}
              >
                {isActive ? <UserX className="size-4" /> : <UserCheck className="size-4" />}
              </button>
              <button onClick={() => onDeactivate(user)} className="table-action-btn table-action-btn-danger" title="Deactivate Member">
                <Ban className="size-4" />
              </button>
            </>
          )}
          <button onClick={() => onResetPassword(user)} className="table-action-btn" title="Reset Password">
            <KeyRound className="size-4" />
          </button>
          <button onClick={() => onViewKeys(user)} className="table-action-btn" title="API Keys">
            <Vault className="size-4" />
          </button>
        </div>
      </TableCell>
    </TableRow>
  )
}

function RoleCheckboxes({ roles, selected, onChange }: { roles: string[]; selected: string[]; onChange: (next: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-3">
      {roles.map((r) => {
        const checked = selected.includes(r)
        return (
          <label key={r} className="flex items-center gap-1.5 text-xs font-semibold capitalize text-foreground cursor-pointer">
            <Checkbox
              checked={checked}
              onCheckedChange={(v) => onChange(v ? [...selected, r] : selected.filter((x) => x !== r))}
            />
            {r}
          </label>
        )
      })}
    </div>
  )
}

export default function UsersRoles() {
  const [allUsers, setAllUsers] = useState<AppUser[]>([])
  const [roleNames, setRoleNames] = useState<string[]>([])
  const [offset, setOffset] = useState(0)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editUser, setEditUser] = useState<AppUser | null>(null)
  const [resetPasswordUser, setResetPasswordUser] = useState<AppUser | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<AppUser | null>(null)
  const [keysUser, setKeysUser] = useState<AppUser | null>(null)
  const [userKeys, setUserKeys] = useState<ApiKeyOut[]>([])
  const [keysLoading, setKeysLoading] = useState(false)
  const [keysError, setKeysError] = useState<string | null>(null)
  const [revokeKeyTarget, setRevokeKeyTarget] = useState<ApiKeyOut | null>(null)
  const [revokingKey, setRevokingKey] = useState(false)
  const [models, setModels] = useState<PortalModel[]>([])
  const [showCreateKey, setShowCreateKey] = useState(false)
  const [createKeyForm, setCreateKeyForm] = useState({ label: '', modelEntitlements: [] as string[], expiresAt: '', rateLimitRpm: 60 })
  const [creatingKey, setCreatingKey] = useState(false)
  const [createdKey, setCreatedKey] = useState<ApiKeyCreated | null>(null)
  const [rawCopied, setRawCopied] = useState(false)

  function handleCopyRaw() {
    if (!createdKey) return
    navigator.clipboard.writeText(createdKey.raw_key)
    setRawCopied(true)
    setTimeout(() => setRawCopied(false), 2000)
  }
  const [editForm, setEditForm] = useState<{ roles: string[]; status: string }>({ roles: [], status: 'active' })
  const [newPassword, setNewPassword] = useState('')
  const [createForm, setCreateForm] = useState({ username: '', email: '', department: '', roles: [] as string[], password: '' })
  const [submitting, setSubmitting] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [sortKey, setSortKey] = useState<'name' | 'department' | 'status'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [users, roles] = await Promise.all([listUsers(), listRoles().catch(() => [] as RoleOut[])])
      setAllUsers(users.map(toAppUser))
      setRoleNames(roles.length > 0 ? roles.map((r) => r.role_name) : Array.from(new Set(users.flatMap((u) => u.roles))))
    } catch {
      setError('Failed to load users. Check your Portal connection.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])
  useEffect(() => { setOffset(0) }, [query])

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = !q
      ? allUsers
      : allUsers.filter((u) =>
          (u.name || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q) ||
          (u.department || '').toLowerCase().includes(q)
        )
    return [...base].sort((a, b) => {
      const av = (sortKey === 'name' ? a.name || a.email || '' : (a as any)[sortKey] || '').toString().toLowerCase()
      const bv = (sortKey === 'name' ? b.name || b.email || '' : (b as any)[sortKey] || '').toString().toLowerCase()
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [allUsers, query, sortKey, sortDir])

  const total = filteredUsers.length
  const pagedUsers = filteredUsers.slice(offset, offset + PAGE_SIZE)

  function openEdit(u: AppUser) {
    setEditUser(u)
    setEditForm({ roles: u.roles, status: u.status })
  }

  async function handleSubmitEdit(e: FormEvent) {
    e.preventDefault()
    if (!editUser) return
    setSubmitting(true)
    try {
      await Promise.all([
        replaceUserRoles(editUser.id, editForm.roles),
        editForm.status !== editUser.status ? updateUserStatus(editUser.id, editForm.status) : Promise.resolve(),
      ])
      setEditUser(null)
      loadData()
    } catch { setError('Failed to update member.') }
    finally { setSubmitting(false) }
  }

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault()
    if (!resetPasswordUser || !newPassword.trim()) return
    setSubmitting(true)
    try {
      await resetUserPassword(resetPasswordUser.id, newPassword.trim())
      setResetPasswordUser(null)
      setNewPassword('')
    } catch { setError('Failed to reset password.') }
    finally { setSubmitting(false) }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await apiCreateUser({
        username: createForm.username,
        email: createForm.email || null,
        department: createForm.department || null,
        roles: createForm.roles,
        password: createForm.password || null,
      })
      setShowCreate(false)
      setCreateForm({ username: '', email: '', department: '', roles: [], password: '' })
      loadData()
    } catch { setError('Failed to create user.') }
    finally { setSubmitting(false) }
  }

  async function handleToggle(u: AppUser) {
    const next = u.status === 'active' ? 'inactive' : 'active'
    try {
      await updateUserStatus(u.id, next)
      loadData()
    } catch { setError('Failed to update user status.') }
  }

  async function handleDeactivate(u: AppUser) {
    setSubmitting(true)
    try {
      await deactivateUser(u.id)
      setDeactivateTarget(null)
      loadData()
    } catch { setError('Failed to deactivate user.') }
    finally { setSubmitting(false) }
  }

  async function openKeys(u: AppUser) {
    setKeysUser(u)
    setUserKeys([])
    setKeysError(null)
    setKeysLoading(true)
    try {
      const [keys, modelList] = await Promise.all([listUserKeys(u.id), listModels().catch(() => [] as PortalModel[])])
      setUserKeys(keys)
      setModels(modelList)
    } catch { setKeysError('Failed to load API keys.') }
    finally { setKeysLoading(false) }
  }

  async function handleRevokeKey(key: ApiKeyOut) {
    if (!keysUser) return
    setRevokingKey(true)
    try {
      await revokeUserKey(keysUser.id, key.key_id)
      setUserKeys((prev) => prev.filter((k) => k.key_id !== key.key_id))
      setRevokeKeyTarget(null)
    } catch { setKeysError('Failed to revoke API key.') }
    finally { setRevokingKey(false) }
  }

  async function handleCreateKey(e: FormEvent) {
    e.preventDefault()
    if (!keysUser) return
    setCreatingKey(true)
    try {
      const created = await createUserKey(keysUser.id, {
        label: createKeyForm.label || undefined,
        model_entitlements: createKeyForm.modelEntitlements,
        expires_at: createKeyForm.expiresAt ? new Date(createKeyForm.expiresAt).toISOString() : undefined,
        rate_limit_rpm: createKeyForm.rateLimitRpm,
      })
      setShowCreateKey(false)
      setCreateKeyForm({ label: '', modelEntitlements: [], expiresAt: '', rateLimitRpm: 60 })
      setCreatedKey(created)
      setUserKeys((prev) => [created, ...prev])
    } catch { setKeysError('Failed to create API key.') }
    finally { setCreatingKey(false) }
  }

  const activeCount = allUsers.filter((u) => u.status === 'active').length
  const adminCount = allUsers.filter((u) => u.isSystemAdmin).length

  return (
    <div className="page sector-cyan space-y-6 animate-slide-up">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="cyber-pulse-dot cyber-pulse-dot-cyan" />
            <h1 className="text-2xl font-bold tracking-tight sector-header-title">Identity Directory</h1>
            <Badge variant="outline" className="sector-badge text-xs font-mono border-border">{total} Members</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Manage user identities, roles, and access levels.</p>
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
          { label: 'Total Directory Members', value: allUsers.length, icon: Users, color: '#06b6d4', chip: 'Directory' },
          { label: 'Active Sessions Now', value: activeCount, icon: UserCheck, color: '#22c55e', chip: 'Online' },
          { label: 'System Administrators', value: adminCount, icon: ShieldAlert, color: '#8b5cf6', chip: 'Super Admin' },
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

      {/* Control bar: Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or email…" className="pl-9 bg-background border-border text-foreground font-semibold placeholder:text-muted-foreground text-sm shadow-xs rounded-lg" />
          {query && <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"><X className="size-3.5 text-muted-foreground hover:text-foreground" /></button>}
        </div>
      </div>

      {/* Main Content Area — Enterprise Directory Table */}
      <div className="sector-card rounded-xl overflow-hidden shadow-sm border border-border bg-card">
        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-11 rounded-xl bg-secondary animate-pulse" style={{ animationDelay: `${i * 40}ms` }} />
            ))}
          </div>
        ) : pagedUsers.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
            <Users className="size-8 text-muted-foreground/30" />No members found.
          </div>
        ) : (
          <div className="px-4">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent bg-secondary/20">
                  {[
                    { key: 'name', label: 'Member' },
                    { key: 'department', label: 'Department' },
                  ].map(({ key, label }) => (
                    <TableHead key={key} className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                      <button onClick={() => toggleSort(key as typeof sortKey)} className="flex items-center gap-1 cursor-pointer hover:text-primary transition-colors">
                        {label}
                        <ArrowUpDown className={`size-3 ${sortKey === key ? 'text-primary' : 'text-muted-foreground'}`} />
                      </button>
                    </TableHead>
                  ))}
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Roles</TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                    <button onClick={() => toggleSort('status')} className="flex items-center gap-1 cursor-pointer hover:text-primary transition-colors">
                      Status
                      <ArrowUpDown className={`size-3 ${sortKey === 'status' ? 'text-primary' : 'text-muted-foreground'}`} />
                    </button>
                  </TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedUsers.map((user, i) => (
                  <UserRow key={user.id} user={user} onEdit={openEdit} onToggle={handleToggle} onResetPassword={setResetPasswordUser} onDeactivate={setDeactivateTarget} onViewKeys={openKeys} index={i} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <Pagination offset={offset} limit={PAGE_SIZE} total={total} onChange={setOffset} />
      </div>

      {/* Edit Roles & Status Modal */}
      {editUser && (
        <Dialog open onOpenChange={(n) => !n && setEditUser(null)}>
          <DialogContent className="sm:max-w-lg border-t-4 border-t-primary shadow-lg rounded-xl bg-card p-6 border-border animate-in fade-in-50 zoom-in-95 duration-200">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5 text-lg font-black text-foreground tracking-tight">
                <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-none">
                  <Edit3 className="size-4 text-primary" />
                </div>
                Edit Member — {editUser.name || editUser.email}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitEdit} className="space-y-4 py-2">
              <div className="text-xs text-muted-foreground">
                {editUser.department && <span className="mr-3">{editUser.department}</span>}
                {editUser.email && <span className="font-mono">{editUser.email}</span>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Roles</Label>
                <RoleCheckboxes roles={roleNames} selected={editForm.roles} onChange={(roles) => setEditForm((f) => ({ ...f, roles }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Status</Label>
                <div className="flex gap-3">
                  {['active', 'inactive'].map((s) => (
                    <label key={s} className="flex items-center gap-1.5 text-xs font-semibold capitalize text-foreground cursor-pointer">
                      <input type="radio" name="status" checked={editForm.status === s} onChange={() => setEditForm((f) => ({ ...f, status: s }))} />
                      {s}
                    </label>
                  ))}
                </div>
              </div>
              <DialogFooter className="pt-3 gap-2">
                <DialogClose asChild><Button variant="outline" size="sm" className="text-xs font-extrabold bg-secondary text-foreground border-border hover:bg-secondary/80 cursor-pointer rounded-lg px-4">Cancel</Button></DialogClose>
                <Button type="submit" size="sm" className="text-xs font-extrabold text-primary-foreground shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer rounded-lg px-5 bg-primary hover:bg-primary-hover" disabled={submitting}>
                  {submitting ? <RefreshCw className="size-3 animate-spin mr-1" /> : null}Save Changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Reset Password Modal */}
      {resetPasswordUser && (
        <Dialog open onOpenChange={(n) => !n && setResetPasswordUser(null)}>
          <DialogContent className="sm:max-w-md border-t-4 border-t-primary shadow-lg rounded-xl bg-card p-6 border-border animate-in fade-in-50 zoom-in-95 duration-200">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5 text-base font-black text-foreground tracking-tight">
                <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-none">
                  <KeyRound className="size-4 text-primary" />
                </div>
                Reset Password — {resetPasswordUser.name || resetPasswordUser.email}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleResetPassword} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">New Password</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="bg-background border-border text-foreground font-semibold font-mono text-xs shadow-xs rounded-lg" />
              </div>
              <DialogFooter className="pt-3 gap-2">
                <DialogClose asChild><Button variant="outline" size="sm" className="text-xs font-extrabold bg-secondary text-foreground border-border hover:bg-secondary/80 cursor-pointer rounded-lg px-4">Cancel</Button></DialogClose>
                <Button type="submit" size="sm" disabled={submitting} className="text-xs font-extrabold text-primary-foreground shadow-sm hover:shadow-md transition-all cursor-pointer rounded-lg px-5 bg-primary hover:bg-primary-hover">
                  {submitting ? <RefreshCw className="size-3.5 animate-spin mr-1" /> : <KeyRound className="size-3.5 mr-1" />}Reset Password
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Create User Modal */}
      {showCreate && (
        <Dialog open onOpenChange={(n) => !n && setShowCreate(false)}>
          <DialogContent className="sm:max-w-lg border-t-4 border-t-primary shadow-lg rounded-xl bg-card p-6 border-border animate-in fade-in-50 zoom-in-95 duration-200">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5 text-lg font-black text-foreground tracking-tight">
                <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-none">
                  <UserPlus className="size-4 text-primary" />
                </div>
                Add New Member
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Username</Label>
                  <Input value={createForm.username} onChange={(e) => setCreateForm((f) => ({ ...f, username: e.target.value }))} placeholder="alice.chen" required className="bg-background border-border text-foreground font-semibold placeholder:text-muted-foreground text-xs shadow-xs rounded-lg" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Email</Label>
                  <Input type="email" value={createForm.email} onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))} placeholder="alice@co.com" className="bg-background border-border text-foreground font-semibold placeholder:text-muted-foreground text-xs shadow-xs rounded-lg" />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Department</Label>
                  <Input value={createForm.department} onChange={(e) => setCreateForm((f) => ({ ...f, department: e.target.value }))} placeholder="Engineering" className="bg-background border-border text-foreground font-semibold placeholder:text-muted-foreground text-xs shadow-xs rounded-lg" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Role</Label>
                <Select value={createForm.roles[0] ?? ''} onValueChange={(v) => setCreateForm((f) => ({ ...f, roles: [v] }))}>
                  <SelectTrigger className="bg-background border-border text-foreground font-semibold text-xs shadow-xs rounded-lg w-full"><SelectValue placeholder="Select a role" /></SelectTrigger>
                  <SelectContent className="bg-card text-foreground border-border shadow-md rounded-lg">
                    {roleNames.map((r) => (
                      <SelectItem key={r} value={r} className="capitalize text-foreground font-medium cursor-pointer">{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Initial Password</Label>
                <Input type="password" value={createForm.password} onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))} placeholder="Optional" className="bg-background border-border text-foreground font-semibold text-xs shadow-xs rounded-lg" />
              </div>
              <DialogFooter className="pt-3 gap-2">
                <DialogClose asChild><Button variant="outline" size="sm" className="text-xs font-extrabold bg-secondary text-foreground border-border hover:bg-secondary/80 cursor-pointer rounded-lg px-4">Cancel</Button></DialogClose>
                <Button type="submit" size="sm" className="text-xs font-extrabold text-primary-foreground shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer rounded-lg px-5 bg-primary hover:bg-primary-hover" disabled={submitting}>
                  {submitting ? <RefreshCw className="size-3 animate-spin mr-1" /> : null}Save Member
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Deactivate User Modal */}
      {deactivateTarget && (
        <Dialog open onOpenChange={(n) => !n && setDeactivateTarget(null)}>
          <DialogContent className="sm:max-w-md border-t-4 border-t-danger shadow-lg rounded-xl bg-card p-6 border-border animate-in fade-in-50 zoom-in-95 duration-200">
            <DialogHeader>
              <DialogTitle className="text-base font-black text-danger flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-danger/10 border border-danger/20 flex items-center justify-center flex-none">
                  <Ban className="size-4 text-danger" />
                </div>
                Deactivate Member
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-foreground py-2 font-medium">Deactivate <span className="font-extrabold">{deactivateTarget.name || deactivateTarget.email}</span>? They will lose portal access until reactivated.</p>
            <DialogFooter className="mt-3 gap-2">
              <DialogClose asChild><Button variant="outline" size="sm" className="text-xs font-extrabold bg-secondary text-foreground border-border hover:bg-secondary/80 cursor-pointer rounded-lg px-4">Cancel</Button></DialogClose>
              <Button variant="destructive" size="sm" className="text-xs font-extrabold cursor-pointer rounded-lg px-5 shadow-sm hover:shadow-md" disabled={submitting} onClick={() => handleDeactivate(deactivateTarget)}>
                {submitting ? <RefreshCw className="size-3.5 animate-spin mr-1" /> : <Ban className="size-3.5 mr-1" />}Deactivate Member
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* API Keys Modal */}
      {keysUser && (
        <Dialog open onOpenChange={(n) => !n && setKeysUser(null)}>
          <DialogContent className="sm:max-w-2xl border-t-4 border-t-primary shadow-lg rounded-xl bg-card p-6 border-border animate-in fade-in-50 zoom-in-95 duration-200">
            <DialogHeader>
              <div className="flex flex-wrap items-center justify-between gap-3 pr-6">
                <DialogTitle className="flex items-center gap-2.5 text-lg font-black text-foreground tracking-tight">
                  <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-none">
                    <Vault className="size-4 text-primary" />
                  </div>
                  API Keys — {keysUser.name || keysUser.email}
                </DialogTitle>
                <Button onClick={() => setShowCreateKey(true)} size="sm" className="gap-1.5 text-xs font-bold bg-primary hover:bg-primary-hover text-primary-foreground rounded-lg shadow-sm">
                  <Plus className="size-3.5" />Issue Key
                </Button>
              </div>
            </DialogHeader>

            {keysError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                <ShieldAlert className="size-4 flex-none" /><span className="flex-1">{keysError}</span>
                <button onClick={() => setKeysError(null)}><X className="size-3.5" /></button>
              </div>
            )}

            <div className="py-2">
              {keysLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-11 rounded-lg bg-secondary animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />)}
                </div>
              ) : userKeys.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                  <KeyRound className="size-7 text-muted-foreground/30" />No API keys issued to this user.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent bg-secondary/20">
                      <TableHead className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Key</TableHead>
                      <TableHead className="hidden sm:table-cell text-[11px] font-black uppercase tracking-wider text-muted-foreground">Expires</TableHead>
                      <TableHead className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Status</TableHead>
                      <TableHead className="text-[11px] font-black uppercase tracking-wider text-muted-foreground text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userKeys.map((key) => {
                      const isActive = key.status === 'active'
                      const expiresAt = key.expires_at ? new Date(key.expires_at) : null
                      const isExpired = expiresAt ? expiresAt < new Date() : false
                      return (
                        <TableRow key={key.key_id} className="border-border hover:bg-secondary/40">
                          <TableCell className="py-3 max-w-[140px] sm:max-w-[260px]">
                            <p className="text-sm font-bold text-foreground truncate">{key.label || 'Untitled Key'}</p>
                            <p className="text-[11px] text-muted-foreground font-mono">{key.key_prefix}…</p>
                            {expiresAt && (
                              <p className={`sm:hidden text-[11px] font-bold ${isExpired ? 'text-danger' : 'text-muted-foreground'}`}>
                                {isExpired ? 'Expired ' : ''}{expiresAt.toLocaleDateString()}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell whitespace-nowrap">
                            {expiresAt ? (
                              <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${isExpired ? 'text-danger' : 'text-muted-foreground'}`}>
                                <Clock className="size-3.5 flex-none" />
                                {isExpired ? 'Expired ' : ''}{expiresAt.toLocaleDateString()}
                                {isExpired && <AlertCircle className="size-3.5 text-danger" />}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
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
                              {isActive ? '● Active' : `○ ${key.status}`}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <button onClick={() => setRevokeKeyTarget(key)} className="table-action-btn table-action-btn-danger" title="Revoke Key">
                              <Trash2 className="size-4" />
                            </button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </div>

            <DialogFooter className="pt-2">
              <DialogClose asChild><Button variant="outline" size="sm" className="text-xs font-extrabold bg-secondary text-foreground border-border hover:bg-secondary/80 cursor-pointer rounded-lg px-4">Close</Button></DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Revoke API Key Confirm */}
      {revokeKeyTarget && (
        <Dialog open onOpenChange={(n) => !n && setRevokeKeyTarget(null)}>
          <DialogContent className="sm:max-w-md border-t-4 border-t-danger shadow-lg rounded-xl bg-card p-6 border-border animate-in fade-in-50 zoom-in-95 duration-200">
            <DialogHeader>
              <DialogTitle className="text-base font-black text-danger flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-danger/10 border border-danger/20 flex items-center justify-center flex-none">
                  <Trash2 className="size-4 text-danger" />
                </div>
                Revoke API Key
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-foreground py-2 font-medium">Permanently revoke <span className="font-extrabold">{revokeKeyTarget.label || revokeKeyTarget.key_prefix}</span>? Applications using this key will immediately lose access.</p>
            <DialogFooter className="mt-3 gap-2">
              <DialogClose asChild><Button variant="outline" size="sm" className="text-xs font-extrabold bg-secondary text-foreground border-border hover:bg-secondary/80 cursor-pointer rounded-lg px-4">Cancel</Button></DialogClose>
              <Button variant="destructive" size="sm" disabled={revokingKey} onClick={() => handleRevokeKey(revokeKeyTarget)} className="text-xs font-extrabold cursor-pointer rounded-lg px-5 shadow-sm hover:shadow-md">
                <Trash2 className="size-3.5 mr-1" />Revoke Key
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Issue API Key Modal (scoped to keysUser) */}
      {showCreateKey && keysUser && (
        <Dialog open onOpenChange={(n) => !n && setShowCreateKey(false)}>
          <DialogContent className="sm:max-w-lg border-t-4 border-t-primary shadow-lg rounded-xl bg-card p-6 border-border animate-in fade-in-50 zoom-in-95 duration-200">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5 text-lg font-black text-foreground tracking-tight">
                <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-none">
                  <KeyRound className="size-4 text-primary" />
                </div>
                Issue API Key — {keysUser.name || keysUser.email}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateKey} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Key Label</Label>
                <Input value={createKeyForm.label} onChange={(e) => setCreateKeyForm((f) => ({ ...f, label: e.target.value }))} placeholder="Production access" className="bg-background border-border text-foreground font-semibold text-xs shadow-xs rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Model Entitlements</Label>
                {models.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No models registered yet — the key will default to all active models.</p>
                ) : (
                  <MultiSelect
                    options={models.map((m) => ({ value: m.name, label: m.name }))}
                    selected={createKeyForm.modelEntitlements}
                    onChange={(next) => setCreateKeyForm((f) => ({ ...f, modelEntitlements: next }))}
                    placeholder="All active models"
                    searchPlaceholder="Search models…"
                    emptyText="No models found."
                  />
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Rate Limit (req/min)</Label>
                  <Input type="number" min={1} value={createKeyForm.rateLimitRpm} onChange={(e) => setCreateKeyForm((f) => ({ ...f, rateLimitRpm: Number(e.target.value) || 1 }))} className="bg-background border-border text-foreground font-semibold text-xs shadow-xs rounded-lg" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Expires At</Label>
                  <Input type="date" value={createKeyForm.expiresAt} onChange={(e) => setCreateKeyForm((f) => ({ ...f, expiresAt: e.target.value }))} className="bg-background border-border text-foreground font-semibold text-xs shadow-xs rounded-lg" />
                </div>
              </div>
              <DialogFooter className="pt-3 gap-2">
                <DialogClose asChild><Button variant="outline" size="sm" className="text-xs font-extrabold bg-secondary text-foreground border-border hover:bg-secondary/80 cursor-pointer rounded-lg px-4">Cancel</Button></DialogClose>
                <Button type="submit" size="sm" disabled={creatingKey} className="text-xs font-extrabold text-primary-foreground shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer rounded-lg px-5 bg-primary hover:bg-primary-hover">
                  {creatingKey ? <RefreshCw className="size-3 animate-spin mr-1" /> : <Lock className="size-3.5 mr-1.5" />}Issue Key
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Raw key reveal — shown exactly once, right after creation */}
      {createdKey && (
        <Dialog open onOpenChange={(n) => !n && setCreatedKey(null)}>
          <DialogContent className="sm:max-w-lg border-t-4 border-t-emerald-500 shadow-lg rounded-xl bg-card p-6 border-border animate-in fade-in-50 zoom-in-95 duration-200">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5 text-lg font-black text-foreground tracking-tight">
                <div className="size-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-none">
                  <KeyRound className="size-4 text-emerald-500" />
                </div>
                Key Issued
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <p className="text-xs text-danger font-semibold flex items-center gap-1.5">
                <AlertCircle className="size-3.5 flex-none" />
                Copy this now — it won't be shown again.
              </p>
              <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 font-mono text-xs bg-secondary/50 border border-border break-all">
                <span className="flex-1">{createdKey.raw_key}</span>
                <button onClick={handleCopyRaw} className="p-1 rounded hover:bg-secondary transition-colors cursor-pointer flex-none" title="Copy key">
                  {rawCopied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4 text-muted-foreground" />}
                </button>
              </div>
            </div>
            <DialogFooter className="pt-2">
              <DialogClose asChild>
                <Button size="sm" className="text-xs font-extrabold text-primary-foreground bg-primary hover:bg-primary-hover cursor-pointer rounded-lg px-5">Done</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

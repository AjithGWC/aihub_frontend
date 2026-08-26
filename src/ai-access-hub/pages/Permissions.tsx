import { useEffect, useState } from 'react'
import {
  Check,
  Plus,
  ShieldCheck,
  RotateCcw,
  Save,
  Lock,
  Layers,
  AlertCircle,
  Crown,
  X,
  ArrowLeft
} from 'lucide-react'
import { api } from '@/api'
import type { PermissionAction, PermissionMatrix } from '../types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

const ROLE_COLORS: Record<string, { color: string; glow: string; gradient: string }> = {
  admin:     { color: '#a855f7', glow: 'rgba(168,85,247,0.4)',  gradient: 'linear-gradient(135deg, #a855f7, #7c3aed)' },
  owner:     { color: '#f97316', glow: 'rgba(249,115,22,0.4)',  gradient: 'linear-gradient(135deg, #f97316, #ea580c)' },
  viewer:    { color: '#06b6d4', glow: 'rgba(6,182,212,0.4)',   gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)' },
  editor:    { color: '#22c55e', glow: 'rgba(34,197,94,0.4)',   gradient: 'linear-gradient(135deg, #22c55e, #16a34a)' },
  analyst:   { color: '#3b82f6', glow: 'rgba(59,130,246,0.4)',  gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)' },
  developer: { color: '#f59e0b', glow: 'rgba(245,158,11,0.4)', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
}
const DEFAULT_ROLE = { color: 'var(--muted)', glow: 'var(--primary-soft)', gradient: 'linear-gradient(135deg, var(--muted), var(--foreground))' }

const ACTIONS: PermissionAction[] = [
  'viewAdminPortal',
  'manageUsers',
  'manageApiKeys',
  'managePermissions',
  'manageModels',
  'viewAuditLog',
]

const ACTION_LABELS: Record<PermissionAction, string> = {
  viewAdminPortal: 'View Admin Portal',
  manageUsers: 'Manage Users',
  manageApiKeys: 'Manage API Keys',
  managePermissions: 'Manage Permissions',
  manageModels: 'Manage Models',
  viewAuditLog: 'View Audit Log',
}

/* Helper to convert any role object or string into a safe display string */
function getRoleName(r: any): string {
  if (!r) return ''
  if (typeof r === 'string') return r
  if (typeof r === 'object') {
    const val = r.role || r.name || r.id || r.key || r.value || r.label || r.title
    if (val && typeof val === 'string') return val
    const keys = Object.keys(r)
    if (keys.length > 0 && typeof r[keys[0]] === 'string') return r[keys[0]]
  }
  const str = String(r)
  return str === '[object Object]' ? 'Role' : str
}

/* Permission orb toggle with GSAP-inspired spring dynamics */
function PermOrb({ allowed, onChange, roleColor, roleGlow }: { allowed: boolean; onChange: (next: boolean) => void; roleColor: string; roleGlow: string }) {
  const [hovered, setHovered] = useState(false)
  const [pulsing, setPulsing] = useState(false)

  function handleClick() {
    onChange(!allowed)
    setPulsing(true)
    setTimeout(() => setPulsing(false), 500)
  }

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={allowed ? 'Revoke permission' : 'Grant permission'}
      className={`relative size-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer ${pulsing ? 'scale-110' : ''}`}
      style={allowed
        ? { background: `radial-gradient(circle at 35% 35%, ${roleColor}, ${roleColor}ee)`, boxShadow: `0 0 0 2px ${roleColor}33, 0 4px 12px ${roleColor}44`, border: `1.5px solid ${roleColor}` }
        : hovered
          ? { background: `${roleColor}15`, border: `1.5px solid ${roleColor}`, boxShadow: `0 0 8px ${roleColor}22` }
          : { background: 'var(--panel-2)', border: '1.5px solid var(--border)' }
      }
    >
      {allowed && (
        <span className="absolute inset-0 rounded-full animate-ping opacity-20 pointer-events-none" style={{ background: roleColor }} />
      )}
      {allowed ? (
        <Check className="size-4 text-white" />
      ) : hovered ? (
        <Plus className="size-4 animate-in fade-in zoom-in-50" style={{ color: roleColor }} />
      ) : (
        <span className="size-2 rounded-full bg-muted-foreground/30" />
      )}
    </button>
  )
}

/* Action row card */
function ActionCard({ action, roles, matrix, onMatrixChange, index }: {
  action: PermissionAction
  roles: string[]
  matrix: PermissionMatrix
  onMatrixChange: (role: string, action: PermissionAction, next: boolean) => void
  index: number
}) {
  const grantedRoles = (Array.isArray(roles) ? roles : []).filter((r) => {
    const rName = getRoleName(r)
    return matrix[rName]?.[action]
  })
  const label = ACTION_LABELS[action] || action

  return (
    <div
      className="group relative overflow-hidden border border-border hover:border-primary/50 bg-card hover:bg-card/85 transition-all duration-300 rounded-xl p-5 space-y-4 shadow-sm"
      style={{
        animationDelay: `${index * 60}ms`,
        background: `radial-gradient(circle at 90% 10%, var(--primary-soft), transparent 65%), var(--panel)`,
      }}
    >
      {/* Shimmer sweep effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

      <div className="flex items-start gap-3 z-10">
        <div className="p-2.5 rounded-lg flex-none transition-transform duration-300 group-hover:scale-105 shadow-xs" style={{ background: 'var(--primary-soft)', border: '1px solid var(--border)' }}>
          <Lock className="size-4 text-primary icon-spring" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground transition-colors">{label}</p>
          <p className="text-[11px] text-muted-foreground font-bold mt-0.5">
            {grantedRoles.length} of {roles.length} roles granted
          </p>
        </div>
      </div>

      {/* Orb grid */}
      <div className="grid gap-2.5 font-sans" style={{ gridTemplateColumns: `repeat(${Math.min(Math.max(roles.length, 1), 4)}, 1fr)` }}>
        {(Array.isArray(roles) ? roles : []).map((roleRaw) => {
          const role = getRoleName(roleRaw)
          const conf = ROLE_COLORS[role.toLowerCase()] || DEFAULT_ROLE
          const allowed = !!matrix[role]?.[action]
          return (
            <div key={role} className="flex flex-col items-center gap-1.5">
              <PermOrb
                allowed={allowed}
                onChange={(next) => onMatrixChange(role, action, next)}
                roleColor={conf.color}
                roleGlow={conf.glow}
              />
              <span
                className="text-[11px] font-black capitalize text-center leading-tight transition-colors truncate max-w-full"
                style={{ color: allowed ? conf.color : 'var(--muted)' }}
              >
                {role}
              </span>
            </div>
          )
        })}
      </div>

      {/* Granted pills */}
      {grantedRoles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border">
          {grantedRoles.map((rRaw) => {
            const r = getRoleName(rRaw)
            const conf = ROLE_COLORS[r.toLowerCase()] || DEFAULT_ROLE
            return (
              <span key={r} className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold capitalize shadow-xs border" style={{ color: conf.color, background: `${conf.color}15`, borderColor: `${conf.color}33` }}>
                ✓ {r}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

const DEFAULT_MATRIX: PermissionMatrix = {
  admin: { viewAdminPortal: true, manageUsers: true, manageApiKeys: true, managePermissions: true, manageModels: true, viewAuditLog: true },
  developer: { viewAdminPortal: true, manageUsers: false, manageApiKeys: true, managePermissions: false, manageModels: true, viewAuditLog: true },
  analyst: { viewAdminPortal: true, manageUsers: false, manageApiKeys: false, managePermissions: false, manageModels: false, viewAuditLog: true },
  viewer: { viewAdminPortal: true, manageUsers: false, manageApiKeys: false, managePermissions: false, manageModels: false, viewAuditLog: false },
}

export default function Permissions() {
  const [matrix, setMatrix] = useState<PermissionMatrix>(DEFAULT_MATRIX)
  const [roles, setRoles] = useState<string[]>(['viewer', 'analyst', 'developer', 'admin'])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAddRole, setShowAddRole] = useState(false)

  const [newRoleName, setNewRoleName] = useState('')
  const [addingRole, setAddingRole] = useState(false)

  function loadPermissions() {
    setLoading(true)
    api
      .get('/permissions')
      .then(({ data }: { data: any }) => {
        const mat = data?.matrix && Object.keys(data.matrix).length > 0 ? data.matrix : DEFAULT_MATRIX
        const rawRoles = data?.roles ?? Object.keys(mat)
        const safeRoles = Array.isArray(rawRoles) && rawRoles.length > 0
          ? rawRoles.map(getRoleName).filter(Boolean)
          : Object.keys(mat)
        
        setMatrix(mat)
        setRoles(safeRoles)
        setDirty(false)
      })
      .catch((err: any) => {
        console.warn('Using default permission matrix fallback:', err?.message)
        setMatrix(DEFAULT_MATRIX)
        setRoles(['viewer', 'analyst', 'developer', 'admin'])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadPermissions()
  }, [])

  function handleMatrixChange(role: string, action: PermissionAction, next: boolean) {
    setMatrix((prev) => ({
      ...prev,
      [role]: {
        ...(prev[role] || {}),
        [action]: next,
      },
    }))
    setDirty(true)
  }

  function handleSave() {
    setSaving(true)
    setError(null)
    api
      .put('/permissions', { matrix })
      .then(() => {
        setDirty(false)
      })
      .catch((err: any) => {
        setError(err?.response?.data?.message || 'Failed to update permissions')
      })
      .finally(() => setSaving(false))
  }

  function handleCreateRole(e: React.FormEvent) {
    e.preventDefault()
    if (!newRoleName.trim()) return

    setAddingRole(true)
    const normalizedRole = newRoleName.trim().toLowerCase()

    const updatedMatrix = {
      ...matrix,
      [normalizedRole]: ACTIONS.reduce((acc, act) => {
        acc[act] = false
        return acc
      }, {} as Record<PermissionAction, boolean>)
    }

    const updatedRoles = Array.from(new Set([...roles, normalizedRole]))

    api
      .put('/permissions', { matrix: updatedMatrix })
      .then(() => {
        setMatrix(updatedMatrix)
        setRoles(updatedRoles)
        setShowAddRole(false)
        setNewRoleName('')
      })
      .catch((err: any) => {
        setError(err?.response?.data?.message || 'Failed to add role')
      })
      .finally(() => setAddingRole(false))
  }

  const safeRolesList = Array.isArray(roles) ? roles : []

  const totalGrants = safeRolesList.reduce((acc, r) => {
    const roleName = getRoleName(r)
    const roleMap = matrix[roleName] || {}
    return acc + Object.values(roleMap).filter(Boolean).length
  }, 0)

  return (
    <div className="page sector-violet space-y-6 animate-slide-up">
      {/* Header Controls */}
      <header className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="sector-badge text-xs font-mono font-bold border-border">
            RBAC Engine
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddRole(true)}
            className="border-border bg-secondary text-foreground hover:bg-secondary/80 font-bold shadow-sm cursor-pointer rounded-lg px-3"
          >
            <Crown className="size-3.5 mr-1" />
            Add Role
          </Button>

          {dirty && (
            <Button
              variant="outline"
              size="sm"
              onClick={loadPermissions}
              className="border-border text-foreground hover:bg-secondary/80 font-bold shadow-sm cursor-pointer rounded-lg px-3 animate-in fade-in zoom-in-95 duration-150"
            >
              <RotateCcw className="size-3.5 mr-1" />
              Reset
            </Button>
          )}

          <Button
            size="sm"
            onClick={handleSave}
            disabled={!dirty || saving}
            className="text-primary-foreground font-bold shadow-sm bg-primary hover:bg-primary-hover disabled:opacity-50 cursor-pointer rounded-lg px-4"
          >
            <Save className="size-3.5 mr-1.5" />
            {saving ? 'Saving...' : 'Save Matrix Changes'}
          </Button>
        </div>
      </header>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="size-4 flex-none" />
          {error}
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Configured Roles', value: safeRolesList.length, icon: Crown, color: '#a855f7', chip: 'RBAC Roles', glow: 'rgba(168,85,247,0.45)' },
          { label: 'Protected Actions', value: ACTIONS.length, icon: ShieldCheck, color: '#10b981', chip: 'Enforced', glow: 'rgba(16,185,129,0.45)' },
          { label: 'Active Grants', value: totalGrants, icon: Layers, color: '#06b6d4', chip: 'Matrix Sync', glow: 'rgba(6,182,212,0.45)' },
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

      {/* Role Legend Bar */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border shadow-xs overflow-x-auto">
        <span className="text-xs font-black uppercase text-foreground font-mono tracking-wider flex-none flex items-center gap-1">
          <Crown className="size-3.5 text-primary" /> Role Legend:
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          {safeRolesList.map((rRaw) => {
            const r = getRoleName(rRaw)
            const conf = ROLE_COLORS[r.toLowerCase()] || DEFAULT_ROLE
            return (
              <span key={r} className="px-2.5 py-1 rounded-full text-[11px] font-extrabold capitalize flex items-center gap-1.5 shadow-xs border" style={{ color: conf.color, background: `${conf.color}15`, borderColor: `${conf.color}33` }}>
                <span className="size-2 rounded-full shadow-xs" style={{ background: conf.color }} />
                {r}
              </span>
            )
          })}
        </div>
      </div>

      {/* Action Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 rounded-xl bg-secondary animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ACTIONS.map((action, idx) => (
            <ActionCard
              key={action}
              action={action}
              roles={safeRolesList}
              matrix={matrix}
              onMatrixChange={handleMatrixChange}
              index={idx}
            />
          ))}
        </div>
      )}

      {/* Add Role Dialog */}
      <Dialog open={showAddRole} onOpenChange={setShowAddRole}>
        <DialogContent className="sm:max-w-md border-t-4 border-t-primary shadow-lg rounded-xl bg-card p-6 border-border animate-in fade-in-50 zoom-in-95 duration-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-lg font-black text-foreground tracking-tight">
              <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-none">
                <Crown className="size-4 text-primary" />
              </div>
              Add New Role
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateRole} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Role Key / Name</Label>
              <Input
                placeholder="e.g. analyst, auditor, devops"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                className="bg-background border-border text-foreground font-semibold font-mono text-xs shadow-xs focus:border-primary transition-all rounded-lg"
                required
              />
            </div>

            <DialogFooter className="pt-3 gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" size="sm" className="text-xs font-extrabold bg-secondary text-foreground border-border hover:bg-secondary/80 cursor-pointer rounded-lg px-4">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                size="sm"
                disabled={addingRole}
                className="text-xs font-extrabold text-primary-foreground shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer rounded-lg px-5 bg-primary hover:bg-primary-hover"
              >
                {addingRole ? 'Adding...' : 'Create Role'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

import { useEffect, useState } from 'react'
import {
  Check,
  ShieldCheck,
  RotateCcw,
  Save,
  Lock,
  Layers,
  AlertCircle,
  Crown,
  Sparkles,
  X,
  ShieldAlert,
  ArrowLeft
} from 'lucide-react'
import { api } from '@/api'
import type { PermissionAction, PermissionMatrix, Role } from '../types'
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
  admin:     { color: '#a855f7', glow: 'rgba(168,85,247,0.7)',  gradient: 'linear-gradient(135deg, #a855f7, #6b21a8)' },
  owner:     { color: '#f97316', glow: 'rgba(249,115,22,0.7)',  gradient: 'linear-gradient(135deg, #f97316, #9a3412)' },
  viewer:    { color: '#06b6d4', glow: 'rgba(6,182,212,0.7)',   gradient: 'linear-gradient(135deg, #06b6d4, #155e75)' },
  editor:    { color: '#22c55e', glow: 'rgba(34,197,94,0.7)',   gradient: 'linear-gradient(135deg, #22c55e, #166534)' },
  analyst:   { color: '#3b82f6', glow: 'rgba(59,130,246,0.7)',  gradient: 'linear-gradient(135deg, #3b82f6, #1e40af)' },
  developer: { color: '#f59e0b', glow: 'rgba(245,158,11,0.7)', gradient: 'linear-gradient(135deg, #f59e0b, #92400e)' },
}
const DEFAULT_ROLE = { color: '#64748b', glow: 'rgba(100,116,139,0.5)', gradient: 'linear-gradient(135deg, #64748b, #1e293b)' }

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
  const [pulsing, setPulsing] = useState(false)

  function handleClick() {
    onChange(!allowed)
    setPulsing(true)
    setTimeout(() => setPulsing(false), 500)
  }

  return (
    <button
      onClick={handleClick}
      title={allowed ? 'Revoke permission' : 'Grant permission'}
      className={`relative size-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-125 active:scale-90 cursor-pointer ${pulsing ? 'scale-125' : ''}`}
      style={allowed
        ? { background: `radial-gradient(circle at 35% 35%, ${roleColor}, ${roleColor}aa)`, boxShadow: `0 0 0 2px ${roleColor}aa, 0 0 16px ${roleGlow}`, border: `1.5px solid ${roleColor}` }
        : { background: 'rgba(241,245,249,0.9)', border: '1.5px solid rgba(203,213,225,0.8)' }
      }
    >
      {allowed && (
        <span className="absolute inset-0 rounded-full animate-ping opacity-25 pointer-events-none" style={{ background: roleColor }} />
      )}
      {allowed
        ? <Check className="size-4.5 text-white" style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.9))' }} />
        : <span className="size-2.5 rounded-full bg-slate-400" />
      }
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
      className="spotlight-card card-hover-lift rounded-2xl p-5 space-y-4 animate-slide-left group shadow-lg border-slate-200"
      style={{
        animationDelay: `${index * 60}ms`,
        background: `radial-gradient(circle at 50% 0%, rgba(168,85,247,0.1), transparent 75%), linear-gradient(135deg, #ffffff, #f8fafc)`,
        border: '1.5px solid rgba(168, 85, 247, 0.35)',
        borderTop: '3.5px solid #7c3aed',
        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)'
      }}
    >
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl flex-none transition-transform group-hover:scale-110" style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.35)' }}>
          <Lock className="size-4 text-[#7c3aed] icon-spring" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-slate-900 font-mono group-hover:text-[#7c3aed] transition-colors">{label}</p>
          <p className="text-[11px] text-slate-600 font-bold mt-0.5">
            {grantedRoles.length} of {roles.length} roles granted
          </p>
        </div>
      </div>

      {/* Orb grid */}
      <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${Math.min(Math.max(roles.length, 1), 4)}, 1fr)` }}>
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
                style={{ color: allowed ? conf.color : '#64748b' }}
              >
                {role}
              </span>
            </div>
          )
        })}
      </div>

      {/* Granted pills */}
      {grantedRoles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-200">
          {grantedRoles.map((rRaw) => {
            const r = getRoleName(rRaw)
            const conf = ROLE_COLORS[r.toLowerCase()] || DEFAULT_ROLE
            return (
              <span key={r} className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold capitalize shadow-sm" style={{ color: conf.color, background: `${conf.color}15`, border: `1px solid ${conf.color}44` }}>
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
      {/* Header */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-[#a855f7]/40 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="cyber-pulse-dot cyber-pulse-dot-violet" />
            <h1 className="text-2xl font-black tracking-tight sector-header-title">
              Permission Matrix
            </h1>
            <Badge variant="outline" className="sector-badge text-xs font-mono font-bold">
              RBAC Engine
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-300 font-medium">
            Define which roles can perform which actions. Tap any orb to toggle access, then save.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.dispatchEvent(new CustomEvent('hexagon-hub-back'))}
            className="border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 font-extrabold shadow-sm"
          >
            <ArrowLeft className="size-3.5 mr-1" />
            All Sectors
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddRole(true)}
            className="magnetic-btn border-[#a855f7]/40 bg-[#a855f7]/10 hover:bg-[#a855f7]/25 text-[#c084fc] font-extrabold shadow-md"
          >
            <Crown className="size-3.5 mr-1" />
            Add Role
          </Button>

          {dirty && (
            <Button
              variant="outline"
              size="sm"
              onClick={loadPermissions}
              className="magnetic-btn border-white/20 text-slate-300 hover:bg-white/10 font-extrabold"
            >
              <RotateCcw className="size-3.5 mr-1" />
              Reset
            </Button>
          )}

          <Button
            size="sm"
            onClick={handleSave}
            disabled={!dirty || saving}
            className="magnetic-btn bg-gradient-to-r from-[#a855f7] to-[#7c3aed] text-white font-black shadow-lg shadow-[#a855f7]/30 hover:opacity-95"
          >
            <Save className="size-3.5 mr-1.5" />
            {saving ? 'Saving...' : 'Save Matrix Changes'}
          </Button>
        </div>
      </header>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="size-4 flex-none" />
          {error}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Roles', value: safeRolesList.length, icon: Crown, color: '#7c3aed', glow: 'rgba(124,58,237,0.3)' },
          { label: 'Actions', value: ACTIONS.length, icon: ShieldCheck, color: '#16a34a', glow: 'rgba(22,163,74,0.3)' },
          { label: 'Total Grants', value: totalGrants, icon: Layers, color: '#0891b2', glow: 'rgba(8,145,178,0.3)' },
        ].map((s) => (
          <div
            key={s.label}
            className="spotlight-card card-hover-lift rounded-2xl p-4 flex items-center gap-4 shadow-lg border-slate-200"
            style={{
              background: `radial-gradient(circle at 50% 0%, ${s.color}12, transparent 70%), linear-gradient(135deg, #ffffff, #f8fafc)`,
              border: `1.5px solid ${s.color}35`,
              borderTop: `3.5px solid ${s.color}`,
              boxShadow: '0 6px 18px rgba(15, 23, 42, 0.06)'
            }}
          >
            <div className="p-3 rounded-xl flex-none" style={{ background: `${s.color}18`, border: `1px solid ${s.color}35` }}>
              <s.icon className="size-5 icon-spring" style={{ color: s.color }} />
            </div>
            <div>
              <span className="text-2xl font-black font-mono text-slate-900">{s.value}</span>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-600 mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Role Legend Bar */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 shadow-xs overflow-x-auto">
        <span className="text-xs font-black uppercase text-slate-800 font-mono tracking-wider flex-none flex items-center gap-1">
          <Crown className="size-3.5 text-[#7c3aed]" /> Role Legend:
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          {safeRolesList.map((rRaw) => {
            const r = getRoleName(rRaw)
            const conf = ROLE_COLORS[r.toLowerCase()] || DEFAULT_ROLE
            return (
              <span key={r} className="px-2.5 py-1 rounded-full text-[11px] font-extrabold capitalize flex items-center gap-1.5 shadow-xs" style={{ color: 'white', background: conf.gradient, border: `1.5px solid ${conf.color}` }}>
                <span className="size-2 rounded-full bg-white shadow-xs" />
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
            <div key={i} className="h-48 rounded-2xl bg-white/5 animate-pulse" />
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
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Crown className="size-5 text-[#a855f7]" /> Add New Role
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateRole} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-slate-200 font-bold">Role Name</Label>
              <Input
                placeholder="e.g. analyst, auditor, devops"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                className="bg-slate-900 border-white/20 text-white font-bold"
                required
              />
            </div>

            <DialogFooter className="gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={addingRole}
                className="magnetic-btn bg-[#a855f7] hover:bg-[#9333ea] text-white font-extrabold"
              >
                {addingRole ? 'Adding...' : 'Add Role'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

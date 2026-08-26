import { useEffect, useMemo, useState } from 'react'
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
} from 'lucide-react'
import { getPolicyMatrix, patchRolePermissions, type PolicyMatrix } from '@/api/portal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const ROLE_COLORS: Record<string, { color: string; glow: string; gradient: string }> = {
  admin:     { color: '#a855f7', glow: 'rgba(168,85,247,0.4)',  gradient: 'linear-gradient(135deg, #a855f7, #7c3aed)' },
  owner:     { color: '#f97316', glow: 'rgba(249,115,22,0.4)',  gradient: 'linear-gradient(135deg, #f97316, #ea580c)' },
  viewer:    { color: '#06b6d4', glow: 'rgba(6,182,212,0.4)',   gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)' },
  editor:    { color: '#22c55e', glow: 'rgba(34,197,94,0.4)',   gradient: 'linear-gradient(135deg, #22c55e, #16a34a)' },
  analyst:   { color: '#3b82f6', glow: 'rgba(59,130,246,0.4)',  gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)' },
  developer: { color: '#f59e0b', glow: 'rgba(245,158,11,0.4)', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
}
const DEFAULT_ROLE = { color: 'var(--muted)', glow: 'var(--primary-soft)', gradient: 'linear-gradient(135deg, var(--muted), var(--foreground))' }

function labelize(taskType: string): string {
  return taskType.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/* Permission orb toggle with GSAP-inspired spring dynamics */
function PermOrb({ allowed, onChange, roleColor }: { allowed: boolean; onChange: (next: boolean) => void; roleColor: string }) {
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
function ActionCard({ taskType, roles, matrix, onMatrixChange, index }: {
  taskType: string
  roles: string[]
  matrix: PolicyMatrix
  onMatrixChange: (role: string, taskType: string, next: boolean) => void
  index: number
}) {
  const grantedRoles = roles.filter((r) => matrix[r]?.[taskType])
  const label = labelize(taskType)

  return (
    <div
      className="group relative overflow-hidden border border-border hover:border-primary/50 bg-card hover:bg-card/85 transition-all duration-300 rounded-xl p-5 space-y-4 shadow-sm"
      style={{
        animationDelay: `${index * 60}ms`,
        background: `radial-gradient(circle at 90% 10%, var(--primary-soft), transparent 65%), var(--panel)`,
      }}
    >
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

      <div className="grid gap-2.5 font-sans" style={{ gridTemplateColumns: `repeat(${Math.min(Math.max(roles.length, 1), 4)}, 1fr)` }}>
        {roles.map((role) => {
          const conf = ROLE_COLORS[role.toLowerCase()] || DEFAULT_ROLE
          const allowed = !!matrix[role]?.[taskType]
          return (
            <div key={role} className="flex flex-col items-center gap-1.5">
              <PermOrb allowed={allowed} onChange={(next) => onMatrixChange(role, taskType, next)} roleColor={conf.color} />
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

      {grantedRoles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border">
          {grantedRoles.map((r) => {
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

export default function Permissions() {
  const [matrix, setMatrix] = useState<PolicyMatrix>({})
  const [originalMatrix, setOriginalMatrix] = useState<PolicyMatrix>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function loadPermissions() {
    setLoading(true)
    setError(null)
    getPolicyMatrix()
      .then((mat) => {
        setMatrix(mat)
        setOriginalMatrix(mat)
      })
      .catch(() => setError('Failed to load the permission matrix.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadPermissions() }, [])

  const roles = useMemo(() => Object.keys(matrix), [matrix])
  const taskTypes = useMemo(
    () => Array.from(new Set(Object.values(matrix).flatMap((perms) => Object.keys(perms)))),
    [matrix]
  )
  const dirty = JSON.stringify(matrix) !== JSON.stringify(originalMatrix)

  function handleMatrixChange(role: string, taskType: string, next: boolean) {
    setMatrix((prev) => ({ ...prev, [role]: { ...(prev[role] || {}), [taskType]: next } }))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const changedRoles = roles.filter((r) => JSON.stringify(matrix[r]) !== JSON.stringify(originalMatrix[r]))
      await Promise.all(changedRoles.map((r) => patchRolePermissions(r, matrix[r])))
      setOriginalMatrix(matrix)
    } catch {
      setError('Failed to update permissions')
    } finally {
      setSaving(false)
    }
  }

  const totalGrants = roles.reduce((acc, r) => acc + Object.values(matrix[r] || {}).filter(Boolean).length, 0)

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
          <button onClick={() => setError(null)} className="ml-auto"><X className="size-3.5" /></button>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Configured Roles', value: roles.length, icon: Crown, color: '#a855f7', chip: 'RBAC Roles' },
          { label: 'Task Types', value: taskTypes.length, icon: ShieldCheck, color: '#10b981', chip: 'Enforced' },
          { label: 'Active Grants', value: totalGrants, icon: Layers, color: '#06b6d4', chip: 'Matrix Sync' },
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

      {/* Role Legend Bar */}
      {roles.length > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border shadow-xs overflow-x-auto">
          <span className="text-xs font-black uppercase text-foreground font-mono tracking-wider flex-none flex items-center gap-1">
            <Crown className="size-3.5 text-primary" /> Role Legend:
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {roles.map((r) => {
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
      )}

      {/* Action Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 rounded-xl bg-secondary animate-pulse" />
          ))}
        </div>
      ) : taskTypes.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">No task types found in the policy matrix.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {taskTypes.map((taskType, idx) => (
            <ActionCard
              key={taskType}
              taskType={taskType}
              roles={roles}
              matrix={matrix}
              onMatrixChange={handleMatrixChange}
              index={idx}
            />
          ))}
        </div>
      )}
    </div>
  )
}

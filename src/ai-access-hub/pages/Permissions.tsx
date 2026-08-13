import { useEffect, useState, type FormEvent } from 'react'
import { Check, X } from 'lucide-react'
import { api } from '../api/client'
import type { PermissionAction, PermissionMatrix as MatrixType, RoleRecord } from '../types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const ACTION_LABELS: Record<PermissionAction, string> = {
  viewAdminPortal: 'View admin portal',
  manageUsers: 'Manage users',
  manageApiKeys: 'Manage API keys',
  managePermissions: 'Manage permissions',
  manageModels: 'Manage model registry',
  viewAuditLog: 'View audit log',
}

export default function Permissions() {
  const [matrix, setMatrix] = useState<MatrixType | null>(null)
  const [roles, setRoles] = useState<RoleRecord[]>([])
  const [actions, setActions] = useState<PermissionAction[]>([])
  const [saved, setSaved] = useState<MatrixType | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [showAddRole, setShowAddRole] = useState(false)

  async function load() {
    const { data } = await api.get('/permissions')
    setMatrix(data.matrix)
    setSaved(data.matrix)
    setRoles(data.roles)
    setActions(data.actions)
  }

  useEffect(() => {
    load()
  }, [])

  function toggle(role: string, action: PermissionAction) {
    if (!matrix) return
    setMatrix({ ...matrix, [role]: { ...matrix[role], [action]: !matrix[role][action] } })
  }

  const dirty = matrix && saved && JSON.stringify(matrix) !== JSON.stringify(saved)

  async function save() {
    if (!matrix) return
    setSaving(true)
    setError('')
    try {
      const { data } = await api.put('/permissions', { matrix })
      setMatrix(data.matrix)
      setSaved(data.matrix)
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Could not save permission matrix')
    } finally {
      setSaving(false)
    }
  }

  async function removeRole(key: string) {
    if (!confirm(`Delete the "${key}" role? This only works if no users currently have it.`)) return
    setError('')
    try {
      await api.delete(`/roles/${key}`)
      await load()
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Could not delete role')
    }
  }

  if (!matrix) return <div className="page text-sm text-muted-foreground">Loading…</div>

  return (
    <div className="page">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[23px] font-semibold tracking-tight text-foreground">Roles &amp; permissions</h1>
          <p className="mt-1 text-sm text-muted-foreground">Click a cell to toggle access, enforced server-side on every protected route.</p>
        </div>
        <Button onClick={() => setShowAddRole(true)}>+ Add role</Button>
      </header>

      {error && <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

      <Card className="bg-[var(--panel-2)]">
        <CardHeader>
          <CardTitle>Policy matrix</CardTitle>
          <CardDescription>Roles are managed here.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  {actions.map((a) => (
                    <TableHead key={a} className="text-center">
                      {ACTION_LABELS[a]}
                    </TableHead>
                  ))}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.key}>
                    <TableCell className="font-medium text-foreground">{role.label}</TableCell>
                    {actions.map((action) => {
                      const on = matrix[role.key]?.[action]
                      return (
                        <TableCell key={action} className="text-center">
                          <button
                            onClick={() => toggle(role.key, action)}
                            className={`inline-flex h-6.5 w-6.5 items-center justify-center rounded-md border ${
                              on ? 'border-primary bg-primary/15 text-primary' : 'border-border bg-muted text-muted-foreground'
                            }`}
                          >
                            {on ? <Check className="size-3.5" /> : <X className="size-3.5" />}
                          </button>
                        </TableCell>
                      )
                    })}
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => removeRole(role.key)}>
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {dirty && (
            <div className="mt-4 flex items-center justify-between rounded-md border border-border bg-muted/40 px-4 py-3 text-sm">
              <span>Unsaved changes to the policy matrix</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setMatrix(saved)}>
                  Discard
                </Button>
                <Button size="sm" onClick={save} disabled={saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {showAddRole && <AddRoleDialog onClose={() => setShowAddRole(false)} onCreated={load} />}
    </div>
  )
}

function AddRoleDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [key, setKey] = useState('')
  const [label, setLabel] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await api.post('/roles', { key, label })
      onCreated()
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Could not create role')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add role</DialogTitle>
        </DialogHeader>
        <form id="add-role-form" className="grid gap-4" onSubmit={handleSubmit} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="ar-label">Display label</Label>
            <Input id="ar-label" required value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Support Engineer" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ar-key">Role key</Label>
            <Input id="ar-key" required value={key} onChange={(e) => setKey(e.target.value.toLowerCase())} placeholder="e.g. support_engineer" className="font-mono" />
            <p className="text-xs text-muted-foreground">Lowercase letters, numbers, - or _. This is the value stored on users — pick it carefully.</p>
          </div>
          {error && <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={submitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" form="add-role-form" disabled={submitting}>
            {submitting ? 'Creating…' : 'Add role'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

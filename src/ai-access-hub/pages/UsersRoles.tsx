import { useEffect, useState, type FormEvent } from 'react'
import { UserPlus } from 'lucide-react'
import { api } from '@/api'
import type { AppUser, Role, RoleRecord } from '../types'
import { Pagination } from '../components/Pagination'
import { Badge } from '@/components/ui/badge'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const PAGE_SIZE = 10

function labelFor(roles: RoleRecord[], key: string) {
  return roles.find((r) => r.key === key)?.label ?? key
}

export default function UsersRoles() {
  const [users, setUsers] = useState<AppUser[]>([])
  const [roles, setRoles] = useState<RoleRecord[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editingUser, setEditingUser] = useState<AppUser | null>(null)

  async function load() {
    setLoading(true)
    const [u, r] = await Promise.all([api.get('/users', { params: { offset, limit: PAGE_SIZE } }), api.get('/roles')])
    setUsers(u.data.users)
    setTotal(u.data.total)
    setRoles(r.data.roles)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [offset])

  async function handleAction(fn: () => Promise<unknown>) {
    setError('')
    try {
      await fn()
      await load()
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Action failed')
    }
  }

  async function changeRole(id: string, role: Role) {
    await handleAction(() => api.patch(`/users/${id}`, { role }))
  }
  async function toggleStatus(u: AppUser) {
    await handleAction(() => api.patch(`/users/${u.id}`, { status: u.status === 'active' ? 'inactive' : 'active' }))
  }
  async function removeUser(id: string) {
    if (!confirm('Delete this user permanently?')) return
    await handleAction(() => api.delete(`/users/${id}`))
  }

  return (
    <div className="page">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[23px] font-semibold tracking-tight text-foreground">Users &amp; roles</h1>
          <p className="mt-1 text-sm text-muted-foreground">Roles are enforced server-side, never trusted from the client.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <UserPlus className="size-4" />
          Create user
        </Button>
      </header>

      {error && <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

      <Card className="bg-[var(--panel-2)]">
        <CardHeader>
          <CardTitle>Directory</CardTitle>
          <CardDescription>{loading ? 'Loading…' : `${total} user${total === 1 ? '' : 's'}`}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">No users yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">
                        {u.name} {u.isSystemAdmin && <span className="ml-1 text-xs font-normal text-muted-foreground">(super admin)</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </TableCell>
                    <TableCell>
                      {u.isSystemAdmin ? (
                        <Badge>{labelFor(roles, u.role)}</Badge>
                      ) : (
                        <Select value={u.role} onValueChange={(v) => changeRole(u.id, v)}>
                          <SelectTrigger size="sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {roles.map((r) => (
                              <SelectItem key={r.key} value={r.key}>
                                {r.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.department}</TableCell>
                    <TableCell>
                      <Badge variant={u.status === 'active' ? 'default' : 'secondary'}>{u.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {!u.isSystemAdmin && (
                        <div className="flex justify-end gap-1.5">
                          <Button variant="ghost" size="sm" onClick={() => setEditingUser(u)}>
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => toggleStatus(u)}>
                            {u.status === 'active' ? 'Deactivate' : 'Reactivate'}
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => removeUser(u.id)}>
                            Delete
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="mt-3">
        <Pagination offset={offset} limit={PAGE_SIZE} total={total} onChange={setOffset} />
      </div>

      {showCreate && <CreateUserDialog roles={roles} onClose={() => setShowCreate(false)} onCreated={load} />}
      {editingUser && <EditUserDialog roles={roles} user={editingUser} onClose={() => setEditingUser(null)} onSaved={load} />}
    </div>
  )
}

function CreateUserDialog({ roles, onClose, onCreated }: { roles: RoleRecord[]; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [department, setDepartment] = useState('')
  const [role, setRole] = useState<Role>(roles[0]?.key ?? '')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await api.post('/users', { name, email, password, role, department })
      onCreated()
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Could not create user')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create user</DialogTitle>
        </DialogHeader>
        <form id="create-user-form" className="grid gap-4" onSubmit={handleSubmit} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="cu-name">Full name</Label>
            <Input id="cu-name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cu-email">Email</Label>
            <Input id="cu-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cu-password">Password</Label>
            <Input id="cu-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cu-department">Department</Label>
            <Input id="cu-department" value={department} onChange={(e) => setDepartment(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cu-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v)}>
              <SelectTrigger id="cu-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.key} value={r.key}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={submitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" form="create-user-form" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create user'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditUserDialog({
  roles,
  user,
  onClose,
  onSaved,
}: {
  roles: RoleRecord[]
  user: AppUser
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [department, setDepartment] = useState(user.department)
  const [role, setRole] = useState<Role>(user.role)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await api.patch(`/users/${user.id}`, { name, email, department, role, ...(password ? { password } : {}) })
      onSaved()
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Could not update user')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
        </DialogHeader>
        <form id="edit-user-form" className="grid gap-4" onSubmit={handleSubmit} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="eu-name">Full name</Label>
            <Input id="eu-name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eu-email">Email</Label>
            <Input id="eu-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eu-department">Department</Label>
            <Input id="eu-department" value={department} onChange={(e) => setDepartment(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eu-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v)}>
              <SelectTrigger id="eu-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.key} value={r.key}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eu-password">New password (optional)</Label>
            <Input id="eu-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Leave blank to keep current password" />
          </div>
          {error && <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={submitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" form="edit-user-form" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

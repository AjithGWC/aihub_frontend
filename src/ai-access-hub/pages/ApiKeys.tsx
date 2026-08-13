import { useEffect, useState, type FormEvent } from 'react'
import { KeyRound } from 'lucide-react'
import { api } from '@/api'
import type { AppUser, ApiKeyRecord } from '../types'
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

export default function ApiKeys() {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [keyModalRecord, setKeyModalRecord] = useState<ApiKeyRecord | null>(null)

  async function load() {
    setLoading(true)
    const [k, u] = await Promise.all([
      api.get('/api-keys', { params: { offset, limit: PAGE_SIZE } }),
      api.get('/users', { params: { limit: 100 } }),
    ])
    setKeys(k.data.apiKeys)
    setTotal(k.data.total)
    setUsers(u.data.users.filter((usr: AppUser) => usr.status === 'active'))
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [offset])

  async function toggleStatus(k: ApiKeyRecord) {
    setError('')
    try {
      await api.patch(`/api-keys/${k.id}`, { status: k.status === 'active' ? 'revoked' : 'active' })
      await load()
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Action failed')
    }
  }

  async function removeKey(id: string) {
    if (!confirm('Delete this API key permanently?')) return
    setError('')
    try {
      await api.delete(`/api-keys/${id}`)
      await load()
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Action failed')
    }
  }

  function ownerLabel(owner: ApiKeyRecord['owner']) {
    if (typeof owner === 'string') return owner
    return owner?.name ?? '—'
  }

  return (
    <div className="page">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[23px] font-semibold tracking-tight text-foreground">API keys</h1>
          <p className="mt-1 text-sm text-muted-foreground">Per-user LLM provider keys, encrypted server-side — the raw value is never shown again after saving.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <KeyRound className="size-4" />
          Add API key
        </Button>
      </header>

      {error && <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

      <Card className="bg-[var(--panel-2)]">
        <CardHeader>
          <CardTitle>Registered keys</CardTitle>
          <CardDescription>{loading ? 'Loading…' : `${total} key${total === 1 ? '' : 's'}`}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : keys.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">No keys yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>LLM</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className="font-mono text-xs">{k.masked}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{k.llmName}</TableCell>
                    <TableCell className="text-muted-foreground">{k.label}</TableCell>
                    <TableCell className="text-muted-foreground">{ownerLabel(k.owner)}</TableCell>
                    <TableCell className="text-muted-foreground">{k.expiresAt ? new Date(k.expiresAt).toLocaleDateString() : 'Never'}</TableCell>
                    <TableCell>
                      <Badge variant={k.status === 'active' ? 'default' : 'destructive'}>{k.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button variant="ghost" size="sm" onClick={() => setKeyModalRecord(k)}>
                          Update key
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => toggleStatus(k)}>
                          {k.status === 'active' ? 'Revoke' : 'Reactivate'}
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => removeKey(k.id)}>
                          Delete
                        </Button>
                      </div>
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

      {showCreate && <CreateKeyDialog users={users} onClose={() => setShowCreate(false)} onCreated={load} />}
      {keyModalRecord && <UpdateKeyDialog record={keyModalRecord} onClose={() => setKeyModalRecord(null)} onSaved={load} />}
    </div>
  )
}

function CreateKeyDialog({ users, onClose, onCreated }: { users: AppUser[]; onClose: () => void; onCreated: () => void }) {
  const [label, setLabel] = useState('')
  const [ownerId, setOwnerId] = useState(users[0]?.id ?? '')
  const [llmName, setLlmName] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await api.post('/api-keys', { label, ownerId, llmName, apiKey, expiresAt: expiresAt || null })
      onCreated()
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Could not add key')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add API key</DialogTitle>
        </DialogHeader>
        <form id="create-key-form" className="grid gap-4" onSubmit={handleSubmit} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="ck-label">Label</Label>
            <Input id="ck-label" required value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. ci pipeline key" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ck-owner">Owner</Label>
            <Select value={ownerId} onValueChange={setOwnerId}>
              <SelectTrigger id="ck-owner" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ck-llm">LLM name</Label>
            <Input id="ck-llm" required value={llmName} onChange={(e) => setLlmName(e.target.value)} placeholder="e.g. claude-sonnet-5" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ck-key">API key</Label>
            <Input id="ck-key" required value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-ant-api03-…" />
            <p className="text-xs text-muted-foreground">Encrypted server-side before storage — never shown again after saving.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ck-expires">Expires (optional)</Label>
            <Input id="ck-expires" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </div>
          {error && <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={submitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" form="create-key-form" disabled={submitting || !ownerId}>
            {submitting ? 'Adding…' : 'Add key'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function UpdateKeyDialog({ record, onClose, onSaved }: { record: ApiKeyRecord; onClose: () => void; onSaved: () => void }) {
  const [apiKey, setApiKey] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await api.patch(`/api-keys/${record.id}/key`, { apiKey })
      onSaved()
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Could not update key')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update API key</DialogTitle>
        </DialogHeader>
        <form id="update-key-form" className="grid gap-4" onSubmit={handleSubmit} noValidate>
          <p className="text-sm text-muted-foreground">
            {record.label} · {record.llmName}
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="uk-key">New API key</Label>
            <Input id="uk-key" required autoFocus value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-ant-api03-…" />
          </div>
          <p className="text-xs text-muted-foreground">Encrypted at rest with AES-256-GCM. Used server-side only — never returned by any API response.</p>
          {error && <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={submitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" form="update-key-form" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save key'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

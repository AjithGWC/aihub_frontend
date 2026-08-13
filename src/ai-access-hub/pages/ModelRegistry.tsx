import { useEffect, useState, type FormEvent } from 'react'
import { Boxes } from 'lucide-react'
import { api } from '@/api'
import type { ModelRecord, ModelTask, RoleRecord } from '../types'
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

const ALL_TASKS: ModelTask[] = ['chat', 'code', 'reasoning', 'summarization', 'translation']
const PAGE_SIZE = 10

export default function ModelRegistry() {
  const [models, setModels] = useState<ModelRecord[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [keyModalModel, setKeyModalModel] = useState<ModelRecord | null>(null)
  const [rolesModalModel, setRolesModalModel] = useState<ModelRecord | null>(null)
  const [roles, setRoles] = useState<RoleRecord[]>([])

  async function load() {
    setLoading(true)
    const { data } = await api.get('/models', { params: { offset, limit: PAGE_SIZE } })
    setModels(data.models)
    setTotal(data.total)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [offset])

  useEffect(() => {
    api.get('/roles').then(({ data }: { data: { roles: RoleRecord[] } }) => setRoles(data.roles))
  }, [])

  function roleLabel(key: string) {
    return roles.find((r) => r.key === key)?.label ?? key
  }

  async function setStatus(m: ModelRecord, status: ModelRecord['status']) {
    setError('')
    try {
      await api.patch(`/models/${m.id}/status`, { status })
      await load()
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Action failed')
    }
  }

  async function removeModel(id: string) {
    if (!confirm('Delete this model permanently?')) return
    setError('')
    try {
      await api.delete(`/models/${id}`)
      await load()
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Action failed')
    }
  }

  const statusVariant: Record<ModelRecord['status'], 'default' | 'secondary' | 'outline'> = {
    active: 'default',
    staging: 'secondary',
    inactive: 'outline',
  }

  return (
    <div className="page">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[23px] font-semibold tracking-tight text-foreground">Model registry</h1>
          <p className="mt-1 text-sm text-muted-foreground">Models available for routing. Provider API keys are encrypted at rest and never returned by the API.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Boxes className="size-4" />
          Register model
        </Button>
      </header>

      {error && <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

      <Card className="bg-[var(--panel-2)]">
        <CardHeader>
          <CardTitle>Registered models</CardTitle>
          <CardDescription>{loading ? 'Loading…' : `${total} model${total === 1 ? '' : 's'}`}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : models.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">No models registered yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead>Backend</TableHead>
                    <TableHead>Tasks</TableHead>
                    <TableHead>API Key</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Context</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {models.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <span className="font-medium text-foreground">{m.name}</span>{' '}
                        <Badge variant="outline" className="ml-1">
                          {m.isCloud ? '☁ cloud' : 'on-prem'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">{m.backend}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {m.tasks.map((t) => (
                            <Badge key={t} variant="secondary" className="font-mono text-[10px]">
                              {t}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {!m.isCloud ? (
                          <span className="text-muted-foreground">—</span>
                        ) : m.apiKeyMasked ? (
                          <span className="rounded bg-muted px-2 py-0.5 font-mono text-[11px]">{m.apiKeyMasked}</span>
                        ) : (
                          <Badge variant="outline" className="text-amber-500 border-amber-500/40">
                            not set
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {m.allowedRoles.length === 0 ? (
                          <Badge variant="outline">All roles</Badge>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {m.allowedRoles.map((r) => (
                              <Badge key={r} variant="outline">
                                {roleLabel(r)}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[m.status]}>{m.status}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{m.context}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Select value={m.status} onValueChange={(v) => setStatus(m, v as ModelRecord['status'])}>
                            <SelectTrigger size="sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">active</SelectItem>
                              <SelectItem value="staging">staging</SelectItem>
                              <SelectItem value="inactive">inactive</SelectItem>
                            </SelectContent>
                          </Select>
                          {m.isCloud && (
                            <Button variant="ghost" size="sm" onClick={() => setKeyModalModel(m)}>
                              {m.apiKeyMasked ? 'Update key' : 'Set key'}
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => setRolesModalModel(m)}>
                            Edit roles
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => removeModel(m.id)}>
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-3">
        <Pagination offset={offset} limit={PAGE_SIZE} total={total} onChange={setOffset} />
      </div>

      {showCreate && <RegisterModelDialog roles={roles} onClose={() => setShowCreate(false)} onCreated={load} />}
      {keyModalModel && <ApiKeyDialog model={keyModalModel} onClose={() => setKeyModalModel(null)} onSaved={load} />}
      {rolesModalModel && <RolesDialog model={rolesModalModel} roles={roles} onClose={() => setRolesModalModel(null)} onSaved={load} />}
    </div>
  )
}

function RegisterModelDialog({ roles, onClose, onCreated }: { roles: RoleRecord[]; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [deployment, setDeployment] = useState<'onprem-cpu' | 'onprem-gpu' | 'cloud-anthropic' | 'cloud-other'>('cloud-anthropic')
  const [backend, setBackend] = useState('Anthropic API · Cloud')
  const [context, setContext] = useState('200k')
  const [apiKey, setApiKey] = useState('')
  const [tasks, setTasks] = useState<ModelTask[]>(ALL_TASKS)
  const [allowedRoles, setAllowedRoles] = useState<string[]>([])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isCloud = deployment.startsWith('cloud')

  function toggleRole(key: string) {
    setAllowedRoles((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]))
  }

  function onDeploymentChange(val: typeof deployment) {
    setDeployment(val)
    if (val === 'onprem-cpu') {
      setBackend('Ollama · CPU · On-prem')
      setContext('8k')
    } else if (val === 'onprem-gpu') {
      setBackend('Ollama · GPU · On-prem')
      setContext('32k')
    } else if (val === 'cloud-anthropic') {
      setBackend('Anthropic API · Cloud')
      setContext('200k')
    } else {
      setBackend('Cloud API · Other provider')
      setContext('128k')
    }
  }

  function toggleTask(t: ModelTask) {
    setTasks((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await api.post('/models', { name, backend, context, tasks, isCloud, apiKey: isCloud ? apiKey : undefined, allowedRoles })
      onCreated()
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Could not register model')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Register model</DialogTitle>
        </DialogHeader>
        <form id="register-model-form" className="grid gap-4 max-h-[60vh] overflow-y-auto pr-1" onSubmit={handleSubmit} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="rm-name">Model name</Label>
            <Input id="rm-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. claude-sonnet-5" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rm-deployment">Deployment</Label>
            <Select value={deployment} onValueChange={(v) => onDeploymentChange(v as typeof deployment)}>
              <SelectTrigger id="rm-deployment" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="onprem-cpu">On-prem · Ollama · CPU</SelectItem>
                <SelectItem value="onprem-gpu">On-prem · Ollama · GPU</SelectItem>
                <SelectItem value="cloud-anthropic">Cloud · Anthropic API</SelectItem>
                <SelectItem value="cloud-other">Cloud · Other provider API</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rm-backend">Backend label</Label>
            <Input id="rm-backend" value={backend} onChange={(e) => setBackend(e.target.value)} />
          </div>
          {isCloud && (
            <div className="space-y-1.5">
              <Label htmlFor="rm-key">Provider API key</Label>
              <Input id="rm-key" required value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-ant-api03-…" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="rm-context">Context length</Label>
            <Input id="rm-context" value={context} onChange={(e) => setContext(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Supported tasks</Label>
            <div className="flex flex-wrap gap-2">
              {ALL_TASKS.map((t) => (
                <Badge
                  key={t}
                  variant={tasks.includes(t) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleTask(t)}
                >
                  {t}
                </Badge>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Allowed roles</Label>
            <div className="flex flex-wrap gap-2">
              {roles.map((r) => (
                <Badge
                  key={r.key}
                  variant={allowedRoles.includes(r.key) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleRole(r.key)}
                >
                  {r.label}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Leave all unselected to allow every role.</p>
          </div>
          {error && <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={submitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" form="register-model-form" disabled={submitting}>
            {submitting ? 'Registering…' : 'Register model'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ApiKeyDialog({ model, onClose, onSaved }: { model: ModelRecord; onClose: () => void; onSaved: () => void }) {
  const [apiKey, setApiKey] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await api.patch(`/models/${model.id}/api-key`, { apiKey })
      onSaved()
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Could not save API key')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{model.apiKeyMasked ? 'Update' : 'Set'} API key</DialogTitle>
        </DialogHeader>
        <form id="model-key-form" className="grid gap-4" onSubmit={handleSubmit} noValidate>
          <p className="text-sm text-muted-foreground">
            {model.name} · {model.backend}
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="mk-key">Provider API key</Label>
            <Input id="mk-key" required autoFocus value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-ant-api03-…" />
          </div>
          {error && <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={submitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" form="model-key-form" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save key'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RolesDialog({ model, roles, onClose, onSaved }: { model: ModelRecord; roles: RoleRecord[]; onClose: () => void; onSaved: () => void }) {
  const [allowedRoles, setAllowedRoles] = useState<string[]>(model.allowedRoles)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function toggleRole(key: string) {
    setAllowedRoles((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await api.patch(`/models/${model.id}/roles`, { allowedRoles })
      onSaved()
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Could not save roles')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit allowed roles</DialogTitle>
        </DialogHeader>
        <form id="model-roles-form" className="grid gap-4" onSubmit={handleSubmit} noValidate>
          <p className="text-sm text-muted-foreground">
            {model.name} · {model.backend}
          </p>
          <div className="flex flex-wrap gap-2">
            {roles.map((r) => (
              <Badge key={r.key} variant={allowedRoles.includes(r.key) ? 'default' : 'outline'} className="cursor-pointer" onClick={() => toggleRole(r.key)}>
                {r.label}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Leave all unselected to allow every role.</p>
          {error && <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={submitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" form="model-roles-form" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save roles'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

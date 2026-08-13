import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { api } from '@/api'
import type { AuditLogEntry } from '../types'
import { Pagination } from '../components/Pagination'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const PAGE_SIZE = 10

const outcomeVariant: Record<AuditLogEntry['outcome'], 'default' | 'secondary' | 'destructive'> = {
  passed: 'default',
  denied: 'secondary',
  error: 'destructive',
}

export default function AuditLog() {
  const [events, setEvents] = useState<AuditLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  async function load(q: string, off: number) {
    setLoading(true)
    const { data } = await api.get('/audit-log', { params: { q: q || undefined, offset: off, limit: PAGE_SIZE } })
    setEvents(data.events)
    setTotal(data.total)
    setLoading(false)
  }

  useEffect(() => {
    load('', 0)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      setOffset(0)
      load(query, 0)
    }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  function handlePageChange(newOffset: number) {
    setOffset(newOffset)
    load(query, newOffset)
  }

  return (
    <div className="page">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[23px] font-semibold tracking-tight text-foreground">Audit log</h1>
          <p className="mt-1 text-sm text-muted-foreground">Every login, admin action, and policy decision — queryable by user and event.</p>
        </div>
        <div className="relative min-w-60">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search user, event, outcome…" className="pl-8" />
        </div>
      </header>

      <Card className="bg-[var(--panel-2)]">
        <CardHeader>
          <CardTitle>Events</CardTitle>
          <CardDescription>{loading ? 'Loading…' : `${total} event${total === 1 ? '' : 's'}`}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">No matching events.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Layer</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-xs">{e.event}</TableCell>
                    <TableCell className="text-muted-foreground">{e.actorEmail}</TableCell>
                    <TableCell className="text-muted-foreground">{e.layer}</TableCell>
                    <TableCell>
                      <Badge variant={outcomeVariant[e.outcome]}>{e.outcome}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{new Date(e.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="mt-3">
        <Pagination offset={offset} limit={PAGE_SIZE} total={total} onChange={handlePageChange} />
      </div>
    </div>
  )
}

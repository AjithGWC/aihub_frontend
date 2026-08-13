import { useEffect, useState } from 'react'
import { api } from '@/api'
import type { AuditLogEntry } from '../types'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

// Static demo values, matching the original AI Hub mockup — swap for live platform
// metrics once the AI/routing layer (owned by another team) exposes them.
const KPIS_DEMO = [
  { label: 'Requests / sec', value: '42.7', delta: '▲ 8.1% vs last hour', warn: false },
  { label: 'Cache hit rate', value: '61%', delta: '▲ 3.4% vs last hour', warn: false },
  { label: 'Error rate', value: '0.4%', delta: '▲ 0.1% — within SLO', warn: true },
  { label: 'Active users', value: '128', delta: '▲ 12 this week', warn: false },
]

// Illustrative only — real per-task request volume is produced by the AI/routing layer,
// which this app does not own. Swap for a live metric once that pipeline exists.
const TASK_VOLUME_DEMO = [
  { label: 'Chat', value: 18204 },
  { label: 'Code', value: 11290 },
  { label: 'Reasoning', value: 8012 },
  { label: 'Summarize', value: 6920 },
  { label: 'Translate', value: 4005 },
]

const outcomeVariant: Record<AuditLogEntry['outcome'], 'default' | 'secondary' | 'destructive'> = {
  passed: 'default',
  denied: 'secondary',
  error: 'destructive',
}

export default function Dashboard() {
  const [auditEvents, setAuditEvents] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/audit-log')
      .then(({ data }: { data: { events: AuditLogEntry[] } }) => setAuditEvents(data.events))
      .finally(() => setLoading(false))
  }, [])

  const max = Math.max(...TASK_VOLUME_DEMO.map((x) => x.value))

  return (
    <div className="page">
      <header className="page-header">
        <h1>Platform overview</h1>
        <p className="muted">Live status across gateway, routing, and inference layers</p>
      </header>

      <div className="kpi-row">
        {KPIS_DEMO.map((kpi) => (
          <div key={kpi.label} className="kpi-card">
            <div className="kpi-label">{kpi.label}</div>
            <div className="kpi-value">{kpi.value}</div>
            <div className={`small mt-1.5 font-semibold ${kpi.warn ? 'text-amber-500' : 'text-emerald-500'}`}>{kpi.delta}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Requests by task type</CardTitle>
            <CardDescription>Illustrative demo data — live routing metrics are owned by the AI platform team.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-[150px] items-end gap-2.5 px-2 pb-9 pt-5">
              {TASK_VOLUME_DEMO.map((t) => (
                <div key={t.label} className="group relative flex-1">
                  <div
                    className="cursor-default rounded-t-[6px] rounded-b-[3px] transition group-hover:opacity-100"
                    style={{ height: `${Math.max(6, (t.value / max) * 100)}px`, background: 'var(--accent-gradient)', opacity: 0.9 }}
                  >
                    <span className="absolute -top-5 left-0 right-0 text-center text-[11px] font-bold opacity-0 transition group-hover:opacity-100">
                      {t.value.toLocaleString()}
                    </span>
                  </div>
                  <span className="absolute -bottom-6 left-0 right-0 text-center text-[10.5px] muted">{t.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent audit events</CardTitle>
            <CardDescription>Fed from the Audit Log</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-5 w-full" />
                ))}
              </div>
            ) : auditEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No events yet.</p>
            ) : (
              auditEvents.slice(0, 5).map((e) => (
                <div key={e.id} className="flex items-center justify-between border-b border-border py-2.5 text-sm last:border-0">
                  <span className="flex items-center gap-2 truncate">
                    {e.outcome !== 'passed' && <Badge variant={outcomeVariant[e.outcome]}>{e.outcome}</Badge>}
                    <span className="truncate">{e.event}</span>
                  </span>
                  <span className="font-mono text-xs text-muted-foreground flex-none ml-2">{new Date(e.createdAt).toLocaleTimeString()}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

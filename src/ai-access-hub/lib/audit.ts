import type { RawAuditEvent } from '@/api/portal'
import type { AuditLogEntry } from '../types'

/**
 * The audit event response schema is declared opaque (`{}`) in the Portal
 * swagger, so field names aren't guaranteed — try the common alternates
 * before falling back to a safe default.
 */
export function normalizeAuditEvent(raw: RawAuditEvent, index: number): AuditLogEntry {
  const id = (raw.request_id ?? raw.id ?? raw.trace_id ?? `event-${index}`) as string
  const event = (raw.event ?? raw.event_type ?? raw.action ?? raw.type ?? 'unknown_event') as string
  const actorEmail = (raw.actor_email ?? raw.actor ?? raw.username ?? raw.user ?? raw.user_id ?? '') as string
  const layer = (raw.layer ?? raw.component ?? 'unknown') as string
  const outcome = String(raw.outcome ?? raw.status ?? raw.result ?? 'passed').toLowerCase()
  const createdAt = (raw.timestamp_utc ?? raw.created_at ?? raw.timestamp ?? new Date(0).toISOString()) as string

  return { id, event, actorEmail, layer, outcome, createdAt }
}

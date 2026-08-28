import type { AuditEvent } from '@/api/portal'
import type { AuditLogEntry } from '../types'

export function normalizeAuditEvent(raw: AuditEvent): AuditLogEntry {
  return {
    id: raw.audit_id,
    requestId: raw.request_id,
    eventType: raw.event_type,
    userId: raw.user_id,
    department: raw.department,
    modelUsed: raw.model_used,
    layer: raw.layer,
    outcome: raw.outcome,
    errorCode: raw.error_code,
    promptTokens: raw.prompt_tokens,
    completionTokens: raw.completion_tokens,
    latencyMs: raw.latency_ms,
    piiActions: raw.pii_actions ?? [],
    policyDecisions: raw.policy_decisions ?? [],
    createdAt: raw.timestamp_utc,
  }
}

/** "auth_fail" -> "Auth Fail" */
export function labelizeEvent(eventType: string): string {
  return eventType.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

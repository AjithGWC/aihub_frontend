export type Role = string

export interface AppUser {
  id: string
  name: string
  email: string | null
  roles: string[]
  department: string | null
  status: string
  isSystemAdmin: boolean
  createdAt: string
}

export interface ApiKeyRecord {
  id: string
  label: string | null
  keyPrefix: string
  modelEntitlements: string[]
  owner: { id: string; name: string }
  expiresAt: string | null
  rateLimitRpm: number
  status: string
  createdAt: string
}

export type PermissionMatrix = Record<Role, Record<string, boolean>>

export interface ModelRecord {
  /** The model's `name` doubles as its API identifier — the registry has no separate id. */
  id: string
  name: string
  version: string
  backend: string
  endpoint: string
  tasks: string[]
  status: string
  maxContextLength: number | null
  vramRequiredGb: number | null
  fallbackModel: string | null
  notes: string | null
  isCloud: boolean
  apiKeySet: boolean
}

export interface AuditLogEntry {
  id: string
  requestId: string
  eventType: string
  userId: string | null
  department: string | null
  modelUsed: string | null
  layer: string
  outcome: 'pass' | 'block' | 'error' | string
  errorCode: string | null
  promptTokens: number
  completionTokens: number
  latencyMs: number
  piiActions: string[]
  policyDecisions: string[]
  createdAt: string
}

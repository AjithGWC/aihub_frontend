export type Role = string

export interface RoleRecord {
  key: string
  label: string
}

export interface AppUser {
  id: string
  name: string
  email: string
  role: Role
  department: string
  status: 'active' | 'inactive'
  isSystemAdmin: boolean
  createdAt: string
}

export interface ApiKeyRecord {
  id: string
  label: string
  llmName: string
  masked: string
  owner: { _id: string; name: string; email: string } | string
  expiresAt: string | null
  status: 'active' | 'revoked'
  createdAt: string
}

export type PermissionAction =
  | 'viewAdminPortal'
  | 'manageUsers'
  | 'manageApiKeys'
  | 'managePermissions'
  | 'manageModels'
  | 'viewAuditLog'
export type PermissionMatrix = Record<Role, Record<PermissionAction, boolean>>

export type ModelTask = 'chat' | 'code' | 'reasoning' | 'summarization' | 'translation'

export interface ModelRecord {
  id: string
  name: string
  backend: string
  tasks: ModelTask[]
  status: 'active' | 'staging' | 'inactive'
  context: string
  isCloud: boolean
  apiKeyMasked: string | null
  allowedRoles: string[]
}

export interface AuditLogEntry {
  id: string
  event: string
  actorEmail: string
  layer: string
  outcome: 'passed' | 'denied' | 'error'
  createdAt: string
}

// src/types/permissions.ts

export interface PermissionDef {
  name: string
  description?: string
  scope: 'global' | 'module' | 'widget'
  default?: boolean
}

// src/core/stores/permissions.ts
import { defineStore } from 'pinia'
import { registerHandler } from '@/core/messaging/api'
import { useErrorStore } from '@/core/stores/error'

interface PermissionDef {
  name: string
  description?: string
  scope: 'global' | 'module' | 'widget'
  default?: boolean
}

interface PermissionState {
  definitions: Record<string, PermissionDef>
  granted: string[] // vom Backend/Keycloak bestätigte Berechtigungen
}

export const usePermissionStore = defineStore('permissions', {
  state: (): PermissionState => ({
    definitions: {},
    granted: []
  }),

  actions: {
    initHandlers() {
      const errorStore = useErrorStore()

      registerHandler('user.permissions', (action, p) => {
        if (action === 'list') {
          try {
            if (Array.isArray(p)) {
              this.definitions = {}
              p.forEach((def: any) => {
                if (def && def.name && def.scope) {
                  this.definitions[def.name] = def as PermissionDef
                }
              })
            } else {
              throw new Error('Invalid permissions list payload')
            }
          } catch (err: any) {
            errorStore.add({
              source: 'user.permissions.list',
              code: 'VALIDATION',
              msg: 'Invalid permissions list',
              details: { error: err.message, payload: p }
            })
          }
        }

        if (action === 'granted') {
          try {
            if (Array.isArray(p)) {
              this.granted = p
            } else {
              throw new Error('Invalid granted permissions payload')
            }
          } catch (err: any) {
            errorStore.add({
              source: 'user.permissions.granted',
              code: 'VALIDATION',
              msg: 'Invalid granted permissions payload',
              details: { error: err.message, payload: p }
            })
          }
        }
      })
    },

    has(name: string) {
      return this.granted.includes(name)
    },

    describe(name: string) {
      return this.definitions[name] || { name, scope: 'global' }
    }
  }
})

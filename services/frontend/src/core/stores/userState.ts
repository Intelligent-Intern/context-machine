// src/core/stores/userState.ts
import { defineStore } from 'pinia'
import { registerHandler } from '@/core/messaging/api'
import { useErrorStore } from '@/core/stores/error'

interface UserStateData {
  layout: Record<string, any>
  preferences: Record<string, any>
  updatedAt: string
}

interface UserStateStore {
  data: UserStateData | null
  dirty: boolean
}

export const useUserStateStore = defineStore('userState', {
  state: (): UserStateStore => ({
    data: null,
    dirty: false
  }),

  actions: {
    initHandlers() {
      const errorStore = useErrorStore()

      registerHandler('user.state', (action, p) => {
        if (action === 'get') {
          try {
            if (p && typeof p === 'object') {
              this.data = p as UserStateData
              this.saveLocal()
              this.dirty = false
            } else {
              throw new Error('Invalid user.state.get payload')
            }
          } catch (err: any) {
            errorStore.add({
              source: 'user.state.get',
              code: 'VALIDATION',
              msg: 'Invalid user state payload',
              details: { error: err.message, payload: p }
            })
          }
        }

        if (action === 'update') {
          try {
            if (p && typeof p === 'object') {
              this.data = { ...(this.data || {}), ...p }
              this.data.updatedAt = new Date().toISOString()
              this.saveLocal()
              this.dirty = false
            } else {
              throw new Error('Invalid user.state.update payload')
            }
          } catch (err: any) {
            errorStore.add({
              source: 'user.state.update',
              code: 'VALIDATION',
              msg: 'Invalid user state update payload',
              details: { error: err.message, payload: p }
            })
          }
        }
      })
    },

    keyFor(sub: string) {
      return `userstate:${sub}`
    },

    async load(sub: string) {
      const localRaw = localStorage.getItem(this.keyFor(sub))
      if (localRaw) {
        try {
          this.data = JSON.parse(localRaw)
        } catch {
          // ignore parse error
        }
      }
    },

    update(path: string, value: any, sub?: string) {
      if (!this.data) {
        this.data = { layout: {}, preferences: {}, updatedAt: new Date().toISOString() }
      }
      const parts = path.split('.')
      let target: any = this.data
      for (let i = 0; i < parts.length - 1; i++) {
        if (!target[parts[i]]) target[parts[i]] = {}
        target = target[parts[i]]
      }
      target[parts[parts.length - 1]] = value
      this.data.updatedAt = new Date().toISOString()
      this.dirty = true
      this.saveLocal(sub)
    },

    saveLocal(sub?: string) {
      if (!this.data) return
      const key = sub ? this.keyFor(sub) : 'userstate:anonymous'
      localStorage.setItem(key, JSON.stringify(this.data))
    },

    clear(sub?: string) {
      const key = sub ? this.keyFor(sub) : 'userstate:anonymous'
      localStorage.removeItem(key)
      this.data = null
      this.dirty = false
    }
  }
})

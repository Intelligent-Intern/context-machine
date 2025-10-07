// src/core/stores/audit.ts
import { defineStore } from 'pinia'

export interface AuditEntry {
  id: string
  ts: string
  type: 'info' | 'error' | 'event'
  source: string
  msg: string
  details?: Record<string, any>
}

interface AuditState {
  entries: AuditEntry[]
}

function uid() {
  return Math.random().toString(36).slice(2)
}

export const useAuditStore = defineStore('audit', {
  state: (): AuditState => ({
    entries: []
  }),

  actions: {
    initListeners() {
      // Lauscht auf globale Error-Events
      document.addEventListener('error.added', (ev: any) => {
        const err = ev.detail
        this.add({
          type: 'error',
          source: err.source,
          msg: err.msg,
          details: { code: err.code, traceId: err.traceId, ...err.details }
        })
      })

      // Beispiel: auf andere Events könnte später genauso gehört werden
      document.addEventListener('audit.event', (ev: any) => {
        const e = ev.detail
        this.add({
          type: 'event',
          source: e.source,
          msg: e.msg,
          details: e.details
        })
      })
    },

    add(entry: Omit<AuditEntry, 'id' | 'ts'>) {
      this.entries.unshift({
        id: uid(),
        ts: new Date().toISOString(),
        ...entry
      })
      // Option: Limitierung auf z. B. 500 Einträge
      if (this.entries.length > 500) {
        this.entries.pop()
      }
    },

    clear() {
      this.entries = []
    },

    all() {
      return this.entries
    },

    bySource(source: string) {
      return this.entries.filter(e => e.source === source)
    },

    last(n: number = 10) {
      return this.entries.slice(0, n)
    }
  }
})

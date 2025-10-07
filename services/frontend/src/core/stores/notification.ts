// src/core/stores/notification.ts
import { defineStore } from 'pinia'

export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  message: string
  timeout?: number
  ts: string
}

interface NotificationState {
  items: Notification[]
}

function uid() {
  return Math.random().toString(36).slice(2)
}

export const useNotificationStore = defineStore('notification', {
  state: (): NotificationState => ({
    items: []
  }),

  actions: {
    initListeners() {
      // Reagiere auf globale Error-Events
      document.addEventListener('error.added', (ev: any) => {
        const err = ev.detail
        this.push('error', `[${err.source}] ${err.msg}`, 6000)
      })
      document.addEventListener('error.cleared', () => {
        this.items = []
      })
    },

    push(type: Notification['type'], message: string, timeout = 4000) {
      const n: Notification = {
        id: uid(),
        type,
        message,
        timeout,
        ts: new Date().toISOString()
      }
      this.items.push(n)

      if (timeout > 0) {
        setTimeout(() => this.remove(n.id), timeout)
      }
    },

    remove(id: string) {
      this.items = this.items.filter(n => n.id !== id)
    },

    info(msg: string, t?: number) {
      this.push('info', msg, t)
    },
    success(msg: string, t?: number) {
      this.push('success', msg, t)
    },
    warning(msg: string, t?: number) {
      this.push('warning', msg, t)
    },
    error(msg: string, t?: number) {
      this.push('error', msg, t)
    }
  }
})

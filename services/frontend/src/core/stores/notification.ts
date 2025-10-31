// src/core/stores/notification.ts
import { defineStore } from 'pinia'

interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info' | 'loading'
  message: string
  duration?: number
  persistent?: boolean
  progress?: number
  timestamp: number
}

interface NotificationState {
  items: Notification[]
  loadingStates: Record<string, { message: string, progress?: number }>
}

export const useNotificationStore = defineStore('notification', {
  state: (): NotificationState => ({
    items: [],
    loadingStates: {}
  }),

  actions: {
    add(notification: Omit<Notification, 'id' | 'timestamp'>) {
      const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      const newNotification: Notification = {
        id,
        timestamp: Date.now(),
        duration: notification.duration || (notification.type === 'loading' ? 0 : 5000),
        ...notification
      }

      this.items.push(newNotification)

      // Auto-remove non-persistent notifications
      if (!newNotification.persistent && newNotification.duration > 0) {
        setTimeout(() => {
          this.remove(id)
        }, newNotification.duration)
      }

      return id
    },

    remove(id: string) {
      const index = this.items.findIndex(item => item.id === id)
      if (index > -1) {
        this.items.splice(index, 1)
      }
    },

    clear() {
      this.items = []
    },

    // Loading state management
    startLoading(key: string, message: string, progress?: number) {
      this.loadingStates[key] = { message, progress }
      
      // Add loading notification
      return this.add({
        type: 'loading',
        message,
        progress,
        persistent: true
      })
    },

    updateLoading(key: string, message?: string, progress?: number) {
      if (this.loadingStates[key]) {
        if (message !== undefined) {
          this.loadingStates[key].message = message
        }
        if (progress !== undefined) {
          this.loadingStates[key].progress = progress
        }

        // Update existing loading notification
        const loadingNotification = this.items.find(
          item => item.type === 'loading' && item.message === this.loadingStates[key].message
        )
        
        if (loadingNotification) {
          if (message !== undefined) {
            loadingNotification.message = message
          }
          if (progress !== undefined) {
            loadingNotification.progress = progress
          }
        }
      }
    },

    stopLoading(key: string, finalMessage?: string, finalType: 'success' | 'error' | 'warning' | 'info' = 'success') {
      if (this.loadingStates[key]) {
        // Remove loading notification
        const loadingNotification = this.items.find(
          item => item.type === 'loading' && item.message === this.loadingStates[key].message
        )
        
        if (loadingNotification) {
          this.remove(loadingNotification.id)
        }

        // Add final notification if provided
        if (finalMessage) {
          this.add({
            type: finalType,
            message: finalMessage
          })
        }

        delete this.loadingStates[key]
      }
    },

    // Convenience methods
    success(message: string, duration?: number) {
      return this.add({ type: 'success', message, duration })
    },

    error(message: string, duration?: number) {
      return this.add({ type: 'error', message, duration })
    },

    warning(message: string, duration?: number) {
      return this.add({ type: 'warning', message, duration })
    },

    info(message: string, duration?: number) {
      return this.add({ type: 'info', message, duration })
    },

    // Message handlers for backend updates
    initListeners() {
      import('@/core/messaging/api').then(({ registerHandler }) => {
        registerHandler('notification', (action, payload) => {
          console.log(`[notification] Received message: ${action}`, payload)
          
          switch (action) {
            case 'loading.start':
              this.startLoading(payload.key, payload.message, payload.progress)
              break
              
            case 'loading.update':
              this.updateLoading(payload.key, payload.message, payload.progress)
              break
              
            case 'loading.stop':
              this.stopLoading(payload.key, payload.finalMessage, payload.finalType)
              break
              
            case 'toast':
              this.add({
                type: payload.type || 'info',
                message: payload.message,
                duration: payload.duration
              })
              break
              
            default:
              console.warn(`[notification] Unknown action: ${action}`)
          }
        })
      })
    }
  }
})
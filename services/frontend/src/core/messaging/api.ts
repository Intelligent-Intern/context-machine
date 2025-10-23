// src/core/messaging/api.ts
import { useErrorStore } from '@/core/stores/error'

// Message handlers registry
const handlers: Record<string, (action: string, payload: any) => void> = {}

/**
 * Registers a message handler for a specific action prefix
 */
export function registerHandler(actionPrefix: string, handler: (action: string, payload: any) => void) {
  handlers[actionPrefix] = handler
}

/**
 * Dispatches a message to the appropriate handler
 */
export function dispatch(action: string, payload: any) {
  
  try {
    // Find handler by action prefix (e.g., "discovery.page" matches "discovery")
    const actionParts = action.split('.')
    
    for (let i = actionParts.length; i > 0; i--) {
      const prefix = actionParts.slice(0, i).join('.')
      
      if (handlers[prefix]) {
        const subAction = actionParts.slice(i).join('.')
        handlers[prefix](subAction, payload)
        return
      }
    }
    
    // No specific handler found, try generic handlers
    if (handlers['*']) {
      handlers['*'](action, payload)
      return
    }
    
    console.warn(`[messaging] No handler found for action: ${action}`)
    
  } catch (error) {
    console.error(`[messaging] Error dispatching ${action}:`, error)
    
    const errorStore = useErrorStore()
    errorStore.add({
      source: 'messaging.dispatch',
      code: 'HANDLER_ERROR',
      msg: `Error handling message: ${action}`,
      details: { action, payload, error: error instanceof Error ? error.message : 'Unknown error' }
    })
  }
}

/**
 * Sends a message to the backend via HTTP API
 */
export async function sendMessage(action: string, payload: any = {}) {
  
  try {
    const response = await fetch('/api/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify([{ a: action, p: payload }])
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const result = await response.json()
    return result
    
  } catch (error) {
    console.error(`[messaging] Error sending message ${action}:`, error)
    throw error
  }
}

/**
 * Gets the current auth token for API requests
 */
function getAuthToken(): string | null {
  try {
    const authStore = (window as any).__AUTH_STORE__
    return authStore?.accessToken || localStorage.getItem('auth_token') || null
  } catch (error) {
    console.error('[messaging] Error getting auth token:', error)
    return null
  }
}

/**
 * Registers common message handlers for real-time updates
 */
export function initMessageHandlers() {

  
  // Handle authentication responses
  registerHandler('auth', (action, payload) => {
    if (action === 'login.response') {
      // Handle login response from WebSocket
    } else if (action === 'logout') {
      // Handle logout notification
    }
  })
  
  // Handle chat messages
  registerHandler('chat', (action, payload) => {
    if (action === 'message') {
      // Handle incoming chat message
    } else if (action === 'send.response') {
      // Handle chat send response
    }
  })
  
  // Handle discovery updates
  registerHandler('discovery', (action, payload) => {
    // Discovery messages are handled by the discovery store
  })
  
  // Handle dashboard updates
  registerHandler('dashboard', (action, payload) => {
    if (action === 'stats.update') {
      // Handle dashboard stats update
    }
  })
  
  // Handle navigation updates
  registerHandler('navigation', (action, payload) => {
    if (action === 'menu.update') {
      // Handle navigation menu update
    }
  })
  
  // Generic handler for unhandled messages
  registerHandler('*', (action, payload) => {
    // Unhandled message
  })
}
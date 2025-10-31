// src/core/messaging/api/index.ts

/**
 * Handler-Registry: speichert alle Callback-Funktionen pro ns.entity
 */
const handlers: Record<string, (action: string, payload: any) => void> = {}

/**
 * Registrierung einer Handler-Funktion für einen Namespace + Entity.
 * Beispiel: registerHandler('notification', (action, p) => { ... })
 */
export function registerHandler(nsEntity: string, fn: (action: string, payload: any) => void) {
    handlers[nsEntity] = fn
    console.log(`[messaging] Handler registered for: ${nsEntity}`)
}

/**
 * Dispatcher: verteilt eingehende WS-Nachrichten an die registrierten Handler.
 */
export function dispatch(a: string, p: any) {
    console.log(`[messaging] Dispatching: ${a}`, p)
    
    const parts = a.split('.')
    if (parts.length < 2) {
        console.error(`[messaging] Invalid action format: ${a}`)
        return
    }

    // Try different handler key patterns
    const namespace = parts[0]
    const remainingAction = parts.slice(1).join('.')
    
    // First try: exact namespace match (e.g., "navigation" for "navigation.items.response")
    if (handlers[namespace]) {
        try {
            handlers[namespace](remainingAction, p)
            return
        } catch (err: any) {
            console.error(`[messaging] Handler error for ${a}:`, err)
            return
        }
    }
    
    // Second try: namespace.entity pattern (legacy)
    if (parts.length >= 3) {
        const key = `${parts[0]}.${parts[1]}`
        const action = parts.slice(2).join('.')
        
        if (handlers[key]) {
            try {
                handlers[key](action, p)
                return
            } catch (err: any) {
                console.error(`[messaging] Handler error for ${a}:`, err)
                return
            }
        }
    }
    
    console.warn(`[messaging] No handler registered for ${namespace} or ${parts[0]}.${parts[1]}`)
}

/**
 * Sends a message to backend via HTTP API
 * Backend processes it and sends response via WebSocket
 */
export async function sendMessage(action: string, payload: any = {}): Promise<any> {
    console.log(`[messaging] Sending message: ${action}`, payload)
    
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
        
        // Backend processes message and sends response via WebSocket
        // Return acknowledgment that message was sent
        return { sent: true, action, payload }
        
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

export function listHandlers() {
    return Object.keys(handlers)
}

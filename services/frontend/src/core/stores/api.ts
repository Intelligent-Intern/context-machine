// src/core/stores/api.ts
import { defineStore } from 'pinia'
import { useErrorStore } from '@/core/stores/error'
import { useAuthStore } from '@/core/stores/auth'

interface ApiRequest {
    a: string
    p?: any
}

export const useApiStore = defineStore('api', {
    actions: {
        /**
         * Sendet Nachrichten gebündelt an das Backend.
         * Antworten kommen ausschließlich über WebSocket.
         */
        async send(messages: ApiRequest[]) {
            const errorStore = useErrorStore()
            const authStore = useAuthStore()
            
            try {
                // Prepare headers
                const headers: Record<string, string> = {
                    'Content-Type': 'application/json'
                }
                
                // Add JWT token if available
                if (authStore.accessToken) {
                    headers['Authorization'] = `Bearer ${authStore.accessToken}`
                }
                
                const res = await fetch('/api/message', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(messages)
                })

                if (!res.ok) {
                    const text = await res.text()
                    
                    // Handle token expiration
                    if (res.status === 401) {
                        // Clear invalid token and redirect to login
                        authStore.logout()
                        errorStore.add({
                            source: 'api.send',
                            code: 'AUTH',
                            msg: 'Authentication required - please login again',
                            details: { status: res.status },
                            ts: new Date().toISOString()
                        })
                        return false
                    }
                    
                    errorStore.add({
                        source: 'api.send',
                        code: 'HTTP',
                        msg: text || `HTTP ${res.status}`,
                        details: { status: res.status },
                        ts: new Date().toISOString()
                    })
                    return false
                }

                // Response wird ignoriert, da Antworten via WS kommen
                return true
            } catch (err: any) {
                errorStore.add({
                    source: 'api.send',
                    code: 'NETWORK',
                    msg: err?.message || 'API request failed',
                    details: { stack: err?.stack },
                    ts: new Date().toISOString()
                })
                return false
            }
        }
    }
})

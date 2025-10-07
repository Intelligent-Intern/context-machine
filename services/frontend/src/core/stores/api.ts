// src/core/stores/api.ts
import { defineStore } from 'pinia'
import { useErrorStore } from '@/core/stores/error'

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
            try {
                const res = await fetch('/api/message', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ m: messages })
                })

                if (!res.ok) {
                    const text = await res.text()
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

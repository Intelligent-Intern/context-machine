// src/core/messaging/api/index.ts
import { useErrorStore } from '@/core/stores/error'

/**
 * Handler-Registry: speichert alle Callback-Funktionen pro ns.entity
 */
const handlers: Record<string, (action: string, payload: any) => void> = {}

/**
 * Registrierung einer Handler-Funktion für einen Namespace + Entity.
 * Beispiel: registerHandler('discovery.page', (action, p) => { ... })
 */
export function registerHandler(nsEntity: string, fn: (action: string, payload: any) => void) {
    handlers[nsEntity] = fn
}

/**
 * Dispatcher: verteilt eingehende WS-Nachrichten an die registrierten Handler.
 */
export function dispatch(a: string, p: any) {
    const errorStore = useErrorStore()
    const [ns, entity, action] = a.split('.')
    if (!ns || !entity || !action) {
        errorStore.add({
            source: 'dispatcher',
            code: 'FORMAT',
            msg: `Invalid action format: ${a}`,
            details: { a, p },
            ts: new Date().toISOString()
        })
        return
    }

    const key = `${ns}.${entity}`
    const handler = handlers[key]

    if (handler) {
        try {
            handler(action, p)
        } catch (err: any) {
            errorStore.add({
                source: key,
                code: 'HANDLER_ERROR',
                msg: `Handler for ${a} failed`,
                details: { error: err.message, stack: err.stack, payload: p },
                ts: new Date().toISOString()
            })
        }
    } else {
        errorStore.add({
            source: 'dispatcher',
            code: 'NO_HANDLER',
            msg: `No handler registered for ${key}`,
            details: { a, p },
            ts: new Date().toISOString()
        })
    }
}

/**
 * Utility: gibt alle aktuell registrierten Handler zurück (für Debug/Overlay).
 */
export function listHandlers() {
    return Object.keys(handlers)
}

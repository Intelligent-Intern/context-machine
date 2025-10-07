// src/core/stores/error.ts
import { defineStore } from 'pinia'
import { registerHandler } from '@/core/messaging/api'

export interface ErrorPayload {
    source: string
    code: string
    msg: string
    details?: Record<string, any>
    traceId?: string
    ts?: string
}

interface ErrorState {
    errors: ErrorPayload[]
}

export const useErrorStore = defineStore('error', {
    state: (): ErrorState => ({
        errors: []
    }),

    actions: {
        initHandlers() {
            // Globale Fehler vom Backend
            registerHandler('error.global', (_action, p) => {
                this.add({
                    source: p.source,
                    code: p.code,
                    msg: p.msg,
                    details: p.details,
                    traceId: p.traceId,
                    ts: new Date().toISOString()
                })
            })

            // Fehlerhafte Widgets in Quarantäne
            registerHandler('error.widget', (action, p) => {
                if (action === 'load') {
                    this.add({
                        source: 'error.widget.load',
                        code: 'WIDGET_LOAD',
                        msg: `Widget konnte nicht geladen werden: ${p.widget}`,
                        details: { reason: p.reason },
                        traceId: p.traceId,
                        ts: new Date().toISOString()
                    })
                }
            })
        },

        add(err: ErrorPayload) {
            this.errors.push(err)
            document.dispatchEvent(
                new CustomEvent('error.added', { detail: err })
            )
        },

        clear() {
            this.errors = []
            document.dispatchEvent(new CustomEvent('error.cleared'))
        },

        getBySource(source: string) {
            return this.errors.filter(e => e.source === source)
        },

        getValidation(source: string) {
            const errs = this.errors.filter(
                e => e.source === source && e.code === 'VALIDATION'
            )
            const fields: Record<string, string> = {}
            errs.forEach(e => {
                if (e.details?.fields) {
                    Object.entries(e.details.fields).forEach(([k, v]) => {
                        fields[k] = String(v)
                    })
                }
            })
            return fields
        }
    }
})

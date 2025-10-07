// src/core/i18n/index.ts
import { createI18n, useI18n as _useI18n } from 'vue-i18n'
import { registerHandler } from '@/core/messaging/api'
import { useErrorStore } from '@/core/stores/error'

// Fallback-Locales
import deFallback from './locales/de.json'
import enFallback from './locales/en.json'

// Globale i18n-Instanz
export const i18n = createI18n({
    legacy: false,
    locale: 'en',
    fallbackLocale: 'en',
    messages: {
        en: enFallback,
        de: deFallback
    }
})

/**
 * Registriert Handler für eingehende i18n-Messages.
 */
export function initI18nHandlers() {
    const errorStore = useErrorStore()

    registerHandler('i18n.locale', (action, p) => {
        if (action === 'get') {
            try {
                if (p && typeof p === 'object') {
                    const locale = p.locale || 'en'
                    const merged = {
                        ...i18n.global.getLocaleMessage(locale),
                        ...p
                    }
                    i18n.global.setLocaleMessage(locale, merged)
                    i18n.global.locale.value = locale
                    localStorage.setItem('i18n.locale', locale)
                } else {
                    throw new Error('Invalid i18n payload')
                }
            } catch (err: any) {
                errorStore.add({
                    source: 'i18n.locale.get',
                    code: 'VALIDATION',
                    msg: 'Invalid i18n locale payload',
                    details: { error: err.message, payload: p }
                })
            }
        }
    })
}

/**
 * Lädt persistierte Locale aus localStorage.
 */
export function loadPersistedLocale() {
    const saved = localStorage.getItem('i18n.locale')
    if (saved) {
        i18n.global.locale.value = saved
    }
}

/**
 * Re-export von useI18n, damit man überall
 * `import { useI18n } from '@/core/i18n'` schreiben kann.
 */
export const useI18n = _useI18n

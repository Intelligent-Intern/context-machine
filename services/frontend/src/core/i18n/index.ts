// src/core/i18n/index.ts
import { createI18n } from 'vue-i18n'

// Simple messages for now
const messages = {
  en: {
    'a11y.skipToContent': 'Skip to content'
  },
  de: {
    'a11y.skipToContent': 'Zum Inhalt springen'
  }
}

export const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages
})

export function initI18nHandlers() {
  // Placeholder for i18n handlers
}

export function loadPersistedLocale() {
  // Placeholder for loading persisted locale
}

export function useI18n() {
  return i18n.global
}
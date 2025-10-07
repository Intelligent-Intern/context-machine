// src/core/stores/theme.ts
import { defineStore } from 'pinia'
import { registerHandler } from '@/core/messaging/api'
import { useErrorStore } from '@/core/stores/error'
import mick from '@/core/theme/base-themes/mick-theme.json'
import herb from '@/core/theme/base-themes/herb-theme.json'

export interface ThemeDefinition {
  name: string
  tokens: Record<string, string>
}

interface ThemeState {
  active: string
  themes: Record<string, ThemeDefinition>
}

export const useThemeStore = defineStore('theme', {
  state: (): ThemeState => ({
    active: 'mick',
    themes: {
      mick: mick as ThemeDefinition,
      herb: herb as ThemeDefinition
    }
  }),

  actions: {
    initHandlers() {
      const errorStore = useErrorStore()

      registerHandler('theme.theme', (action, p) => {
        if (action === 'list') {
          try {
            p.forEach((theme: ThemeDefinition) => {
              this.themes[theme.name] = theme
            })
          } catch (err: any) {
            errorStore.add({
              source: 'theme.theme.list',
              code: 'VALIDATION',
              msg: 'Theme list invalid',
              details: { error: err.message }
            })
          }
        }
        if (action === 'get') {
          try {
            if (p && p.name && p.tokens) {
              this.themes[p.name] = p
            } else {
              throw new Error('Invalid theme payload')
            }
          } catch (err: any) {
            errorStore.add({
              source: 'theme.theme.get',
              code: 'VALIDATION',
              msg: 'Theme payload invalid',
              details: { error: err.message, payload: p }
            })
          }
        }
      })
    },

    async setTheme(name: string) {
      if (!this.themes[name]) {
        // falls Theme noch nicht geladen ist, forciere API-Nachladen
        // das wird über messaging/api send passieren
        return
      }
      this.active = name
      localStorage.setItem('theme.active', name)
    },

    loadPersisted() {
      const saved = localStorage.getItem('theme.active')
      if (saved && this.themes[saved]) {
        this.active = saved
      }
    },

    getToken(key: string) {
      const theme = this.themes[this.active]
      return theme?.tokens[key] || ''
    }
  }
})

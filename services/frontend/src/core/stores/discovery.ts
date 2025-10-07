// src/core/stores/discovery.ts
import { defineStore } from 'pinia'
import { registerHandler } from '@/core/messaging/api'
import { validateManifest, normalizePage, normalizeModule, normalizeWidgetPack } from '@/core/discovery/manifest-loader'
import { useErrorStore } from '@/core/stores/error'

interface PageManifest {
  id: string
  route: string
  bars: Record<string, any>
  ports: Record<string, any>
}

interface ModuleManifest {
  name: string
  version: string
  dependsOn?: string[]
}

interface WidgetPackManifest {
  name: string
  version: string
  widgets: any[]
}

interface DiscoveryState {
  pages: Record<string, PageManifest>
  modules: Record<string, ModuleManifest>
  widgetPacks: Record<string, WidgetPackManifest>
}

export const useDiscoveryStore = defineStore('discovery', {
  state: (): DiscoveryState => ({
    pages: {},
    modules: {},
    widgetPacks: {}
  }),

  actions: {
    initHandlers() {
      const errorStore = useErrorStore()

      // Page List
      registerHandler('discovery.page', (action, p) => {
        if (action === 'list') {
          try {
            p.forEach((pg: any) => {
              if (validateManifest('page', pg)) {
                this.pages[pg.id] = normalizePage(pg)
              }
            })
          } catch (err: any) {
            errorStore.add({
              source: 'discovery.page.list',
              code: 'VALIDATION',
              msg: 'Page manifest invalid',
              details: { error: err.message }
            })
          }
        }
        if (action === 'get') {
          if (validateManifest('page', p)) {
            this.pages[p.id] = normalizePage(p)
          } else {
            errorStore.add({
              source: 'discovery.page.get',
              code: 'VALIDATION',
              msg: 'Invalid page manifest received',
              details: { manifest: p }
            })
          }
        }
      })

      // Module List
      registerHandler('discovery.module', (action, p) => {
        if (action === 'list') {
          try {
            p.forEach((mod: any) => {
              if (validateManifest('module', mod)) {
                this.modules[mod.name] = normalizeModule(mod)
              }
            })
          } catch (err: any) {
            errorStore.add({
              source: 'discovery.module.list',
              code: 'VALIDATION',
              msg: 'Module manifest invalid',
              details: { error: err.message }
            })
          }
        }
      })

      // WidgetPack List
      registerHandler('discovery.widgetpack', (action, p) => {
        if (action === 'list') {
          try {
            p.forEach((wp: any) => {
              if (validateManifest('widget-pack', wp)) {
                this.widgetPacks[wp.name] = normalizeWidgetPack(wp)
              }
            })
          } catch (err: any) {
            errorStore.add({
              source: 'discovery.widgetpack.list',
              code: 'VALIDATION',
              msg: 'WidgetPack manifest invalid',
              details: { error: err.message }
            })
          }
        }
      })
    }
  }
})

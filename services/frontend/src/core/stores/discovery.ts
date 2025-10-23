// src/core/stores/discovery.ts
import { defineStore } from 'pinia'
import { watch } from 'vue'
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
  isConfigLoaded: boolean
}

export const useDiscoveryStore = defineStore('discovery', {
  state: (): DiscoveryState => ({
    pages: {},
    modules: {},
    widgetPacks: {},
    isConfigLoaded: false
  }),

  actions: {
    setConfiguration(config: any) {

      // Clear existing data
      this.pages = {}
      this.modules = {}
      this.widgetPacks = {}

      try {
        // Process modules - convert backend format to frontend format
        if (config.modules && Array.isArray(config.modules)) {
          config.modules.forEach((module: any) => {
            const convertedModule = this.convertBackendModule(module)
            this.modules[module.id] = normalizeModule(convertedModule)
          })
        }

        // Process pages - convert backend format to frontend format
        if (config.pages && Array.isArray(config.pages)) {
          config.pages.forEach((page: any) => {
            const convertedPage = this.convertBackendPage(page)
            this.pages[page.route] = normalizePage(convertedPage)
          })
        }

        // Process widget packs - convert backend format to frontend format
        if (config.widgetPacks && Array.isArray(config.widgetPacks)) {
          config.widgetPacks.forEach((pack: any) => {
            const convertedPack = this.convertBackendWidgetPack(pack)
            this.widgetPacks[pack.id] = normalizeWidgetPack(convertedPack)
          })
        }

        this.isConfigLoaded = true

        // Trigger router and widget registry updates
        this.triggerUpdates()
      } catch (error) {
        console.error('[discovery] Error loading configuration:', error)
        const errorStore = useErrorStore()
        errorStore.add({
          source: 'discovery.setConfiguration',
          code: 'CONFIG_ERROR',
          msg: 'Failed to load backend configuration',
          details: { error: error instanceof Error ? error.message : 'Unknown error' }
        })
      }
    },

    convertBackendPage(backendPage: any) {
      // Convert backend page format to frontend page format
      const page = {
        id: backendPage.route.replace('/', '') || 'home', // Use route as ID, fallback to 'home' for root
        route: backendPage.route,
        name: backendPage.name,
        // Convert layout to bars format (2 = visible and active)
        bars: {
          top: backendPage.layout?.top ? 2 : 0,
          bottom: backendPage.layout?.bottom ? 2 : 0,
          left: backendPage.layout?.left ? 2 : 1, // Show left sidebar by default
          right: backendPage.layout?.right ? 2 : 0
        },
        // Add empty ports for now - will be populated by modules
        ports: {
          top: [],
          bottom: [],
          left: [],
          right: [],
          main: []
        }
      }


      return page
    },

    convertBackendModule(backendModule: any) {
      // Convert backend module format to frontend module format
      const module = {
        name: backendModule.id,
        version: '1.0.0', // Default version
        id: backendModule.id,
        widgets: backendModule.widgets || [],
        dependsOn: [],
        navigation: [],
        pages: [],
        permissions: [],
        features: []
      }


      return module
    },

    convertBackendWidgetPack(backendPack: any) {
      // Convert backend widget pack format to frontend widget pack format
      const widgets = []

      if (backendPack.components) {
        for (const [componentName, componentConfig] of Object.entries(backendPack.components)) {
          let componentPath = (componentConfig as any).path
          
          // Fix known path issues
          if (componentPath === '@/widget-packs/navigation/widgets/TopBar.vue') {
            componentPath = '@/components/TopBar.vue'
          }

          widgets.push({
            key: componentName,
            component: componentPath,
            themeWidget: componentName.toLowerCase(),
            props: {},
            events: [],
            classes: {}
          })
        }
      }

      const pack = {
        name: backendPack.id,
        version: '1.0.0', // Default version
        id: backendPack.id,
        widgets: widgets,
        tokens: [],
        // Keep original components for widget registry with corrected paths
        components: this.correctWidgetPackPaths(backendPack.components, backendPack.id)
      }

      return pack
    },

    correctWidgetPackPaths(components: any, packId: string) {
      if (!components) return {}

      const correctedComponents: any = {}
      for (const [componentName, componentConfig] of Object.entries(components)) {
        let path = (componentConfig as any).path

        // Fix known path issues
        if (path === '@/widget-packs/navigation/widgets/TopBar.vue') {
          path = '@/components/TopBar.vue'
        }

        correctedComponents[componentName] = {
          ...(componentConfig as any),
          path: path
        }
      }

      return correctedComponents
    },

    triggerUpdates() {
      // This method will be called to notify other systems about config changes

      // Update widget registry with new widget packs
      import('@/core/widgets/registry').then(({ updateWidgetRegistry, registerWidgetPack }) => {
        updateWidgetRegistry(this.widgetPacks)

        // Also register backend widget packs with their actual components
        Object.values(this.widgetPacks).forEach(pack => {
          if (pack.components) {
            const componentMap: Record<string, any> = {}
            
            Object.entries(pack.components).forEach(([componentName, componentConfig]) => {
              const path = componentConfig.path
              
              // Create dynamic import based on path
              if (path.startsWith('@/')) {
                componentMap[componentName] = () => import(/* @vite-ignore */ path)
              }
            })

            // Register with full pack ID
            registerWidgetPack(pack.id || pack.name, componentMap)
            
            // Also register with short name for compatibility
            if (pack.name && pack.name !== pack.id) {
              registerWidgetPack(pack.name, componentMap)
            }
          }
        })
      })

      // Also register built-in widget packs that are not from backend
      this.registerBuiltInWidgets()
    },

    async loadBackendConfig() {
      // Check if we're on a public route that doesn't need authenticated backend config
      const currentRoute = window.location.pathname
      const publicRoutes = ['/login', '/forgot-password']

      if (publicRoutes.includes(currentRoute)) {
        return false
      }

      // Check if user is authenticated before making backend calls
      const { useAuthStore } = await import('@/core/stores/auth')
      const authStore = useAuthStore()

      if (!authStore.isAuthenticated || !authStore.isTokenValid) {
        console.warn('[discovery] User not authenticated, skipping backend config')
        return false
      }

      // Try to load widget packs from backend first
      try {
        // Use the existing message system directly
        const { sendMessage } = await import('@/core/messaging/api')

        try {
          const data = await sendMessage('widget.registry', {})
          if (data && data.widgetPacks) {

            // Update widget registry with backend config
            import('@/core/widgets/registry').then(({ updateWidgetRegistry }) => {
              const widgetPacksMap: Record<string, any> = {}
              data.widgetPacks.forEach((pack: any) => {
                widgetPacksMap[pack.id] = pack
              })
              updateWidgetRegistry(widgetPacksMap)
            })

            return true
          } else {
            console.warn('[discovery] No widget packs in backend response')
            return false
          }
        } catch (error) {
          console.warn('[discovery] Failed to load backend config:', error)
          return false
        }
      } catch (error) {
        console.warn('[discovery] Failed to load backend config:', error)
      }

      return false
    },

    registerBuiltInWidgets() {
      // Register FALLBACK widgets only if backend config fails
      import('@/core/widgets/registry').then(({ registerWidgetPack }) => {

        // Auth widget pack FALLBACK
        registerWidgetPack('widget-pack/core-ui/auth/550e8400-e29b-41d4-a716-446655440000/1.0.0', {
          LoginForm: () => import('@/widget-packs/auth/widgets/LoginForm.vue'),
          ForgotPasswordForm: () => import('@/widget-packs/auth/widgets/ForgotPasswordForm.vue')
        })

        // Also register with short name for backend compatibility
        registerWidgetPack('auth', {
          LoginForm: () => import('@/widget-packs/auth/widgets/LoginForm.vue'),
          ForgotPasswordForm: () => import('@/widget-packs/auth/widgets/ForgotPasswordForm.vue')
        })

        // Dashboard widgets FALLBACK
        registerWidgetPack('widget-pack/dashboard/ui/550e8400-e29b-41d4-a716-446655440000/1.0.0', {
          Welcome: () => import('@/components/Welcome.vue')
        })

        // Also register with short name for backend compatibility
        registerWidgetPack('dashboard', {
          Welcome: () => import('@/components/Welcome.vue')
        })

        // Navigation widget pack FALLBACK - fix TopBar path
        registerWidgetPack('widget-pack/core-ui/navigation/550e8400-e29b-41d4-a716-446655440000/1.0.0', {
          SidebarNav: () => import('@/widget-packs/navigation/widgets/SidebarNav.vue'),
          TopBar: () => import('@/components/TopBar.vue')
        })

        // Also register with short name for backend compatibility
        registerWidgetPack('navigation', {
          SidebarNav: () => import('@/widget-packs/navigation/widgets/SidebarNav.vue'),
          TopBar: () => import('@/components/TopBar.vue')
        })

        // Register short names that match the backend widget references
        registerWidgetPack('nav', {
          SidebarNav: () => import('@/widget-packs/navigation/widgets/SidebarNav.vue'),
          TopBar: () => import('@/components/TopBar.vue')
        })

        // Theme widget pack
        registerWidgetPack('theme', {
          ThemeEditor: () => import('@/widget-packs/theme/widgets/ThemeEditor.vue')
        })
      })
    },

    async initAuthWatcher() {
      // Import auth store dynamically to avoid circular dependencies
      import('@/core/stores/auth').then(async ({ useAuthStore }) => {
        const authStore = useAuthStore()

        // Try to load backend config first, fallback to built-in widgets
        const backendConfigLoaded = await this.loadBackendConfig()
        if (!backendConfigLoaded) {
          this.registerBuiltInWidgets()
        }

        // Watch for changes in auth config
        watch(
          () => authStore.config,
          async (newConfig) => {
            if (newConfig && authStore.isAuthenticated) {
              this.setConfiguration(newConfig)
            } else if (!authStore.isAuthenticated) {
              // Clear configuration when user logs out
              this.pages = {}
              this.modules = {}
              this.widgetPacks = {}
              this.isConfigLoaded = false

              // Only register built-in widgets for public routes, don't call backend
              this.registerBuiltInWidgets()
            }
          },
          { immediate: true }
        )
      })
    },

    initHandlers() {
      const errorStore = useErrorStore()

      // Initialize auth watcher to consume backend config
      this.initAuthWatcher()

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

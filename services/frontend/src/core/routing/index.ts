import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { registerDynamicRoutes } from './routes'
import guards from './guards'

// Helper function to get page layout from auth config
async function getPageLayoutFromConfig(route: string) {
  const { useAuthStore } = await import('@/core/stores/auth')
  const authStore = useAuthStore()
  
  if (!authStore.config || !authStore.config.pages) {
    return null
  }
  
  // Find the page in the config
  const page = authStore.config.pages.find(p => p.route === route)
  if (!page) {
    return null
  }
  
  // Convert page layout to the expected format
  if (page.layout && typeof page.layout === 'object') {
    // Check if it's already in the new compact format
    if ('bars' in page.layout && 'ports' in page.layout) {
      return page.layout
    }
    
    // Convert from old format to new compact format
    const layout = page.layout as Record<string, boolean>
    return {
      bars: {
        t: layout.top ? 2 : 0,
        b: layout.bottom ? 2 : 0,
        l: layout.left ? 2 : 0,
        r: layout.right ? 2 : 0
      },
      ports: {
        t: layout.top ? ['nav@TopBar'] : [],
        b: layout.bottom ? [] : [],
        l: layout.left ? ['nav@SidebarNav'] : [],
        r: layout.right ? [] : [],
        m: ['dashboard@Welcome'] // Default main content
      }
    }
  }
  
  return null
}

const staticRoutes: RouteRecordRaw[] = [
    {
        path: '/login',
        name: 'login',
        component: () => import('@/components/AppShell.vue'),
        beforeEnter: async (_to, _from, next) => {
            // For login page, get public config
            const { useLayoutStore } = await import('@/core/stores/layout')
            const layout = useLayoutStore()
            
            try {
                // Get public config for login page
                const response = await fetch(`/api/config?origin=${window.location.origin}`)
                const config = await response.json()
                
                // Register widget packs from public config
                if (config.widgetPacks) {
                    const { updateWidgetRegistry } = await import('@/core/widgets/registry')
                    const widgetPacksMap: Record<string, any> = {}
                    
                    config.widgetPacks.forEach((pack: any) => {
                        widgetPacksMap[pack.id] = pack
                    })
                    
                    updateWidgetRegistry(widgetPacksMap)
                }
                
                if (config.pages?.login?.layout) {
                    layout.applyManifest(config.pages.login.layout)
                } else {
                    throw new Error('No login layout in config')
                }
            } catch (error) {
                console.warn('[router] Public config failed, using fallback for login page:', error)
                // Fallback layout (using new compact format)
                layout.applyManifest({
                    bars: { t: 0, b: 0, l: 0, r: 0 },
                    ports: { 
                        m: ['auth@LoginForm']
                    }
                })
            }
            next()
        }
    },
    {
        path: '/forgot-password',
        name: 'forgot-password',
        component: () => import('@/components/AppShell.vue'),
        beforeEnter: async (_to, _from, next) => {
            // For forgot password page, get public config
            const { useLayoutStore } = await import('@/core/stores/layout')
            const layout = useLayoutStore()
            
            try {
                // Get public config for forgot password page
                const response = await fetch(`/api/config?origin=${window.location.origin}`)
                const config = await response.json()
                
                // Register widget packs from public config
                if (config.widgetPacks) {
                    const { updateWidgetRegistry } = await import('@/core/widgets/registry')
                    const widgetPacksMap: Record<string, any> = {}
                    
                    config.widgetPacks.forEach((pack: any) => {
                        widgetPacksMap[pack.id] = pack
                    })
                    
                    updateWidgetRegistry(widgetPacksMap)
                }
                
                if (config.pages?.['forgot-password']?.layout) {
                    layout.applyManifest(config.pages['forgot-password'].layout)
                } else {
                    throw new Error('No forgot-password layout in config')
                }
            } catch (error) {
                console.warn('[router] Public config failed, using fallback for forgot-password page:', error)
                // Fallback layout
                layout.applyManifest({
                    bars: { t: 0, b: 0, l: 0, r: 0 },
                    ports: { 
                        m: ['auth@ForgotPasswordForm']
                    }
                })
            }
            next()
        }
    },
    {
        path: '/test',
        name: 'test',
        component: () => import('@/components/AppShell.vue'),
        beforeEnter: async (_to, _from, next) => {
            const { useLayoutStore } = await import('@/core/stores/layout')
            const layout = useLayoutStore()
            
            try {
                // Try to get layout from auth config first
                const configLayout = await getPageLayoutFromConfig('/test')
                if (configLayout) {
                    console.log('[router] Using layout from auth config for test page')
                    layout.applyManifest(configLayout)
                } else {
                    throw new Error('No layout found in auth config')
                }
            } catch (error) {
                console.warn('[router] Backend layout failed, using fallback for test page:', error)
                // Fallback layout (using new compact format)
                const manifest = {
                    bars: { t: 2, b: 0, l: 2, r: 0 },
                    ports: {
                        t: ['nav@TopBar'],
                        l: ['nav@SidebarNav'],
                        m: ['dashboard@Welcome']
                    }
                }
                layout.applyManifest(manifest)
            }
            next()
        }
    },
    {
        path: '/admin/theme-editor',
        name: 'theme-editor',
        component: () => import('@/components/AppShell.vue'),
        beforeEnter: async (_to, _from, next) => {
            const { useLayoutStore } = await import('@/core/stores/layout')
            const layout = useLayoutStore()
            
            try {
                // Try to get layout from auth config first
                const configLayout = await getPageLayoutFromConfig('/admin/theme-editor')
                if (configLayout) {
                    console.log('[router] Using layout from auth config for theme editor page')
                    layout.applyManifest(configLayout)
                } else {
                    throw new Error('No layout found in auth config')
                }
            } catch (error) {
                console.warn('[router] Backend layout failed, using fallback for theme editor page:', error)
                // Fallback layout (using new compact format)
                const manifest = {
                    bars: { t: 2, b: 0, l: 2, r: 0 },
                    ports: {
                        t: ['nav@TopBar'],
                        l: ['nav@SidebarNav'],
                        m: ['theme@ThemeEditor']
                    }
                }
                layout.applyManifest(manifest)
            }
            next()
        },
        meta: { requiresAuth: true, requiresRole: 'SUPERADMIN' }
    },
    {
        path: '/',
        name: 'home',
        component: () => import('@/components/AppShell.vue'),
        beforeEnter: async (_to, _from, next) => {
            const { useLayoutStore } = await import('@/core/stores/layout')
            const layout = useLayoutStore()
            
            try {
                // Try to get layout from auth config first
                const configLayout = await getPageLayoutFromConfig('/')
                if (configLayout) {
                    console.log('[router] Using layout from auth config for home page')
                    layout.applyManifest(configLayout)
                } else {
                    throw new Error('No layout found in auth config')
                }
            } catch (error) {
                console.warn('[router] Backend layout failed, using fallback for home page:', error)
                // Fallback layout (using new compact format)
                const manifest = {
                    bars: { t: 2, b: 0, l: 2, r: 0 },
                    ports: {
                        t: ['nav@TopBar'],
                        l: ['nav@SidebarNav'],
                        m: ['dashboard@Welcome']
                    }
                }
                layout.applyManifest(manifest)
            }
            next()
        },
        meta: { requiresAuth: true }
    },
    {
        path: '/:pathMatch(.*)*',
        name: 'not-found',
        component: () => import('@/pages/NotFound.vue')
    }
]


const router = createRouter({
    history: createWebHistory(),
    routes: staticRoutes
})

/**
 * Registriert dynamische Routen aus Discovery-Store.
 * Wird nach erfolgreichem Login aufgerufen.
 */
export async function initDynamicRoutes() {
    await registerDynamicRoutes(router)
}

// Guards anhängen
router.beforeEach(guards.beforeEach)
router.afterEach(guards.afterEach)

export default router

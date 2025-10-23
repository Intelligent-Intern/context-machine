// src/core/routing/routes.ts
import type { RouteRecordRaw, Router } from 'vue-router'
import { useDiscoveryStore } from '@/core/stores/discovery'
import { useLayoutStore } from '@/core/stores/layout'

/**
 * Baut dynamische Routen aus den geladenen Page-Manifests.
 */
export function buildDynamicRoutes(): RouteRecordRaw[] {
  const discovery = useDiscoveryStore()
  const layout = useLayoutStore()

  const routes: RouteRecordRaw[] = []

  for (const pageId in discovery.pages) {
    const pg = discovery.pages[pageId]

    routes.push({
      path: pg.route,
      name: pg.id,
      component: () => import('@/components/AppShell.vue'), // Container
      beforeEnter: (to, _from, next) => {
        layout.applyManifest(pg)
        next()
      },
      meta: {
        permissions: pg.permissions || [],
        module: pg.module || null
      }
    })
  }

  return routes
}

/**
 * Registriert dynamische Routen am Router, falls noch nicht vorhanden.
 */
export async function registerDynamicRoutes(router: Router) {
  const discovery = useDiscoveryStore()
  


  for (const pageRoute in discovery.pages) {
    const pg = discovery.pages[pageRoute]
    const routeName = pg.id
    
    if (!router.hasRoute(routeName)) {
      
      router.addRoute({
        path: pg.route,
        name: routeName,
        component: () => import('@/components/AppShell.vue'),
        beforeEnter: async (to, _from, next) => {
          
          const layout = useLayoutStore()
          
          // Apply layout configuration from page
          layout.applyManifest(pg)
          
          // Populate ports with widgets from modules
          await populatePagePorts(pg)
          
          next()
        },
        meta: {
          permissions: pg.permissions || [],
          module: pg.module || null,
          pageConfig: pg
        }
      })
    } else {
      // Route already exists, skipping
    }
  }
}

/**
 * Populates page ports with widgets based on modules and backend configuration
 */
async function populatePagePorts(page: any) {
  const discovery = useDiscoveryStore()
  
  // Get widgets from modules for this page
  const pageWidgets: any = {
    top: [],
    bottom: [],
    left: [],
    right: [],
    main: []
  }
  
  // Process modules to find widgets for this page
  for (const moduleId in discovery.modules) {
    const module = discovery.modules[moduleId]
    
    if (module.widgets && Array.isArray(module.widgets)) {
      module.widgets.forEach((widgetRef: string, index: number) => {
        // Determine port based on page layout and widget type
        let port = 'main' // default
        
        if (widgetRef.includes('TopBar') && page.bars?.top > 0) {
          port = 'top'
        } else if (widgetRef.includes('Welcome')) {
          port = 'main'
        }
        
        pageWidgets[port].push({
          slot: index + 1,
          widget: widgetRef
        })
      })
    }
  }
  
  // Add navigation to left sidebar if it's visible
  if (page.bars?.left > 0) {
    pageWidgets.left.push({
      slot: 1,
      widget: 'navigation@Navigation'
    })
  }
  
  // Update page ports
  page.ports = {
    ...page.ports,
    ...pageWidgets
  }
}

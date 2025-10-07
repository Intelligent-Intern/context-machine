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

  for (const pageId in discovery.pages) {
    if (!router.hasRoute(pageId)) {
      const pg = discovery.pages[pageId]
      router.addRoute({
        path: pg.route,
        name: pg.id,
        component: () => import('@/components/AppShell.vue'),
        beforeEnter: (to, _from, next) => {
          const layout = useLayoutStore()
          layout.applyManifest(pg)
          next()
        },
        meta: {
          permissions: pg.permissions || [],
          module: pg.module || null
        }
      })
    }
  }
}

// src/site/init.ts
import router from '@/core/routing'
import { useDiscoveryStore } from '@/core/stores/discovery'
import { useLayoutStore } from '@/core/stores/layout'
import { validateManifest, normalizePage } from '@/core/discovery/manifest-loader'
import { registerWidgetPack } from '@/core/widgets/registry'

export async function initSite() {
  const domain = (import.meta.env.VITE_SITE_DOMAIN as string) || 'intelligent-intern.com'
  console.info('[site] initSite start', domain)

  // Manifeste laden
  const siteManifests = import.meta.glob('/page/**/manifest/site.json', { eager: true, import: 'default' })
  const site = siteManifests[`/page/${domain}/manifest/site.json`] as any
  if (!site) {
    console.warn('[site] no site manifest for', domain)
    return
  }
  console.info('[site] manifest loaded', site)

  // Widget-Pack "site" registrieren (Widgets + TopNav als Widget)
  const widgetLoaders: Record<string, () => Promise<any>> = {}
  const widgets = import.meta.glob('/page/**/widgets/*.vue')
  const components = import.meta.glob('/page/**/components/*.vue')

  for (const p in widgets) {
    if (p.startsWith(`/page/${domain}/widgets/`)) {
      const key = p.split('/').pop()!.replace('.vue', '')
      widgetLoaders[key] = widgets[p] as any
      console.info('[site] widget registered', key, p)
    }
  }
  const topNavPath = `/page/${domain}/components/TopNav.vue`
  if (components[topNavPath]) {
    widgetLoaders['TopNav'] = components[topNavPath] as any
    console.info('[site] TopNav registered', topNavPath)
  }

  registerWidgetPack('site', widgetLoaders)
  console.info('[site] widget pack registered', Object.keys(widgetLoaders))

  // Pages registrieren
  const discovery = useDiscoveryStore()
  const layout = useLayoutStore()

  for (const raw of site.pages || []) {
    if (!validateManifest('page', raw)) {
      console.warn('[site] invalid page manifest skipped', raw)
      continue
    }
    const pg = normalizePage(raw)
    discovery.pages[pg.id] = pg
    console.info('[site] page normalized and added to discovery', pg.id, pg.route)

    if (!router.hasRoute(pg.id)) {
      router.addRoute({
        path: pg.route,
        name: pg.id,
        component: () => import('@/components/AppShell.vue'),
        beforeEnter: (to, _from, next) => {
          console.info('[site] beforeEnter for', to.fullPath, '→ applying manifest', pg.id)
          layout.applyManifest(pg)
          next()
        }
      })
      console.info('[site] route added', pg.id, pg.route)
    }

    // **NEU**: Wenn die aktuelle Route bereits diese Page ist → Manifest sofort anwenden
    if (router.currentRoute.value.path === pg.route) {
      console.info('[site] applying manifest immediately for active route', pg.id)
      layout.applyManifest(pg)
    }
  }

  console.info('[site] total pages registered', Object.keys(discovery.pages).length)
}

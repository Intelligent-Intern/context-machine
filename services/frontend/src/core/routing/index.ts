import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { registerDynamicRoutes } from './routes'
import guards from './guards'

const staticRoutes: RouteRecordRaw[] = [
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

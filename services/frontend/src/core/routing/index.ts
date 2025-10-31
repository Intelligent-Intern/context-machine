// src/core/routing/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

/**
 * Minimal routing system with fallback
 * - /login: Always available (fallback when backend unavailable)
 * - Dynamic routes: Registered after login from backend config
 */

// Minimal static routes - only what's absolutely necessary
const staticRoutes: RouteRecordRaw[] = [
    // Login route - uses fallback config when backend unavailable
    {
        path: '/login',
        name: 'login',
        component: () => import('@/core/layout/AppShell.vue'),
        beforeEnter: async (_to, _from, next) => {
            // Check if user is already authenticated
            const { useAuthStore } = await import('@/core/stores/auth')
            const authStore = useAuthStore()
            
            if (authStore.isAuthenticated && authStore.isTokenValid) {
                // User is already logged in - redirect to home
                console.log('[router] User already authenticated, redirecting to home')
                next('/')
                return
            }
            
            // Apply fallback layout for login (all bars hidden, auth widget only)
            const { initFallbackConfig } = await import('@/site/init')
            await initFallbackConfig()
            next()
        }
    },
    
    // Logout route - clears session and redirects to login
    {
        path: '/logout',
        name: 'logout',
        beforeEnter: async (_to, _from, next) => {
            // Perform logout
            const { useAuthStore } = await import('@/core/stores/auth')
            const authStore = useAuthStore()
            await authStore.logout()
            
            // Redirect to login
            next('/login')
        }
    },
    
    // Forgot password route - public access
    {
        path: '/forgot-password',
        name: 'forgot-password',
        component: () => import('@/core/layout/AppShell.vue'),
        beforeEnter: async (_to, _from, next) => {
            // Apply fallback config for forgot password page
            const { initForgotPasswordConfig } = await import('@/site/init')
            await initForgotPasswordConfig()
            next()
        }
    },
    
    // Root route - show dashboard for authenticated users
    {
        path: '/',
        name: 'home',
        component: () => import('@/core/layout/AppShell.vue'),
        beforeEnter: async (_to, _from, next) => {
            const { useAuthStore } = await import('@/core/stores/auth')
            const authStore = useAuthStore()
            
            if (!authStore.isAuthenticated || !authStore.isTokenValid) {
                // Not authenticated - redirect to login
                console.log('[router] Not authenticated, redirecting to login')
                next('/login')
                return
            }
            
            // User is authenticated - just proceed without additional logic
            console.log('[router] Accessing home page')
            next()
        }
    },
    
    // 404 fallback - redirect unknown routes to login
    {
        path: '/:pathMatch(.*)*',
        name: 'not-found',
        redirect: '/login'
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes: staticRoutes
})

/**
 * Registers dynamic routes from auth config after successful login
 * Called by auth store after login response is received
 */
export async function registerDynamicRoutes(routes: Array<{
    route: string
    name: string
    layout: any
}>) {
    console.log('[router] Registering dynamic routes:', routes.length)
    
    // Clear existing dynamic routes (keep only static ones)
    const staticRouteNames = ['login', 'forgot-password', 'not-found']
    router.getRoutes().forEach(route => {
        if (route.name && !staticRouteNames.includes(route.name as string)) {
            router.removeRoute(route.name)
        }
    })
    
    // Register routes from auth config
    routes.forEach(routeConfig => {
        if (router.hasRoute(routeConfig.route)) {
            console.warn(`[router] Route ${routeConfig.route} already exists, skipping`)
            return
        }
        
        router.addRoute({
            path: routeConfig.route,
            name: routeConfig.route.replace('/', '') || 'home',
            component: () => import('@/core/layout/AppShell.vue'),
            beforeEnter: async (to, _from, next) => {
                console.log(`[router] Entering route: ${to.path}`)
                
                // Apply layout from config
                const { useLayoutStore } = await import('@/core/stores/layout')
                const layoutStore = useLayoutStore()
                
                if (routeConfig.layout) {
                    layoutStore.applyConfig(routeConfig.layout)
                } else {
                    // Fallback: all bars hidden, empty main
                    layoutStore.applyFallbackConfig()
                }
                
                // Request page content via message API
                await loadPageContent(routeConfig.route)
                
                next()
            },
            meta: { requiresAuth: true }
        })
        
        console.log(`[router] Registered dynamic route: ${routeConfig.route}`)
    })
    
    // Redirect root to first available route or login
    if (routes.length > 0) {
        const homeRoute = routes.find(r => r.route === '/') || routes[0]
        router.addRoute({
            path: '/',
            redirect: homeRoute.route
        })
    }
}

/**
 * Loads page content via message API when route becomes active
 */
async function loadPageContent(route: string) {
    try {
        const { sendMessage } = await import('@/core/messaging/api')
        
        // Send message to backend - response will come via WebSocket
        await sendMessage('page.content.load', { route })
        
        console.log(`[router] Page content request sent for: ${route}`)
    } catch (error) {
        console.error(`[router] Failed to request page content for ${route}:`, error)
        // Continue without content - layout is already applied
    }
}

/**
 * Navigation guard for authentication
 */
router.beforeEach(async (to, from, next) => {
    // Allow access to public pages
    if (to.path === '/login' || to.path === '/forgot-password') {
        next()
        return
    }
    
    // Check authentication for protected routes
    try {
        const { useAuthStore } = await import('@/core/stores/auth')
        const authStore = useAuthStore()
        
        if (!authStore.isAuthenticated || !authStore.isTokenValid) {
            // Not authenticated - redirect to login
            console.log('[router] Not authenticated, redirecting to login')
            next('/login')
            return
        }
        
        // Authenticated - allow access
        next()
    } catch (error) {
        console.error('[router] Auth check failed:', error)
        next('/login')
    }
})

/**
 * Clear all dynamic routes and redirect to login
 * Called when user logs out or API is unavailable
 */
export function clearDynamicRoutes() {
    console.log('[router] Clearing dynamic routes')
    
    const staticRouteNames = ['login', 'forgot-password', 'not-found']
    router.getRoutes().forEach(route => {
        if (route.name && !staticRouteNames.includes(route.name as string)) {
            router.removeRoute(route.name)
        }
    })
    
    // Redirect to login
    router.push('/login')
}

export default router
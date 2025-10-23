import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import { useAuthStore } from '@/core/stores/auth'

function beforeEach(
  to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext
) {
  const auth = useAuthStore()

  // Try to restore session on first navigation
  if (!auth.isAuthenticated) {
    auth.restoreSession()
  }

  // Public routes that don't require authentication
  const publicRoutes = ['login', 'forgot-password', 'not-found', 'test']

  // If route is public, allow access
  if (publicRoutes.includes(to.name as string)) {
    return next()
  }

  // Check if user is authenticated and token is valid
  if (!auth.isAuthenticated || !auth.isTokenValid) {
    // Clear invalid session
    if (auth.accessToken && !auth.isTokenValid) {
      auth.logout()
    }
    
    // Redirect to login
    return next({ name: 'login' })
  }

  // Check role-based access
  if (to.meta.requiresRole) {
    const requiredRole = to.meta.requiresRole as string
    const userRole = auth.user?.role
    
    if (!userRole || userRole !== requiredRole) {
      console.warn(`[router] Access denied: required role ${requiredRole}, user has ${userRole}`)
      // Redirect to home or show access denied
      return next({ name: 'home' })
    }
  }

  // User is authenticated and has required role, allow access
  return next()
}

function afterEach(to: RouteLocationNormalized) {

}

export default { beforeEach, afterEach }

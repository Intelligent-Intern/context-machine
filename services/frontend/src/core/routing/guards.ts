import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import { useAuthStore } from '@/core/stores/auth'
import { usePermissionStore } from '@/core/stores/permissions'

function beforeEach(
    to: RouteLocationNormalized,
    _from: RouteLocationNormalized,
    next: NavigationGuardNext
) {
  const auth = useAuthStore()
  const perms = usePermissionStore()

  // Kein Token → Login erzwingen (außer Home/NotFound)
  if (!auth.accessToken) {
    if (to.name === 'home' || to.name === 'not-found') {
      return next()
    }
    return auth.login()
  }

  // Permissions prüfen
  const required = (to.meta?.permissions as string[]) || []
  for (const p of required) {
    if (!perms.has(p)) {
      console.warn(`[router] blocked navigation, missing permission: ${p}`)
      return next({ name: 'not-found' })
    }
  }

  return next()
}

function afterEach(to: RouteLocationNormalized) {
  console.info(`[router] navigated to ${to.fullPath}`)
}

export default { beforeEach, afterEach }

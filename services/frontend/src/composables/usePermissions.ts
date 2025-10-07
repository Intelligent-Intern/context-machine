import { computed } from 'vue'
import { useAuthStore } from '@/core/stores/auth'

/**
 * usePermissions composable
 *
 * Provides helpers to check RBAC permissions and feature flags.
 * Integrates with Auth store which holds current user roles and policies.
 *
 * Example:
 * const { can, hasRole } = usePermissions()
 * if (can('workflow:delete')) { ... }
 */

export function usePermissions() {
    const auth = useAuthStore()

    const roles = computed(() => auth.roles)
    const permissions = computed(() => auth.permissions)
    const features = computed(() => auth.features)

    function hasRole(role: string) {
        return roles.value.includes(role)
    }

    function can(permission: string) {
        return permissions.value.includes(permission)
    }

    function featureEnabled(flag: string) {
        return features.value.includes(flag)
    }

    /**
     * Higher-order guard for actions.
     */
    function guard<T>(permission: string, action: () => T): T | null {
        if (can(permission)) {
            return action()
        }
        console.warn(`Permission denied: ${permission}`)
        return null
    }

    return {
        roles,
        permissions,
        features,
        hasRole,
        can,
        featureEnabled,
        guard,
    }
}

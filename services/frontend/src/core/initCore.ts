// src/core/initCore.ts
import { useDiscoveryStore } from '@/core/stores/discovery'
import { useLayoutStore } from '@/core/stores/layout'
import { useThemeStore } from '@/core/stores/theme'
import { useUserStateStore } from '@/core/stores/userState'
import { usePermissionStore } from '@/core/stores/permissions'
import { useNotificationStore } from '@/core/stores/notification'
import { useAuditStore } from '@/core/stores/audit'
import { useErrorStore } from '@/core/stores/error'
import { initI18nHandlers, loadPersistedLocale } from '@/core/i18n'
import { connectWebSocket } from '@/core/messaging/ws/socket'

/**
 * Initialisiert alle Core-Stores und Messaging-Handler.
 * Wird einmalig beim App-Start aufgerufen (z. B. in main.ts).
 */
export function initCore() {
    // ErrorStore zuerst, damit Fehler früh gefangen werden
    const errorStore = useErrorStore()
    errorStore.initHandlers()

    // Discovery (Pages, Modules, WidgetPacks)
    const discovery = useDiscoveryStore()
    discovery.initHandlers()

    // Layout
    const layout = useLayoutStore()
    layout.initHandlers()
    layout.loadSizes()
    layout.applyResponsiveDefaults()

    // Theme
    const theme = useThemeStore()
    theme.initHandlers()
    theme.loadPersisted()

    // UserState
    const userState = useUserStateStore()
    userState.initHandlers()

    // Permissions
    const permissions = usePermissionStore()
    permissions.initHandlers()

    // i18n
    initI18nHandlers()
    loadPersistedLocale()

    // Notifications
    const notifications = useNotificationStore()
    notifications.initListeners()

    // Audit
    const audit = useAuditStore()
    audit.initListeners()

    // WebSocket-Verbindung starten
    connectWebSocket()

    console.info('[core] initialization complete')
}

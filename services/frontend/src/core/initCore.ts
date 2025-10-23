// src/core/initCore.ts
import { watch } from 'vue'
import { useAuthStore } from '@/core/stores/auth'
import { useDiscoveryStore } from '@/core/stores/discovery'
import { useLayoutStore } from '@/core/stores/layout'
import { useThemeStore } from '@/core/stores/theme'
import { useUserStateStore } from '@/core/stores/userState'
import { usePermissionStore } from '@/core/stores/permissions'
import { useNotificationStore } from '@/core/stores/notification'
import { useAuditStore } from '@/core/stores/audit'
import { useErrorStore } from '@/core/stores/error'
import { useStreamingStore } from '@/core/stores/streaming'
import { initI18nHandlers, loadPersistedLocale } from '@/core/i18n'
import { connectWebSocket } from '@/core/messaging/ws/socket'
import { initMessageHandlers } from '@/core/messaging/api'
import { initDynamicRoutes } from '@/core/routing'

/**
 * Initialisiert alle Core-Stores und Messaging-Handler.
 * Wird einmalig beim App-Start aufgerufen (z. B. in main.ts).
 */
export async function initCore() {
    // ErrorStore zuerst, damit Fehler früh gefangen werden
    const errorStore = useErrorStore()
    errorStore.initHandlers()

    // Auth - Session wiederherstellen
    const auth = useAuthStore()
    await auth.initialize()
    
    if (auth.isAuthenticated && auth.isTokenValid) {
        // Wenn Session wiederhergestellt wurde, dynamische Routen initialisieren
        initDynamicRoutes()
    }

    // Discovery (Pages, Modules, WidgetPacks)
    const discovery = useDiscoveryStore()
    discovery.initHandlers()

    // Watch for discovery config changes to trigger router updates
    watch(
        () => discovery.isConfigLoaded,
        (isLoaded) => {
            if (isLoaded) {
                initDynamicRoutes()
            }
        }
    )

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

    // Message handlers for real-time communication
    initMessageHandlers()

    // Notifications
    const notifications = useNotificationStore()
    notifications.initListeners()

    // Audit
    const audit = useAuditStore()
    audit.initListeners()

    // Streaming
    const streaming = useStreamingStore()
    streaming.initHandlers()

    // WebSocket-Verbindung starten
    connectWebSocket()


}

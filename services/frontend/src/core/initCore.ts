// src/core/initCore.ts
import { ref } from 'vue'
import { useAuthStore } from '@/core/stores/auth'
import { useLayoutStore } from '@/core/stores/layout'
import { useNotificationStore } from '@/core/stores/notification'
import { registerWidgetPack } from '@/core/widgets/registry'
import defaultConfig from './default.json'

// Global loading state
export const isLoading = ref(true)
export const loadingMessage = ref('Initializing...')

/**
 * Initialisiert alle Core-Stores und Messaging-Handler.
 * Wird einmalig beim App-Start aufgerufen (z. B. in main.ts).
 */
export async function initCore() {
    console.log('[core] Initializing core system...')
    
    try {
        // Auth Store - Session wiederherstellen
        const auth = useAuthStore()
        const isAuthenticated = await auth.initialize()

        // Immer Auth Widget registrieren (für Login/Logout)
        await registerAuthWidget()

        // Immer Dashboard Widget registrieren (für eingeloggte User)
        await registerDashboardWidget()

        // Immer Navigation Widget registrieren (für Sidebars)
        await registerNavigationWidget()

        if (isAuthenticated) {
            loadingMessage.value = 'Loading user configuration...'
            // User ist eingeloggt - Config sollte schon da sein
            console.log('[core] User authenticated, using backend config')
        } else {
            loadingMessage.value = 'Loading default configuration...'
            // Nicht eingeloggt - Default Config laden
            await loadDefaultConfig()
            
            // Theme von Config API laden (nur für nicht-eingeloggte User)
            await loadThemeFromConfigAPI()
        }

        // Layout Store - Größen laden und Message Handler initialisieren
        const layout = useLayoutStore()
        layout.initialize()

        // Notification Store - Message Handler initialisieren
        const notifications = useNotificationStore()
        notifications.initListeners()

        // WebSocket-Verbindung starten (falls vorhanden)
        try {
            const { connectWebSocket } = await import('@/core/messaging/ws/socket')
            connectWebSocket()
        } catch (error) {
            console.warn('[core] WebSocket module not available:', error)
        }

        console.log('[core] Core system initialized')
    } catch (error) {
        console.error('[core] Initialization failed:', error)
        loadingMessage.value = 'Initialization failed'
    } finally {
        // Loading beenden nach 100ms delay für smooth transition
        setTimeout(() => {
            isLoading.value = false
        }, 100)
    }
}

/**
 * Registriert Auth Widget (immer nötig für Login/Logout)
 */
async function registerAuthWidget() {
    try {
        console.log('[core] Registering auth widgets')
        registerWidgetPack('auth', {
            LoginForm: () => import('/src/widget-packs/auth/widgets/LoginForm.vue'),
            ForgotPasswordForm: () => import('/src/widget-packs/auth/widgets/ForgotPasswordForm.vue')
        })
        console.log('[core] Auth widgets registered')
    } catch (error) {
        console.error('[core] Failed to register auth widgets:', error)
    }
}

/**
 * Registriert Dashboard Widget (für eingeloggte User)
 */
async function registerDashboardWidget() {
    try {
        console.log('[core] Registering dashboard widgets')
        registerWidgetPack('dashboard', {
            Default: () => import('/src/widget-packs/dashboard/widgets/Default.vue')
        })
        console.log('[core] Dashboard widgets registered')
    } catch (error) {
        console.error('[core] Failed to register dashboard widgets:', error)
    }
}

/**
 * Registriert Navigation Widget (für Sidebars)
 */
async function registerNavigationWidget() {
    try {
        console.log('[core] Registering navigation widgets')
        registerWidgetPack('navigation', {
            LeftNav: () => import('/src/widget-packs/navigation/widgets/LeftNav.vue'),
            TopBar: () => import('/src/widget-packs/navigation/widgets/TopBar.vue')
        })
        console.log('[core] Navigation widgets registered')
    } catch (error) {
        console.error('[core] Failed to register navigation widgets:', error)
    }
}

/**
 * Lädt Default Config wenn nicht eingeloggt
 */
async function loadDefaultConfig() {
    try {
        console.log('[core] Loading default config for unauthenticated user')
        
        // Widget Packs aus Default Config registrieren
        if (defaultConfig.widgetPacks) {
            defaultConfig.widgetPacks.forEach(pack => {
                const components: Record<string, () => Promise<any>> = {}
                
                Object.entries(pack.components).forEach(([name, config]) => {
                    // Convert @/ alias to /src/ for dynamic imports
                    const path = config.path.replace('@/', '/src/')
                    components[name] = () => import(/* @vite-ignore */ path)
                })
                
                registerWidgetPack(pack.id, components)
                console.log(`[core] Registered default widget pack: ${pack.id}`)
            })
        }
        


        // Layout aus Default Config anwenden
        const layout = useLayoutStore()
        if (defaultConfig.routes && defaultConfig.routes.length > 0) {
            layout.applyConfig(defaultConfig.routes[0].layout)
        }

    } catch (error) {
        console.error('[core] Failed to load default config:', error)
    }
}

/**
 * Lädt Theme von Config API mit Timeout
 */
async function loadThemeFromConfigAPI() {
    try {
        loadingMessage.value = 'Loading theme...'
        
        // 3 Sekunden Timeout für Config API
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000)
        
        const response = await fetch('/api/config', {
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json'
            }
        })
        
        clearTimeout(timeoutId)
        
        if (response.ok) {
            const config = await response.json()
            
            if (config.theme) {
                // Theme CSS anwenden
                applyThemeCSS(config.theme)
                console.log('[core] Theme loaded from config API')
            }
        } else {
            console.warn('[core] Config API returned error:', response.status)
        }
        
    } catch (error) {
        if (error.name === 'AbortError') {
            console.warn('[core] Config API timeout after 3 seconds')
        } else {
            console.warn('[core] Failed to load theme from config API:', error)
        }
        // Weiter mit Default Theme
    }
}

/**
 * Wendet Theme CSS an
 */
function applyThemeCSS(css: string) {
    // Entferne existierende Theme Styles
    const existingStyle = document.getElementById('config-theme-styles')
    if (existingStyle) {
        existingStyle.remove()
    }
    
    // Neues Style Element erstellen
    const styleElement = document.createElement('style')
    styleElement.id = 'config-theme-styles'
    styleElement.textContent = css
    document.head.appendChild(styleElement)
}

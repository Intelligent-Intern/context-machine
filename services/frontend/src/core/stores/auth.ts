// src/core/stores/auth.ts
import { defineStore } from 'pinia'
import { jwtDecode } from 'jwt-decode'

interface DecodedToken {
  exp: number
  sub: string
  username?: string
  role?: string
  permissions?: string[]
  [key: string]: any
}

interface User {
  id: string
  username: string
  name: string
  email: string
  role: string
}

interface AuthConfig {
  lang: string
  theme: string
  routes: Array<{
    route: string
    name: string
    layout: {
      bars: { t: number, b: number, l: number, r: number }
      ports?: Record<string, string[]>
    }
  }>
  styles?: string
  widgetPacks?: Array<{
    id: string
    name?: string
    version?: string
    components: Record<string, { path: string }>
  }>
}

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: User | null
  config: AuthConfig | null
  isLoading: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    accessToken: null,
    refreshToken: null,
    user: null,
    config: null,
    isLoading: false
  }),

  getters: {
    isAuthenticated: (state) => !!state.accessToken && !!state.user,
    
    isTokenValid: (state) => {
      if (!state.accessToken) return false
      
      try {
        const decoded = jwtDecode<DecodedToken>(state.accessToken)
        const now = Date.now() / 1000
        return decoded.exp > now
      } catch {
        return false
      }
    },

    userPermissions: (state) => {
      if (!state.accessToken) return []
      
      try {
        const decoded = jwtDecode<DecodedToken>(state.accessToken)
        return decoded.permissions || []
      } catch {
        return []
      }
    }
  },

  actions: {
    async loginWithCredentials(username: string, password: string): Promise<boolean> {
      this.isLoading = true
      
      try {
        console.log('[auth] Sending login request:', { username, password: '***' })
        
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username, password })
        })

        console.log('[auth] Login response status:', response.status)
        console.log('[auth] Login response headers:', Object.fromEntries(response.headers.entries()))

        if (!response.ok) {
          let errorMessage = 'Login failed'
          try {
            const error = await response.json()
            errorMessage = error.error || errorMessage
          } catch (e) {
            console.error('[auth] Failed to parse error response:', e)
            errorMessage = `HTTP ${response.status}: ${response.statusText}`
          }
          throw new Error(errorMessage)
        }

        const responseText = await response.text()
        console.log('[auth] Raw response text:', responseText)
        
        let data
        try {
          data = JSON.parse(responseText)
          console.log('[auth] Parsed response data:', data)
        } catch (parseError) {
          console.error('[auth] Failed to parse JSON response:', parseError)
          throw new Error('Invalid JSON response from server')
        }
        
        // Check for configuration errors
        if (data.error === 'CONFIG_ERROR') {
          console.error('[auth] Configuration error:', data.error_type, data.message)
          
          // Store user info but no config
          this.user = data.user
          localStorage.setItem('auth_user', JSON.stringify(data.user))
          
          // Show appropriate error message based on error type
          const { useNotificationStore } = await import('./notification')
          const notifications = useNotificationStore()
          
          if (data.error_type === 'ADMIN_CONFIG_MISSING') {
            notifications.showError('Fatal Error', 'Admin-Konfiguration fehlt. Das System ist nicht vollständig eingerichtet.', 0)
          } else if (data.error_type === 'SYSTEM_NOT_CONFIGURED') {
            notifications.showError('System Error', 'System ist nicht konfiguriert. Bitte wenden Sie sich an den Administrator.', 0)
          } else if (data.error_type === 'DATABASE_ERROR') {
            notifications.showError('Service Error', 'Unser Service ist aktuell nicht erreichbar. Bitte versuchen Sie es später erneut.', 0)
          } else {
            notifications.showError('Configuration Error', data.message, 0)
          }
          
          // Don't proceed with login - stay on login page
          throw new Error(data.message)
        }
        
        // Normal login flow - store tokens and user data
        this.accessToken = data.token
        this.refreshToken = data.refreshToken
        this.user = data.user
        this.config = data.config

        // Store in localStorage for persistence
        localStorage.setItem('auth_token', data.token)
        if (data.refreshToken) {
          localStorage.setItem('refresh_token', data.refreshToken)
        }
        localStorage.setItem('auth_user', JSON.stringify(data.user))
        localStorage.setItem('auth_config', JSON.stringify(data.config))

        // Make token available for messaging API
        ;(window as any).__AUTH_STORE__ = { accessToken: data.token }

        // Distribute config to other stores
        await this.distributeConfig(data.config)

        return true
      } catch (error) {
        console.error('[auth] Login error:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async refreshAccessToken(): Promise<boolean> {
      if (!this.refreshToken) {
        return false
      }

      try {
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ refreshToken: this.refreshToken })
        })

        if (!response.ok) {
          throw new Error('Token refresh failed')
        }

        const data = await response.json()
        
        this.accessToken = data.token
        if (data.refreshToken) {
          this.refreshToken = data.refreshToken
        }

        // Update localStorage
        localStorage.setItem('auth_token', data.token)
        if (data.refreshToken) {
          localStorage.setItem('refresh_token', data.refreshToken)
        }

        // Update messaging API token
        ;(window as any).__AUTH_STORE__ = { accessToken: data.token }

        return true
      } catch (error) {
        console.error('[auth] Token refresh error:', error)
        this.logout()
        return false
      }
    },

    async distributeConfig(config: AuthConfig) {
      try {
        // Apply theme and styles
        if (config.styles) {
          this.applyDatabaseStyles(config.styles)
        }

        // Handle new simplified config structure
        if (config.page && config.page.length > 0) {
          // Apply layout from first page
          const { useLayoutStore } = await import('./layout')
          const layoutStore = useLayoutStore()
          layoutStore.applyConfig(config.page[0].layout)
          
          // Register routes (simplified - just the page routes)
          const routes = config.page.map(page => ({
            route: page.route,
            name: page.name,
            layout: page.layout
          }))
          await this.registerDynamicRoutes(routes)
        } else {
          // Fallback for old config structure
          if (config.routes) {
            await this.registerDynamicRoutes(config.routes)
          }

          const { useLayoutStore } = await import('./layout')
          const layoutStore = useLayoutStore()
          
          if (config.routes && config.routes.length > 0) {
            layoutStore.applyConfig(config.routes[0].layout)
          } else {
            layoutStore.applyFallbackConfig()
          }
        }

        console.log('[auth] Config distributed to stores')
      } catch (error) {
        console.error('[auth] Error distributing config:', error)
      }
    },

    async registerDynamicRoutes(routes: AuthConfig['routes']) {
      try {
        const { registerDynamicRoutes } = await import('@/core/routing')
        await registerDynamicRoutes(routes)
        console.log('[auth] Dynamic routes registered:', routes.length)
      } catch (error) {
        console.error('[auth] Error registering dynamic routes:', error)
      }
    },

    async loadPageContent(route: string) {
      try {
        const { sendMessage } = await import('@/core/messaging/api')
        
        // Send message to backend - response will come via WebSocket
        await sendMessage('page.content.load', { route })
        
        console.log(`[auth] Page content request sent for: ${route}`)
      } catch (error) {
        console.error(`[auth] Failed to request page content for ${route}:`, error)
      }
    },

    applyDatabaseStyles(css: string) {
      // Remove existing database styles
      const existingStyle = document.getElementById('database-styles')
      if (existingStyle) {
        existingStyle.remove()
      }
      
      // Create new style element
      const styleElement = document.createElement('style')
      styleElement.id = 'database-styles'
      styleElement.textContent = css
      document.head.appendChild(styleElement)
    },

    restoreSession() {
      try {
        const token = localStorage.getItem('auth_token')
        const refreshToken = localStorage.getItem('refresh_token')
        const user = localStorage.getItem('auth_user')
        const config = localStorage.getItem('auth_config')

        if (token && user && config) {
          // Check if token is still valid
          const decoded = jwtDecode<DecodedToken>(token)
          const now = Date.now() / 1000
          
          if (decoded.exp > now) {
            this.accessToken = token
            this.refreshToken = refreshToken
            this.user = JSON.parse(user)
            this.config = JSON.parse(config)
            
            // Make token available for messaging API
            ;(window as any).__AUTH_STORE__ = { accessToken: token }
            
            // Distribute config to stores
            this.distributeConfig(this.config)
            
            return true
          } else {
            // Token expired, try refresh
            if (refreshToken) {
              this.refreshToken = refreshToken
              return this.refreshAccessToken()
            } else {
              this.clearStorage()
            }
          }
        }
      } catch (error) {
        console.error('[auth] Session restore error:', error)
        this.clearStorage()
      }
      
      return false
    },

    async logout() {
      this.accessToken = null
      this.refreshToken = null
      this.user = null
      this.config = null
      this.clearStorage()
      
      // Clear messaging API token
      ;(window as any).__AUTH_STORE__ = null
      
      // Clear dynamic routes and redirect to login
      try {
        const { clearDynamicRoutes } = await import('@/core/routing')
        clearDynamicRoutes()
      } catch (error) {
        console.error('[auth] Error clearing routes on logout:', error)
      }
    },

    clearStorage() {
      // Clear all localStorage completely to ensure clean logout
      localStorage.clear()
      console.log('[auth] localStorage cleared completely')
    },

    async initialize() {
      return this.restoreSession()
    }
  }
})
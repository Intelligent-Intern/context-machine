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

interface FrontendConfig {
  modules: Array<{
    id: string
    name: string
    widgets: string[]
  }>
  pages: Array<{
    route: string
    name: string
    layout: Record<string, boolean>
    ports?: Record<string, Array<{
      slot: number
      widget: string
      bind?: string
      visibleWhen?: string
    }>>
  }>
  widgetPacks: Array<{
    id: string
    name?: string
    version?: string
    components: Record<string, { path: string }>
  }>
  navigation?: Array<{
    id: string
    label: string
    icon?: string
    route?: string
    badge?: string | number
    children?: any[]
    permissions?: string[]
  }>
}

interface AuthState {
  accessToken: string | null
  user: User | null
  config: FrontendConfig | null
  isLoading: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    accessToken: null,
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
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username, password })
        })



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

        let data
        try {
          const responseText = await response.text()
          data = JSON.parse(responseText)
        } catch (e) {
          console.error('[auth] Failed to parse login response:', e)
          throw new Error('Invalid response from server')
        }
        
        // Store token and user data
        this.accessToken = data.token
        this.user = data.user
        this.config = data.config



        // Store in localStorage for persistence
        localStorage.setItem('auth_token', data.token)
        localStorage.setItem('auth_user', JSON.stringify(data.user))
        localStorage.setItem('auth_config', JSON.stringify(data.config))

        // Make token available for WebSocket
        ;(window as any).__AUTH_STORE__ = { accessToken: data.token }

        // Reconnect WebSocket with new token
        this.reconnectWebSocket()

        return true
      } catch (error) {
        console.error('Login error:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    restoreSession() {
      try {
        const token = localStorage.getItem('auth_token')
        const user = localStorage.getItem('auth_user')
        const config = localStorage.getItem('auth_config')

        if (token && user && config) {
          // Check if token is still valid
          const decoded = jwtDecode<DecodedToken>(token)
          const now = Date.now() / 1000
          
          if (decoded.exp > now) {
            this.accessToken = token
            this.user = JSON.parse(user)
            this.config = JSON.parse(config)
            
            // Make token available for WebSocket
            ;(window as any).__AUTH_STORE__ = { accessToken: token }
            
            return true
          } else {
            // Token expired, clear storage
            this.clearStorage()
          }
        }
      } catch (error) {
        console.error('Session restore error:', error)
        this.clearStorage()
      }
      
      return false
    },

    logout() {
      this.accessToken = null
      this.user = null
      this.config = null
      this.clearStorage()
      
      // Clear WebSocket token and disconnect
      ;(window as any).__AUTH_STORE__ = null
      this.disconnectWebSocket()
    },

    clearStorage() {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      localStorage.removeItem('auth_config')
    },

    // Force clear all auth data and reload
    forceLogout() {
      this.logout()
      // Reload page to ensure clean state
      window.location.reload()
    },

    // Legacy method for compatibility with existing code
    async login() {
      // Redirect to login page instead of Keycloak
      window.location.href = '/login'
    },

    // Initialize method for app startup
    async initialize() {
      this.restoreSession()
    },

    // WebSocket integration methods
    reconnectWebSocket() {
      // Import WebSocket functions dynamically to avoid circular dependencies
      import('@/core/messaging/ws/socket').then(({ reconnectWebSocket }) => {
        reconnectWebSocket()
      }).catch(error => {
        console.error('[auth] Failed to reconnect WebSocket:', error)
      })
    },

    disconnectWebSocket() {
      // Import WebSocket functions dynamically to avoid circular dependencies
      import('@/core/messaging/ws/socket').then(({ disconnectWebSocket }) => {
        disconnectWebSocket()
      }).catch(error => {
        console.error('[auth] Failed to disconnect WebSocket:', error)
      })
    }
  }
})
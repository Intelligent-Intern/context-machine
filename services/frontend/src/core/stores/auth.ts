// src/core/stores/auth.ts
import { defineStore } from 'pinia'
import { jwtDecode } from 'jwt-decode'

interface DecodedToken {
  exp: number
  sub: string
  realm_access?: { roles: string[] }
  resource_access?: Record<string, { roles: string[] }>
  permissions?: string[]
  features?: string[]
  [key: string]: any
}

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  roles: string[]
  permissions: string[]
  features: string[]
  user: Record<string, any> | null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    accessToken: null,
    refreshToken: null,
    roles: [],
    permissions: [],
    features: [],
    user: null
  }),

  actions: {
    async login() {
      const clientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID
      const realm = import.meta.env.VITE_KEYCLOAK_REALM
      const url = import.meta.env.VITE_KEYCLOAK_URL
      const redirect = encodeURIComponent(window.location.origin)
      window.location.href = `${url}/realms/${realm}/protocol/openid-connect/auth?client_id=${clientId}&response_type=code&redirect_uri=${redirect}`
    },

    async handleCallback(code: string) {
      const clientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID
      const realm = import.meta.env.VITE_KEYCLOAK_REALM
      const url = import.meta.env.VITE_KEYCLOAK_URL

      const res = await fetch(`${url}/realms/${realm}/protocol/openid-connect/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: clientId,
          code,
          redirect_uri: window.location.origin
        })
      })
      const data = await res.json()
      this.setTokens(data.access_token, data.refresh_token)
    },

    setTokens(access: string, refresh: string) {
      this.accessToken = access
      this.refreshToken = refresh
      const decoded = jwtDecode<DecodedToken>(access)
      this.roles = decoded.realm_access?.roles || []
      this.permissions = decoded.permissions || []
      this.features = decoded.features || []
      this.user = decoded
    },

    async refresh() {
      if (!this.refreshToken) return
      const clientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID
      const realm = import.meta.env.VITE_KEYCLOAK_REALM
      const url = import.meta.env.VITE_KEYCLOAK_URL

      const res = await fetch(`${url}/realms/${realm}/protocol/openid-connect/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: clientId,
          refresh_token: this.refreshToken
        })
      })
      const data = await res.json()
      this.setTokens(data.access_token, data.refresh_token)
    },

    logout() {
      this.accessToken = null
      this.refreshToken = null
      this.roles = []
      this.permissions = []
      this.features = []
      this.user = null
      const url = import.meta.env.VITE_KEYCLOAK_URL
      const realm = import.meta.env.VITE_KEYCLOAK_REALM
      window.location.href = `${url}/realms/${realm}/protocol/openid-connect/logout?redirect_uri=${encodeURIComponent(window.location.origin)}`
    }
  }
})

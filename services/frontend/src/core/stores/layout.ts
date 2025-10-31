// src/core/stores/layout.ts
import { defineStore } from 'pinia'

interface LayoutConfig {
  bars: { t: number, b: number, l: number, r: number }
  ports?: Record<string, string[]>
}

interface LayoutState {
  bars: { t: number, b: number, l: number, r: number }
  ports: Record<string, string[]>
  sizes: {
    left: { default: number, current: number }
    right: { default: number, current: number }
  }
}

export const useLayoutStore = defineStore('layout', {
  state: (): LayoutState => ({
    bars: { t: 0, b: 0, l: 0, r: 0 }, // Default: all bars hidden
    ports: { t: [], b: [], l: [], r: [], m: [] },
    sizes: {
      left: { default: 280, current: 280 },
      right: { default: 320, current: 320 }
    }
  }),

  getters: {
    isBarVisible: (state) => (bar: 't' | 'b' | 'l' | 'r') => state.bars[bar] > 0,
    
    getPortWidgets: (state) => (port: string) => {
      // Map full port names to compact format
      const portMap: Record<string, string> = {
        'top': 't',
        'bottom': 'b', 
        'left': 'l',
        'right': 'r',
        'main': 'm'
      }
      
      const mappedPort = portMap[port] || port
      const widgets = state.ports[mappedPort] || []
      console.log(`[layout] getPortWidgets(${port} -> ${mappedPort}):`, widgets)
      return widgets
    }
  },

  actions: {
    applyConfig(config: LayoutConfig) {
      console.log('[layout] Applying config:', config)
      
      // Apply bar states
      this.bars = { ...config.bars }
      
      // Apply port configuration if provided
      if (config.ports) {
        this.ports = { ...config.ports }
        console.log('[layout] Ports updated:', this.ports)
      } else {
        console.warn('[layout] No ports in config!')
      }
      
      // Only persist to backend if user is authenticated
      try {
        const authStore = (window as any).__AUTH_STORE__
        if (authStore?.accessToken) {
          this.persistLayoutState()
        }
      } catch (error) {
        // Ignore persistence errors during fallback mode
        console.log('[layout] Skipping persistence in fallback mode')
      }
    },

    updatePorts(ports: Record<string, string[]>) {
      console.log('[layout] Updating ports:', ports)
      this.ports = { ...this.ports, ...ports }
    },

    setBarState(bar: 't' | 'b' | 'l' | 'r', state: number) {
      console.log(`[layout] Setting bar ${bar} to state ${state}`)
      this.bars[bar] = state
      this.persistLayoutState()
    },

    toggleBar(bar: 't' | 'b' | 'l' | 'r') {
      const newState = this.bars[bar] > 0 ? 0 : 2
      this.setBarState(bar, newState)
    },

    setBarSize(side: 'left' | 'right', size: number) {
      console.log(`[layout] Setting ${side} bar size to ${size}`)
      this.sizes[side].current = size
      this.persistSizes()
    },

    async persistLayoutState() {
      // Skip backend persistence for now - not needed for basic functionality
      console.log('[layout] Layout state updated (local only)')
    },

    persistSizes() {
      // Store sizes locally for immediate feedback
      localStorage.setItem('layout.sizes', JSON.stringify(this.sizes))
      
      // Only send to backend if authenticated
      try {
        const authStore = (window as any).__AUTH_STORE__
        if (authStore?.accessToken) {
          this.persistLayoutState()
        }
      } catch (error) {
        console.log('[layout] Skipping backend persistence in fallback mode')
      }
    },

    loadSizes() {
      const rawSizes = localStorage.getItem('layout.sizes')
      if (rawSizes) {
        try {
          this.sizes = JSON.parse(rawSizes)
        } catch (error) {
          console.error('[layout] Failed to parse stored sizes:', error)
        }
      }
    },

    // Apply fallback configuration (all bars hidden, auth widget only)
    applyFallbackConfig() {
      console.log('[layout] Applying fallback configuration')
      
      this.bars = { t: 0, b: 0, l: 0, r: 0 }
      this.ports = {
        t: [],
        b: [],
        l: [],
        r: [],
        m: ['auth@LoginForm']
      }
    },

    // Initialize layout store
    initialize() {
      this.loadSizes()
      
      // Register message handlers for layout updates
      this.initMessageHandlers()
    },

    initMessageHandlers() {
      import('@/core/messaging/api').then(({ registerHandler }) => {
        registerHandler('layout', (action, payload) => {
          console.log(`[layout] Received message: ${action}`, payload)
          
          switch (action) {
            case 'config.update':
              this.applyConfig(payload)
              break
              
            case 'ports.update':
              this.updatePorts(payload)
              break
              
            case 'content.loaded':
              // Page content loaded from backend
              if (payload.widgets) {
                this.updatePorts(payload.widgets)
              }
              break
              
            default:
              console.warn(`[layout] Unknown action: ${action}`)
          }
        })
      })
    }
  }
})
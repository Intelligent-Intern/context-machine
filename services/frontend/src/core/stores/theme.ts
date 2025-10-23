// Theme Store - Pinia store for theme management
import { defineStore } from 'pinia'
import { nextTick } from 'vue'
import { sendMessage } from '@/core/messaging/api'
import { themeRegistry, discoverWidgetPackThemes } from '@/core/theme/registry'
import type { WidgetPackTheme, ThemeVariable } from '@/core/theme/registry'
import { validateTheme } from '@/core/theme/validation'
import type { ThemeValidationResult } from '@/core/theme/validation'

export interface Theme {
  id: string
  name: string
  display_name: string
  description: string
  css_variables: Record<string, string>
  is_default: boolean
  is_custom: boolean
  created_by?: string
  created_at?: string
}

export interface GlobalThemeSettings {
  primaryColor: string
  secondaryColor: string
  accentColor: string
  backgroundColor: string
  surfaceColor: string
  textColor: string
  textSecondaryColor: string
  borderColor: string
  borderRadius: string
  fontFamily: string
  fontSize: string
  spacingUnit: string
}

export interface WidgetThemeSettings {
  [key: string]: string | number | boolean
}

export interface ThemeState {
  // Current theme
  currentTheme: Theme | null
  currentThemeId: string | null
  
  // Available themes
  availableThemes: Theme[]
  
  // Theme settings
  globalSettings: GlobalThemeSettings
  widgetSettings: Record<string, WidgetThemeSettings>
  
  // Widget pack themes
  widgetPackThemes: WidgetPackTheme[]
  themeVariables: Record<string, ThemeVariable>
  
  // Editor state
  isEditing: boolean
  previewMode: boolean
  hasUnsavedChanges: boolean
  
  // Loading states
  isLoading: boolean
  isApplying: boolean
  isSaving: boolean
  
  // Validation
  validationResult: ThemeValidationResult | null
  
  // User preferences
  userPreferences: {
    theme_id: string | null
    language: string
    preferences: Record<string, any>
  }
}

const defaultGlobalSettings: GlobalThemeSettings = {
  primaryColor: '#667eea',
  secondaryColor: '#764ba2',
  accentColor: '#f093fb',
  backgroundColor: '#ffffff',
  surfaceColor: '#f8fafc',
  textColor: '#1a202c',
  textSecondaryColor: '#718096',
  borderColor: '#e2e8f0',
  borderRadius: '8px',
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: '14px',
  spacingUnit: '16px'
}

export const useThemeStore = defineStore('theme', {
  state: (): ThemeState => ({
    currentTheme: null,
    currentThemeId: null,
    availableThemes: [],
    globalSettings: { ...defaultGlobalSettings },
    widgetSettings: {},
    widgetPackThemes: [],
    themeVariables: {},
    isEditing: false,
    previewMode: false,
    hasUnsavedChanges: false,
    isLoading: false,
    isApplying: false,
    isSaving: false,
    validationResult: null,
    userPreferences: {
      theme_id: null,
      language: 'en',
      preferences: {}
    }
  }),

  getters: {
    /**
     * Check if a theme is currently active
     */
    isThemeActive: (state) => (themeId: string) => {
      return state.currentThemeId === themeId
    },

    /**
     * Get current theme CSS variables for application
     */
    currentCssVariables: (state) => {
      if (!state.currentTheme) return {}
      
      // Merge global settings and widget settings into CSS variables
      const cssVariables: Record<string, string> = {}
      
      // Add global settings
      Object.entries(state.globalSettings).forEach(([key, value]) => {
        const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase()
        cssVariables[cssKey] = value
      })
      
      // Add current theme variables
      Object.entries(state.currentTheme.css_variables).forEach(([key, value]) => {
        cssVariables[key] = value
      })
      
      // Add widget-specific overrides
      Object.entries(state.widgetSettings).forEach(([widgetId, settings]) => {
        Object.entries(settings).forEach(([key, value]) => {
          const cssKey = `${widgetId}-${key}`.replace(/([A-Z])/g, '-$1').toLowerCase()
          cssVariables[cssKey] = String(value)
        })
      })
      
      return cssVariables
    },

    /**
     * Get all theme variables from widget packs
     */
    allThemeVariables: (state) => {
      return state.themeVariables
    },

    /**
     * Get theme variables by category
     */
    variablesByCategory: (state) => {
      const categories: Record<string, Record<string, ThemeVariable>> = {}
      
      Object.entries(state.themeVariables).forEach(([key, variable]) => {
        if (!categories[variable.category]) {
          categories[variable.category] = {}
        }
        categories[variable.category][key] = variable
      })
      
      return categories
    },

    /**
     * Check if theme editor has validation errors
     */
    hasValidationErrors: (state) => {
      return state.validationResult && !state.validationResult.valid
    },

    /**
     * Get validation error count
     */
    validationErrorCount: (state) => {
      return state.validationResult?.summary.errorCount || 0
    },

    /**
     * Get validation warning count
     */
    validationWarningCount: (state) => {
      return state.validationResult?.summary.warningCount || 0
    },

    /**
     * Check if current user can edit themes
     */
    canEditThemes: () => {
      // TODO: Check user permissions
      return true
    },

    /**
     * Get default theme
     */
    defaultTheme: (state) => {
      return state.availableThemes.find(theme => theme.is_default) || null
    }
  },

  actions: {
    /**
     * Initialize theme system
     */
    async initialize() {
      try {
        this.isLoading = true
        
        // Discover widget pack themes
        await this.discoverWidgetPackThemes()
        
        // Load available themes from backend
        await this.loadAvailableThemes()
        
        // Load user preferences
        await this.loadUserPreferences()
        
        // Apply user's preferred theme or default theme
        await this.applyUserPreferredTheme()
      } catch (error) {
        console.error('[theme] Failed to initialize theme system:', error)
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Discover themes from widget packs
     */
    async discoverWidgetPackThemes() {
      try {
        // Use theme registry to discover themes
        await discoverWidgetPackThemes()
        
        // Get discovered themes
        this.widgetPackThemes = themeRegistry.getWidgetPackThemes()
        this.themeVariables = themeRegistry.getAllThemeVariables()
      } catch (error) {
        console.error('[theme] Failed to discover widget pack themes:', error)
      }
    },

    /**
     * Load available themes from backend
     */
    async loadAvailableThemes() {
      // Check if we're on a public route - use public config endpoint
      const currentRoute = window.location.pathname
      const publicRoutes = ['/login', '/forgot-password']
      
      if (publicRoutes.includes(currentRoute)) {
        try {
          // Load theme from public config endpoint
          const response = await fetch(`/api/config?origin=${window.location.origin}`)
          if (response.ok) {
            const config = await response.json()
            if (config.project?.theme) {
              // Create a theme object from project config
              const projectTheme = {
                id: 'project-default',
                name: 'project-default',
                display_name: 'Project Default',
                description: 'Default project theme',
                css_variables: config.project.theme,
                is_default: true,
                is_custom: false
              }
              this.availableThemes = [projectTheme]
              return
            }
          }
        } catch (error) {
          console.warn('[theme] Failed to load public theme config:', error)
        }
        
        // Fallback to empty themes for public routes
        this.availableThemes = []
        return
      }

      // Check if user is authenticated for protected routes
      const { useAuthStore } = await import('@/core/stores/auth')
      const authStore = useAuthStore()
      
      if (!authStore.isAuthenticated || !authStore.isTokenValid) {
        console.warn('[theme] User not authenticated, skipping theme loading')
        this.availableThemes = []
        return
      }

      try {
        const response = await sendMessage('theme.list', {})
        
        if (response && response.themes) {
          this.availableThemes = response.themes
        }
      } catch (error) {
        console.error('[theme] Failed to load themes from backend:', error)
        // Continue with empty themes list
        this.availableThemes = []
      }
    },

    /**
     * Load user theme preferences
     */
    async loadUserPreferences() {
      // Check if we're on a public route - no user preferences needed
      const currentRoute = window.location.pathname
      const publicRoutes = ['/login', '/forgot-password']
      
      if (publicRoutes.includes(currentRoute)) {
        // Use default preferences for public routes
        this.userPreferences = {
          theme_id: 'project-default',
          language: 'en',
          preferences: {}
        }
        return
      }

      // Check if user is authenticated
      const { useAuthStore } = await import('@/core/stores/auth')
      const authStore = useAuthStore()
      
      if (!authStore.isAuthenticated || !authStore.isTokenValid) {
        console.warn('[theme] User not authenticated, using default preferences')
        return
      }

      try {
        const response = await sendMessage('theme.preferences.get', {})
        
        if (response && response.preferences) {
          this.userPreferences = response.preferences
        }
      } catch (error) {
        console.error('[theme] Failed to load user preferences:', error)
        // Continue with default preferences
      }
    },

    /**
     * Apply user's preferred theme or default theme
     */
    async applyUserPreferredTheme() {
      try {
        let themeToApply: Theme | null = null
        
        // Try to use user's preferred theme
        if (this.userPreferences.theme_id) {
          themeToApply = this.availableThemes.find(
            theme => theme.id === this.userPreferences.theme_id
          ) || null
        }
        
        // Fallback to default theme
        if (!themeToApply) {
          themeToApply = this.defaultTheme
        }
        
        // Fallback to first available theme
        if (!themeToApply && this.availableThemes.length > 0) {
          themeToApply = this.availableThemes[0]
        }
        
        if (themeToApply) {
          await this.applyTheme(themeToApply.id)
        } else {
          console.warn('[theme] No themes available, using default settings')
          await this.applyDefaultTheme()
        }
      } catch (error) {
        console.error('[theme] Failed to apply preferred theme:', error)
        await this.applyDefaultTheme()
      }
    },

    /**
     * Apply default theme settings
     */
    async applyDefaultTheme() {
      this.currentTheme = null
      this.currentThemeId = null
      this.globalSettings = { ...defaultGlobalSettings }
      this.widgetSettings = {}
      
      await this.applyCssVariables()
    },

    /**
     * Load and apply a specific theme
     */
    async applyTheme(themeId: string) {
      try {
        this.isApplying = true
        
        // Load theme details if not already loaded
        let theme = this.availableThemes.find(t => t.id === themeId)
        
        if (!theme) {
          const response = await sendMessage('theme.get', { id: themeId })
          if (response && response.theme) {
            theme = response.theme
          } else {
            throw new Error(`Theme ${themeId} not found`)
          }
        }
        
        if (!theme) {
          throw new Error(`Theme ${themeId} not found`)
        }
        
        // Set current theme
        this.currentTheme = theme
        this.currentThemeId = themeId
        
        // Update global settings from theme
        this.updateGlobalSettingsFromTheme(theme)
        
        // Apply CSS variables
        await this.applyCssVariables()
        
        // Save user preference
        await this.saveUserThemePreference(themeId)
        

      } catch (error) {
        console.error(`[theme] Failed to apply theme ${themeId}:`, error)
        throw error
      } finally {
        this.isApplying = false
      }
    },

    /**
     * Update global settings from theme
     */
    updateGlobalSettingsFromTheme(theme: Theme) {
      const cssVars = theme.css_variables
      
      // Map CSS variables to global settings
      this.globalSettings = {
        primaryColor: cssVars['primary-color'] || defaultGlobalSettings.primaryColor,
        secondaryColor: cssVars['secondary-color'] || defaultGlobalSettings.secondaryColor,
        accentColor: cssVars['accent-color'] || defaultGlobalSettings.accentColor,
        backgroundColor: cssVars['background-color'] || defaultGlobalSettings.backgroundColor,
        surfaceColor: cssVars['surface-color'] || defaultGlobalSettings.surfaceColor,
        textColor: cssVars['text-color'] || defaultGlobalSettings.textColor,
        textSecondaryColor: cssVars['text-secondary-color'] || defaultGlobalSettings.textSecondaryColor,
        borderColor: cssVars['border-color'] || defaultGlobalSettings.borderColor,
        borderRadius: cssVars['border-radius'] || defaultGlobalSettings.borderRadius,
        fontFamily: cssVars['font-family'] || defaultGlobalSettings.fontFamily,
        fontSize: cssVars['font-size'] || defaultGlobalSettings.fontSize,
        spacingUnit: cssVars['spacing-unit'] || defaultGlobalSettings.spacingUnit
      }
    },

    /**
     * Apply CSS variables to the document
     */
    async applyCssVariables() {
      await nextTick()
      
      const root = document.documentElement
      const cssVariables = this.currentCssVariables
      

      
      // Apply all CSS variables to :root
      Object.entries(cssVariables).forEach(([key, value]) => {
        const cssKey = key.startsWith('--') ? key : `--${key}`
        root.style.setProperty(cssKey, value)
      })
      
      // Trigger CSS transition for smooth theme changes
      root.classList.add('theme-transitioning')
      setTimeout(() => {
        root.classList.remove('theme-transitioning')
      }, 300)
    },

    /**
     * Start theme editing mode
     */
    startEditing() {

      this.isEditing = true
      this.previewMode = true
      this.hasUnsavedChanges = false
    },

    /**
     * Stop theme editing mode
     */
    stopEditing() {

      this.isEditing = false
      this.previewMode = false
      this.hasUnsavedChanges = false
      this.validationResult = null
    },

    /**
     * Update global theme setting
     */
    updateGlobalSetting(key: keyof GlobalThemeSettings, value: string) {

      
      this.globalSettings[key] = value
      this.hasUnsavedChanges = true
      
      if (this.previewMode) {
        this.applyCssVariables()
      }
      
      this.validateCurrentTheme()
    },

    /**
     * Update widget-specific setting
     */
    updateWidgetSetting(widgetId: string, key: string, value: string | number | boolean) {

      
      if (!this.widgetSettings[widgetId]) {
        this.widgetSettings[widgetId] = {}
      }
      
      this.widgetSettings[widgetId][key] = value
      this.hasUnsavedChanges = true
      
      if (this.previewMode) {
        this.applyCssVariables()
      }
      
      this.validateCurrentTheme()
    },

    /**
     * Reset to default settings
     */
    resetToDefaults() {

      
      this.globalSettings = { ...defaultGlobalSettings }
      this.widgetSettings = {}
      this.hasUnsavedChanges = true
      
      if (this.previewMode) {
        this.applyCssVariables()
      }
      
      this.validateCurrentTheme()
    },

    /**
     * Validate current theme settings
     */
    validateCurrentTheme() {
      try {
        const themeValues = this.currentCssVariables
        this.validationResult = validateTheme(this.themeVariables, themeValues)
        

      } catch (error) {
        console.error('[theme] Theme validation failed:', error)
        this.validationResult = null
      }
    },

    /**
     * Save current theme as new custom theme
     */
    async saveAsNewTheme(name: string, displayName: string, description: string = '') {
      try {

        this.isSaving = true
        
        const themeData = {
          name,
          display_name: displayName,
          description,
          css_variables: this.currentCssVariables
        }
        
        const response = await sendMessage('theme.create', { theme: themeData })
        
        if (response && response.theme_id) {
          // Reload available themes
          await this.loadAvailableThemes()
          
          // Apply the new theme
          await this.applyTheme(response.theme_id)
          
          this.hasUnsavedChanges = false

          
          return response.theme_id
        } else {
          throw new Error('Failed to save theme')
        }
      } catch (error) {
        console.error('[theme] Failed to save new theme:', error)
        throw error
      } finally {
        this.isSaving = false
      }
    },

    /**
     * Update existing custom theme
     */
    async updateCurrentTheme() {
      try {
        if (!this.currentTheme || !this.currentTheme.is_custom) {
          throw new Error('Cannot update system theme')
        }
        

        this.isSaving = true
        
        const themeData = {
          display_name: this.currentTheme.display_name,
          description: this.currentTheme.description,
          css_variables: this.currentCssVariables
        }
        
        await sendMessage('theme.update', {
          id: this.currentTheme.id,
          theme: themeData
        })
        
        // Reload available themes
        await this.loadAvailableThemes()
        
        this.hasUnsavedChanges = false

      } catch (error) {
        console.error('[theme] Failed to update theme:', error)
        throw error
      } finally {
        this.isSaving = false
      }
    },

    /**
     * Delete a custom theme
     */
    async deleteTheme(themeId: string) {
      try {

        
        await sendMessage('theme.delete', { id: themeId })
        
        // If deleted theme was current, switch to default
        if (this.currentThemeId === themeId) {
          await this.applyUserPreferredTheme()
        }
        
        // Reload available themes
        await this.loadAvailableThemes()
        

      } catch (error) {
        console.error(`[theme] Failed to delete theme ${themeId}:`, error)
        throw error
      }
    },

    /**
     * Export theme for sharing
     */
    async exportTheme(themeId: string) {
      try {

        
        const response = await sendMessage('theme.export', { id: themeId })
        
        if (response && response.export) {
          return response.export
        } else {
          throw new Error('Failed to export theme')
        }
      } catch (error) {
        console.error(`[theme] Failed to export theme ${themeId}:`, error)
        throw error
      }
    },

    /**
     * Import theme from exported data
     */
    async importTheme(themeData: any) {
      try {

        
        const response = await sendMessage('theme.import', { theme: themeData })
        
        if (response && response.theme_id) {
          // Reload available themes
          await this.loadAvailableThemes()
          

          return response.theme_id
        } else {
          throw new Error('Failed to import theme')
        }
      } catch (error) {
        console.error('[theme] Failed to import theme:', error)
        throw error
      }
    },

    /**
     * Save user theme preference
     */
    async saveUserThemePreference(themeId: string) {
      // Check if we're on a public route - don't save preferences
      const currentRoute = window.location.pathname
      const publicRoutes = ['/login', '/forgot-password']
      
      if (publicRoutes.includes(currentRoute)) {
        // Just update local preferences, don't save to backend
        this.userPreferences.theme_id = themeId
        return
      }

      // Check if user is authenticated
      const { useAuthStore } = await import('@/core/stores/auth')
      const authStore = useAuthStore()
      
      if (!authStore.isAuthenticated || !authStore.isTokenValid) {
        // Just update local preferences, don't save to backend
        this.userPreferences.theme_id = themeId
        return
      }

      try {
        await sendMessage('theme.preferences.set', { theme_id: themeId })
        this.userPreferences.theme_id = themeId
      } catch (error) {
        console.error('[theme] Failed to save user preference:', error)
        // Don't throw - this is not critical
      }
    },

    /**
     * Search theme variables
     */
    searchVariables(query: string): Record<string, ThemeVariable> {
      return themeRegistry.searchVariables(query)
    },

    /**
     * Get variables by category
     */
    getVariablesByCategory(category: string): Record<string, ThemeVariable> {
      return themeRegistry.getVariablesByCategory(category)
    },

    /**
     * Initialize theme handlers (for compatibility with initCore)
     */
    initHandlers() {

      // Initialize theme system
      this.initialize()
    },

    /**
     * Load persisted theme settings (for compatibility with initCore)
     */
    loadPersisted() {

      // This is handled by initialize() method
    }
  }
})

// Auto-initialize theme system when store is created
let initialized = false

export function initializeThemeSystem() {
  if (initialized) return
  
  const themeStore = useThemeStore()
  
  // Initialize on next tick to ensure all dependencies are ready
  nextTick(() => {
    themeStore.initialize()
  })
  
  initialized = true
}

// CSS transition styles for smooth theme changes
const themeTransitionStyles = `
.theme-transitioning * {
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease !important;
}
`

// Inject transition styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = themeTransitionStyles
  document.head.appendChild(style)
}
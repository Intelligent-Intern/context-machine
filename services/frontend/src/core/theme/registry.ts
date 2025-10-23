// Theme Registry System for discovering and managing widget pack themes

export interface ThemeVariable {
  name: string
  type: 'color' | 'size' | 'font' | 'spacing' | 'shadow' | 'border' | 'transition'
  default: string
  description: string
  category: string
  min?: number
  max?: number
  options?: string[]
  unit?: string
}

export interface ThemeCategory {
  name: string
  description?: string
  variables: Record<string, ThemeVariable>
}

export interface WidgetPackTheme {
  packId: string
  packName: string
  version: string
  categories: Record<string, ThemeCategory>
  cssVariables: Record<string, string>
  variants?: Record<string, ThemeVariant>
}

export interface ThemeVariant {
  name: string
  description: string
  overrides: Record<string, string>
}

export interface ParsedThemeData {
  variables: Record<string, ThemeVariable>
  cssVariables: Record<string, string>
  categories: Record<string, ThemeCategory>
}

class ThemeRegistry {
  private widgetPackThemes: Map<string, WidgetPackTheme> = new Map()
  private themeVariables: Map<string, ThemeVariable> = new Map()
  private cssVariableMap: Map<string, string> = new Map()
  
  /**
   * Register theme data from a widget pack
   */
  registerWidgetPackTheme(packId: string, themeData: any): void {
    try {
      
      const parsedTheme = this.parseThemeData(packId, themeData)
      this.widgetPackThemes.set(packId, parsedTheme)
      
      // Register individual variables for global access
      Object.entries(parsedTheme.cssVariables).forEach(([key, value]) => {
        this.cssVariableMap.set(`${packId}--${key}`, value)
      })
      
      Object.entries(parsedTheme.categories).forEach(([categoryName, category]) => {
        Object.entries(category.variables).forEach(([varName, variable]) => {
          this.themeVariables.set(`${packId}--${categoryName}--${varName}`, variable)
        })
      })
    } catch (error) {
      console.error(`[theme-registry] Failed to register theme for ${packId}:`, error)
    }
  }
  
  /**
   * Parse theme data from widget pack manifest or theme files
   */
  private parseThemeData(packId: string, themeData: any): WidgetPackTheme {
    const theme: WidgetPackTheme = {
      packId,
      packName: themeData.name || packId,
      version: themeData.version || '1.0.0',
      categories: {},
      cssVariables: {},
      variants: themeData.variants || {}
    }
    
    // Parse from manifest.json theme section
    if (themeData.designTokens) {
      theme.categories = this.parseDesignTokens(themeData.designTokens)
      theme.cssVariables = this.extractCssVariables(theme.categories)
    }
    
    // Parse from variables.css file content
    if (themeData.cssContent) {
      const parsed = this.parseCssVariables(themeData.cssContent)
      theme.cssVariables = { ...theme.cssVariables, ...parsed.cssVariables }
      theme.categories = { ...theme.categories, ...parsed.categories }
    }
    
    // Parse from variables.json file
    if (themeData.variablesJson) {
      const parsed = this.parseVariablesJson(themeData.variablesJson)
      theme.categories = { ...theme.categories, ...parsed.categories }
      theme.cssVariables = { ...theme.cssVariables, ...parsed.cssVariables }
    }
    
    return theme
  }
  
  /**
   * Parse design tokens from manifest.json
   */
  private parseDesignTokens(designTokens: any): Record<string, ThemeCategory> {
    const categories: Record<string, ThemeCategory> = {}
    
    Object.entries(designTokens).forEach(([categoryName, tokens]) => {
      if (typeof tokens === 'object' && tokens !== null) {
        categories[categoryName] = {
          name: this.formatCategoryName(categoryName),
          description: `${this.formatCategoryName(categoryName)} design tokens`,
          variables: {}
        }
        
        Object.entries(tokens as Record<string, any>).forEach(([tokenName, value]) => {
          const variableName = `--${categoryName}-${tokenName.replace(/_/g, '-')}`
          categories[categoryName].variables[tokenName] = {
            name: variableName,
            type: this.inferVariableType(tokenName, value),
            default: String(value),
            description: this.generateDescription(categoryName, tokenName),
            category: categoryName
          }
        })
      }
    })
    
    return categories
  }
  
  /**
   * Parse CSS variables from CSS content
   */
  private parseCssVariables(cssContent: string): ParsedThemeData {
    const variables: Record<string, ThemeVariable> = {}
    const cssVariables: Record<string, string> = {}
    const categories: Record<string, ThemeCategory> = {}
    
    // Extract CSS custom properties
    const cssVarRegex = /--([a-zA-Z0-9-_]+):\s*([^;]+);/g
    let match
    
    while ((match = cssVarRegex.exec(cssContent)) !== null) {
      const [, name, value] = match
      const fullName = `--${name}`
      const cleanValue = value.trim()
      
      cssVariables[name] = cleanValue
      
      // Parse category from variable name
      const parts = name.split('-')
      const categoryName = parts[0] || 'general'
      const variableName = parts.slice(1).join('-')
      
      if (!categories[categoryName]) {
        categories[categoryName] = {
          name: this.formatCategoryName(categoryName),
          description: `${this.formatCategoryName(categoryName)} variables`,
          variables: {}
        }
      }
      
      variables[name] = {
        name: fullName,
        type: this.inferVariableType(name, cleanValue),
        default: cleanValue,
        description: this.generateDescription(categoryName, variableName),
        category: categoryName
      }
      
      categories[categoryName].variables[variableName] = variables[name]
    }
    
    return { variables, cssVariables, categories }
  }
  
  /**
   * Parse variables from variables.json
   */
  private parseVariablesJson(variablesData: any): ParsedThemeData {
    const variables: Record<string, ThemeVariable> = {}
    const cssVariables: Record<string, string> = {}
    const categories: Record<string, ThemeCategory> = {}
    
    if (variablesData.categories) {
      Object.entries(variablesData.categories).forEach(([categoryName, categoryData]: [string, any]) => {
        categories[categoryName] = {
          name: categoryData.name || this.formatCategoryName(categoryName),
          description: categoryData.description,
          variables: {}
        }
        
        if (categoryData.variables) {
          Object.entries(categoryData.variables).forEach(([varName, varData]: [string, any]) => {
            const fullName = varData.name || `--${categoryName}-${varName}`
            
            variables[varName] = {
              name: fullName,
              type: varData.type || this.inferVariableType(varName, varData.default),
              default: varData.default,
              description: varData.description || this.generateDescription(categoryName, varName),
              category: categoryName,
              min: varData.min,
              max: varData.max,
              options: varData.options,
              unit: varData.unit
            }
            
            cssVariables[varName] = varData.default
            categories[categoryName].variables[varName] = variables[varName]
          })
        }
      })
    }
    
    return { variables, cssVariables, categories }
  }
  
  /**
   * Extract CSS variables from parsed categories
   */
  private extractCssVariables(categories: Record<string, ThemeCategory>): Record<string, string> {
    const cssVariables: Record<string, string> = {}
    
    Object.values(categories).forEach(category => {
      Object.values(category.variables).forEach(variable => {
        const key = variable.name.replace('--', '')
        cssVariables[key] = variable.default
      })
    })
    
    return cssVariables
  }
  
  /**
   * Infer variable type from name and value
   */
  private inferVariableType(name: string, value: string): ThemeVariable['type'] {
    const lowerName = name.toLowerCase()
    const lowerValue = value.toLowerCase()
    
    // Color detection
    if (lowerName.includes('color') || lowerName.includes('bg') || lowerName.includes('text') ||
        lowerValue.startsWith('#') || lowerValue.startsWith('rgb') || lowerValue.startsWith('hsl') ||
        lowerValue.includes('rgba') || lowerValue.includes('hsla')) {
      return 'color'
    }
    
    // Size detection
    if (lowerName.includes('size') || lowerName.includes('width') || lowerName.includes('height') ||
        lowerValue.includes('px') || lowerValue.includes('rem') || lowerValue.includes('em') ||
        lowerValue.includes('%') || lowerValue.includes('vh') || lowerValue.includes('vw')) {
      return 'size'
    }
    
    // Font detection
    if (lowerName.includes('font') || lowerName.includes('family') || lowerName.includes('weight')) {
      return 'font'
    }
    
    // Spacing detection
    if (lowerName.includes('padding') || lowerName.includes('margin') || lowerName.includes('gap') ||
        lowerName.includes('spacing') || lowerName.includes('indent')) {
      return 'spacing'
    }
    
    // Shadow detection
    if (lowerName.includes('shadow') || lowerValue.includes('box-shadow')) {
      return 'shadow'
    }
    
    // Border detection
    if (lowerName.includes('border') || lowerName.includes('radius')) {
      return 'border'
    }
    
    // Transition detection
    if (lowerName.includes('transition') || lowerName.includes('duration') || lowerName.includes('ease')) {
      return 'transition'
    }
    
    return 'size' // Default fallback
  }
  
  /**
   * Format category name for display
   */
  private formatCategoryName(name: string): string {
    return name
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }
  
  /**
   * Generate description for variable
   */
  private generateDescription(category: string, variable: string): string {
    const formattedCategory = this.formatCategoryName(category)
    const formattedVariable = this.formatCategoryName(variable)
    return `${formattedCategory} - ${formattedVariable}`
  }
  
  /**
   * Get all registered widget pack themes
   */
  getWidgetPackThemes(): WidgetPackTheme[] {
    return Array.from(this.widgetPackThemes.values())
  }
  
  /**
   * Get theme data for a specific widget pack
   */
  getWidgetPackTheme(packId: string): WidgetPackTheme | undefined {
    return this.widgetPackThemes.get(packId)
  }
  
  /**
   * Get all theme variables across all widget packs
   */
  getAllThemeVariables(): Record<string, ThemeVariable> {
    const allVariables: Record<string, ThemeVariable> = {}
    
    this.widgetPackThemes.forEach((theme, packId) => {
      Object.entries(theme.categories).forEach(([categoryName, category]) => {
        Object.entries(category.variables).forEach(([varName, variable]) => {
          const key = `${packId}--${categoryName}--${varName}`
          allVariables[key] = variable
        })
      })
    })
    
    return allVariables
  }
  
  /**
   * Get all CSS variables for theme application
   */
  getAllCssVariables(): Record<string, string> {
    const allCssVariables: Record<string, string> = {}
    
    this.widgetPackThemes.forEach(theme => {
      Object.entries(theme.cssVariables).forEach(([key, value]) => {
        allCssVariables[key] = value
      })
    })
    
    return allCssVariables
  }
  
  /**
   * Get theme variables by category
   */
  getVariablesByCategory(category: string): Record<string, ThemeVariable> {
    const variables: Record<string, ThemeVariable> = {}
    
    this.widgetPackThemes.forEach((theme, packId) => {
      if (theme.categories[category]) {
        Object.entries(theme.categories[category].variables).forEach(([varName, variable]) => {
          const key = `${packId}--${varName}`
          variables[key] = variable
        })
      }
    })
    
    return variables
  }
  
  /**
   * Search theme variables by name or description
   */
  searchVariables(query: string): Record<string, ThemeVariable> {
    const results: Record<string, ThemeVariable> = {}
    const lowerQuery = query.toLowerCase()
    
    this.widgetPackThemes.forEach((theme, packId) => {
      Object.entries(theme.categories).forEach(([categoryName, category]) => {
        Object.entries(category.variables).forEach(([varName, variable]) => {
          if (
            variable.name.toLowerCase().includes(lowerQuery) ||
            variable.description.toLowerCase().includes(lowerQuery) ||
            variable.category.toLowerCase().includes(lowerQuery)
          ) {
            const key = `${packId}--${categoryName}--${varName}`
            results[key] = variable
          }
        })
      })
    })
    
    return results
  }
  
  /**
   * Validate theme variable value
   */
  validateVariableValue(variable: ThemeVariable, value: string): { valid: boolean; error?: string } {
    try {
      switch (variable.type) {
        case 'color':
          return this.validateColor(value)
        case 'size':
          return this.validateSize(value, variable.min, variable.max)
        case 'font':
          return this.validateFont(value, variable.options)
        default:
          return { valid: true }
      }
    } catch (error) {
      return { valid: false, error: (error as Error).message }
    }
  }
  
  private validateColor(value: string): { valid: boolean; error?: string } {
    // Basic color validation
    const colorRegex = /^(#[0-9a-fA-F]{3,8}|rgb\(|rgba\(|hsl\(|hsla\(|[a-zA-Z]+).*$/
    if (!colorRegex.test(value)) {
      return { valid: false, error: 'Invalid color format' }
    }
    return { valid: true }
  }
  
  private validateSize(value: string, min?: number, max?: number): { valid: boolean; error?: string } {
    const sizeRegex = /^(\d*\.?\d+)(px|rem|em|%|vh|vw|pt|pc|in|cm|mm|ex|ch|vmin|vmax)?$/
    const match = value.match(sizeRegex)
    
    if (!match) {
      return { valid: false, error: 'Invalid size format' }
    }
    
    const numValue = parseFloat(match[1])
    if (min !== undefined && numValue < min) {
      return { valid: false, error: `Value must be at least ${min}` }
    }
    if (max !== undefined && numValue > max) {
      return { valid: false, error: `Value must be at most ${max}` }
    }
    
    return { valid: true }
  }
  
  private validateFont(value: string, options?: string[]): { valid: boolean; error?: string } {
    if (options && !options.includes(value)) {
      return { valid: false, error: `Value must be one of: ${options.join(', ')}` }
    }
    return { valid: true }
  }
  
  /**
   * Clear all registered themes
   */
  clear(): void {
    this.widgetPackThemes.clear()
    this.themeVariables.clear()
    this.cssVariableMap.clear()
  }
}

// Export singleton instance
export const themeRegistry = new ThemeRegistry()

// Auto-discovery functions
export async function discoverWidgetPackThemes(): Promise<void> {
  try {
    // Discover themes from known widget packs
    const widgetPacks = ['navigation', 'auth', 'dashboard', 'table']
    
    for (const packId of widgetPacks) {
      await discoverPackTheme(packId)
    }
  } catch (error) {
    console.error('[theme-registry] Theme discovery failed:', error)
  }
}

async function discoverPackTheme(packId: string): Promise<void> {
  try {
    
    // Try to load manifest.json
    try {
      const manifestPath = `/src/widget-packs/${packId}/manifest.json`
      const manifestResponse = await fetch(manifestPath)
      if (manifestResponse.ok) {
        const manifest = await manifestResponse.json()
        if (manifest.theme) {
          themeRegistry.registerWidgetPackTheme(packId, {
            name: manifest.name,
            version: manifest.version,
            designTokens: manifest.theme.designTokens,
            variants: manifest.theme.variants
          })
          return
        }
      }
    } catch (error) {
      // No manifest theme found
    }
    
    // Try to load variables.css
    try {
      const cssPath = `/src/widget-packs/${packId}/theme/variables.css`
      const cssResponse = await fetch(cssPath)
      if (cssResponse.ok) {
        const cssContent = await cssResponse.text()
        themeRegistry.registerWidgetPackTheme(packId, {
          name: `${packId} Theme`,
          version: '1.0.0',
          cssContent
        })
        return
      }
    } catch (error) {
      // No CSS theme found
    }
    
    // Try to load variables.json
    try {
      const jsonPath = `/src/widget-packs/${packId}/theme/variables.json`
      const jsonResponse = await fetch(jsonPath)
      if (jsonResponse.ok) {
        const variablesJson = await jsonResponse.json()
        themeRegistry.registerWidgetPackTheme(packId, {
          name: `${packId} Theme`,
          version: '1.0.0',
          variablesJson
        })
        return
      }
    } catch (error) {
      // No JSON theme found
    }
  } catch (error) {
    console.error(`[theme-registry] Failed to discover theme for ${packId}:`, error)
  }
}
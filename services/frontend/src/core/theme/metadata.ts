// Theme metadata extraction and management
import type { WidgetPackTheme } from './registry'

export interface ThemeMetadata {
  packId: string
  packName: string
  version: string
  description?: string
  author?: string
  license?: string
  keywords?: string[]
  dependencies?: Record<string, string>
  variableCount: number
  categoryCount: number
  categories: string[]
  supportedVariants?: string[]
  lastUpdated?: Date
  size: {
    variables: number
    categories: number
    variants: number
  }
}

export interface ThemeDependency {
  packId: string
  version: string
  required: boolean
  variables: string[]
}

export interface ThemeCompatibility {
  compatible: boolean
  issues: string[]
  warnings: string[]
  missingDependencies: ThemeDependency[]
  conflictingVariables: string[]
}

/**
 * Extract metadata from widget pack theme
 */
export function extractThemeMetadata(theme: WidgetPackTheme, manifestData?: any): ThemeMetadata {
  const categories = Object.keys(theme.categories)
  const variableCount = Object.values(theme.categories).reduce(
    (count, category) => count + Object.keys(category.variables).length,
    0
  )
  
  return {
    packId: theme.packId,
    packName: theme.packName,
    version: theme.version,
    description: manifestData?.description,
    author: manifestData?.author,
    license: manifestData?.license,
    keywords: manifestData?.keywords || [],
    dependencies: manifestData?.dependencies,
    variableCount,
    categoryCount: categories.length,
    categories,
    supportedVariants: theme.variants ? Object.keys(theme.variants) : undefined,
    lastUpdated: new Date(),
    size: {
      variables: variableCount,
      categories: categories.length,
      variants: theme.variants ? Object.keys(theme.variants).length : 0
    }
  }
}

/**
 * Analyze theme dependencies
 */
export function analyzeThemeDependencies(
  theme: WidgetPackTheme,
  availableThemes: WidgetPackTheme[]
): ThemeDependency[] {
  const dependencies: ThemeDependency[] = []
  
  // Analyze CSS variable references
  Object.values(theme.categories).forEach(category => {
    Object.values(category.variables).forEach(variable => {
      const varReferences = extractVariableReferences(variable.default)
      
      varReferences.forEach(ref => {
        const [packId] = ref.split('--')
        if (packId && packId !== theme.packId && !dependencies.find(d => d.packId === packId)) {
          dependencies.push({
            packId,
            version: '*',
            required: true,
            variables: [ref]
          })
        }
      })
    })
  })
  
  return dependencies
}

/**
 * Check theme compatibility with current environment
 */
export function checkThemeCompatibility(
  theme: WidgetPackTheme,
  availableThemes: WidgetPackTheme[],
  currentThemeValues?: Record<string, string>
): ThemeCompatibility {
  const issues: string[] = []
  const warnings: string[] = []
  const missingDependencies: ThemeDependency[] = []
  const conflictingVariables: string[] = []
  
  // Check dependencies
  const dependencies = analyzeThemeDependencies(theme, availableThemes)
  const availablePackIds = new Set(availableThemes.map(t => t.packId))
  
  dependencies.forEach(dep => {
    if (!availablePackIds.has(dep.packId)) {
      missingDependencies.push(dep)
      issues.push(`Missing dependency: ${dep.packId}`)
    }
  })
  
  // Check for variable conflicts
  if (currentThemeValues) {
    Object.keys(theme.cssVariables).forEach(varName => {
      if (varName in currentThemeValues) {
        const currentValue = currentThemeValues[varName]
        const themeValue = theme.cssVariables[varName]
        
        if (currentValue !== themeValue) {
          conflictingVariables.push(varName)
          warnings.push(`Variable ${varName} will be overridden`)
        }
      }
    })
  }
  
  // Check for circular dependencies
  const circularDeps = detectCircularDependencies(theme, availableThemes)
  if (circularDeps.length > 0) {
    issues.push(`Circular dependencies detected: ${circularDeps.join(' -> ')}`)
  }
  
  return {
    compatible: issues.length === 0,
    issues,
    warnings,
    missingDependencies,
    conflictingVariables
  }
}

/**
 * Extract variable references from CSS value
 */
function extractVariableReferences(value: string): string[] {
  const references: string[] = []
  const varRegex = /var\(\s*(--[a-zA-Z0-9-_]+)\s*(?:,\s*[^)]+)?\s*\)/g
  let match
  
  while ((match = varRegex.exec(value)) !== null) {
    references.push(match[1].replace('--', ''))
  }
  
  return references
}

/**
 * Detect circular dependencies in theme variables
 */
function detectCircularDependencies(
  theme: WidgetPackTheme,
  availableThemes: WidgetPackTheme[]
): string[] {
  const visited = new Set<string>()
  const recursionStack = new Set<string>()
  const allThemes = [...availableThemes, theme]
  
  function hasCircularDep(packId: string, path: string[] = []): string[] {
    if (recursionStack.has(packId)) {
      return [...path, packId]
    }
    
    if (visited.has(packId)) {
      return []
    }
    
    visited.add(packId)
    recursionStack.add(packId)
    
    const currentTheme = allThemes.find(t => t.packId === packId)
    if (!currentTheme) {
      recursionStack.delete(packId)
      return []
    }
    
    const dependencies = analyzeThemeDependencies(currentTheme, allThemes)
    
    for (const dep of dependencies) {
      const cycle = hasCircularDep(dep.packId, [...path, packId])
      if (cycle.length > 0) {
        recursionStack.delete(packId)
        return cycle
      }
    }
    
    recursionStack.delete(packId)
    return []
  }
  
  return hasCircularDep(theme.packId)
}

/**
 * Generate theme documentation
 */
export function generateThemeDocumentation(theme: WidgetPackTheme): string {
  const metadata = extractThemeMetadata(theme)
  
  let doc = `# ${theme.packName} Theme\n\n`
  
  if (metadata.description) {
    doc += `${metadata.description}\n\n`
  }
  
  doc += `**Version:** ${theme.version}\n`
  if (metadata.author) {
    doc += `**Author:** ${metadata.author}\n`
  }
  if (metadata.license) {
    doc += `**License:** ${metadata.license}\n`
  }
  doc += `**Variables:** ${metadata.variableCount}\n`
  doc += `**Categories:** ${metadata.categoryCount}\n\n`
  
  // Categories and variables
  Object.entries(theme.categories).forEach(([, category]) => {
    doc += `## ${category.name}\n\n`
    
    if (category.description) {
      doc += `${category.description}\n\n`
    }
    
    doc += '| Variable | Type | Default | Description |\n'
    doc += '|----------|------|---------|-------------|\n'
    
    Object.entries(category.variables).forEach(([, variable]) => {
      doc += `| \`${variable.name}\` | ${variable.type} | \`${variable.default}\` | ${variable.description} |\n`
    })
    
    doc += '\n'
  })
  
  // Variants
  if (theme.variants && Object.keys(theme.variants).length > 0) {
    doc += '## Theme Variants\n\n'
    
    Object.entries(theme.variants).forEach(([, variant]) => {
      doc += `### ${variant.name}\n\n`
      doc += `${variant.description}\n\n`
      
      if (variant.overrides && Object.keys(variant.overrides).length > 0) {
        doc += '**Overrides:**\n\n'
        Object.entries(variant.overrides).forEach(([key, value]) => {
          doc += `- \`${key}\`: \`${value}\`\n`
        })
        doc += '\n'
      }
    })
  }
  
  return doc
}

/**
 * Compare two themes and generate diff
 */
export function compareThemes(
  themeA: WidgetPackTheme,
  themeB: WidgetPackTheme
): {
  added: string[]
  removed: string[]
  modified: Array<{ variable: string; oldValue: string; newValue: string }>
  unchanged: string[]
} {
  const added: string[] = []
  const removed: string[] = []
  const modified: Array<{ variable: string; oldValue: string; newValue: string }> = []
  const unchanged: string[] = []
  
  const varsA = new Set(Object.keys(themeA.cssVariables))
  const varsB = new Set(Object.keys(themeB.cssVariables))
  
  // Find added variables
  varsB.forEach(varName => {
    if (!varsA.has(varName)) {
      added.push(varName)
    }
  })
  
  // Find removed variables
  varsA.forEach(varName => {
    if (!varsB.has(varName)) {
      removed.push(varName)
    }
  })
  
  // Find modified and unchanged variables
  varsA.forEach(varName => {
    if (varsB.has(varName)) {
      const valueA = themeA.cssVariables[varName]
      const valueB = themeB.cssVariables[varName]
      
      if (valueA !== valueB) {
        modified.push({
          variable: varName,
          oldValue: valueA,
          newValue: valueB
        })
      } else {
        unchanged.push(varName)
      }
    }
  })
  
  return { added, removed, modified, unchanged }
}

/**
 * Calculate theme complexity score
 */
export function calculateThemeComplexity(theme: WidgetPackTheme): {
  score: number
  factors: {
    variableCount: number
    categoryCount: number
    dependencyCount: number
    variantCount: number
    complexityFactors: string[]
  }
} {
  const variableCount = Object.values(theme.categories).reduce(
    (count, category) => count + Object.keys(category.variables).length,
    0
  )
  
  const categoryCount = Object.keys(theme.categories).length
  const variantCount = theme.variants ? Object.keys(theme.variants).length : 0
  
  // Analyze variable complexity
  const complexityFactors: string[] = []
  let complexVariables = 0
  
  Object.values(theme.categories).forEach(category => {
    Object.values(category.variables).forEach(variable => {
      // Check for complex values
      if (variable.default.includes('calc(')) {
        complexVariables++
        complexityFactors.push('CSS calc() functions')
      }
      if (variable.default.includes('var(')) {
        complexVariables++
        complexityFactors.push('Variable references')
      }
      if (variable.type === 'shadow' && variable.default.includes(',')) {
        complexVariables++
        complexityFactors.push('Multiple shadows')
      }
    })
  })
  
  // Calculate score (0-100)
  let score = 0
  score += Math.min(variableCount * 2, 40) // Max 40 points for variables
  score += Math.min(categoryCount * 5, 20) // Max 20 points for categories
  score += Math.min(variantCount * 3, 15) // Max 15 points for variants
  score += Math.min(complexVariables * 2, 25) // Max 25 points for complexity
  
  return {
    score: Math.min(score, 100),
    factors: {
      variableCount,
      categoryCount,
      dependencyCount: 0, // Would need to analyze dependencies
      variantCount,
      complexityFactors: [...new Set(complexityFactors)]
    }
  }
}

/**
 * Get theme usage statistics
 */
export function getThemeUsageStats(
  theme: WidgetPackTheme,
  usageData?: Record<string, number>
): {
  totalUsage: number
  popularVariables: Array<{ variable: string; usage: number }>
  unusedVariables: string[]
  categoryUsage: Record<string, number>
} {
  const totalUsage = usageData ? Object.values(usageData).reduce((sum, count) => sum + count, 0) : 0
  
  const popularVariables = usageData
    ? Object.entries(usageData)
        .map(([variable, usage]) => ({ variable, usage }))
        .sort((a, b) => b.usage - a.usage)
        .slice(0, 10)
    : []
  
  const unusedVariables = Object.keys(theme.cssVariables).filter(
    varName => !usageData || usageData[varName] === 0
  )
  
  const categoryUsage: Record<string, number> = {}
  Object.entries(theme.categories).forEach(([categoryName, category]) => {
    categoryUsage[categoryName] = Object.keys(category.variables).reduce(
      (sum, varName) => sum + (usageData?.[varName] || 0),
      0
    )
  })
  
  return {
    totalUsage,
    popularVariables,
    unusedVariables,
    categoryUsage
  }
}
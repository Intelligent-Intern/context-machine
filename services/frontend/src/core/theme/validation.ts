// Theme validation utilities
import type { ThemeVariable } from './registry'

export interface ValidationResult {
  valid: boolean
  error?: string
  warnings?: string[]
}

export interface ThemeValidationResult {
  valid: boolean
  errors: Record<string, string>
  warnings: Record<string, string[]>
  summary: {
    totalVariables: number
    validVariables: number
    errorCount: number
    warningCount: number
  }
}

/**
 * Validate a complete theme configuration
 */
export function validateTheme(
  themeVariables: Record<string, ThemeVariable>,
  themeValues: Record<string, string>
): ThemeValidationResult {
  const errors: Record<string, string> = {}
  const warnings: Record<string, string[]> = {}
  let validCount = 0
  
  // Validate each theme value against its variable definition
  Object.entries(themeValues).forEach(([key, value]) => {
    const variable = themeVariables[key]
    if (!variable) {
      warnings[key] = warnings[key] || []
      warnings[key].push('Variable definition not found')
      return
    }
    
    const result = validateThemeVariable(variable, value)
    if (result.valid) {
      validCount++
    } else {
      errors[key] = result.error || 'Validation failed'
    }
    
    if (result.warnings && result.warnings.length > 0) {
      warnings[key] = warnings[key] || []
      warnings[key].push(...result.warnings)
    }
  })
  
  // Check for missing required variables
  Object.entries(themeVariables).forEach(([key]) => {
    if (!(key in themeValues)) {
      warnings[key] = warnings[key] || []
      warnings[key].push('Missing value, using default')
    }
  })
  
  const totalVariables = Object.keys(themeVariables).length
  const errorCount = Object.keys(errors).length
  const warningCount = Object.keys(warnings).length
  
  return {
    valid: errorCount === 0,
    errors,
    warnings,
    summary: {
      totalVariables,
      validVariables: validCount,
      errorCount,
      warningCount
    }
  }
}

/**
 * Validate a single theme variable value
 */
export function validateThemeVariable(variable: ThemeVariable, value: string): ValidationResult {
  const warnings: string[] = []
  
  try {
    // Type-specific validation
    switch (variable.type) {
      case 'color':
        return validateColorValue(value)
      
      case 'size':
        return validateSizeValue(value, variable.min, variable.max, variable.unit)
      
      case 'font':
        return validateFontValue(value, variable.options)
      
      case 'spacing':
        return validateSpacingValue(value, variable.min, variable.max)
      
      case 'shadow':
        return validateShadowValue(value)
      
      case 'border':
        return validateBorderValue(value)
      
      case 'transition':
        return validateTransitionValue(value)
      
      default:
        return { valid: true, warnings: ['Unknown variable type'] }
    }
  } catch (error) {
    return {
      valid: false,
      error: `Validation error: ${(error as Error).message}`
    }
  }
}

/**
 * Validate color values
 */
function validateColorValue(value: string): ValidationResult {
  const trimmedValue = value.trim()
  
  // Empty value
  if (!trimmedValue) {
    return { valid: false, error: 'Color value cannot be empty' }
  }
  
  // Hex colors
  if (trimmedValue.startsWith('#')) {
    const hexRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/
    if (!hexRegex.test(trimmedValue)) {
      return { valid: false, error: 'Invalid hex color format' }
    }
    return { valid: true }
  }
  
  // RGB/RGBA colors
  if (trimmedValue.startsWith('rgb')) {
    const rgbRegex = /^rgba?\(\s*(\d+(?:\.\d+)?%?)\s*,\s*(\d+(?:\.\d+)?%?)\s*,\s*(\d+(?:\.\d+)?%?)\s*(?:,\s*(\d+(?:\.\d+)?))?\s*\)$/
    if (!rgbRegex.test(trimmedValue)) {
      return { valid: false, error: 'Invalid RGB/RGBA color format' }
    }
    
    // Validate RGB values
    const match = trimmedValue.match(rgbRegex)
    if (match) {
      const [, r, g, b, a] = match
      
      // Check RGB values (0-255 or 0-100%)
      const rgbValues = [r, g, b]
      for (const val of rgbValues) {
        if (val.includes('%')) {
          const percent = parseFloat(val)
          if (percent < 0 || percent > 100) {
            return { valid: false, error: 'RGB percentage values must be between 0% and 100%' }
          }
        } else {
          const num = parseFloat(val)
          if (num < 0 || num > 255) {
            return { valid: false, error: 'RGB values must be between 0 and 255' }
          }
        }
      }
      
      // Check alpha value (0-1)
      if (a !== undefined) {
        const alpha = parseFloat(a)
        if (alpha < 0 || alpha > 1) {
          return { valid: false, error: 'Alpha value must be between 0 and 1' }
        }
      }
    }
    
    return { valid: true }
  }
  
  // HSL/HSLA colors
  if (trimmedValue.startsWith('hsl')) {
    const hslRegex = /^hsla?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%\s*(?:,\s*(\d+(?:\.\d+)?))?\s*\)$/
    if (!hslRegex.test(trimmedValue)) {
      return { valid: false, error: 'Invalid HSL/HSLA color format' }
    }
    
    const match = trimmedValue.match(hslRegex)
    if (match) {
      const [, h, s, l, a] = match
      
      // Validate hue (0-360)
      const hue = parseFloat(h)
      if (hue < 0 || hue > 360) {
        return { valid: false, error: 'Hue value must be between 0 and 360' }
      }
      
      // Validate saturation and lightness (0-100%)
      const saturation = parseFloat(s)
      const lightness = parseFloat(l)
      if (saturation < 0 || saturation > 100) {
        return { valid: false, error: 'Saturation must be between 0% and 100%' }
      }
      if (lightness < 0 || lightness > 100) {
        return { valid: false, error: 'Lightness must be between 0% and 100%' }
      }
      
      // Check alpha value
      if (a !== undefined) {
        const alpha = parseFloat(a)
        if (alpha < 0 || alpha > 1) {
          return { valid: false, error: 'Alpha value must be between 0 and 1' }
        }
      }
    }
    
    return { valid: true }
  }
  
  // CSS named colors (basic validation)
  const namedColors = [
    'transparent', 'currentColor', 'inherit', 'initial', 'unset',
    'black', 'white', 'red', 'green', 'blue', 'yellow', 'cyan', 'magenta',
    'gray', 'grey', 'orange', 'purple', 'pink', 'brown', 'navy', 'teal'
  ]
  
  if (namedColors.includes(trimmedValue.toLowerCase())) {
    return { valid: true }
  }
  
  // CSS variables
  if (trimmedValue.startsWith('var(')) {
    const varRegex = /^var\(\s*--[a-zA-Z0-9-_]+\s*(?:,\s*.+)?\s*\)$/
    if (!varRegex.test(trimmedValue)) {
      return { valid: false, error: 'Invalid CSS variable format' }
    }
    return { valid: true, warnings: ['CSS variable reference - cannot validate actual value'] }
  }
  
  return { valid: false, error: 'Unrecognized color format' }
}

/**
 * Validate size values
 */
function validateSizeValue(value: string, min?: number, max?: number, expectedUnit?: string): ValidationResult {
  const trimmedValue = value.trim()
  const warnings: string[] = []
  
  if (!trimmedValue) {
    return { valid: false, error: 'Size value cannot be empty' }
  }
  
  // CSS variables
  if (trimmedValue.startsWith('var(')) {
    return { valid: true, warnings: ['CSS variable reference - cannot validate actual value'] }
  }
  
  // Size with unit
  const sizeRegex = /^(\d*\.?\d+)(px|rem|em|%|vh|vw|pt|pc|in|cm|mm|ex|ch|vmin|vmax|fr)?$/
  const match = trimmedValue.match(sizeRegex)
  
  if (!match) {
    return { valid: false, error: 'Invalid size format' }
  }
  
  const [, numStr, unit] = match
  const numValue = parseFloat(numStr)
  
  // Validate numeric value
  if (isNaN(numValue)) {
    return { valid: false, error: 'Invalid numeric value' }
  }
  
  // Check min/max constraints
  if (min !== undefined && numValue < min) {
    return { valid: false, error: `Value must be at least ${min}` }
  }
  if (max !== undefined && numValue > max) {
    return { valid: false, error: `Value must be at most ${max}` }
  }
  
  // Check expected unit
  if (expectedUnit && unit !== expectedUnit) {
    warnings.push(`Expected unit '${expectedUnit}', got '${unit || 'none'}'`)
  }
  
  // Warn about unitless values (except for 0)
  if (!unit && numValue !== 0) {
    warnings.push('Consider adding a unit (px, rem, em, etc.)')
  }
  
  return { valid: true, warnings }
}

/**
 * Validate font values
 */
function validateFontValue(value: string, options?: string[]): ValidationResult {
  const trimmedValue = value.trim()
  
  if (!trimmedValue) {
    return { valid: false, error: 'Font value cannot be empty' }
  }
  
  // CSS variables
  if (trimmedValue.startsWith('var(')) {
    return { valid: true, warnings: ['CSS variable reference - cannot validate actual value'] }
  }
  
  // Check against allowed options
  if (options && options.length > 0) {
    if (!options.includes(trimmedValue)) {
      return { 
        valid: false, 
        error: `Value must be one of: ${options.join(', ')}` 
      }
    }
  }
  
  return { valid: true }
}

/**
 * Validate spacing values
 */
function validateSpacingValue(value: string, min?: number, max?: number): ValidationResult {
  const trimmedValue = value.trim()
  
  if (!trimmedValue) {
    return { valid: false, error: 'Spacing value cannot be empty' }
  }
  
  // CSS variables
  if (trimmedValue.startsWith('var(')) {
    return { valid: true, warnings: ['CSS variable reference - cannot validate actual value'] }
  }
  
  // Multiple values (e.g., "10px 20px" or "1rem 2rem 1rem 2rem")
  const values = trimmedValue.split(/\s+/)
  
  for (const val of values) {
    const result = validateSizeValue(val, min, max)
    if (!result.valid) {
      return result
    }
  }
  
  return { valid: true }
}

/**
 * Validate shadow values
 */
function validateShadowValue(value: string): ValidationResult {
  const trimmedValue = value.trim()
  
  if (!trimmedValue || trimmedValue === 'none') {
    return { valid: true }
  }
  
  // CSS variables
  if (trimmedValue.startsWith('var(')) {
    return { valid: true, warnings: ['CSS variable reference - cannot validate actual value'] }
  }
  
  // Basic shadow validation (simplified)
  const shadowRegex = /^(\d+px\s+\d+px(\s+\d+px)?(\s+\d+px)?(\s+[^,]+)?)(,\s*\d+px\s+\d+px(\s+\d+px)?(\s+\d+px)?(\s+[^,]+)?)*$/
  
  if (!shadowRegex.test(trimmedValue)) {
    return { valid: false, error: 'Invalid shadow format' }
  }
  
  return { valid: true }
}

/**
 * Validate border values
 */
function validateBorderValue(value: string): ValidationResult {
  const trimmedValue = value.trim()
  
  if (!trimmedValue || trimmedValue === 'none') {
    return { valid: true }
  }
  
  // CSS variables
  if (trimmedValue.startsWith('var(')) {
    return { valid: true, warnings: ['CSS variable reference - cannot validate actual value'] }
  }
  
  // Border radius (just numbers with units)
  if (/^\d*\.?\d+(px|rem|em|%)?$/.test(trimmedValue)) {
    return { valid: true }
  }
  
  // Full border shorthand (simplified validation)
  const borderRegex = /^(\d+px\s+)?(solid|dashed|dotted|double|groove|ridge|inset|outset)?\s*([^,]+)?$/
  
  if (!borderRegex.test(trimmedValue)) {
    return { valid: false, error: 'Invalid border format' }
  }
  
  return { valid: true }
}

/**
 * Validate transition values
 */
function validateTransitionValue(value: string): ValidationResult {
  const trimmedValue = value.trim()
  
  if (!trimmedValue || trimmedValue === 'none') {
    return { valid: true }
  }
  
  // CSS variables
  if (trimmedValue.startsWith('var(')) {
    return { valid: true, warnings: ['CSS variable reference - cannot validate actual value'] }
  }
  
  // Basic transition validation
  const transitionRegex = /^(all|[a-zA-Z-]+)(\s+\d*\.?\d+(s|ms))?(\s+(ease|linear|ease-in|ease-out|ease-in-out|cubic-bezier\([^)]+\)))?(\s+\d*\.?\d+(s|ms))?$/
  
  if (!transitionRegex.test(trimmedValue)) {
    return { valid: false, error: 'Invalid transition format' }
  }
  
  return { valid: true }
}

/**
 * Get validation suggestions for a variable type
 */
export function getValidationSuggestions(type: ThemeVariable['type']): string[] {
  switch (type) {
    case 'color':
      return [
        'Use hex format: #ff0000',
        'Use RGB: rgb(255, 0, 0)',
        'Use RGBA: rgba(255, 0, 0, 0.5)',
        'Use HSL: hsl(0, 100%, 50%)',
        'Use CSS variables: var(--primary-color)'
      ]
    
    case 'size':
      return [
        'Use pixels: 16px',
        'Use rem units: 1rem',
        'Use percentages: 100%',
        'Use viewport units: 50vh, 50vw',
        'Use CSS variables: var(--base-size)'
      ]
    
    case 'font':
      return [
        'Use font family names: "Inter", sans-serif',
        'Use system fonts: system-ui',
        'Use web safe fonts: Arial, Helvetica',
        'Use CSS variables: var(--font-family)'
      ]
    
    case 'spacing':
      return [
        'Single value: 16px',
        'Two values: 16px 24px',
        'Four values: 16px 24px 16px 24px',
        'Use CSS variables: var(--spacing-md)'
      ]
    
    case 'shadow':
      return [
        'Box shadow: 0 2px 4px rgba(0,0,0,0.1)',
        'Multiple shadows: 0 1px 2px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.1)',
        'No shadow: none',
        'Use CSS variables: var(--shadow-md)'
      ]
    
    case 'border':
      return [
        'Border radius: 8px',
        'Border width: 1px',
        'Full border: 1px solid #ccc',
        'Use CSS variables: var(--border-radius)'
      ]
    
    case 'transition':
      return [
        'Simple transition: all 0.3s ease',
        'Property specific: opacity 0.2s ease-out',
        'Multiple properties: opacity 0.2s, transform 0.3s',
        'Use CSS variables: var(--transition-fast)'
      ]
    
    default:
      return ['Enter a valid CSS value']
  }
}
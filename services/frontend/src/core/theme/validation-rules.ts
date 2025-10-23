// Theme Validation Rules and Utilities
import type { 
  ThemeVariableSchema, 
  ThemeCategorySchema, 
  WidgetPackThemeSchema 
} from './schema'
import { 
  THEME_NAMING_CONVENTIONS,
  validateThemeVariableSchema,
  validateThemeCategorySchema,
  validateWidgetPackThemeSchema
} from './schema'

export interface ValidationError {
  code: string
  message: string
  path: string
  severity: 'error' | 'warning' | 'info'
  suggestion?: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  info: ValidationError[]
}

/**
 * Comprehensive theme validation
 */
export class ThemeValidator {
  private errors: ValidationError[] = []
  private warnings: ValidationError[] = []
  private info: ValidationError[] = []

  /**
   * Validate complete widget pack theme schema
   */
  validateWidgetPackTheme(schema: any, packId?: string): ValidationResult {
    this.reset()
    
    // Basic schema validation
    if (!validateWidgetPackThemeSchema(schema)) {
      this.addError('INVALID_SCHEMA', 'Theme schema is invalid', '')
      return this.getResult()
    }
    
    // Validate metadata
    this.validateMetadata(schema, packId)
    
    // Validate categories
    this.validateCategories(schema.categories)
    
    // Validate variants
    if (schema.variants) {
      this.validateVariants(schema.variants)
    }
    
    // Validate dependencies
    if (schema.dependencies) {
      this.validateDependencies(schema.dependencies)
    }
    
    return this.getResult()
  }

  /**
   * Validate theme metadata
   */
  private validateMetadata(schema: WidgetPackThemeSchema, packId?: string): void {
    // Version validation
    if (!this.isValidVersion(schema.version)) {
      this.addError('INVALID_VERSION', `Invalid version format: ${schema.version}`, 'version')
    }
    
    // Name validation
    if (packId && schema.name !== packId) {
      this.addWarning('NAME_MISMATCH', `Theme name "${schema.name}" doesn't match pack ID "${packId}"`, 'name')
    }
    
    // Description validation
    if (schema.description && schema.description.length < 10) {
      this.addWarning('SHORT_DESCRIPTION', 'Theme description is very short', 'description')
    }
    
    // License validation
    if (schema.license && !this.isValidLicense(schema.license)) {
      this.addWarning('UNKNOWN_LICENSE', `Unknown license: ${schema.license}`, 'license')
    }
    
    // Keywords validation
    if (schema.keywords) {
      if (schema.keywords.length === 0) {
        this.addInfo('NO_KEYWORDS', 'Consider adding keywords for better discoverability', 'keywords')
      } else if (schema.keywords.length > 10) {
        this.addWarning('TOO_MANY_KEYWORDS', 'Too many keywords (max 10 recommended)', 'keywords')
      }
    }
  }

  /**
   * Validate theme categories
   */
  private validateCategories(categories: Record<string, ThemeCategorySchema>): void {
    if (Object.keys(categories).length === 0) {
      this.addError('NO_CATEGORIES', 'Theme must have at least one category', 'categories')
      return
    }
    
    Object.entries(categories).forEach(([categoryKey, category]) => {
      this.validateCategory(categoryKey, category)
    })
    
    // Check for recommended categories
    this.checkRecommendedCategories(categories)
  }

  /**
   * Validate individual category
   */
  private validateCategory(categoryKey: string, category: ThemeCategorySchema): void {
    const path = `categories.${categoryKey}`
    
    // Basic schema validation
    if (!validateThemeCategorySchema(category)) {
      this.addError('INVALID_CATEGORY', `Invalid category schema: ${categoryKey}`, path)
      return
    }
    
    // Category name validation
    if (!THEME_NAMING_CONVENTIONS.CATEGORY_NAME_PATTERN.test(categoryKey)) {
      this.addError('INVALID_CATEGORY_NAME', `Invalid category name: ${categoryKey}`, path)
    }
    
    // Variables validation
    if (Object.keys(category.variables).length === 0) {
      this.addWarning('EMPTY_CATEGORY', `Category "${categoryKey}" has no variables`, path)
    }
    
    Object.entries(category.variables).forEach(([varKey, variable]) => {
      this.validateVariable(varKey, variable, `${path}.variables.${varKey}`)
    })
    
    // Order validation
    if (category.order !== undefined && category.order < 0) {
      this.addWarning('NEGATIVE_ORDER', `Category order should be positive: ${category.order}`, `${path}.order`)
    }
  }

  /**
   * Validate theme variable
   */
  private validateVariable(varKey: string, variable: ThemeVariableSchema, path: string): void {
    // Basic schema validation
    if (!validateThemeVariableSchema(variable)) {
      this.addError('INVALID_VARIABLE', `Invalid variable schema: ${varKey}`, path)
      return
    }
    
    // Variable name validation
    if (variable.name !== varKey) {
      this.addError('NAME_MISMATCH', `Variable name "${variable.name}" doesn't match key "${varKey}"`, path)
    }
    
    if (!THEME_NAMING_CONVENTIONS.VARIABLE_NAME_PATTERN.test(variable.name)) {
      this.addError('INVALID_VARIABLE_NAME', `Invalid variable name: ${variable.name}`, path)
    }
    
    // Reserved prefix check
    const hasReservedPrefix = THEME_NAMING_CONVENTIONS.RESERVED_PREFIXES.some(prefix => 
      variable.name.startsWith(prefix)
    )
    if (hasReservedPrefix) {
      this.addError('RESERVED_PREFIX', `Variable name uses reserved prefix: ${variable.name}`, path)
    }
    
    // Type-specific validation
    this.validateVariableValue(variable, path)
    
    // Constraint validation
    this.validateVariableConstraints(variable, path)
    
    // Description validation
    if (variable.description.length < 5) {
      this.addWarning('SHORT_DESCRIPTION', `Variable description is too short: ${variable.name}`, path)
    }
    
    // Examples validation
    if (variable.examples) {
      this.validateVariableExamples(variable, path)
    }
  }

  /**
   * Validate variable value based on type
   */
  private validateVariableValue(variable: ThemeVariableSchema, path: string): void {
    const { type, default: defaultValue } = variable
    
    switch (type) {
      case 'color':
        if (!this.isValidColor(defaultValue)) {
          this.addError('INVALID_COLOR', `Invalid color value: ${defaultValue}`, `${path}.default`)
        }
        break
        
      case 'size':
        if (!this.isValidSize(defaultValue)) {
          this.addError('INVALID_SIZE', `Invalid size value: ${defaultValue}`, `${path}.default`)
        }
        break
        
      case 'font':
        if (!this.isValidFont(defaultValue)) {
          this.addError('INVALID_FONT', `Invalid font value: ${defaultValue}`, `${path}.default`)
        }
        break
        
      case 'spacing':
        if (!this.isValidSpacing(defaultValue)) {
          this.addError('INVALID_SPACING', `Invalid spacing value: ${defaultValue}`, `${path}.default`)
        }
        break
        
      case 'shadow':
        if (!this.isValidShadow(defaultValue)) {
          this.addError('INVALID_SHADOW', `Invalid shadow value: ${defaultValue}`, `${path}.default`)
        }
        break
        
      case 'border':
        if (!this.isValidBorder(defaultValue)) {
          this.addError('INVALID_BORDER', `Invalid border value: ${defaultValue}`, `${path}.default`)
        }
        break
        
      case 'transition':
        if (!this.isValidTransition(defaultValue)) {
          this.addError('INVALID_TRANSITION', `Invalid transition value: ${defaultValue}`, `${path}.default`)
        }
        break
        
      case 'opacity':
        if (!this.isValidOpacity(defaultValue)) {
          this.addError('INVALID_OPACITY', `Invalid opacity value: ${defaultValue}`, `${path}.default`)
        }
        break
        
      case 'z-index':
        if (!this.isValidZIndex(defaultValue)) {
          this.addError('INVALID_Z_INDEX', `Invalid z-index value: ${defaultValue}`, `${path}.default`)
        }
        break
    }
  }

  /**
   * Validate variable constraints
   */
  private validateVariableConstraints(variable: ThemeVariableSchema, path: string): void {
    const { min, max, step, options } = variable
    
    // Min/max validation
    if (min !== undefined && max !== undefined && min >= max) {
      this.addError('INVALID_RANGE', `Min value (${min}) must be less than max value (${max})`, path)
    }
    
    // Step validation
    if (step !== undefined && step <= 0) {
      this.addError('INVALID_STEP', `Step value must be positive: ${step}`, `${path}.step`)
    }
    
    // Options validation
    if (options && options.length === 0) {
      this.addWarning('EMPTY_OPTIONS', 'Options array is empty', `${path}.options`)
    }
    
    // Check if default value is in options
    if (options && !options.includes(variable.default)) {
      this.addError('DEFAULT_NOT_IN_OPTIONS', `Default value "${variable.default}" is not in options`, path)
    }
  }

  /**
   * Validate variable examples
   */
  private validateVariableExamples(variable: ThemeVariableSchema, path: string): void {
    if (!variable.examples || variable.examples.length === 0) return
    
    // Check if default is included in examples
    if (!variable.examples.includes(variable.default)) {
      this.addInfo('DEFAULT_NOT_IN_EXAMPLES', 'Consider including default value in examples', `${path}.examples`)
    }
    
    // Validate each example
    variable.examples.forEach((example, index) => {
      if (!this.isValidValueForType(example, variable.type)) {
        this.addWarning('INVALID_EXAMPLE', `Invalid example value: ${example}`, `${path}.examples[${index}]`)
      }
    })
  }

  /**
   * Validate theme variants
   */
  private validateVariants(variants: Record<string, any>): void {
    Object.entries(variants).forEach(([variantKey, variant]) => {
      const path = `variants.${variantKey}`
      
      // Variant name validation
      if (!THEME_NAMING_CONVENTIONS.VARIANT_NAME_PATTERN.test(variantKey)) {
        this.addError('INVALID_VARIANT_NAME', `Invalid variant name: ${variantKey}`, path)
      }
      
      // Required fields
      if (!variant.name || typeof variant.name !== 'string') {
        this.addError('MISSING_VARIANT_NAME', `Variant missing name: ${variantKey}`, `${path}.name`)
      }
      
      if (!variant.description || typeof variant.description !== 'string') {
        this.addError('MISSING_VARIANT_DESCRIPTION', `Variant missing description: ${variantKey}`, `${path}.description`)
      }
      
      // Overrides validation
      if (!variant.overrides || typeof variant.overrides !== 'object') {
        this.addError('MISSING_VARIANT_OVERRIDES', `Variant missing overrides: ${variantKey}`, `${path}.overrides`)
      } else if (Object.keys(variant.overrides).length === 0) {
        this.addWarning('EMPTY_VARIANT_OVERRIDES', `Variant has no overrides: ${variantKey}`, `${path}.overrides`)
      }
    })
  }

  /**
   * Validate dependencies
   */
  private validateDependencies(dependencies: Record<string, string>): void {
    Object.entries(dependencies).forEach(([depName, version]) => {
      if (!this.isValidVersion(version)) {
        this.addWarning('INVALID_DEPENDENCY_VERSION', `Invalid dependency version: ${depName}@${version}`, `dependencies.${depName}`)
      }
    })
  }

  /**
   * Check for recommended categories
   */
  private checkRecommendedCategories(categories: Record<string, ThemeCategorySchema>): void {
    const hasColors = 'colors' in categories
    const hasTypography = 'typography' in categories
    const hasSpacing = 'spacing' in categories
    
    if (!hasColors) {
      this.addInfo('MISSING_COLORS', 'Consider adding a "colors" category for better organization', 'categories')
    }
    
    if (!hasTypography) {
      this.addInfo('MISSING_TYPOGRAPHY', 'Consider adding a "typography" category for font-related variables', 'categories')
    }
    
    if (!hasSpacing) {
      this.addInfo('MISSING_SPACING', 'Consider adding a "spacing" category for layout variables', 'categories')
    }
  }

  /**
   * Value validation methods
   */
  private isValidColor(value: string): boolean {
    const colorRegex = /^(#[0-9a-fA-F]{3,8}|rgb\(|rgba\(|hsl\(|hsla\(|var\(|[a-zA-Z]+).*$/
    return colorRegex.test(value.trim())
  }

  private isValidSize(value: string): boolean {
    const sizeRegex = /^(\d*\.?\d+)(px|rem|em|%|vh|vw|pt|pc|in|cm|mm|ex|ch|vmin|vmax|fr)?$|^var\(/
    return sizeRegex.test(value.trim())
  }

  private isValidFont(value: string): boolean {
    return value.trim().length > 0
  }

  private isValidSpacing(value: string): boolean {
    // Allow single values or multiple values separated by spaces
    const spacingRegex = /^(\d*\.?\d+(px|rem|em|%|vh|vw|pt|pc|in|cm|mm|ex|ch|vmin|vmax|fr)?\s*)+$|^var\(/
    return spacingRegex.test(value.trim()) || value.trim() === '0'
  }

  private isValidShadow(value: string): boolean {
    return value.trim() === 'none' || value.trim().length > 0
  }

  private isValidBorder(value: string): boolean {
    return value.trim() === 'none' || value.trim().length > 0
  }

  private isValidTransition(value: string): boolean {
    return value.trim() === 'none' || value.trim().length > 0
  }

  private isValidOpacity(value: string): boolean {
    const num = parseFloat(value)
    return !isNaN(num) && num >= 0 && num <= 1
  }

  private isValidZIndex(value: string): boolean {
    const num = parseInt(value, 10)
    return !isNaN(num) && num >= 0
  }

  private isValidValueForType(value: string, type: ThemeVariableSchema['type']): boolean {
    switch (type) {
      case 'color': return this.isValidColor(value)
      case 'size': return this.isValidSize(value)
      case 'font': return this.isValidFont(value)
      case 'spacing': return this.isValidSpacing(value)
      case 'shadow': return this.isValidShadow(value)
      case 'border': return this.isValidBorder(value)
      case 'transition': return this.isValidTransition(value)
      case 'opacity': return this.isValidOpacity(value)
      case 'z-index': return this.isValidZIndex(value)
      default: return true
    }
  }

  private isValidVersion(version: string): boolean {
    const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9-]+)?(\+[a-zA-Z0-9-]+)?$/
    return semverRegex.test(version)
  }

  private isValidLicense(license: string): boolean {
    const commonLicenses = [
      'MIT', 'Apache-2.0', 'GPL-3.0', 'BSD-3-Clause', 'ISC', 
      'LGPL-2.1', 'MPL-2.0', 'CDDL-1.0', 'EPL-2.0'
    ]
    return commonLicenses.includes(license) || license.startsWith('SPDX:')
  }

  /**
   * Helper methods for managing validation results
   */
  private addError(code: string, message: string, path: string, suggestion?: string): void {
    this.errors.push({ code, message, path, severity: 'error', suggestion })
  }

  private addWarning(code: string, message: string, path: string, suggestion?: string): void {
    this.warnings.push({ code, message, path, severity: 'warning', suggestion })
  }

  private addInfo(code: string, message: string, path: string, suggestion?: string): void {
    this.info.push({ code, message, path, severity: 'info', suggestion })
  }

  private reset(): void {
    this.errors = []
    this.warnings = []
    this.info = []
  }

  private getResult(): ValidationResult {
    return {
      valid: this.errors.length === 0,
      errors: [...this.errors],
      warnings: [...this.warnings],
      info: [...this.info]
    }
  }
}

/**
 * Quick validation functions
 */
export function validateThemeSchema(schema: any, packId?: string): ValidationResult {
  const validator = new ThemeValidator()
  return validator.validateWidgetPackTheme(schema, packId)
}

export function validateThemeVariable(variable: any): ValidationResult {
  const validator = new ThemeValidator()
  validator['validateVariable']('test', variable, 'variable')
  return validator['getResult']()
}

export function validateThemeCategory(category: any): ValidationResult {
  const validator = new ThemeValidator()
  validator['validateCategory']('test', category)
  return validator['getResult']()
}

/**
 * Validation error codes and their descriptions
 */
export const VALIDATION_ERROR_CODES = {
  // Schema errors
  INVALID_SCHEMA: 'Theme schema structure is invalid',
  INVALID_CATEGORY: 'Category schema is invalid',
  INVALID_VARIABLE: 'Variable schema is invalid',
  
  // Naming errors
  INVALID_CATEGORY_NAME: 'Category name must be lowercase and contain only letters and numbers',
  INVALID_VARIABLE_NAME: 'Variable name must be kebab-case',
  INVALID_VARIANT_NAME: 'Variant name must be kebab-case',
  RESERVED_PREFIX: 'Variable name uses a reserved prefix',
  NAME_MISMATCH: 'Name field does not match the key',
  
  // Value errors
  INVALID_COLOR: 'Color value is not in a valid format',
  INVALID_SIZE: 'Size value is not in a valid format',
  INVALID_FONT: 'Font value is not valid',
  INVALID_SPACING: 'Spacing value is not in a valid format',
  INVALID_SHADOW: 'Shadow value is not in a valid format',
  INVALID_BORDER: 'Border value is not in a valid format',
  INVALID_TRANSITION: 'Transition value is not in a valid format',
  INVALID_OPACITY: 'Opacity value must be between 0 and 1',
  INVALID_Z_INDEX: 'Z-index value must be a non-negative integer',
  
  // Constraint errors
  INVALID_RANGE: 'Min value must be less than max value',
  INVALID_STEP: 'Step value must be positive',
  DEFAULT_NOT_IN_OPTIONS: 'Default value must be included in options array',
  
  // Structure errors
  NO_CATEGORIES: 'Theme must have at least one category',
  EMPTY_CATEGORY: 'Category contains no variables',
  EMPTY_OPTIONS: 'Options array is empty',
  EMPTY_VARIANT_OVERRIDES: 'Variant has no override values',
  
  // Metadata errors
  INVALID_VERSION: 'Version must follow semantic versioning (x.y.z)',
  UNKNOWN_LICENSE: 'License is not a recognized SPDX identifier',
  SHORT_DESCRIPTION: 'Description should be more descriptive',
  TOO_MANY_KEYWORDS: 'Too many keywords (recommended maximum: 10)',
  
  // Missing fields
  MISSING_VARIANT_NAME: 'Variant must have a name',
  MISSING_VARIANT_DESCRIPTION: 'Variant must have a description',
  MISSING_VARIANT_OVERRIDES: 'Variant must have override values',
  
  // Recommendations
  NO_KEYWORDS: 'Adding keywords improves discoverability',
  DEFAULT_NOT_IN_EXAMPLES: 'Consider including default value in examples',
  INVALID_EXAMPLE: 'Example value is not valid for this variable type',
  MISSING_COLORS: 'Consider adding a colors category',
  MISSING_TYPOGRAPHY: 'Consider adding a typography category',
  MISSING_SPACING: 'Consider adding a spacing category',
  NEGATIVE_ORDER: 'Category order should be positive',
  INVALID_DEPENDENCY_VERSION: 'Dependency version is not valid'
} as const
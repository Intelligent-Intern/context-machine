// Theme Schema Definitions and Validation
export interface ThemeVariableSchema {
    name: string
    type: 'color' | 'size' | 'font' | 'spacing' | 'shadow' | 'border' | 'transition' | 'opacity' | 'z-index'
    default: string
    description: string
    category: string
    min?: number
    max?: number
    step?: number
    unit?: string
    options?: string[]
    required?: boolean
    deprecated?: boolean
    since?: string
    examples?: string[]
}

export interface ThemeCategorySchema {
    name: string
    description: string
    icon?: string
    order?: number
    variables: Record<string, ThemeVariableSchema>
}

export interface ThemeVariantSchema {
    name: string
    description: string
    preview?: string
    overrides: Record<string, string>
    conditions?: {
        mediaQuery?: string
        selector?: string
        userPreference?: string
    }
}

export interface WidgetPackThemeSchema {
    version: string
    name: string
    description?: string
    author?: string
    license?: string
    homepage?: string
    repository?: string
    keywords?: string[]
    categories: Record<string, ThemeCategorySchema>
    variants?: Record<string, ThemeVariantSchema>
    dependencies?: Record<string, string>
    peerDependencies?: Record<string, string>
    compatibility?: {
        minVersion?: string
        maxVersion?: string
        browsers?: string[]
    }
}

export interface ThemeFolderStructure {
    'variables.json'?: WidgetPackThemeSchema
    'variables.css'?: string
    'defaults.css'?: string
    'variants/'?: {
        [variantName: string]: {
            'variables.css': string
            'overrides.json'?: Record<string, string>
        }
    }
    'preview.png'?: string
    'README.md'?: string
    'CHANGELOG.md'?: string
}

/**
 * Standard theme folder structure for widget packs
 */
export const THEME_FOLDER_STRUCTURE = {
    // Required files
    VARIABLES_JSON: 'variables.json',
    VARIABLES_CSS: 'variables.css',

    // Optional files
    DEFAULTS_CSS: 'defaults.css',
    PREVIEW_IMAGE: 'preview.png',
    README: 'README.md',
    CHANGELOG: 'CHANGELOG.md',

    // Directories
    VARIANTS_DIR: 'variants',
    EXAMPLES_DIR: 'examples',
    DOCS_DIR: 'docs',

    // File patterns
    VARIANT_CSS_PATTERN: /^[a-z][a-z0-9-]*\.css$/,
    VARIANT_JSON_PATTERN: /^[a-z][a-z0-9-]*\.json$/
} as const

/**
 * Theme variable naming conventions
 */
export const THEME_NAMING_CONVENTIONS = {
    // Variable name patterns
    VARIABLE_NAME_PATTERN: /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/,
    CATEGORY_NAME_PATTERN: /^[a-z][a-z0-9]*$/,
    VARIANT_NAME_PATTERN: /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/,

    // CSS custom property patterns
    CSS_VAR_PATTERN: /^--[a-z][a-z0-9]*(-[a-z0-9]+)*$/,

    // Reserved prefixes
    RESERVED_PREFIXES: ['system', 'internal', 'private', 'temp'],

    // Standard categories
    STANDARD_CATEGORIES: [
        'colors',
        'typography',
        'spacing',
        'borders',
        'shadows',
        'transitions',
        'layout',
        'components'
    ],

    // Standard variable types
    STANDARD_TYPES: [
        'color',
        'size',
        'font',
        'spacing',
        'shadow',
        'border',
        'transition',
        'opacity',
        'z-index'
    ]
} as const

/**
 * Default theme categories with standard variables
 */
export const DEFAULT_THEME_CATEGORIES: Record<string, ThemeCategorySchema> = {
    colors: {
        name: 'Colors',
        description: 'Color palette and color-related variables',
        icon: '🎨',
        order: 1,
        variables: {
            'primary': {
                name: 'primary',
                type: 'color',
                default: '#3b82f6',
                description: 'Primary brand color',
                category: 'colors',
                examples: ['#3b82f6', '#ef4444', '#10b981']
            },
            'secondary': {
                name: 'secondary',
                type: 'color',
                default: '#6b7280',
                description: 'Secondary color for supporting elements',
                category: 'colors',
                examples: ['#6b7280', '#8b5cf6', '#f59e0b']
            },
            'accent': {
                name: 'accent',
                type: 'color',
                default: '#10b981',
                description: 'Accent color for highlights and calls-to-action',
                category: 'colors',
                examples: ['#10b981', '#f59e0b', '#ef4444']
            },
            'background': {
                name: 'background',
                type: 'color',
                default: '#ffffff',
                description: 'Main background color',
                category: 'colors',
                examples: ['#ffffff', '#f8fafc', '#1f2937']
            },
            'surface': {
                name: 'surface',
                type: 'color',
                default: '#f8fafc',
                description: 'Surface color for cards and panels',
                category: 'colors',
                examples: ['#f8fafc', '#ffffff', '#374151']
            },
            'text': {
                name: 'text',
                type: 'color',
                default: '#1f2937',
                description: 'Primary text color',
                category: 'colors',
                examples: ['#1f2937', '#374151', '#f9fafb']
            },
            'text-secondary': {
                name: 'text-secondary',
                type: 'color',
                default: '#6b7280',
                description: 'Secondary text color for less important content',
                category: 'colors',
                examples: ['#6b7280', '#9ca3af', '#d1d5db']
            },
            'border': {
                name: 'border',
                type: 'color',
                default: '#e5e7eb',
                description: 'Border color for dividers and outlines',
                category: 'colors',
                examples: ['#e5e7eb', '#d1d5db', '#4b5563']
            }
        }
    },

    typography: {
        name: 'Typography',
        description: 'Font families, sizes, weights, and text-related properties',
        icon: '📝',
        order: 2,
        variables: {
            'font-family': {
                name: 'font-family',
                type: 'font',
                default: 'Inter, system-ui, sans-serif',
                description: 'Primary font family',
                category: 'typography',
                examples: [
                    'Inter, system-ui, sans-serif',
                    'Georgia, serif',
                    'Monaco, monospace'
                ]
            },
            'font-size': {
                name: 'font-size',
                type: 'size',
                default: '14px',
                description: 'Base font size',
                category: 'typography',
                min: 10,
                max: 24,
                unit: 'px',
                examples: ['14px', '16px', '1rem']
            },
            'font-weight': {
                name: 'font-weight',
                type: 'font',
                default: '400',
                description: 'Normal font weight',
                category: 'typography',
                options: ['300', '400', '500', '600', '700'],
                examples: ['400', '500', '600']
            },
            'line-height': {
                name: 'line-height',
                type: 'size',
                default: '1.5',
                description: 'Base line height',
                category: 'typography',
                min: 1,
                max: 3,
                step: 0.1,
                examples: ['1.5', '1.6', '1.4']
            }
        }
    },

    spacing: {
        name: 'Spacing',
        description: 'Margins, padding, gaps, and layout spacing',
        icon: '📏',
        order: 3,
        variables: {
            'spacing-xs': {
                name: 'spacing-xs',
                type: 'spacing',
                default: '4px',
                description: 'Extra small spacing unit',
                category: 'spacing',
                examples: ['4px', '0.25rem', '2px']
            },
            'spacing-sm': {
                name: 'spacing-sm',
                type: 'spacing',
                default: '8px',
                description: 'Small spacing unit',
                category: 'spacing',
                examples: ['8px', '0.5rem', '6px']
            },
            'spacing-md': {
                name: 'spacing-md',
                type: 'spacing',
                default: '16px',
                description: 'Medium spacing unit (base)',
                category: 'spacing',
                examples: ['16px', '1rem', '12px']
            },
            'spacing-lg': {
                name: 'spacing-lg',
                type: 'spacing',
                default: '24px',
                description: 'Large spacing unit',
                category: 'spacing',
                examples: ['24px', '1.5rem', '20px']
            },
            'spacing-xl': {
                name: 'spacing-xl',
                type: 'spacing',
                default: '32px',
                description: 'Extra large spacing unit',
                category: 'spacing',
                examples: ['32px', '2rem', '28px']
            }
        }
    },

    borders: {
        name: 'Borders',
        description: 'Border widths, styles, and border radius values',
        icon: '⬜',
        order: 4,
        variables: {
            'border-width': {
                name: 'border-width',
                type: 'border',
                default: '1px',
                description: 'Standard border width',
                category: 'borders',
                examples: ['1px', '2px', '0.5px']
            },
            'border-radius': {
                name: 'border-radius',
                type: 'border',
                default: '6px',
                description: 'Standard border radius',
                category: 'borders',
                examples: ['6px', '8px', '4px', '0.375rem']
            },
            'border-radius-sm': {
                name: 'border-radius-sm',
                type: 'border',
                default: '4px',
                description: 'Small border radius',
                category: 'borders',
                examples: ['4px', '3px', '0.25rem']
            },
            'border-radius-lg': {
                name: 'border-radius-lg',
                type: 'border',
                default: '12px',
                description: 'Large border radius',
                category: 'borders',
                examples: ['12px', '16px', '0.75rem']
            }
        }
    },

    shadows: {
        name: 'Shadows',
        description: 'Box shadows and drop shadows',
        icon: '🌫️',
        order: 5,
        variables: {
            'shadow-sm': {
                name: 'shadow-sm',
                type: 'shadow',
                default: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                description: 'Small subtle shadow',
                category: 'shadows',
                examples: [
                    '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                    '0 1px 3px rgba(0, 0, 0, 0.1)'
                ]
            },
            'shadow-md': {
                name: 'shadow-md',
                type: 'shadow',
                default: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                description: 'Medium shadow for cards',
                category: 'shadows',
                examples: [
                    '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    '0 2px 8px rgba(0, 0, 0, 0.15)'
                ]
            },
            'shadow-lg': {
                name: 'shadow-lg',
                type: 'shadow',
                default: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                description: 'Large shadow for modals',
                category: 'shadows',
                examples: [
                    '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    '0 8px 24px rgba(0, 0, 0, 0.2)'
                ]
            }
        }
    },

    transitions: {
        name: 'Transitions',
        description: 'Animation durations, easing functions, and transitions',
        icon: '⚡',
        order: 6,
        variables: {
            'transition-fast': {
                name: 'transition-fast',
                type: 'transition',
                default: '150ms ease-out',
                description: 'Fast transition for hover effects',
                category: 'transitions',
                examples: ['150ms ease-out', '100ms ease', '200ms linear']
            },
            'transition-normal': {
                name: 'transition-normal',
                type: 'transition',
                default: '250ms ease-in-out',
                description: 'Normal transition for most animations',
                category: 'transitions',
                examples: ['250ms ease-in-out', '300ms ease', '200ms cubic-bezier(0.4, 0, 0.2, 1)']
            },
            'transition-slow': {
                name: 'transition-slow',
                type: 'transition',
                default: '400ms ease-in-out',
                description: 'Slow transition for complex animations',
                category: 'transitions',
                examples: ['400ms ease-in-out', '500ms ease', '350ms cubic-bezier(0.25, 0.46, 0.45, 0.94)']
            }
        }
    }
}

/**
 * Validate theme variable schema
 */
export function validateThemeVariableSchema(variable: any): variable is ThemeVariableSchema {
    if (!variable || typeof variable !== 'object') return false

    // Required fields
    if (!variable.name || typeof variable.name !== 'string') return false
    if (!variable.type || !THEME_NAMING_CONVENTIONS.STANDARD_TYPES.includes(variable.type)) return false
    if (!variable.default || typeof variable.default !== 'string') return false
    if (!variable.description || typeof variable.description !== 'string') return false
    if (!variable.category || typeof variable.category !== 'string') return false

    // Validate naming conventions
    if (!THEME_NAMING_CONVENTIONS.VARIABLE_NAME_PATTERN.test(variable.name)) return false
    if (!THEME_NAMING_CONVENTIONS.CATEGORY_NAME_PATTERN.test(variable.category)) return false

    // Optional field validation
    if (variable.min !== undefined && typeof variable.min !== 'number') return false
    if (variable.max !== undefined && typeof variable.max !== 'number') return false
    if (variable.step !== undefined && typeof variable.step !== 'number') return false
    if (variable.unit !== undefined && typeof variable.unit !== 'string') return false
    if (variable.options !== undefined && !Array.isArray(variable.options)) return false
    if (variable.required !== undefined && typeof variable.required !== 'boolean') return false
    if (variable.deprecated !== undefined && typeof variable.deprecated !== 'boolean') return false
    if (variable.since !== undefined && typeof variable.since !== 'string') return false
    if (variable.examples !== undefined && !Array.isArray(variable.examples)) return false

    return true
}

/**
 * Validate theme category schema
 */
export function validateThemeCategorySchema(category: any): category is ThemeCategorySchema {
    if (!category || typeof category !== 'object') return false

    // Required fields
    if (!category.name || typeof category.name !== 'string') return false
    if (!category.description || typeof category.description !== 'string') return false
    if (!category.variables || typeof category.variables !== 'object') return false

    // Validate variables
    for (const [key, variable] of Object.entries(category.variables)) {
        if (!validateThemeVariableSchema(variable)) return false
        if ((variable as ThemeVariableSchema).name !== key) return false
    }

    // Optional field validation
    if (category.icon !== undefined && typeof category.icon !== 'string') return false
    if (category.order !== undefined && typeof category.order !== 'number') return false

    return true
}

/**
 * Validate widget pack theme schema
 */
export function validateWidgetPackThemeSchema(schema: any): schema is WidgetPackThemeSchema {
    if (!schema || typeof schema !== 'object') return false

    // Required fields
    if (!schema.version || typeof schema.version !== 'string') return false
    if (!schema.name || typeof schema.name !== 'string') return false
    if (!schema.categories || typeof schema.categories !== 'object') return false

    // Validate categories
    for (const [, category] of Object.entries(schema.categories)) {
        if (!validateThemeCategorySchema(category)) return false
    }

    // Optional field validation
    if (schema.description !== undefined && typeof schema.description !== 'string') return false
    if (schema.author !== undefined && typeof schema.author !== 'string') return false
    if (schema.license !== undefined && typeof schema.license !== 'string') return false
    if (schema.homepage !== undefined && typeof schema.homepage !== 'string') return false
    if (schema.repository !== undefined && typeof schema.repository !== 'string') return false
    if (schema.keywords !== undefined && !Array.isArray(schema.keywords)) return false

    return true
}

/**
 * Generate theme variable definition template
 */
export function generateThemeVariableTemplate(
    name: string,
    type: ThemeVariableSchema['type'],
    category: string,
    description: string,
    defaultValue: string
): ThemeVariableSchema {
    return {
        name,
        type,
        default: defaultValue,
        description,
        category,
        examples: [defaultValue]
    }
}

/**
 * Generate complete theme schema template
 */
export function generateThemeSchemaTemplate(
    packName: string,
    description?: string
): WidgetPackThemeSchema {
    return {
        version: '1.0.0',
        name: packName,
        description: description || `Theme variables for ${packName} widget pack`,
        categories: {
            colors: DEFAULT_THEME_CATEGORIES.colors,
            typography: DEFAULT_THEME_CATEGORIES.typography,
            spacing: DEFAULT_THEME_CATEGORIES.spacing
        }
    }
}

/**
 * Convert theme schema to CSS variables
 */
export function schemaToCssVariables(schema: WidgetPackThemeSchema): Record<string, string> {
    const cssVariables: Record<string, string> = {}

    Object.values(schema.categories).forEach(category => {
        Object.values(category.variables).forEach(variable => {
            const cssKey = variable.name.startsWith('--') ? variable.name.slice(2) : variable.name
            cssVariables[cssKey] = variable.default
        })
    })

    return cssVariables
}

/**
 * Generate CSS from theme schema
 */
export function generateCssFromSchema(schema: WidgetPackThemeSchema, selector: string = ':root'): string {
    let css = `${selector} {\n`

    Object.entries(schema.categories).forEach(([, category]) => {
        css += `  /* ${category.name} */\n`

        Object.values(category.variables).forEach(variable => {
            const cssKey = variable.name.startsWith('--') ? variable.name : `--${variable.name}`
            css += `  ${cssKey}: ${variable.default}; /* ${variable.description} */\n`
        })

        css += '\n'
    })

    css += '}\n'

    return css
}
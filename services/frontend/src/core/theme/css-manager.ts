// CSS Variable Management System
import type { ThemeVariable } from './registry'

export interface CssVariableScope {
    selector: string
    variables: Record<string, string>
}

export interface CssVariableInheritance {
    parent: string
    child: string
    inheritedVariables: string[]
}

export interface CssTransitionConfig {
    properties: string[]
    duration: string
    easing: string
    delay?: string
}

/**
 * CSS Variable Manager for theme system
 */
export class CssVariableManager {
    private appliedVariables: Map<string, string> = new Map()
    private scopedVariables: Map<string, CssVariableScope> = new Map()
    private inheritanceRules: CssVariableInheritance[] = []
    private transitionConfig: CssTransitionConfig | null = null
    private observers: Set<(variables: Record<string, string>) => void> = new Set()

    /**
     * Apply CSS variables to the document root
     */
    applyVariables(variables: Record<string, string>, scope: string = ':root'): void {


        const element = this.getElementForScope(scope)
        if (!element) {
            console.error(`[css-manager] Cannot find element for scope: ${scope}`)
            return
        }

        // Apply variables
        Object.entries(variables).forEach(([key, value]) => {
            const cssKey = this.normalizeCssVariableName(key)
            element.style.setProperty(cssKey, value)
            this.appliedVariables.set(cssKey, value)
        })

        // Store scoped variables
        this.scopedVariables.set(scope, { selector: scope, variables })

        // Apply inheritance rules
        this.applyInheritanceRules()

        // Notify observers
        this.notifyObservers()


    }

    /**
     * Remove CSS variables from a scope
     */
    removeVariables(variableNames: string[], scope: string = ':root'): void {


        const element = this.getElementForScope(scope)
        if (!element) return

        variableNames.forEach(name => {
            const cssKey = this.normalizeCssVariableName(name)
            element.style.removeProperty(cssKey)
            this.appliedVariables.delete(cssKey)
        })

        // Update scoped variables
        const scopeData = this.scopedVariables.get(scope)
        if (scopeData) {
            variableNames.forEach(name => {
                delete scopeData.variables[name]
            })
        }

        this.notifyObservers()
    }

    /**
     * Clear all variables from a scope
     */
    clearScope(scope: string = ':root'): void {


        const scopeData = this.scopedVariables.get(scope)
        if (scopeData) {
            this.removeVariables(Object.keys(scopeData.variables), scope)
            this.scopedVariables.delete(scope)
        }
    }

    /**
     * Get current value of a CSS variable
     */
    getVariableValue(name: string, scope: string = ':root'): string | null {
        const cssKey = this.normalizeCssVariableName(name)
        const element = this.getElementForScope(scope)

        if (!element) return null

        return getComputedStyle(element).getPropertyValue(cssKey).trim() || null
    }

    /**
     * Get all applied variables
     */
    getAllVariables(): Record<string, string> {
        return Object.fromEntries(this.appliedVariables)
    }

    /**
     * Get variables for a specific scope
     */
    getScopeVariables(scope: string): Record<string, string> {
        const scopeData = this.scopedVariables.get(scope)
        return scopeData ? { ...scopeData.variables } : {}
    }

    /**
     * Set up variable inheritance between scopes
     */
    setupInheritance(parentScope: string, childScope: string, variables: string[]): void {


        // Remove existing inheritance rule for this child
        this.inheritanceRules = this.inheritanceRules.filter(rule => rule.child !== childScope)

        // Add new inheritance rule
        this.inheritanceRules.push({
            parent: parentScope,
            child: childScope,
            inheritedVariables: variables
        })

        // Apply inheritance immediately
        this.applyInheritanceRules()
    }

    /**
     * Apply inheritance rules
     */
    private applyInheritanceRules(): void {
        this.inheritanceRules.forEach(rule => {
            const parentData = this.scopedVariables.get(rule.parent)
            if (!parentData) return

            const childElement = this.getElementForScope(rule.child)
            if (!childElement) return

            // Inherit specified variables from parent
            rule.inheritedVariables.forEach(varName => {
                const parentValue = parentData.variables[varName]
                if (parentValue !== undefined) {
                    const cssKey = this.normalizeCssVariableName(varName)
                    childElement.style.setProperty(cssKey, `var(${cssKey}, ${parentValue})`)
                }
            })
        })
    }

    /**
     * Set up smooth transitions for theme changes
     */
    setupTransitions(config: CssTransitionConfig): void {


        this.transitionConfig = config

        // Create transition CSS
        const transitionProperties = config.properties.map(prop =>
            `${prop} ${config.duration} ${config.easing}${config.delay ? ` ${config.delay}` : ''}`
        ).join(', ')

        // Apply transition to all elements
        const style = document.createElement('style')
        style.id = 'theme-transitions'
        style.textContent = `
      * {
        transition: ${transitionProperties} !important;
      }
      
      /* Disable transitions during initial load */
      .no-transitions * {
        transition: none !important;
      }
      
      /* Smooth theme switching */
      .theme-switching * {
        transition: ${transitionProperties} !important;
      }
    `

        // Remove existing transition styles
        const existingStyle = document.getElementById('theme-transitions')
        if (existingStyle) {
            existingStyle.remove()
        }

        document.head.appendChild(style)
    }

    /**
     * Trigger smooth theme transition
     */
    triggerTransition(callback: () => void): Promise<void> {
        return new Promise((resolve) => {
            if (!this.transitionConfig) {
                callback()
                resolve()
                return
            }



            // Add transition class
            document.body.classList.add('theme-switching')

            // Apply changes
            callback()

            // Remove transition class after animation
            const duration = parseFloat(this.transitionConfig.duration) * 1000
            const delay = this.transitionConfig.delay ? parseFloat(this.transitionConfig.delay) * 1000 : 0

            setTimeout(() => {
                document.body.classList.remove('theme-switching')
                resolve()
            }, duration + delay)
        })
    }

    /**
     * Create scoped CSS variables for widget
     */
    createWidgetScope(widgetId: string, variables: Record<string, string>): void {
        const scope = `[data-widget-id="${widgetId}"]`


        // Create scoped CSS variables
        const scopedVariables: Record<string, string> = {}
        Object.entries(variables).forEach(([key, value]) => {
            const scopedKey = `${widgetId}-${key}`
            scopedVariables[scopedKey] = value
        })

        this.applyVariables(scopedVariables, scope)
    }

    /**
     * Remove widget scope
     */
    removeWidgetScope(widgetId: string): void {
        const scope = `[data-widget-id="${widgetId}"]`


        this.clearScope(scope)
    }

    /**
     * Generate CSS custom properties from theme variables
     */
    generateCssFromThemeVariables(variables: Record<string, ThemeVariable>): string {


        let css = ':root {\n'

        Object.entries(variables).forEach(([, variable]) => {
            const cssKey = this.normalizeCssVariableName(variable.name)
            css += `  ${cssKey}: ${variable.default}; /* ${variable.description} */\n`
        })

        css += '}\n'

        return css
    }

    /**
     * Validate CSS variable values
     */
    validateVariableValue(name: string, value: string, type?: ThemeVariable['type']): boolean {
        try {
            // Create temporary element to test CSS value
            const testElement = document.createElement('div')
            testElement.style.setProperty(this.normalizeCssVariableName(name), value)

            // Check if value was accepted
            const appliedValue = testElement.style.getPropertyValue(this.normalizeCssVariableName(name))

            if (!appliedValue) {
                return false
            }

            // Type-specific validation
            if (type) {
                return this.validateByType(value, type)
            }

            return true
        } catch (error) {
            console.error(`[css-manager] Validation error for ${name}:`, error)
            return false
        }
    }

    /**
     * Type-specific validation
     */
    private validateByType(value: string, type: ThemeVariable['type']): boolean {
        switch (type) {
            case 'color':
                return this.isValidColor(value)
            case 'size':
                return this.isValidSize(value)
            case 'font':
                return this.isValidFont(value)
            default:
                return true
        }
    }

    /**
     * Check if value is a valid color
     */
    private isValidColor(value: string): boolean {
        const colorRegex = /^(#[0-9a-fA-F]{3,8}|rgb\(|rgba\(|hsl\(|hsla\(|var\(|[a-zA-Z]+).*$/
        return colorRegex.test(value.trim())
    }

    /**
     * Check if value is a valid size
     */
    private isValidSize(value: string): boolean {
        const sizeRegex = /^(\d*\.?\d+)(px|rem|em|%|vh|vw|pt|pc|in|cm|mm|ex|ch|vmin|vmax|fr)?$|^var\(/
        return sizeRegex.test(value.trim())
    }

    /**
     * Check if value is a valid font
     */
    private isValidFont(value: string): boolean {
        // Basic font validation - accept most strings and CSS variables
        return value.trim().length > 0
    }

    /**
     * Watch for changes in CSS variables
     */
    observeChanges(callback: (variables: Record<string, string>) => void): () => void {
        this.observers.add(callback)

        // Return unsubscribe function
        return () => {
            this.observers.delete(callback)
        }
    }

    /**
     * Notify observers of changes
     */
    private notifyObservers(): void {
        const variables = this.getAllVariables()
        this.observers.forEach(callback => {
            try {
                callback(variables)
            } catch (error) {
                console.error('[css-manager] Observer error:', error)
            }
        })
    }

    /**
     * Get DOM element for CSS scope
     */
    private getElementForScope(scope: string): HTMLElement | null {
        if (scope === ':root') {
            return document.documentElement
        }

        return document.querySelector(scope) as HTMLElement
    }

    /**
     * Normalize CSS variable name
     */
    private normalizeCssVariableName(name: string): string {
        if (name.startsWith('--')) {
            return name
        }

        // Convert camelCase to kebab-case and add --
        return `--${name.replace(/([A-Z])/g, '-$1').toLowerCase()}`
    }

    /**
     * Extract CSS variables from computed styles
     */
    extractVariablesFromElement(element: HTMLElement): Record<string, string> {
        const variables: Record<string, string> = {}
        const computedStyle = getComputedStyle(element)

        // Get all CSS custom properties
        for (let i = 0; i < computedStyle.length; i++) {
            const property = computedStyle[i]
            if (property.startsWith('--')) {
                const value = computedStyle.getPropertyValue(property).trim()
                if (value) {
                    variables[property] = value
                }
            }
        }

        return variables
    }

    /**
     * Create CSS variable fallback chain
     */
    createFallbackChain(primary: string, fallbacks: string[]): string {
        let chain = primary

        fallbacks.forEach(fallback => {
            chain = `var(${this.normalizeCssVariableName(primary)}, ${fallback})`
        })

        return chain
    }

    /**
     * Batch apply multiple variable sets with single reflow
     */
    batchApply(operations: Array<{
        scope: string
        variables: Record<string, string>
        action: 'apply' | 'remove'
    }>): void {


        // Group operations by scope for efficiency
        const scopeOperations = new Map<string, {
            apply: Record<string, string>
            remove: string[]
        }>()

        operations.forEach(op => {
            if (!scopeOperations.has(op.scope)) {
                scopeOperations.set(op.scope, { apply: {}, remove: [] })
            }

            const scopeOp = scopeOperations.get(op.scope)!

            if (op.action === 'apply') {
                Object.assign(scopeOp.apply, op.variables)
            } else {
                scopeOp.remove.push(...Object.keys(op.variables))
            }
        })

        // Apply all operations
        scopeOperations.forEach((ops, scope) => {
            if (Object.keys(ops.apply).length > 0) {
                this.applyVariables(ops.apply, scope)
            }
            if (ops.remove.length > 0) {
                this.removeVariables(ops.remove, scope)
            }
        })
    }

    /**
     * Clear all variables and reset manager
     */
    reset(): void {


        // Clear all scopes
        this.scopedVariables.forEach((_, scope) => {
            this.clearScope(scope)
        })

        // Clear data structures
        this.appliedVariables.clear()
        this.scopedVariables.clear()
        this.inheritanceRules = []
        this.observers.clear()

        // Remove transition styles
        const transitionStyle = document.getElementById('theme-transitions')
        if (transitionStyle) {
            transitionStyle.remove()
        }
    }
}

// Export singleton instance
export const cssVariableManager = new CssVariableManager()

// Initialize default transitions
cssVariableManager.setupTransitions({
    properties: ['background-color', 'color', 'border-color', 'box-shadow'],
    duration: '0.3s',
    easing: 'ease-in-out'
})

// Utility functions
export function applyCssVariables(variables: Record<string, string>, scope?: string): void {
    cssVariableManager.applyVariables(variables, scope)
}

export function removeCssVariables(names: string[], scope?: string): void {
    cssVariableManager.removeVariables(names, scope)
}

export function getCssVariable(name: string, scope?: string): string | null {
    return cssVariableManager.getVariableValue(name, scope)
}

export function createWidgetThemeScope(widgetId: string, variables: Record<string, string>): void {
    cssVariableManager.createWidgetScope(widgetId, variables)
}

export function removeWidgetThemeScope(widgetId: string): void {
    cssVariableManager.removeWidgetScope(widgetId)
}

export function smoothThemeTransition(callback: () => void): Promise<void> {
    return cssVariableManager.triggerTransition(callback)
}
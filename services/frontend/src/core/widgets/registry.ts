// src/core/widgets/registry.ts

/**
 * Minimal widget registry for login functionality
 */

const widgets: Record<string, () => Promise<any>> = {}

/**
 * Register a widget pack with its components
 */
export function registerWidgetPack(packId: string, components: Record<string, () => Promise<any>>) {
  Object.entries(components).forEach(([componentName, loader]) => {
    const widgetKey = `${packId}@${componentName}`
    widgets[widgetKey] = loader
    console.log(`[registry] Registered widget: ${widgetKey}`)
  })
}

/**
 * Check if a widget exists
 */
export function hasWidget(widgetKey: string): boolean {
  return widgetKey in widgets
}

/**
 * Resolve a widget component
 */
export function resolveWidget(widgetKey: string) {
  const loader = widgets[widgetKey]
  if (!loader) {
    console.warn(`[registry] Widget not found: ${widgetKey}`)
    return null
  }
  return loader
}

/**
 * Dynamically discover and register all widget packs
 */
export async function initWidgetPacks() {
  try {
    // Get all widget pack manifests dynamically
    const widgetPackModules = import.meta.glob('/src/widget-packs/*/manifest.json')

    for (const [path, moduleLoader] of Object.entries(widgetPackModules)) {
      try {
        const manifest = await moduleLoader() as any
        const packId = manifest.default?.id || manifest.id

        if (!packId) continue

        // Extract pack name from path
        const packName = path.match(/widget-packs\/([^\/]+)\//)?.[1]
        if (!packName) continue

        // Dynamically load all widgets for this pack
        const widgetModules = import.meta.glob('/src/widget-packs/*/widgets/*.vue')
        const packWidgets: Record<string, () => Promise<any>> = {}

        for (const [widgetPath, widgetLoader] of Object.entries(widgetModules)) {
          if (widgetPath.includes(`/widget-packs/${packName}/widgets/`)) {
            const widgetName = widgetPath.match(/\/([^\/]+)\.vue$/)?.[1]
            if (widgetName) {
              packWidgets[widgetName] = widgetLoader
            }
          }
        }

        // Register the pack with its widgets
        if (Object.keys(packWidgets).length > 0) {
          registerWidgetPack(packName, packWidgets)
          console.log(`[registry] Registered widget pack: ${packName}`, Object.keys(packWidgets))
        }

      } catch (error) {
        console.warn(`[registry] Failed to load widget pack from ${path}:`, error)
      }
    }

  } catch (error) {
    console.error('[registry] Failed to initialize widget packs:', error)
  }
}

/**
 * List all registered widgets
 */
export function listWidgets(): string[] {
  return Object.keys(widgets)
}
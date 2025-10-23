// frontend/src/core/widgets/registry.ts
import { defineAsyncComponent, markRaw, type Component, h } from 'vue'

const packs: Record<string, Record<string, Component>> = {}

// Create simple fallback components
const createLoadingComponent = (widgetRef: string) => {
  return {
    name: 'LoadingWidget',
    setup() {
      return () => h('div', {
        class: 'loading-widget p-4 bg-gray-50 border border-gray-200 rounded-lg'
      }, [
        h('div', { class: 'flex items-center space-x-3' }, [
          h('div', { class: 'animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600' }),
          h('div', { class: 'text-gray-600' }, [
            h('span', { class: 'font-medium' }, 'Loading Widget...'),
            h('div', { class: 'text-sm text-gray-500 mt-1' }, widgetRef)
          ])
        ])
      ])
    }
  }
}

const createErrorComponent = (widgetRef: string, error?: string) => {
  return {
    name: 'ErrorWidget',
    setup() {
      return () => h('div', {
        class: 'error-widget p-4 border-2 border-red-300 bg-red-50 rounded-lg'
      }, [
        h('div', { class: 'flex items-center space-x-2 text-red-700' }, [
          h('span', { class: 'font-semibold' }, 'Widget Error'),
        ]),
        h('div', { class: 'mt-2 text-sm text-red-600' }, [
          h('p', {}, [
            h('strong', {}, 'Widget: '),
            h('code', { class: 'bg-red-100 px-1 rounded' }, widgetRef)
          ]),
          error && h('p', { class: 'mt-1' }, [
            h('strong', {}, 'Error: '),
            error
          ])
        ])
      ])
    }
  }
}

const createMissingComponent = (widgetRef: string) => {
  return {
    name: 'MissingWidget',
    setup() {
      return () => h('div', {
        class: 'missing-widget p-4 border-2 border-dashed border-red-300 bg-red-50 rounded-lg'
      }, [
        h('div', { class: 'flex items-center space-x-2 text-red-700' }, [
          h('span', { class: 'font-semibold' }, 'Widget Not Found'),
        ]),
        h('div', { class: 'mt-2 text-sm text-red-600' }, [
          h('p', {}, [
            h('strong', {}, 'Widget: '),
            h('code', { class: 'bg-red-100 px-1 rounded' }, widgetRef)
          ]),
          h('p', { class: 'mt-1' }, 'This widget could not be loaded.')
        ])
      ])
    }
  }
}

export function registerWidgetPack(
  pack: string,
  entries: Record<string, () => Promise<any>>
) {
  packs[pack] = packs[pack] || {}
  for (const key of Object.keys(entries)) {
    packs[pack][key] = markRaw(defineAsyncComponent(entries[key] as any))
  }
}

export function registerWidgetPackFromConfig(
  packId: string,
  components: Record<string, { path: string }>
) {
  
  packs[packId] = packs[packId] || {}
  
  for (const [componentName, config] of Object.entries(components)) {
    const widgetRef = `${packId}@${componentName}`
    
    try {
      // Create dynamic import function for the component path with error handling
      const importFn = async () => {
        try {
          // Convert path for dynamic import - handle both absolute and relative paths
          let importPath = config.path
          
          // If path starts with /src/, convert to relative path for Vite
          if (importPath.startsWith('/src/')) {
            importPath = importPath.substring(5) // Remove /src/
            importPath = `@/${importPath}`
          }
          // If path starts with ./, it's already relative to widget pack
          else if (importPath.startsWith('./')) {
            // For auth pack, use direct relative path that works with Vite
            if (packId === 'auth') {
              importPath = `/src/widget-packs/auth/${importPath.substring(2)}`
            } else {
              importPath = `/src/widget-packs/${packId}/${importPath.substring(2)}`
            }
          }
          
          const module = await import(/* @vite-ignore */ importPath)
          return module
        } catch (importError) {
          console.error(`[widget-registry] Failed to import ${config.path}:`, importError)
          // Return error component for import failures
          return {
            default: createErrorComponent(widgetRef, (importError as Error).message)
          }
        }
      }
      
      packs[packId][componentName] = markRaw(defineAsyncComponent({
        loader: importFn,
        loadingComponent: createLoadingComponent(widgetRef),
        errorComponent: createErrorComponent(widgetRef, 'Component failed to load'),
        delay: 200,
        timeout: 10000
      }))
      

    } catch (error) {
      console.error(`[widget-registry] Failed to register ${widgetRef}:`, error)
      
      // Register missing component fallback for registration errors
      packs[packId][componentName] = markRaw(createMissingComponent(widgetRef))
    }
  }
}

export function updateWidgetRegistry(widgetPacks: Record<string, any>) {
  
  // Clear existing packs that came from backend config
  // (Keep manually registered packs)
  
  // Register new packs from backend
  for (const [packId, packConfig] of Object.entries(widgetPacks)) {
    if (packConfig.components) {
      registerWidgetPackFromConfig(packId, packConfig.components)
    }
  }
}

export function resolveWidget(widgetRef: string): Component | undefined {
  // widgetRef format: "<pack-id>@<component-name>" or legacy "<pack>@<key>"
  const [packId, componentName] = widgetRef.split('@')
  
  const widget = packs[packId]?.[componentName]
  
  if (widget) {
    return widget
  }
  
  // Return fallback component for missing widgets
  console.warn(`[widget-registry] Widget not found: ${widgetRef}`)
  return markRaw(createMissingComponent(widgetRef))
}

export function createMissingWidgetFallback(widgetRef: string): Component {
  return markRaw(createMissingComponent(widgetRef))
}

export function hasWidget(widgetRef: string) {
  const [packId, componentName] = widgetRef.split('@')
  return Boolean(packs[packId]?.[componentName])
}

export function getRegisteredPacks(): string[] {
  return Object.keys(packs)
}

export function getPackComponents(packId: string): string[] {
  return Object.keys(packs[packId] || {})
}

export function getWidgetInfo(widgetRef: string) {
  const [packId, componentName] = widgetRef.split('@')
  return {
    packId,
    componentName,
    exists: Boolean(packs[packId]?.[componentName]),
    availablePacks: getRegisteredPacks(),
    packComponents: packId ? getPackComponents(packId) : []
  }
}

// Register theme widget pack
registerWidgetPack('theme', {
  ThemeEditor: () => import('@/widget-packs/theme/widgets/ThemeEditor.vue')
})

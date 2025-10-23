// usePageStreaming - Vue composable for page content streaming
// Pages contain modules and widgets from widget-packs that are streamed based on viewport
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useStreamingStore } from '@/core/stores/streaming'
import { viewportTracker } from '@/core/viewport/tracker'

export function usePageStreaming(pageId: string) {
  const streamingStore = useStreamingStore()
  const pageElement = ref<HTMLElement | null>(null)
  const isTracking = ref(false)

  // Computed properties for reactive access to streamed content
  const pageStream = computed(() => streamingStore.getPageStream(pageId))
  const isLoading = computed(() => streamingStore.hasActiveStreams)
  const progress = computed(() => streamingStore.getProgress('page_load', pageId))

  // Get all modules and widgets from widget-packs for current viewport
  const viewportContent = computed(() => {
    if (!isTracking.value) {
      return { modules: [], widgets: [] }
    }
    return viewportTracker.getViewportContent(pageId)
  })

  // Get all modules from all streamed sections
  const allModules = computed(() => {
    const stream = pageStream.value
    if (!stream) return []

    const modules: any[] = []
    Object.values(stream.viewportSections).forEach(section => {
      modules.push(...section.modules)
    })
    return modules
  })

  // Get all widgets from widget-packs from all streamed sections
  const allWidgets = computed(() => {
    const stream = pageStream.value
    if (!stream) return []

    const widgets: any[] = []
    Object.values(stream.viewportSections).forEach(section => {
      widgets.push(...section.widgets)
    })
    return widgets
  })

  // Check if page streaming is complete
  const isComplete = computed(() => {
    return pageStream.value?.complete || false
  })

  // Get page dimensions
  const pageDimensions = computed(() => {
    const stream = pageStream.value
    return {
      width: stream?.totalWidth || 0,
      height: stream?.totalHeight || 0
    }
  })

  /**
   * Start tracking viewport and streaming content
   */
  const startStreaming = (element?: HTMLElement) => {
    const targetElement = element || pageElement.value
    if (!targetElement) {
      console.warn('[usePageStreaming] No element provided for viewport tracking')
      return
    }

    pageElement.value = targetElement
    viewportTracker.startTracking(pageId, targetElement)
    isTracking.value = true

    // Start progress tracking
    streamingStore.startProgress('page_load', pageId, `Loading page ${pageId}`)
  }

  /**
   * Stop tracking viewport
   */
  const stopStreaming = () => {
    if (isTracking.value) {
      viewportTracker.stopTracking(pageId)
      isTracking.value = false
      
      // Complete progress tracking
      streamingStore.completeProgress('page_load', pageId)
    }
  }

  /**
   * Refresh page content (clear cache and re-stream)
   */
  const refreshPage = () => {
    // Clear existing page stream
    streamingStore.clearPageStream(pageId)
    
    // Update layout to trigger re-streaming
    if (isTracking.value) {
      viewportTracker.updatePageLayout(pageId)
    }
  }

  /**
   * Get modules by type
   */
  const getModulesByType = (type: string) => {
    return allModules.value.filter(module => module.type === type)
  }

  /**
   * Get widgets by type
   */
  const getWidgetsByType = (type: string) => {
    return allWidgets.value.filter(widget => widget.type === type)
  }

  /**
   * Get content for specific viewport bounds
   */
  const getContentForBounds = (bounds: { top: number, bottom: number, left: number, right: number }) => {
    const stream = pageStream.value
    if (!stream) return { modules: [], widgets: [] }

    const modules: any[] = []
    const widgets: any[] = []

    Object.values(stream.viewportSections).forEach(section => {
      // Check if section bounds intersect with requested bounds
      if (!(
        bounds.right < section.bounds.left ||
        bounds.left > section.bounds.right ||
        bounds.bottom < section.bounds.top ||
        bounds.top > section.bounds.bottom
      )) {
        modules.push(...section.modules)
        widgets.push(...section.widgets)
      }
    })

    return { modules, widgets }
  }

  /**
   * Check if content is available for specific bounds
   */
  const hasContentForBounds = (bounds: { top: number, bottom: number, left: number, right: number }) => {
    const content = getContentForBounds(bounds)
    return content.modules.length > 0 || content.widgets.length > 0
  }

  // Watch for page stream changes to update progress
  watch(pageStream, (newStream) => {
    if (newStream?.complete && progress.value) {
      streamingStore.updateProgress('page_load', pageId, 100)
    }
  }, { deep: true })

  // Auto-cleanup on unmount
  onUnmounted(() => {
    stopStreaming()
  })

  return {
    // Reactive state
    pageStream,
    isLoading,
    isTracking,
    isComplete,
    progress,
    pageDimensions,
    
    // Content access
    viewportContent,
    allModules,
    allWidgets,
    
    // Control methods
    startStreaming,
    stopStreaming,
    refreshPage,
    
    // Content queries
    getModulesByType,
    getWidgetsByType,
    getContentForBounds,
    hasContentForBounds,
    
    // Element ref
    pageElement
  }
}

// Helper composable for module-specific streaming
export function useModuleStreaming(moduleId: string, pageId: string) {
  const { allModules, getModulesByType } = usePageStreaming(pageId)
  
  const module = computed(() => 
    allModules.value.find(m => m.id === moduleId)
  )
  
  const modulesByType = (type: string) => getModulesByType(type)
  
  return {
    module,
    modulesByType,
    allModules
  }
}

// Helper composable for widget-specific streaming
export function useWidgetStreaming(widgetId: string, pageId: string) {
  const { allWidgets, getWidgetsByType } = usePageStreaming(pageId)
  
  const widget = computed(() => 
    allWidgets.value.find(w => w.id === widgetId)
  )
  
  const widgetsByType = (type: string) => getWidgetsByType(type)
  
  return {
    widget,
    widgetsByType,
    allWidgets
  }
}
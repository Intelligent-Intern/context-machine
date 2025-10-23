// Viewport Tracker - Tracks viewport changes and triggers streaming of modules and widgets from widget-packs
import { requestPageStream } from '@/core/messaging/ws/socket'
import { useStreamingStore } from '@/core/stores/streaming'

export interface ViewportInfo {
  top: number
  bottom: number
  left: number
  right: number
  width: number
  height: number
  scrollDirection?: 'up' | 'down' | 'left' | 'right'
}

export interface PageViewportTracker {
  pageId: string
  element: HTMLElement
  lastViewport: ViewportInfo
  observer: IntersectionObserver | null
  scrollTimeout: number | null
  streamedSections: Set<string>
  isTracking: boolean
}

class ViewportTracker {
  private trackers: Map<string, PageViewportTracker> = new Map()
  private streamingStore = useStreamingStore()

  /**
   * Start tracking viewport for a page
   */
  startTracking(pageId: string, element: HTMLElement) {
    // Stop existing tracking if any
    this.stopTracking(pageId)

    const tracker: PageViewportTracker = {
      pageId,
      element,
      lastViewport: this.getCurrentViewport(element),
      observer: null,
      scrollTimeout: null,
      streamedSections: new Set(),
      isTracking: true
    }

    // Set up intersection observer for efficient viewport tracking
    tracker.observer = new IntersectionObserver(
      (entries) => this.handleIntersection(pageId, entries),
      {
        root: null, // Use viewport as root
        rootMargin: '200px', // Preload content 200px before it becomes visible
        threshold: [0, 0.1, 0.5, 0.9, 1.0] // Multiple thresholds for better tracking
      }
    )

    // Observe the page element
    tracker.observer.observe(element)

    // Set up scroll listener for continuous tracking
    element.addEventListener('scroll', (e) => this.handleScroll(pageId, e), { passive: true })

    // Initial viewport request
    this.requestViewportContent(pageId, tracker.lastViewport)

    this.trackers.set(pageId, tracker)
  }

  /**
   * Stop tracking viewport for a page
   */
  stopTracking(pageId: string) {
    const tracker = this.trackers.get(pageId)
    if (!tracker) return

    tracker.isTracking = false

    // Disconnect intersection observer
    if (tracker.observer) {
      tracker.observer.disconnect()
      tracker.observer = null
    }

    // Clear scroll timeout
    if (tracker.scrollTimeout) {
      clearTimeout(tracker.scrollTimeout)
      tracker.scrollTimeout = null
    }

    // Remove scroll listener
    tracker.element.removeEventListener('scroll', (e) => this.handleScroll(pageId, e))

    this.trackers.delete(pageId)
  }

  /**
   * Handle intersection observer changes
   */
  private handleIntersection(pageId: string, entries: IntersectionObserverEntry[]) {
    const tracker = this.trackers.get(pageId)
    if (!tracker || !tracker.isTracking) return

    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Element is visible, update viewport and request content
        const viewport = this.getCurrentViewport(tracker.element)
        this.requestViewportContent(pageId, viewport)
      }
    })
  }

  /**
   * Handle scroll events with debouncing
   */
  private handleScroll(pageId: string, event: Event) {
    const tracker = this.trackers.get(pageId)
    if (!tracker || !tracker.isTracking) return

    // Clear existing timeout
    if (tracker.scrollTimeout) {
      clearTimeout(tracker.scrollTimeout)
    }

    // Debounce scroll events
    tracker.scrollTimeout = window.setTimeout(() => {
      const currentViewport = this.getCurrentViewport(tracker.element)
      const scrollDirection = this.getScrollDirection(tracker.lastViewport, currentViewport)
      
      currentViewport.scrollDirection = scrollDirection
      tracker.lastViewport = currentViewport

      // Request content for new viewport
      this.requestViewportContent(pageId, currentViewport)
    }, 100) // 100ms debounce
  }

  /**
   * Get current viewport information
   */
  private getCurrentViewport(element: HTMLElement): ViewportInfo {
    const rect = element.getBoundingClientRect()
    const scrollTop = element.scrollTop
    const scrollLeft = element.scrollLeft

    return {
      top: scrollTop,
      bottom: scrollTop + rect.height,
      left: scrollLeft,
      right: scrollLeft + rect.width,
      width: rect.width,
      height: rect.height
    }
  }

  /**
   * Determine scroll direction
   */
  private getScrollDirection(lastViewport: ViewportInfo, currentViewport: ViewportInfo): 'up' | 'down' | 'left' | 'right' {
    const deltaY = currentViewport.top - lastViewport.top
    const deltaX = currentViewport.left - lastViewport.left

    // Prioritize vertical scrolling
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      return deltaY > 0 ? 'down' : 'up'
    } else {
      return deltaX > 0 ? 'right' : 'left'
    }
  }

  /**
   * Request content for current viewport
   */
  private requestViewportContent(pageId: string, viewport: ViewportInfo) {
    const tracker = this.trackers.get(pageId)
    if (!tracker) return

    // Generate section key for this viewport
    const sectionKey = this.generateSectionKey(viewport)

    // Skip if we already streamed this section
    if (tracker.streamedSections.has(sectionKey)) {
      return
    }

    // Mark section as being streamed
    tracker.streamedSections.add(sectionKey)

    // Request content from backend
    requestPageStream(pageId, {
      top: viewport.top,
      bottom: viewport.bottom,
      left: viewport.left,
      right: viewport.right,
      scrollDirection: viewport.scrollDirection
    })
  }

  /**
   * Generate a unique key for a viewport section
   */
  private generateSectionKey(viewport: ViewportInfo): string {
    // Round to nearest 100px to avoid too many small sections
    const top = Math.floor(viewport.top / 100) * 100
    const bottom = Math.ceil(viewport.bottom / 100) * 100
    const left = Math.floor(viewport.left / 100) * 100
    const right = Math.ceil(viewport.right / 100) * 100

    return `${top}-${bottom}_${left}-${right}`
  }

  /**
   * Get modules and widgets from widget-packs for current viewport
   */
  getViewportContent(pageId: string): { modules: any[], widgets: any[] } {
    const pageStream = this.streamingStore.getPageStream(pageId)
    if (!pageStream) {
      return { modules: [], widgets: [] }
    }

    const tracker = this.trackers.get(pageId)
    if (!tracker) {
      return { modules: [], widgets: [] }
    }

    const currentViewport = tracker.lastViewport
    const modules: any[] = []
    const widgets: any[] = []

    // Collect all modules and widgets from widget-packs from viewport sections that intersect with current viewport
    Object.entries(pageStream.viewportSections).forEach(([sectionKey, section]) => {
      if (this.viewportsIntersect(currentViewport, section.bounds)) {
        modules.push(...section.modules)
        widgets.push(...section.widgets)
      }
    })

    return { modules, widgets }
  }

  /**
   * Check if two viewports intersect
   */
  private viewportsIntersect(viewport1: ViewportInfo, viewport2: { top: number, bottom: number, left: number, right: number }): boolean {
    return !(
      viewport1.right < viewport2.left ||
      viewport1.left > viewport2.right ||
      viewport1.bottom < viewport2.top ||
      viewport1.top > viewport2.bottom
    )
  }

  /**
   * Update page layout (called when page structure changes)
   */
  updatePageLayout(pageId: string) {
    const tracker = this.trackers.get(pageId)
    if (!tracker || !tracker.isTracking) return

    // Clear streamed sections to force re-streaming
    tracker.streamedSections.clear()

    // Request content for current viewport
    const viewport = this.getCurrentViewport(tracker.element)
    this.requestViewportContent(pageId, viewport)
  }

  /**
   * Get all tracked pages
   */
  getTrackedPages(): string[] {
    return Array.from(this.trackers.keys())
  }

  /**
   * Check if a page is being tracked
   */
  isTracking(pageId: string): boolean {
    const tracker = this.trackers.get(pageId)
    return tracker?.isTracking || false
  }

  /**
   * Clean up all trackers
   */
  cleanup() {
    this.trackers.forEach((_, pageId) => {
      this.stopTracking(pageId)
    })
    this.trackers.clear()
  }
}

// Export singleton instance
export const viewportTracker = new ViewportTracker()

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    viewportTracker.cleanup()
  })
}
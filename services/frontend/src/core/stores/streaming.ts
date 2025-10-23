// Streaming Store - Manages streaming content and progress
import { defineStore } from 'pinia'
import { registerHandler } from '@/core/messaging/api'
import { registerProgressCallback, unregisterProgressCallback } from '@/core/messaging/ws/socket'

export interface StreamingProgress {
  operation: string
  id: string
  percent: number
  message?: string
  startTime: number
  estimatedTimeRemaining?: number
}

export interface StreamChunk {
  id: string
  chunks: any[]
  complete: boolean
  totalSize?: number
  receivedSize: number
}

export interface WidgetContent {
  widgetId: string
  content: any
  viewport?: any
  lastUpdated: number
}

export interface PageStream {
  pageId: string
  viewportSections: Record<string, {
    modules: any[]
    widgets: any[]
    layout?: any
    bounds: { top: number, bottom: number, left: number, right: number }
  }>
  complete: boolean
  totalHeight?: number
  totalWidth?: number
  lastUpdated: number
}

export interface TableStream {
  tableId: string
  rows: any[]
  offset: number
  total?: number
  complete: boolean
  lastUpdated: number
}

export interface StreamingState {
  // Progress tracking
  activeProgress: Record<string, StreamingProgress>
  
  // Content streaming
  streams: Record<string, StreamChunk>
  widgetContent: Record<string, WidgetContent>
  pageStreams: Record<string, PageStream>
  tableStreams: Record<string, TableStream>
  
  // Viewport tracking for lazy loading
  viewports: Record<string, any>
  
  // Loading states
  isStreaming: boolean
  streamingCount: number
}

export const useStreamingStore = defineStore('streaming', {
  state: (): StreamingState => ({
    activeProgress: {},
    streams: {},
    widgetContent: {},
    pageStreams: {},
    tableStreams: {},
    viewports: {},
    isStreaming: false,
    streamingCount: 0
  }),

  getters: {
    /**
     * Get progress for a specific operation
     */
    getProgress: (state) => (operation: string, id: string = 'default') => {
      const key = `${operation}_${id}`
      return state.activeProgress[key] || null
    },

    /**
     * Get all active progress operations
     */
    getAllProgress: (state) => {
      return Object.values(state.activeProgress)
    },

    /**
     * Check if any streaming operations are active
     */
    hasActiveStreams: (state) => {
      return state.streamingCount > 0
    },

    /**
     * Get widget content by ID
     */
    getWidgetContent: (state) => (widgetId: string) => {
      return state.widgetContent[widgetId] || null
    },

    /**
     * Get page stream by ID
     */
    getPageStream: (state) => (pageId: string) => {
      return state.pageStreams[pageId] || null
    },

    /**
     * Get table stream by ID
     */
    getTableStream: (state) => (tableId: string) => {
      return state.tableStreams[tableId] || null
    },

    /**
     * Get stream by ID
     */
    getStream: (state) => (streamId: string) => {
      return state.streams[streamId] || null
    }
  },

  actions: {
    /**
     * Start tracking progress for an operation
     */
    startProgress(operation: string, id: string = 'default', message?: string) {
      const key = `${operation}_${id}`
      
      this.activeProgress[key] = {
        operation,
        id,
        percent: 0,
        message,
        startTime: Date.now()
      }

      // Register WebSocket callback
      registerProgressCallback(operation, id, (percent: number) => {
        this.updateProgress(operation, id, percent)
      })

      this.streamingCount++
      this.isStreaming = true
    },

    /**
     * Update progress for an operation
     */
    updateProgress(operation: string, id: string = 'default', percent: number, message?: string) {
      const key = `${operation}_${id}`
      const progress = this.activeProgress[key]
      
      if (progress) {
        progress.percent = Math.min(100, Math.max(0, percent))
        if (message) progress.message = message
        
        // Calculate estimated time remaining
        if (percent > 0) {
          const elapsed = Date.now() - progress.startTime
          const totalEstimated = (elapsed / percent) * 100
          progress.estimatedTimeRemaining = Math.max(0, totalEstimated - elapsed)
        }

        // Complete the operation if 100%
        if (percent >= 100) {
          setTimeout(() => {
            this.completeProgress(operation, id)
          }, 500) // Small delay to show completion
        }
      }
    },

    /**
     * Complete and remove progress tracking
     */
    completeProgress(operation: string, id: string = 'default') {
      const key = `${operation}_${id}`
      
      if (this.activeProgress[key]) {
        delete this.activeProgress[key]
        this.streamingCount = Math.max(0, this.streamingCount - 1)
        
        if (this.streamingCount === 0) {
          this.isStreaming = false
        }
      }

      // Unregister WebSocket callback
      unregisterProgressCallback(operation, id)
    },

    /**
     * Handle stream chunk
     */
    handleStreamChunk(streamId: string, chunk: any, complete: boolean = false) {
      if (!this.streams[streamId]) {
        this.streams[streamId] = {
          id: streamId,
          chunks: [],
          complete: false,
          receivedSize: 0
        }
      }

      const stream = this.streams[streamId]
      stream.chunks.push(chunk)
      stream.receivedSize += JSON.stringify(chunk).length
      stream.complete = complete

      if (complete) {
        // Stream is complete, can trigger final processing
        this.processCompleteStream(streamId)
      }
    },

    /**
     * Process completed stream
     */
    processCompleteStream(streamId: string) {
      const stream = this.streams[streamId]
      if (stream && stream.complete) {
        // Emit event for components to handle complete stream
        window.dispatchEvent(new CustomEvent('stream-complete', {
          detail: { streamId, stream }
        }))
      }
    },

    /**
     * Handle widget content update
     */
    updateWidgetContent(widgetId: string, content: any, viewport?: any) {
      this.widgetContent[widgetId] = {
        widgetId,
        content,
        viewport,
        lastUpdated: Date.now()
      }
    },

    /**
     * Handle page stream update
     */
    updatePageStream(
      pageId: string, 
      viewportSection: string, 
      modules: any[] = [], 
      widgets: any[] = [], 
      layout?: any,
      complete: boolean = false
    ) {
      if (!this.pageStreams[pageId]) {
        this.pageStreams[pageId] = {
          pageId,
          viewportSections: {},
          complete: false,
          lastUpdated: Date.now()
        }
      }

      const pageStream = this.pageStreams[pageId]
      
      // Parse viewport section (e.g., "0-800x0-600" for top:0, bottom:800, left:0, right:600)
      const bounds = this.parseViewportSection(viewportSection)
      
      pageStream.viewportSections[viewportSection] = {
        modules,
        widgets,
        layout,
        bounds
      }
      
      pageStream.complete = complete
      pageStream.lastUpdated = Date.now()

      // Update total page dimensions if layout info is available
      if (layout?.totalHeight) pageStream.totalHeight = layout.totalHeight
      if (layout?.totalWidth) pageStream.totalWidth = layout.totalWidth
    },

    /**
     * Parse viewport section string to bounds object
     */
    parseViewportSection(section: string): { top: number, bottom: number, left: number, right: number } {
      // Expected format: "top-bottom_left-right" e.g., "0-800_0-600"
      const [vertical, horizontal] = section.split('_')
      const [top, bottom] = vertical.split('-').map(Number)
      const [left, right] = horizontal.split('-').map(Number)
      
      return { top, bottom, left, right }
    },

    /**
     * Handle table stream update
     */
    updateTableStream(tableId: string, rows: any[], offset: number, total?: number, complete: boolean = false) {
      if (!this.tableStreams[tableId]) {
        this.tableStreams[tableId] = {
          tableId,
          rows: [],
          offset: 0,
          complete: false,
          lastUpdated: Date.now()
        }
      }

      const tableStream = this.tableStreams[tableId]
      
      // Insert rows at correct position
      if (offset === 0) {
        tableStream.rows = rows
      } else {
        // Merge with existing rows
        for (let i = 0; i < rows.length; i++) {
          tableStream.rows[offset + i] = rows[i]
        }
      }
      
      tableStream.offset = offset + rows.length
      if (total !== undefined) tableStream.total = total
      tableStream.complete = complete
      tableStream.lastUpdated = Date.now()
    },

    /**
     * Update viewport for lazy loading
     */
    updateViewport(id: string, viewport: any) {
      this.viewports[id] = {
        ...viewport,
        lastUpdated: Date.now()
      }
    },

    /**
     * Clear stream data
     */
    clearStream(streamId: string) {
      delete this.streams[streamId]
    },

    /**
     * Clear widget content
     */
    clearWidgetContent(widgetId: string) {
      delete this.widgetContent[widgetId]
    },

    /**
     * Clear page stream
     */
    clearPageStream(pageId: string) {
      delete this.pageStreams[pageId]
    },

    /**
     * Clear table stream
     */
    clearTableStream(tableId: string) {
      delete this.tableStreams[tableId]
    },

    /**
     * Clear all streaming data
     */
    clearAll() {
      this.streams = {}
      this.widgetContent = {}
      this.pageStreams = {}
      this.tableStreams = {}
      this.viewports = {}
      
      // Complete all active progress
      Object.keys(this.activeProgress).forEach(key => {
        const progress = this.activeProgress[key]
        this.completeProgress(progress.operation, progress.id)
      })
    },

    /**
     * Initialize streaming handlers
     */
    initHandlers() {
      // Progress updates
      registerHandler('progress.update', (action, payload) => {
        if (action === 'update') {
          this.updateProgress(payload.operation, payload.id, payload.percent, payload.message)
        }
      })

      // Stream chunks
      registerHandler('stream.chunk', (action, payload) => {
        this.handleStreamChunk(payload.id, payload.chunk, payload.complete)
      })

      // Widget content
      registerHandler('widget.content', (action, payload) => {
        this.updateWidgetContent(payload.widgetId, payload.content, payload.viewport)
      })

      // Page streaming
      registerHandler('page.stream', (action, payload) => {
        this.updatePageStream(
          payload.pageId, 
          payload.viewportSection, 
          payload.modules, 
          payload.widgets, 
          payload.layout,
          payload.complete
        )
      })

      // Table streaming
      registerHandler('table.stream', (action, payload) => {
        this.updateTableStream(payload.tableId, payload.rows, payload.offset, payload.total, payload.complete)
      })
    }
  }
})
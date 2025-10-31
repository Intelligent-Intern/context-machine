// src/core/messaging/ws/socket.ts
import { dispatch } from '@/core/messaging/api'

let ws: WebSocket | null = null
let reconnectTimer: number | null = null
let heartbeatTimer: number | null = null

const WS_BASE_URL = (import.meta.env.VITE_WS_URL as string) || `ws://${window.location.host}/ws`

// Progress tracking for streaming operations
let progressCallbacks: Map<string, (progress: number) => void> = new Map()

/**
 * Handles different types of WebSocket messages
 */
function handleWebSocketMessage(msg: any) {
  // Handle standard action/payload messages (existing format)
  if (msg.a && msg.p !== undefined) {
    console.log(`[ws] Dispatching message: ${msg.a}`, msg.p)
    dispatch(msg.a, msg.p)
    return
  }

  // Handle progress updates for streaming operations
  if (typeof msg.percent === 'number') {
    handleProgressMessage(msg)
    return
  }

  // Handle streaming content messages
  if (msg.type === 'stream') {
    handleStreamMessage(msg)
    return
  }

  // Handle widget content streaming
  if (msg.type === 'widget_content') {
    handleWidgetContentMessage(msg)
    return
  }

  // Handle page streaming
  if (msg.type === 'page_stream') {
    handlePageStreamMessage(msg)
    return
  }

  // Handle table streaming
  if (msg.type === 'table_stream') {
    handleTableStreamMessage(msg)
    return
  }

  // Handle heartbeat/ping responses
  if (msg.type === 'pong' || msg.a === 'pong') {
    // Heartbeat response - no action needed
    return
  }

  // Unknown message format - only warn if it's not a simple progress update
  if (!msg.percent) {
    console.warn('[ws] Unknown message format', msg)
  }
}

/**
 * Handles progress messages for loading operations
 */
function handleProgressMessage(msg: { percent: number, operation?: string, id?: string }) {
  const { percent, operation = 'default', id = 'default' } = msg

  // Call registered progress callback if exists
  const callbackKey = `${operation}_${id}`
  const callback = progressCallbacks.get(callbackKey)
  if (callback) {
    callback(percent)
  }

  // Dispatch to global progress handler
  dispatch('progress.update', { percent, operation, id })
}

/**
 * Handles streaming content messages
 */
function handleStreamMessage(msg: { type: string, id: string, chunk: any, complete?: boolean }) {
  dispatch('stream.chunk', {
    id: msg.id,
    chunk: msg.chunk,
    complete: msg.complete || false
  })
}

/**
 * Handles widget content streaming
 */
function handleWidgetContentMessage(msg: { type: string, widget_id: string, content: any, viewport?: any }) {
  dispatch('widget.content', {
    widgetId: msg.widget_id,
    content: msg.content,
    viewport: msg.viewport
  })
}

/**
 * Handles page streaming for lazy loading
 * Pages contain modules and widgets that are streamed based on viewport
 */
function handlePageStreamMessage(msg: {
  type: string,
  page_id: string,
  viewport_section: string,
  modules?: any[],
  widgets?: any[],
  layout?: any,
  complete?: boolean
}) {
  dispatch('page.stream', {
    pageId: msg.page_id,
    viewportSection: msg.viewport_section,
    modules: msg.modules || [],
    widgets: msg.widgets || [],
    layout: msg.layout,
    complete: msg.complete || false
  })
}

/**
 * Handles table streaming for large datasets
 */
function handleTableStreamMessage(msg: { type: string, table_id: string, rows: any[], offset: number, total?: number, complete?: boolean }) {
  dispatch('table.stream', {
    tableId: msg.table_id,
    rows: msg.rows,
    offset: msg.offset,
    total: msg.total,
    complete: msg.complete || false
  })
}

/**
 * Startet die WebSocket-Verbindung mit JWT-Authentifizierung.
 */
export function connectWebSocket() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    console.log('[ws] WebSocket already connected/connecting, reusing existing connection')
    return ws
  }

  // Close existing connection if it exists
  if (ws) {
    console.log('[ws] Closing existing WebSocket connection')
    ws.close()
    ws = null
  }

  // Get JWT token for authentication
  const token = getAuthToken()
  if (!token) {
    console.warn('[ws] No auth token available, skipping WebSocket connection')
    return null
  }

  const wsUrl = buildWebSocketUrl(token)


  ws = new WebSocket(wsUrl)

  ws.onopen = () => {
    console.log('[ws] Connected to WebSocket')
    reconnectAttempts = 0 // Reset reconnect attempts on successful connection
    startHeartbeat()
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  ws.onclose = () => {
    console.warn('[ws] Connection closed')
    stopHeartbeat()
    scheduleReconnect()
  }

  ws.onerror = (ev) => {
    console.error('[ws] WebSocket error:', ev)
  }

  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data)
      handleWebSocketMessage(msg)
    } catch (err: any) {
      console.error('[ws] Message parse error:', err, 'Data:', ev.data)
    }
  }

  return ws
}

/**
 * Sendet eine Nachricht über WS (für subscribe/unspecified Messages).
 */
export function wsSend(payload: any) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload))
  } else {
    console.warn('[ws] send failed: not connected')
  }
}

/**
 * Registers a progress callback for a specific operation
 */
export function registerProgressCallback(operation: string, id: string, callback: (progress: number) => void) {
  const key = `${operation}_${id}`
  progressCallbacks.set(key, callback)
}

/**
 * Unregisters a progress callback
 */
export function unregisterProgressCallback(operation: string, id: string) {
  const key = `${operation}_${id}`
  progressCallbacks.delete(key)
}

/**
 * Requests streaming content for a widget
 */
export function requestWidgetStream(widgetId: string, viewport?: { top: number, bottom: number, left: number, right: number }) {
  wsSend({
    a: 'widget.stream',
    p: {
      widget_id: widgetId,
      viewport: viewport
    }
  })
}

/**
 * Requests streaming content for a page based on viewport
 * This will stream modules and widgets that are visible or about to be visible
 */
export function requestPageStream(pageId: string, viewport: {
  top: number,
  bottom: number,
  left: number,
  right: number,
  scrollDirection?: 'up' | 'down' | 'left' | 'right'
}) {
  wsSend({
    a: 'page.stream',
    p: {
      page_id: pageId,
      viewport: viewport,
      preload_buffer: 200 // Preload content 200px before it becomes visible
    }
  })
}

/**
 * Requests streaming table data
 */
export function requestTableStream(tableId: string, offset: number = 0, limit: number = 50, viewport?: any) {
  wsSend({
    a: 'table.stream',
    p: {
      table_id: tableId,
      offset: offset,
      limit: limit,
      viewport: viewport
    }
  })
}

/**
 * Subscribes to real-time updates for a specific resource
 */
export function subscribeToUpdates(resourceType: string, resourceId: string) {
  wsSend({
    a: 'subscribe',
    p: {
      type: resourceType,
      id: resourceId
    }
  })
}

/**
 * Unsubscribes from real-time updates
 */
export function unsubscribeFromUpdates(resourceType: string, resourceId: string) {
  wsSend({
    a: 'unsubscribe',
    p: {
      type: resourceType,
      id: resourceId
    }
  })
}

/**
 * Heartbeat-Ping alle 20s, damit Proxy/LoadBalancer die Verbindung nicht schließen.
 */
function startHeartbeat() {
  stopHeartbeat()
  heartbeatTimer = window.setInterval(() => {
    wsSend({ a: 'ping', p: { ts: Date.now() } })
  }, 20000)
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
}

/**
 * Reconnect mit Backoff (max 30s).
 */
let reconnectAttempts = 0
function scheduleReconnect() {
  if (reconnectTimer) return

  // Don't reconnect if we already have a working connection
  if (ws && ws.readyState === WebSocket.OPEN) {
    console.log('[ws] WebSocket already connected, skipping reconnect')
    return
  }

  // Exponential backoff: 5s, 10s, 20s, 30s, dann 30s
  const delay = Math.min(5000 * Math.pow(2, reconnectAttempts), 30000)
  reconnectAttempts++

  console.log(`[ws] Scheduling reconnect in ${delay}ms (attempt ${reconnectAttempts})`)
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null
    connectWebSocket()
  }, delay)
}

/**
 * Gets the current JWT token from auth store
 */
function getAuthToken(): string | null {
  try {
    // Import auth store dynamically to avoid circular dependencies
    const authStore = (window as any).__AUTH_STORE__ || localStorage.getItem('auth_token')
    if (typeof authStore === 'string') {
      return authStore
    }
    return authStore?.accessToken || null
  } catch (error) {
    console.error('[ws] Error getting auth token:', error)
    return null
  }
}

/**
 * Builds WebSocket URL with JWT token authentication
 */
function buildWebSocketUrl(token: string): string {
  const url = new URL(WS_BASE_URL)

  // Add JWT token as query parameter for authentication
  url.searchParams.set('token', token)

  // Add API key if available (fallback authentication)
  const apiKey = import.meta.env.VITE_API_KEY || 'dev-key-123'
  url.searchParams.set('api_key', apiKey)

  return url.toString()
}

/**
 * Disconnects WebSocket and clears timers
 */
export function disconnectWebSocket() {


  if (ws) {
    ws.close()
    ws = null
  }

  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }

  stopHeartbeat()
  reconnectAttempts = 0
}

/**
 * Reconnects WebSocket with fresh token
 */
export function reconnectWebSocket() {

  disconnectWebSocket()
  connectWebSocket()
}

// src/core/messaging/ws/socket.ts
import { dispatch } from '@/core/messaging/api'
import { useErrorStore } from '@/core/stores/error'

let ws: WebSocket | null = null
let reconnectTimer: number | null = null
let heartbeatTimer: number | null = null

const WS_URL = (import.meta.env.VITE_WS_URL as string) || `ws://${window.location.host}/ws`

/**
 * Startet die WebSocket-Verbindung.
 */
export function connectWebSocket() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return ws
  }

  const errorStore = useErrorStore()
  ws = new WebSocket(WS_URL)

  ws.onopen = () => {
    console.info('[ws] connected')
    startHeartbeat()
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  ws.onclose = () => {
    console.warn('[ws] closed')
    stopHeartbeat()
    scheduleReconnect()
  }

  ws.onerror = (ev) => {
    console.error('[ws] error', ev)
    errorStore.add({
      source: 'ws',
      code: 'ERROR',
      msg: 'WebSocket error',
      details: { event: ev },
      ts: new Date().toISOString()
    })
  }

  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data)
      if (msg.a) {
        dispatch(msg.a, msg.p)
      } else {
        console.warn('[ws] invalid message format', msg)
      }
    } catch (err: any) {
      errorStore.add({
        source: 'ws',
        code: 'PARSE',
        msg: 'WebSocket message parse error',
        details: { error: err.message, data: ev.data },
        ts: new Date().toISOString()
      })
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
function scheduleReconnect() {
  if (reconnectTimer) return
  reconnectTimer = window.setTimeout(() => {
    console.info('[ws] reconnecting…')
    connectWebSocket()
  }, 5000)
}

<template>
  <div class="message-tester p-4 bg-white rounded-lg shadow-sm border">
    <h3 class="text-lg font-semibold mb-4">Real-time Message Tester</h3>
    
    <div class="space-y-4">
      <!-- Send Test Message -->
      <div class="test-section">
        <h4 class="font-medium mb-2">Send Test Message</h4>
        <div class="flex gap-2">
          <select v-model="selectedAction" class="border rounded px-3 py-1">
            <option value="chat.send">Chat Send</option>
            <option value="dashboard.stats.get">Dashboard Stats</option>
            <option value="navigation.menu.get">Navigation Menu</option>
            <option value="discovery.module.list">Discovery Modules</option>
          </select>
          <input 
            v-model="testPayload" 
            placeholder="Test payload (JSON)" 
            class="border rounded px-3 py-1 flex-1"
          />
          <button 
            @click="sendTestMessage" 
            :disabled="isSending"
            class="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {{ isSending ? 'Sending...' : 'Send' }}
          </button>
        </div>
      </div>
      
      <!-- WebSocket Status -->
      <div class="test-section">
        <h4 class="font-medium mb-2">WebSocket Status</h4>
        <div class="flex items-center gap-2">
          <div :class="wsStatusClass" class="w-3 h-3 rounded-full"></div>
          <span>{{ wsStatusText }}</span>
          <button 
            @click="reconnectWS" 
            class="ml-4 bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
          >
            Reconnect
          </button>
        </div>
      </div>
      
      <!-- Recent Messages -->
      <div class="test-section">
        <h4 class="font-medium mb-2">Recent Messages (Last 10)</h4>
        <div class="bg-gray-50 rounded p-3 max-h-64 overflow-y-auto">
          <div v-if="recentMessages.length === 0" class="text-gray-500 text-sm">
            No messages received yet...
          </div>
          <div 
            v-for="(msg, index) in recentMessages" 
            :key="index"
            class="text-sm mb-2 p-2 bg-white rounded border-l-4"
            :class="getMessageTypeClass(msg.type)"
          >
            <div class="font-mono text-xs text-gray-600">{{ msg.timestamp }}</div>
            <div class="font-medium">{{ msg.action }}</div>
            <div class="text-gray-700 mt-1">
              <pre class="whitespace-pre-wrap text-xs">{{ JSON.stringify(msg.payload, null, 2) }}</pre>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Clear Messages -->
      <div class="flex justify-end">
        <button 
          @click="clearMessages" 
          class="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
        >
          Clear Messages
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { sendMessage, registerHandler } from '@/core/messaging/api'

const selectedAction = ref('chat.send')
const testPayload = ref('{"message": "Hello from frontend!"}')
const isSending = ref(false)
const wsStatus = ref('unknown')
const recentMessages = ref<Array<{
  type: 'sent' | 'received' | 'error'
  action: string
  payload: any
  timestamp: string
}>>([])

const wsStatusClass = computed(() => {
  switch (wsStatus.value) {
    case 'connected': return 'bg-green-500'
    case 'connecting': return 'bg-yellow-500'
    case 'disconnected': return 'bg-red-500'
    default: return 'bg-gray-500'
  }
})

const wsStatusText = computed(() => {
  switch (wsStatus.value) {
    case 'connected': return 'Connected'
    case 'connecting': return 'Connecting...'
    case 'disconnected': return 'Disconnected'
    default: return 'Unknown'
  }
})

function getMessageTypeClass(type: string) {
  switch (type) {
    case 'sent': return 'border-blue-400'
    case 'received': return 'border-green-400'
    case 'error': return 'border-red-400'
    default: return 'border-gray-400'
  }
}

function addMessage(type: 'sent' | 'received' | 'error', action: string, payload: any) {
  recentMessages.value.unshift({
    type,
    action,
    payload,
    timestamp: new Date().toLocaleTimeString()
  })
  
  // Keep only last 10 messages
  if (recentMessages.value.length > 10) {
    recentMessages.value = recentMessages.value.slice(0, 10)
  }
}

async function sendTestMessage() {
  if (isSending.value) return
  
  isSending.value = true
  
  try {
    let payload = {}
    if (testPayload.value.trim()) {
      payload = JSON.parse(testPayload.value)
    }
    
    addMessage('sent', selectedAction.value, payload)
    
    const result = await sendMessage(selectedAction.value, payload)
    
  } catch (error) {
    console.error('[MessageTester] Error sending message:', error)
    addMessage('error', selectedAction.value, { error: error.message })
  } finally {
    isSending.value = false
  }
}

function reconnectWS() {
  import('@/core/messaging/ws/socket').then(({ reconnectWebSocket }) => {
    reconnectWebSocket()
  })
}

function clearMessages() {
  recentMessages.value = []
}

// Register message handler to capture incoming messages
let messageHandler: ((action: string, payload: any) => void) | null = null

onMounted(() => {
  // Register a catch-all handler to capture all incoming messages
  messageHandler = (action: string, payload: any) => {
    addMessage('received', action, payload)
  }
  
  registerHandler('test', messageHandler)
  
  // Check WebSocket status periodically
  const checkWsStatus = () => {
    // This is a simplified status check
    wsStatus.value = 'connected' // Assume connected for now
  }
  
  checkWsStatus()
  const statusInterval = setInterval(checkWsStatus, 5000)
  
  onUnmounted(() => {
    clearInterval(statusInterval)
  })
})
</script>

<style scoped>
.test-section {
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 1rem;
}

.test-section:last-child {
  border-bottom: none;
  padding-bottom: 0;
}
</style>
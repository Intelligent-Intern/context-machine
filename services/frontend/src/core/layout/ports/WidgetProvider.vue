<!-- src/core/layout/ports/WidgetProvider.vue -->
<template>
  <div class="widget-provider h-full w-full m-0 p-0">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { provide, computed } from 'vue'
import { useLayoutStore } from '@/core/stores/layout'
import { useNotificationStore } from '@/core/stores/notification'

interface Props {
  widgetId: string
  port: string
}

const props = defineProps<Props>()

const layout = useLayoutStore()
const notifications = useNotificationStore()

// Provide widget context
const ctx = computed(() => ({
  widgetId: props.widgetId,
  port: props.port,
  layout: layout,
  notifications: notifications
}))

// Provide event dispatcher
const dispatchEvent = (eventType: string, payload?: any) => {
  console.log(`[WidgetProvider] Dispatching event: ${eventType}`, payload)
  
  // Handle different event types
  switch (eventType) {
    case 'notification':
      if (payload?.type && payload?.message) {
        notifications.add(payload.type, payload.message)
      }
      break
    case 'layout-update':
      if (payload?.config) {
        layout.applyConfig(payload.config)
      }
      break
    default:
      console.warn(`[WidgetProvider] Unknown event type: ${eventType}`)
  }
}

// Provide injections
provide('ctx', ctx)
provide('dispatchEvent', dispatchEvent)
</script>
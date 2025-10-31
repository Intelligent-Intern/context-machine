<!-- src/core/layout/ports/PortContainer.vue -->
<template>
  <section
      :aria-label="`Port ${port}`"
      class="h-full w-full m-0 p-0"
      :data-port="port"
  >
    <!-- Show widgets if any -->
    <template
        v-for="entry in entries"
        :key="`${port}-${entry.slot}-${entry.widget}`"
    >
      <WidgetProvider
          v-if="resolve(entry)"
          :widget-id="entry.widget"
          :port="port"
      >
        <component :is="resolve(entry)" />
      </WidgetProvider>
      <div v-else class="p-3 text-sm text-red-600">
        Unknown widget: <code>{{ entry.widget }}</code>
      </div>
    </template>
    
    <!-- Show placeholder if no widgets -->
    <div v-if="entries.length === 0" class="port-placeholder">
      <div class="placeholder-content">
        <div class="placeholder-text">{{ getPortName(port) }}</div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useLayoutStore } from '@/core/stores/layout'
import { resolveWidget, hasWidget } from '@/core/widgets/registry'
import WidgetProvider from './WidgetProvider.vue'

type PortKey = 'top' | 'bottom' | 'left' | 'right' | 'main'
interface SlotEntry {
  slot: number
  widget: string
}

const props = defineProps<{ port: PortKey }>()

const layout = useLayoutStore()

const entries = computed<SlotEntry[]>(() => {
  const portWidgets = layout.getPortWidgets(props.port)
  
  return portWidgets.map((widget: string, index: number) => ({
    slot: index + 1,
    widget: widget
  }))
})

function resolve(entry: SlotEntry) {
  console.log('[PortContainer] Resolving widget:', entry.widget)
  if (hasWidget(entry.widget)) {
    const widgetLoader = resolveWidget(entry.widget)
    console.log('[PortContainer] Widget loader:', entry.widget, widgetLoader)
    
    // Convert dynamic import to async component
    const asyncComponent = defineAsyncComponent(widgetLoader)
    console.log('[PortContainer] Async component created:', entry.widget)
    return asyncComponent
  }
  console.warn('[PortContainer] No widget found for', entry.widget)
  return null
}

// Port name mapping for placeholders
function getPortName(portKey: string): string {
  const names: Record<string, string> = {
    'top': 'Top Bar',
    'bottom': 'Bottom Bar', 
    'left': 'Left Sidebar',
    'right': 'Right Sidebar',
    'main': 'Main Content'
  }
  return names[portKey] || portKey
}
</script>

<style scoped>
.port-placeholder {
  height: 100%;
  width: 100%;
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9fafb;
  min-height: 100px;
}

.placeholder-content {
  text-align: center;
  color: #6b7280;
}

.placeholder-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.placeholder-text {
  font-weight: 600;
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
}

.placeholder-subtext {
  font-size: 0.75rem;
  opacity: 0.7;
}
</style>
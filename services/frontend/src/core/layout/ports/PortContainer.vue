<!-- src/core/layout/ports/PortContainer.vue -->
<template>
  <section
      :aria-label="`Port ${port}`"
      class="h-full w-full overflow-hidden"
      :data-port="port"
  >
    <template
        v-for="entry in visibleSlots"
        :key="`${port}-${entry.slot}-${entry.widget}`"
    >
      <PortSlot :slot-index="entry.slot" :port="port">
        <component
            v-if="resolve(entry)"
            :is="resolve(entry)"
            :ctx="ctx"
            :bind-key="entry.bind || null"
            :class="widgetClass(entry)"
        />
        <div v-else class="p-3 text-sm text-red-600">
          Unknown widget: <code>{{ entry.widget }}</code>
        </div>
      </PortSlot>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, provide } from 'vue'
import { useRoute } from 'vue-router'
import { useLayoutStore } from '@/core/stores/layout'
import PortSlot from '@/core/layout/ports/PortSlot.vue'
import { useUserStateStore } from '@/core/stores/userState'
import { useApi } from '@/composables/useApi'
import { resolveWidget, hasWidget } from '@/core/widgets/registry'

type PortKey = 'top' | 'bottom' | 'left' | 'right' | 'main'
interface SlotEntry {
  slot: number
  widget: string
  bind?: string
  visibleWhen?: string
  classes?: string
}

const props = defineProps<{ port: PortKey }>()

const route = useRoute()
const layout = useLayoutStore()
const userState = useUserStateStore()
const { request } = useApi()

const ctx = computed(() => ({
  route: {
    params: route.params,
    query: route.query,
    path: route.path,
    name: route.name
  },
  page: layout.activePage,
  user: userState.data?.preferences || {},
  layout: layout.bars
}))

function dispatch(event: {
  name: string
  scope: 'ui' | 'backend'
  payload?: any
  permission?: string
}) {
  if (event.scope === 'backend') {
    request('event.dispatch', {
      name: event.name,
      payload: event.payload,
      permission: event.permission
    })
  } else {
    if (event.name === 'bar.right.open') layout.setBarState('right', 3)
    if (event.name === 'bar.right.close') layout.setBarState('right', 0)
  }
}
provide('dispatchEvent', dispatch)
provide('ctx', ctx)

const entries = computed<SlotEntry[]>(() => {
  const m = layout.manifest as any
  const list: SlotEntry[] = m?.ports?.[props.port] || []
  return [...list].sort((a, b) => (a.slot || 0) - (b.slot || 0))
})

function isVisible(entry: SlotEntry): boolean {
  if (!entry.visibleWhen) return true
  try {
    const c = ctx.value as any
    const inMatch = entry.visibleWhen.match(/^ctx\.([\w.]+)\s+in\s+\[(.*)\]$/)
    if (inMatch) {
      const path = inMatch[1]
      const arr = inMatch[2]
          .split(',')
          .map(s => s.trim().replace(/^['"]|['"]$/g, ''))
      const val = path.split('.').reduce((acc, k) => (acc ? acc[k] : undefined), c)
      return arr.includes(String(val))
    }
    const eqMatch = entry.visibleWhen.match(/^ctx\.([\w.]+)\s*={2,3}\s*['\"](.+)['\"]$/)
    if (eqMatch) {
      const path = eqMatch[1]
      const expected = eqMatch[2]
      const val = path.split('.').reduce((acc, k) => (acc ? acc[k] : undefined), c)
      return String(val) === expected
    }
    console.warn('[PortContainer] Unsupported visibleWhen expression:', entry.visibleWhen)
    return true
  } catch (e) {
    console.warn('[PortContainer] visibleWhen evaluation failed:', entry, e)
    return true
  }
}

const visibleSlots = computed(() => entries.value.filter(isVisible))

function resolve(entry: SlotEntry) {
  if (hasWidget(entry.widget)) {
    return resolveWidget(entry.widget)
  }
  console.warn('[PortContainer] No widget found for', entry.widget)
  return null
}

function widgetClass(entry: SlotEntry) {
  // Widget-Referenz auflösen
  if (!hasWidget(entry.widget)) return ''
  const comp = resolveWidget(entry.widget) as any
  // Optional: Klassen-Hooks können in Manifest oder Registry hinterlegt sein
  return comp?.classes?.root || entry.classes || ''
}
</script>

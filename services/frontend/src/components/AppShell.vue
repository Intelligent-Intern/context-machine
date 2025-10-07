<!-- src/components/AppShell.vue -->
<template>
  <div
      class="min-h-screen w-full grid bg-white text-gray-900"
      :class="gridTemplate"
  >
    <!-- Top Bar -->
    <TopBar v-if="isVisible('top')" role="banner" :class="barClass('top')">
      <PortContainer port="top" />
    </TopBar>

    <!-- Left Bar -->
    <aside
        v-if="isMounted('left')"
        :style="leftStyle"
        :class="barClass('left')"
        role="complementary"
        aria-label="Linke Sidebar"
    >
      <div v-if="isActive('left')" class="h-full flex flex-col overflow-hidden">
        <PortContainer port="left" />
      </div>
    </aside>

    <!-- Main -->
    <main
        id="main-content"
        class="h-full w-full overflow-hidden focus:outline-none"
        role="main"
        tabindex="-1"
        :class="mainClass"
    >
      <PortContainer port="main" />
    </main>

    <!-- Right Bar -->
    <aside
        v-if="isMounted('right')"
        :style="rightStyle"
        :class="barClass('right')"
        role="complementary"
        aria-label="Rechte Sidebar"
    >
      <div v-if="isActive('right')" class="h-full flex flex-col overflow-hidden">
        <PortContainer port="right" />
      </div>
    </aside>

    <!-- Bottom Bar -->
    <BottomBar
        v-if="isVisible('bottom')"
        role="contentinfo"
        :class="barClass('bottom')"
    >
      <PortContainer port="bottom" />
    </BottomBar>
  </div>

  <!-- Global Modal -->
  <GlobalModal />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLayoutStore } from '@/core/stores/layout'
import TopBar from '@/core/layout/bars/TopBar.vue'
import BottomBar from '@/core/layout/bars/BottomBar.vue'
import PortContainer from '@/core/layout/ports/PortContainer.vue'
import GlobalModal from '@/core/layout/modal/GlobalModal.vue'

type BarKey = 'top' | 'bottom' | 'left' | 'right'

const layout = useLayoutStore()

const state = computed(() => layout.bars)
const sizes = computed(() => layout.sizes)

const gridTemplate = computed(() => {
  const left = isVisible('left') ? 'auto' : '0'
  const right = isVisible('right') ? 'auto' : '0'
  return [
    'grid-rows-[auto_1fr_auto]',
    `grid-cols-[${left}_minmax(0,1fr)_${right}]`
  ].join(' ')
})

const mainClass = computed(() => [
  'relative',
  'row-start-2 row-end-3 col-start-2 col-end-3'
])

function isMounted(key: BarKey) {
  return state.value[key] > 0
}
function isVisible(key: BarKey) {
  return state.value[key] >= 1
}
function isActive(key: BarKey) {
  return state.value[key] >= 2
}

function barClass(key: BarKey) {
  const base = 'relative bg-gray-50 border border-gray-200'
  const borders: Record<BarKey, string> = {
    top: 'border-b',
    bottom: 'border-t',
    left: 'border-r',
    right: 'border-l'
  }
  const gridAreas: Record<BarKey, string> = {
    top: 'row-start-1 row-end-2 col-start-1 col-end-4',
    bottom: 'row-start-3 row-end-4 col-start-1 col-end-4',
    left: 'row-start-2 row-end-3 col-start-1 col-end-2',
    right: 'row-start-2 row-end-3 col-start-3 col-end-4'
  }
  return [base, borders[key], gridAreas[key]]
}

const leftStyle = computed(() => {
  const s = sizes.value.left
  const st = state.value.left
  if (st === 1) return { width: '0.5rem' }
  if (st === 2 || st === 3) return { width: `${s.current}px` }
  if (st === 4) return { width: '100vw', position: 'fixed', inset: '0', zIndex: '50' }
  return { display: 'none' }
})

const rightStyle = computed(() => {
  const s = sizes.value.right
  const st = state.value.right
  if (st === 1) return { width: '0.5rem' }
  if (st === 2 || st === 3) return { width: `${s.current}px` }
  if (st === 4) return { width: '100vw', position: 'fixed', inset: '0', zIndex: '50' }
  return { display: 'none' }
})
</script>

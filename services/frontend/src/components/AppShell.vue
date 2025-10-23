<!-- src/components/AppShell.vue -->
<template>
  <div class="app-shell min-h-screen w-full flex flex-col bg-white text-gray-900">
    <!-- Top Bar -->
    <header 
      v-if="isVisible('top')" 
      class="top-bar flex-shrink-0"
      :style="topStyle"
      role="banner"
    >
      <PortContainer port="top" />
    </header>

    <!-- Main Content Area with Sidebar Manager -->
    <div class="flex-1 flex overflow-hidden relative">
      <SidebarManager>
        <!-- Left Sidebar Content -->
        <template #left>
          <PortContainer port="left" />
        </template>
        
        <!-- Right Sidebar Content -->
        <template #right>
          <PortContainer port="right" />
        </template>

        <!-- Main Content -->
        <template #main>
          <main
            id="main-content"
            class="main-content flex-1 overflow-hidden"
            role="main"
            tabindex="-1"
          >
            <div class="h-full overflow-y-auto">
              <PortContainer port="main" />
            </div>
          </main>
        </template>
      </SidebarManager>
    </div>

    <!-- Bottom Bar -->
    <footer
      v-if="isVisible('bottom')"
      class="bottom-bar flex-shrink-0"
      :style="bottomStyle"
      role="contentinfo"
    >
      <PortContainer port="bottom" />
    </footer>
  </div>

  <!-- Global Modal -->
  <GlobalModal />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLayoutStore } from '@/core/stores/layout'
import PortContainer from '@/core/layout/ports/PortContainer.vue'
import GlobalModal from '@/core/layout/modal/GlobalModal.vue'
import SidebarManager from '@/core/layout/SidebarManager.vue'

type BarKey = 'top' | 'bottom' | 'left' | 'right'

const layout = useLayoutStore()

const state = computed(() => layout.bars)

// Top bar styles
const topStyle = computed(() => {
  const st = state.value.top
  if (st === 0) return { display: 'none' }
  if (st === 1) return { height: '4px' } // Minimal indicator
  return { height: '64px' } // Full height
})

// Bottom bar styles  
const bottomStyle = computed(() => {
  const st = state.value.bottom
  if (st === 0) return { display: 'none' }
  if (st === 1) return { height: '4px' } // Minimal indicator
  return { height: '48px' } // Full height
})

function isVisible(key: BarKey) {
  return state.value[key] >= 1
}
</script>

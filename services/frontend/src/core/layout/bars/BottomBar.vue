<template>
  <footer
      v-show="visible"
      class="relative w-full bg-surface border-t border-border flex items-center"
      role="contentinfo"
      aria-label="Bottom bar"
  >
    <slot />
  </footer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLayoutStore } from '@/core/stores/layout'

/**
 * BottomBar.vue
 *
 * Structural wrapper for bottom bar.
 * Visibility controlled by layout store bar state.
 */

const layout = useLayoutStore()
const visible = computed(() => layout.bars.bottom > 0)
</script>
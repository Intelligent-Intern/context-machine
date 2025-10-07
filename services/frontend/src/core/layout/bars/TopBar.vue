<template>
  <header
    v-show="visible"
    class="relative w-full bg-surface border-b border-border flex items-center"
    role="banner"
    aria-label="Top bar"
  >
    <slot />
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLayoutStore } from '@/core/stores/layout'

/**
 * TopBar.vue
 *
 * Structural wrapper for top bar.
 * Visibility controlled by layout store bar state.
 */

const layout = useLayoutStore()
const visible = computed(() => layout.bars.top > 0)
</script>

<template>
  <aside
    v-show="visible"
    class="relative h-full bg-surface border-l border-border flex flex-col"
    role="complementary"
    aria-label="Right sidebar"
  >
    <slot />
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLayoutStore } from '@/core/stores/layout'

/**
 * RightBar.vue
 *
 * Structural wrapper for right sidebar.
 * Visibility controlled by layout store bar state.
 */

const layout = useLayoutStore()
const visible = computed(() => layout.bars.right > 0)
</script>
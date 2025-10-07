<template>
  <div
    class="h-full w-full flex flex-col"
    :data-port="port"
    :data-slot="slotIndex"
    role="region"
    :aria-label="`Port ${port} Slot ${slotIndex}`"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
/**
 * PortSlot.vue
 *
 * Minimal wrapper representing a single slot within a port.
 * Provides ARIA semantics and structured DOM for styling.
 */

const props = defineProps<{
  port: 'top' | 'bottom' | 'left' | 'right' | 'main'
  slotIndex: number
}>()
</script>

<style scoped>
[data-port][data-slot] {
  outline: none;
}
</style>
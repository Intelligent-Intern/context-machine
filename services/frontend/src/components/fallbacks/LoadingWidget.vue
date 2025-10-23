<template>
  <div class="loading-widget p-4 bg-gray-50 border border-gray-200 rounded-lg">
    <div class="flex items-center space-x-3">
      <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
      <div class="text-gray-600">
        <span class="font-medium">Loading Widget...</span>
        <div class="text-sm text-gray-500 mt-1">
          {{ widgetRef }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  widgetRef: string
}

defineProps<Props>()
</script>
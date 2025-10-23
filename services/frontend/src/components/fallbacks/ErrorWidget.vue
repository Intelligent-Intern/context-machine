<template>
  <div class="error-widget p-4 border-2 border-red-300 bg-red-50 rounded-lg">
    <div class="flex items-center space-x-2 text-red-700">
      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
      </svg>
      <span class="font-semibold">Widget Error</span>
    </div>
    
    <div class="mt-2 text-sm text-red-600">
      <p><strong>Widget:</strong> <code class="bg-red-100 px-1 rounded">{{ widgetRef }}</code></p>
      <p class="mt-1"><strong>Error:</strong> {{ error }}</p>
    </div>
    
    <div class="mt-3">
      <button 
        @click="retry" 
        class="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
      >
        Retry Loading
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  widgetRef: string
  error: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  retry: []
}>()

const retry = () => {
  emit('retry')
}
</script>
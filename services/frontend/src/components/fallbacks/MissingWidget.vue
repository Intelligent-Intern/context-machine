<template>
  <div class="missing-widget p-4 border-2 border-dashed border-red-300 bg-red-50 rounded-lg">
    <div class="flex items-center space-x-2 text-red-700">
      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
      </svg>
      <span class="font-semibold">Widget Not Found</span>
    </div>
    
    <div class="mt-2 text-sm text-red-600">
      <p><strong>Widget:</strong> <code class="bg-red-100 px-1 rounded">{{ widgetRef }}</code></p>
      <p class="mt-1">This widget could not be loaded. Please check:</p>
      <ul class="mt-1 ml-4 list-disc">
        <li>Widget path is correct</li>
        <li>Component file exists</li>
        <li>Widget pack is properly registered</li>
      </ul>
    </div>
    
    <div class="mt-3 text-xs text-red-500">
      <details>
        <summary class="cursor-pointer hover:text-red-700">Debug Info</summary>
        <div class="mt-2 bg-red-100 p-2 rounded text-xs font-mono">
          <p><strong>Pack:</strong> {{ pack }}</p>
          <p><strong>Component:</strong> {{ component }}</p>
          <p><strong>Available Packs:</strong> {{ availablePacks.join(', ') || 'None' }}</p>
          <p><strong>Pack Components:</strong> {{ packComponents.join(', ') || 'None' }}</p>
        </div>
      </details>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getRegisteredPacks, getPackComponents } from '@/core/widgets/registry'

interface Props {
  widgetRef: string
  error?: string
}

const props = defineProps<Props>()

const [pack, component] = props.widgetRef.split('@')

const availablePacks = computed(() => getRegisteredPacks())
const packComponents = computed(() => pack ? getPackComponents(pack) : [])
</script>
<!-- frontend/page/intelligent-intern.com/widgets/CtaBar.vue -->
<template>
  <section class="bg-gray-50 border-t border-b border-gray-200">
    <div class="mx-auto max-w-6xl px-6 py-6 flex flex-col sm:flex-row items-center gap-4">
      <div class="text-gray-800 font-medium">{{ text }}</div>
      <div class="flex-1"></div>
      <router-link
        :to="to"
        class="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold"
      >{{ primary }}</router-link>
    </div>
  </section>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ primary: string; to: string; text?: string }>(), {
  text: 'Bereit für den Start?'
})
</script>

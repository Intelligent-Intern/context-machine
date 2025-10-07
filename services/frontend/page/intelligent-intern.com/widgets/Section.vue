<!-- frontend/page/intelligent-intern.com/widgets/Section.vue -->
<template>
  <section class="bg-white">
    <div class="mx-auto max-w-6xl px-6 py-10">
      <h2 class="text-2xl font-bold text-gray-900 mb-4">{{ title }}</h2>
      <ul class="space-y-2 list-disc pl-5 text-gray-700">
        <li v-for="(it, i) in items" :key="i">{{ it }}</li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{ title: string; items?: string[] }>()
</script>

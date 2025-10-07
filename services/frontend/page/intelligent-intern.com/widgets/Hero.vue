<!-- frontend/page/intelligent-intern.com/widgets/Hero.vue -->
<template>
  <section class="bg-gradient-to-b from-gray-50 to-white">
    <div class="mx-auto max-w-6xl px-6 py-14 text-center">
      <h1 class="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">
        {{ title }}
      </h1>
      <p class="mt-4 text-lg text-gray-600">
        {{ subtitle }}
      </p>
      <div class="mt-8 flex items-center justify-center gap-4">
        <router-link
          to="/app/idea"
          class="inline-flex items-center px-5 py-3 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold"
        >Idee starten</router-link>
        <router-link
          to="/about"
          class="inline-flex items-center px-5 py-3 rounded-md border border-gray-300 text-gray-800 hover:bg-gray-100"
        >Mehr erfahren</router-link>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{ title: string; subtitle?: string }>()
</script>

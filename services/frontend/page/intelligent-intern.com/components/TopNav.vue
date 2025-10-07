<!-- frontend/page/intelligent-intern.com/components/TopNav.vue -->
<template>
  <nav class="w-full bg-gray-900 text-white">
    <div class="mx-auto max-w-6xl px-6 h-14 flex items-center gap-6">
      <router-link to="/" class="font-semibold tracking-wide hover:text-blue-300">intelligent‑intern</router-link>
      <div class="flex-1"></div>
      <router-link
        v-for="link in nav"
        :key="link.to"
        :to="link.to"
        class="text-sm font-medium hover:text-blue-300"
      >{{ link.label }}</router-link>
      <router-link
        to="/app/idea"
        class="ml-4 inline-flex items-center px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-sm font-semibold"
      >Loslegen</router-link>
    </div>
  </nav>
</template>

<script setup lang="ts">
import manifest from '../manifest/site.json'
const nav = manifest.navigation
</script>

<template>
  <div class="home-page">
    <!-- Show loading state while config is loading -->
    <div v-if="!discovery.isConfigLoaded" class="loading-container">
      <div class="flex items-center justify-center min-h-screen">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 class="text-xl font-semibold text-gray-700">Loading Configuration...</h2>
          <p class="text-gray-500 mt-2">Setting up your dynamic interface</p>
        </div>
      </div>
    </div>

    <!-- Show AppShell when config is loaded -->
    <AppShell v-else />
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { useRouter } from 'vue-router'
import { useDiscoveryStore } from '@/core/stores/discovery'
import { useAuthStore } from '@/core/stores/auth'
import AppShell from '@/components/AppShell.vue'

const router = useRouter()
const discovery = useDiscoveryStore()
const auth = useAuthStore()

// Watch for config loading and redirect to appropriate page
watch(
  () => discovery.isConfigLoaded,
  (isLoaded) => {
    if (isLoaded && Object.keys(discovery.pages).length > 0) {
      // Find the home page or first available page
      const homePage = Object.values(discovery.pages).find(page => page.route === '/')
      const firstPage = Object.values(discovery.pages)[0]
      
      if (homePage) {
        // Stay on home page, just let AppShell handle it
      } else if (firstPage && firstPage.route !== '/') {
        // Redirect to first available page
        router.replace(firstPage.route)
      }
    }
  },
  { immediate: true }
)

// If user is not authenticated, redirect to login
watch(
  () => auth.isAuthenticated,
  (isAuth) => {
    if (!isAuth) {
      router.push('/login')
    }
  },
  { immediate: true }
)
</script>
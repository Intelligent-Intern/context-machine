<!-- src/App.vue -->
<template>
  <div id="app" class="min-h-screen flex flex-col bg-white text-gray-900" :class="{ 'authenticated': isAuthenticated }">
    <!-- Skip-Link für A11y -->
    <a
        href="#main-content"
        class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-blue-600 text-white px-3 py-2 rounded shadow-md"
    >
      {{ t('a11y.skipToContent') }}
    </a>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-container">
      <div class="flex items-center justify-center min-h-screen">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 class="text-xl font-semibold text-gray-700">{{ loadingMessage }}</h2>
        </div>
      </div>
    </div>

    <!-- Hauptlayout -->
    <AppShell v-else>
      <router-view v-slot="{ Component }">
        <component :is="Component" id="main-content" />
      </router-view>
    </AppShell>

    <!-- Toast Notifications -->
    <div
        class="fixed bottom-4 right-4 flex flex-col gap-2 z-50"
        aria-live="polite"
    >
      <div
          v-for="n in notifications.items"
          :key="n.id"
          class="px-4 py-2 rounded shadow-md text-sm font-medium transition-transform transform"
          :class="toastClass(n.type)"
      >
        {{ n.message }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import AppShell from '@/core/layout/AppShell.vue'
import { useNotificationStore } from '@/core/stores/notification'
import { useAuthStore } from '@/core/stores/auth'
import { useI18n } from '@/core/i18n'
import { isLoading, loadingMessage } from '@/core/initCore'

const notifications = useNotificationStore()
const authStore = useAuthStore()
const { t } = useI18n()

const isAuthenticated = computed(() => authStore.isAuthenticated)

// Initialize auth store on app startup
onMounted(() => {
  authStore.initialize()
})

/**
 * Map Notification-Typ zu Tailwind-Klassen
 */
function toastClass(type: string) {
  switch (type) {
    case 'success':
      return 'bg-green-600 text-white'
    case 'error':
      return 'bg-red-600 text-white'
    case 'warning':
      return 'bg-yellow-500 text-black'
    case 'info':
      return 'bg-blue-600 text-white'
    default:
      return 'bg-gray-800 text-white'
  }
}
</script>

<style>
/* Screenreader-only Utility */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>

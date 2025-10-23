<template>
  <div class="top-bar h-full w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 flex items-center justify-between">
    <div class="flex items-center space-x-6">
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
          <span class="text-lg">🚀</span>
        </div>
        <div>
          <h1 class="text-lg font-bold">Context Machine</h1>
          <span class="text-xs opacity-75">Dynamic UI System</span>
        </div>
      </div>
    </div>
    
    <div class="flex items-center space-x-4">
      <div v-if="user" class="flex items-center space-x-3">
        <div class="text-right">
          <div class="text-sm font-medium">{{ user.name }}</div>
          <div class="text-xs opacity-75">{{ user.role }}</div>
        </div>
        <div class="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
          <span class="text-sm font-bold">{{ user.name.charAt(0) }}</span>
        </div>
      </div>
      <button 
        v-if="user" 
        @click="handleLogout"
        class="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
      >
        Logout
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/core/stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

const user = computed(() => authStore.user)

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}
</script>
<template>
  <div class="welcome-widget p-8 h-full overflow-y-auto">
    <div class="max-w-4xl mx-auto">
      <div class="text-center mb-8">
        <h2 class="text-3xl font-bold text-gray-900 mb-2">Welcome to Context Machine</h2>
        <p class="text-gray-600">Your dynamic, data-driven platform is ready!</p>
      </div>
    
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div class="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-6">
          <div class="flex items-center mb-3">
            <span class="text-2xl mr-3">✅</span>
            <h3 class="text-lg font-semibold text-green-800">Backend Integration</h3>
          </div>
          <p class="text-green-700 text-sm">
            Successfully connected to backend with JWT authentication and dynamic configuration loading.
          </p>
        </div>
        
        <div class="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6">
          <div class="flex items-center mb-3">
            <span class="text-2xl mr-3">📊</span>
            <h3 class="text-lg font-semibold text-blue-800">System Status</h3>
          </div>
          <div class="text-blue-700 text-sm space-y-1">
            <div>• JWT Authentication: Active</div>
            <div>• Dynamic Configuration: Loaded</div>
            <div>• Widget Registry: Functional</div>
            <div>• Router Integration: Working</div>
          </div>
        </div>
        
        <div class="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-6">
          <div class="flex items-center mb-3">
            <span class="text-2xl mr-3">🔧</span>
            <h3 class="text-lg font-semibold text-purple-800">Configuration</h3>
          </div>
          <div class="text-purple-700 text-sm space-y-1">
            <div><strong>User:</strong> {{ user?.name }}</div>
            <div><strong>Role:</strong> {{ user?.role }}</div>
            <div><strong>Modules:</strong> {{ moduleCount }} loaded</div>
            <div><strong>Pages:</strong> {{ pageCount }} configured</div>
          </div>
        </div>
      </div>
      
      <!-- Real-time Message Tester -->
      <MessageTester />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/core/stores/auth'
import { useDiscoveryStore } from '@/core/stores/discovery'
import MessageTester from './MessageTester.vue'

const authStore = useAuthStore()
const discoveryStore = useDiscoveryStore()

const user = computed(() => authStore.user)
const moduleCount = computed(() => Object.keys(discoveryStore.modules).length)
const pageCount = computed(() => Object.keys(discoveryStore.pages).length)
// const widgetPackCount = computed(() => Object.keys(discoveryStore.widgetPacks).length)
</script>
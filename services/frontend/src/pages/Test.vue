<template>
  <div class="test-page">
    <h1>Test Page</h1>
    <p>If you can see this, the Vue app is working!</p>
    <div class="test-info">
      <h2>System Status</h2>
      <ul>
        <li>Vue App: ✅ Working</li>
        <li>Router: ✅ Working</li>
        <li>Auth Store: {{ authStore ? '✅' : '❌' }} {{ authStore ? 'Loaded' : 'Not Loaded' }}</li>
        <li>Discovery Store: {{ discoveryStore ? '✅' : '❌' }} {{ discoveryStore ? 'Loaded' : 'Not Loaded' }}</li>
      </ul>
    </div>
    
    <div class="actions">
      <button @click="goToLogin">Go to Login</button>
      <button @click="testBackend">Test Backend</button>
    </div>
    
    <div v-if="testResult" class="test-result">
      <h3>Test Result:</h3>
      <pre>{{ testResult }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/core/stores/auth'
import { useDiscoveryStore } from '@/core/stores/discovery'

const router = useRouter()
const authStore = useAuthStore()
const discoveryStore = useDiscoveryStore()
const testResult = ref('')

const goToLogin = () => {
  router.push('/login')
}

const testBackend = async () => {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    })
    
    if (response.ok) {
      const data = await response.json()
      testResult.value = JSON.stringify(data, null, 2)
    } else {
      testResult.value = `Error: ${response.status} ${response.statusText}`
    }
  } catch (error) {
    testResult.value = `Error: ${error.message}`
  }
}
</script>

<style scoped>
.test-page {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
}

.test-info {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  margin: 1rem 0;
}

.actions {
  margin: 1rem 0;
}

button {
  background: #007bff;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  margin-right: 0.5rem;
  cursor: pointer;
}

button:hover {
  background: #0056b3;
}

.test-result {
  background: #e9ecef;
  padding: 1rem;
  border-radius: 8px;
  margin: 1rem 0;
}

pre {
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
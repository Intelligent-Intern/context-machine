<template>
  <div class="auth-container">
    <!-- Background Elements -->
    <div class="auth-bg-orb auth-bg-orb-1"></div>
    <div class="auth-bg-orb auth-bg-orb-2"></div>
    <div class="auth-bg-orb auth-bg-orb-3"></div>

    <!-- Login Card -->
    <div class="auth-card">
      <!-- Brand Section -->
      <div class="auth-brand">
        <div class="auth-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <h1 class="auth-title">{{ title }}</h1>
        <p class="auth-subtitle">{{ subtitle }}</p>
      </div>

      <!-- Login Form -->
      <form @submit.prevent="handleSubmit" class="auth-form">
        <!-- Username Field -->
        <div class="auth-form-group">
          <label for="username" class="auth-label">Username</label>
          <div class="auth-input-container">
            <div class="auth-input-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <input
              id="username"
              v-model="form.username"
              type="text"
              class="auth-input"
              placeholder="Enter your username"
              :disabled="loading"
              required
            />
          </div>
          <div v-if="errors.username" class="auth-error">{{ errors.username }}</div>
        </div>

        <!-- Password Field -->
        <div class="auth-form-group">
          <label for="password" class="auth-label">Password</label>
          <div class="auth-input-container">
            <div class="auth-input-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <circle cx="12" cy="16" r="1"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <input
              id="password"
              v-model="form.password"
              type="password"
              class="auth-input"
              placeholder="Enter your password"
              :disabled="loading"
              required
            />
          </div>
          <div v-if="errors.password" class="auth-error">{{ errors.password }}</div>
        </div>

        <!-- Options -->
        <div class="auth-options" v-if="showRememberMe || showForgotPassword">
          <label v-if="showRememberMe" class="auth-checkbox-container">
            <input v-model="form.rememberMe" type="checkbox" class="auth-checkbox" :disabled="loading" />
            <span class="auth-checkbox-label">Remember me</span>
          </label>
          <button 
            v-if="showForgotPassword"
            type="button" 
            class="auth-forgot-link" 
            @click="handleForgotPassword"
            :disabled="loading"
          >
            Forgot password?
          </button>
        </div>

        <!-- Error Message -->
        <div v-if="errorMessage" class="auth-error-banner">
          <div class="auth-error-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <div class="auth-error-content">
            <h4>Login Failed</h4>
            <p>{{ errorMessage }}</p>
          </div>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          :disabled="loading || !isFormValid"
          class="auth-submit"
          :class="{ 'loading': loading }"
        >
          <div v-if="loading" class="auth-loading-spinner"></div>
          <span>{{ loading ? 'Signing in...' : 'Sign In' }}</span>
        </button>
      </form>

      <!-- Footer -->
      <div class="auth-footer">
        <p>Demo: <code>admin / admin123</code></p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject } from 'vue'

interface Props {
  title?: string
  subtitle?: string
  showRememberMe?: boolean
  showForgotPassword?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Sign In',
  subtitle: 'Welcome back',
  showRememberMe: true,
  showForgotPassword: true
})

const emit = defineEmits<{
  login: [payload: { username: string; password: string; rememberMe: boolean }]
  'forgot-password': [payload: { username: string }]
}>()

// Injected dependencies
const dispatchEvent = inject('dispatchEvent') as Function
const ctx = inject('ctx') as any

// Form state
const form = ref({
  username: '',
  password: '',
  rememberMe: false
})

const errors = ref({
  username: '',
  password: ''
})

const loading = ref(false)
const errorMessage = ref('')

// Computed
const isFormValid = computed(() => {
  return form.value.username.trim() !== '' && 
         form.value.password.trim() !== '' &&
         !errors.value.username && 
         !errors.value.password
})

// Methods
function validateForm(): boolean {
  errors.value = { username: '', password: '' }
  
  if (!form.value.username.trim()) {
    errors.value.username = 'Username is required'
  }
  
  if (!form.value.password.trim()) {
    errors.value.password = 'Password is required'
  } else if (form.value.password.length < 3) {
    errors.value.password = 'Password must be at least 3 characters'
  }
  
  return !errors.value.username && !errors.value.password
}

async function handleSubmit() {
  if (!validateForm()) return
  
  loading.value = true
  errorMessage.value = ''
  
  try {
    // Emit to parent component
    emit('login', {
      username: form.value.username,
      password: form.value.password,
      rememberMe: form.value.rememberMe
    })
    
    // Login directly via auth store (no message system needed)
    const { useAuthStore } = await import('@/core/stores/auth')
    const authStore = useAuthStore()
    
    const success = await authStore.loginWithCredentials(
      form.value.username,
      form.value.password
    )
    
    if (success) {
      // Simple redirect to home page
      window.location.href = '/'
    }
    
  } catch (error: any) {
    console.error('[LoginForm] Login error:', error)
    errorMessage.value = error.message || 'Login failed. Please try again.'
  } finally {
    loading.value = false
  }
}

function handleForgotPassword() {
  emit('forgot-password', { username: form.value.username })
  
  // Navigate to forgot password page
  window.location.href = '/forgot-password'
}
</script>

<!-- No styles in widgets - all styling via theme classes -->
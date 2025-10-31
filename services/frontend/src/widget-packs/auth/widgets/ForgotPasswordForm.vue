<template>
  <div class="auth-container">
    <!-- Background Elements -->
    <div class="auth-bg-orb auth-bg-orb-1"></div>
    <div class="auth-bg-orb auth-bg-orb-2"></div>
    <div class="auth-bg-orb auth-bg-orb-3"></div>

    <!-- Forgot Password Card -->
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

      <!-- Forgot Password Form -->
      <form @submit.prevent="handleSubmit" class="auth-form">
        <!-- Username/Email Field -->
        <div class="auth-form-group">
          <label for="username" class="auth-label">Username or Email</label>
          <div class="auth-input-container">
            <div class="auth-input-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <input
              id="username"
              v-model="form.username"
              type="text"
              class="auth-input"
              placeholder="Enter your username or email"
              :disabled="loading"
              required
            />
          </div>
          <div v-if="errors.username" class="auth-error">{{ errors.username }}</div>
        </div>

        <!-- Success Message -->
        <div v-if="successMessage" class="auth-success-banner">
          <div class="auth-success-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22,4 12,14.01 9,11.01"/>
            </svg>
          </div>
          <div class="auth-success-content">
            <h4>Reset Link Sent</h4>
            <p>{{ successMessage }}</p>
          </div>
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
            <h4>Reset Failed</h4>
            <p>{{ errorMessage }}</p>
          </div>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          :disabled="loading || !isFormValid || successMessage"
          class="auth-submit"
          :class="{ 'loading': loading }"
        >
          <div v-if="loading" class="auth-loading-spinner"></div>
          <span>{{ loading ? 'Sending...' : 'Send Reset Link' }}</span>
        </button>

      </form>

      <!-- Footer -->
      <div class="auth-footer">
        <p>Remember your password? <a href="/login" class="auth-link">← Back to Login</a></p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject } from 'vue'

interface Props {
  title?: string
  subtitle?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Reset Password',
  subtitle: 'Enter your username or email to receive reset instructions'
})

const emit = defineEmits<{
  'forgot-password': [payload: { username: string }]
  'back-to-login': []
}>()

// Injected dependencies (optional with fallbacks)
const dispatchEvent = inject('dispatchEvent', () => {
  console.log('[ForgotPasswordForm] No dispatchEvent provided, using fallback')
}) as Function

const ctx = inject('ctx', {
  widgetId: 'auth@ForgotPasswordForm',
  port: 'main'
}) as any

// Form state
const form = ref({
  username: ''
})

const errors = ref({
  username: ''
})

const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

// Computed
const isFormValid = computed(() => {
  return form.value.username.trim() !== '' && !errors.value.username
})

// Methods
function validateForm(): boolean {
  errors.value = { username: '' }
  
  if (!form.value.username.trim()) {
    errors.value.username = 'Username or email is required'
    return false
  }
  
  // Basic email validation if it looks like an email
  if (form.value.username.includes('@')) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.value.username)) {
      errors.value.username = 'Please enter a valid email address'
      return false
    }
  }
  
  return true
}

async function handleSubmit() {
  if (!validateForm()) return
  
  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''
  
  try {
    // Emit to parent component
    emit('forgot-password', {
      username: form.value.username
    })
    
    // Simulate API call (replace with actual API call)
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Show success message
    successMessage.value = `Reset instructions have been sent to ${form.value.username}`
    
    // Auto redirect to login after 3 seconds
    setTimeout(() => {
      goToLogin()
    }, 3000)
    
  } catch (error: any) {
    console.error('[ForgotPasswordForm] Reset error:', error)
    errorMessage.value = error.message || 'Failed to send reset instructions. Please try again.'
  } finally {
    loading.value = false
  }
}

function goToLogin() {
  emit('back-to-login')
  window.location.href = '/login'
}
</script>

<!-- No styles in widgets - all styling via theme classes -->
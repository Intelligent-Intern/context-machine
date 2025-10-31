<template>
  <div class="top-bar-widget">
    <!-- Logo/Brand -->
    <div class="brand-section">
      <div class="logo" @click="goHome">
        <div class="logo-icon">🌿</div>
        <span class="logo-text">Context Machine</span>
      </div>
    </div>
    
    <!-- Center Section -->
    <div class="center-section">
      <!-- Page Title or Breadcrumbs could go here -->
    </div>
    
    <!-- Right Section -->
    <div class="right-section">
      <!-- User Menu -->
      <div class="user-menu">
        <button class="user-button" @click="toggleUserMenu">
          <div class="user-avatar">{{ userInitials }}</div>
          <span class="user-name">{{ userName }}</span>
          <svg class="dropdown-icon" :class="{ 'rotate-180': userMenuOpen }">
            <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        
        <!-- User Dropdown -->
        <div v-if="userMenuOpen" class="user-dropdown">
          <a href="/profile" class="dropdown-item">
            <svg class="item-icon">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2" fill="none"/>
              <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2" fill="none"/>
            </svg>
            Profile
          </a>
          <a href="/settings" class="dropdown-item">
            <svg class="item-icon">
              <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" fill="none"/>
              <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1" stroke="currentColor" stroke-width="2" fill="none"/>
            </svg>
            Settings
          </a>
          <div class="dropdown-divider"></div>
          <button @click="logout" class="dropdown-item logout">
            <svg class="item-icon">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" stroke-width="2" fill="none"/>
              <polyline points="16,17 21,12 16,7" stroke="currentColor" stroke-width="2" fill="none"/>
              <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" stroke-width="2"/>
            </svg>
            Logout
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

// Reactive state
const userMenuOpen = ref(false)

// User info
const user = computed(() => {
  try {
    const authData = localStorage.getItem('auth_user')
    return authData ? JSON.parse(authData) : { name: 'Admin', email: 'admin@example.com' }
  } catch {
    return { name: 'Admin', email: 'admin@example.com' }
  }
})

const userName = computed(() => user.value?.name || 'Admin')
const userInitials = computed(() => {
  const name = userName.value
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
})

// Functions
function goHome() {
  window.location.href = '/'
}

function toggleUserMenu() {
  userMenuOpen.value = !userMenuOpen.value
}

function logout() {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('auth_user')
  window.location.href = '/logout'
}

// Close dropdown when clicking outside
function handleClickOutside(event: Event) {
  const target = event.target as Element
  if (!target.closest('.user-menu')) {
    userMenuOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<!-- No styles - all styling via theme system -->
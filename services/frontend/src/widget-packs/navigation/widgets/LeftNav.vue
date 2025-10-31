<template>
  <nav class="left-nav">
    <!-- Elegant Toggle Button - Hidden on Mobile -->
    <div v-if="!isMobile" class="nav-toggle-section" :class="{ 'collapsed': isCollapsed }">
      <button class="nav-toggle-btn" @click="toggleSidebar" :title="isCollapsed ? 'Expand Navigation' : 'Collapse Navigation'">
        <svg class="toggle-arrow" :class="{ 'collapsed': isCollapsed }" viewBox="0 0 24 24" fill="none">
          <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>
    
    <div class="nav-content">
      <div v-if="loading" class="nav-loading">
        <div class="loading-spinner"></div>
        <span>Loading navigation...</span>
      </div>
      
      <ul v-else-if="navItems.length > 0" class="nav-list">
        <li v-for="item in navItems" :key="item.id" class="nav-item">
          <a 
            :href="item.route" 
            class="nav-link"
            :class="{ 'active': $route.path === item.route, 'collapsed': isCollapsed }"
            @click.prevent="handleNavClick(item)"
            :title="isCollapsed ? item.name : ''"
          >
            <span class="nav-icon" v-if="item.icon">{{ item.icon }}</span>
            <span class="nav-text" v-show="!isCollapsed">{{ item.name }}</span>
            
            <!-- Tooltip for collapsed state -->
            <div v-if="isCollapsed" class="nav-tooltip">
              {{ item.name }}
            </div>
          </a>
        </li>
      </ul>
      
      <div v-else class="nav-empty">
        <span>No navigation items available</span>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, inject, computed } from 'vue'

interface NavItem {
  id: string
  name: string
  route: string
  icon?: string
  order?: number
}

const navItems = ref<NavItem[]>([])
const loading = ref(true)
const isMobile = ref(false)

// Get messaging context from WidgetProvider
const dispatchEvent = inject('dispatchEvent') as (eventType: string, payload?: any) => void

// Check if mobile
const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768
}

// Check if sidebar is collapsed by looking at parent container width
const isCollapsed = computed(() => {
  // Don't show collapsed state on mobile
  if (isMobile.value) return false
  
  // Check if parent sidebar has collapsed class or small width
  const sidebar = document.querySelector('.modern-left-sidebar')
  if (!sidebar) return false
  
  const width = sidebar.getBoundingClientRect().width
  // Consider collapsed if width is 80px or less (desktop) or 60px or less (tablet)
  const threshold = window.innerWidth <= 1024 ? 70 : 80
  return width <= threshold
})

onMounted(async () => {
  console.log('[LeftNav] Widget mounted, requesting navigation items')
  
  // Initialize mobile detection
  checkMobile()
  window.addEventListener('resize', checkMobile)
  
  // Try to load from localStorage first
  const cachedItems = loadFromCache()
  if (cachedItems.length > 0) {
    console.log('[LeftNav] Loaded navigation from cache:', cachedItems.length)
    navItems.value = cachedItems
    loading.value = false
  } else {
    console.log('[LeftNav] No cached navigation items found')
    
    // Fallback after timeout if no WebSocket response
    setTimeout(() => {
      if (navItems.value.length === 0) {
        console.log('[LeftNav] Adding fallback navigation items (WebSocket timeout)')
        navItems.value = [
          { id: 'home', name: 'Home', route: '/', icon: '🏠', order: 1 },
          { id: 'logout', name: 'Logout', route: '/logout', icon: '🚪', order: 999 }
        ]
        loading.value = false
        saveToCache(navItems.value)
      }
    }, 5000) // Wait 5 seconds for WebSocket response
  }
  
  try {
    // Always request fresh data from backend
    await requestNavigationItems()
  } catch (error) {
    console.error('[LeftNav] Failed to request navigation items:', error)
    // If we have cached items, keep them, otherwise show error
    if (navItems.value.length === 0) {
      loading.value = false
    }
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

async function requestNavigationItems() {
  console.log('[LeftNav] Sending navigation.items.get message to backend')
  
  try {
    // Register message handler BEFORE sending request
    registerNavigationHandler()
    
    // Import messaging API
    const { sendMessage } = await import('@/core/messaging/api')
    
    // Send message to backend - response will come via WebSocket
    await sendMessage('navigation.items.get', {
      context: 'left-sidebar',
      user_role: 'admin' // TODO: Get from auth store
    })
    
    console.log('[LeftNav] Navigation items request sent')
    
  } catch (error) {
    console.error('[LeftNav] Error sending navigation request:', error)
    loading.value = false
  }
}

function registerNavigationHandler() {
  // Import and register handler for navigation responses
  import('@/core/messaging/api').then(({ registerHandler }) => {
    // Register for both possible handler keys to be safe
    registerHandler('navigation', (action, payload) => {
      console.log(`[LeftNav] Received navigation message: ${action}`, payload)
      
      if (action === 'items.response') {
        navItems.value = payload.items || []
        loading.value = false
        console.log('[LeftNav] Navigation items loaded:', navItems.value.length)
        
        // Cache the navigation items
        saveToCache(navItems.value)
      } else if (action === 'items.error') {
        console.error('[LeftNav] Navigation items error:', payload.error)
        loading.value = false
      }
    })
    
    // Also register for the full action path as fallback
    registerHandler('navigation.items', (action, payload) => {
      console.log(`[LeftNav] Received navigation.items message: ${action}`, payload)
      
      if (action === 'response') {
        navItems.value = payload.items || []
        loading.value = false
        console.log('[LeftNav] Navigation items loaded:', navItems.value.length)
        
        // Cache the navigation items
        saveToCache(navItems.value)
      } else if (action === 'error') {
        console.error('[LeftNav] Navigation items error:', payload.error)
        loading.value = false
      }
    })
  })
}

// Cache functions
function saveToCache(items: NavItem[]) {
  try {
    localStorage.setItem('navigation-items', JSON.stringify(items))
    console.log('[LeftNav] Navigation items cached')
  } catch (error) {
    console.warn('[LeftNav] Failed to cache navigation items:', error)
  }
}

function loadFromCache(): NavItem[] {
  try {
    const cached = localStorage.getItem('navigation-items')
    console.log('[LeftNav] Raw cache content:', cached)
    if (cached) {
      const parsed = JSON.parse(cached)
      console.log('[LeftNav] Parsed cache content:', parsed)
      return parsed
    }
  } catch (error) {
    console.warn('[LeftNav] Failed to load navigation items from cache:', error)
  }
  console.log('[LeftNav] No cache found, returning empty array')
  return []
}

function handleNavClick(item: NavItem) {
  console.log('[LeftNav] Navigation click:', item.route)
  
  // Close mobile sidebar on navigation
  closeMobileSidebar()
  
  // Handle special routes
  if (item.route === '/logout') {
    // Perform logout
    window.location.href = '/logout'
    return
  }
  
  // For other routes, use router navigation
  if (item.route === '/') {
    // Already on home, just refresh the page content
    console.log('[LeftNav] Already on home page')
    return
  }
  
  // Navigate to route
  window.location.href = item.route
}

function closeMobileSidebar() {
  // Check if we're on mobile and sidebar is open
  const isMobile = window.innerWidth <= 768
  if (isMobile) {
    // Dispatch custom event to close mobile sidebar
    window.dispatchEvent(new CustomEvent('close-mobile-sidebar'))
  }
}

function toggleSidebar() {
  // Dispatch custom event to toggle sidebar
  window.dispatchEvent(new CustomEvent('toggle-sidebar', { detail: 'left' }))
}
</script>

<!-- No styles - all styling via theme system -->
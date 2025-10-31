<!-- src/components/AppShell.vue -->
<template>
  <div class="modern-app-shell">
    <!-- Mobile Burger Menu (floating) -->
    <button 
      v-if="isMobile && isVisible('left')"
      class="mobile-burger-menu-floating"
      @click="toggleMobileSidebar"
      :class="{ 'active': mobileMenuOpen }"
    >
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </button>

    <!-- Main Layout Container with Grid -->
    <div class="modern-layout-grid">
      <!-- Top Bar -->
      <header 
        v-if="isVisible('top')" 
        class="modern-top-bar"
        :style="topStyle"
        role="banner"
      >
        <PortContainer port="top" />
      </header>

      <!-- Left Sidebar - Hidden on Mobile -->
      <aside 
        v-if="isVisible('left') && !isMobile"
        class="modern-left-sidebar"
        :class="sidebarClasses.left"
        :style="sidebarStyles.left"
        @mouseenter="onSidebarHover('left', true)"
        @mouseleave="onSidebarHover('left', false)"
      >
        <!-- Sidebar Content -->
        <div class="sidebar-content">
          <PortContainer port="left" />
        </div>
        
        <!-- Resize Handle -->
        <div 
          v-if="!sidebarClasses.left.collapsed && !isMobile"
          class="resize-handle resize-handle-right"
          @mousedown="startResize('left', $event)"
        >
          <div class="resize-indicator"></div>
        </div>
        
        <!-- Collapse/Expand Button -->
        <button 
          v-if="!isMobile"
          class="sidebar-toggle-btn sidebar-toggle-left"
          @click="toggleSidebar('left')"
          :title="sidebarClasses.left.collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        >
          <svg class="toggle-icon" :class="{ 'rotate-180': sidebarClasses.left.collapsed }">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </aside>

      <!-- Main Content -->
      <main class="modern-main-content" role="main" tabindex="-1">
        <PortContainer port="main" />
      </main>

      <!-- Right Sidebar -->
      <aside 
        v-if="isVisible('right')"
        class="modern-right-sidebar"
        :class="sidebarClasses.right"
        :style="sidebarStyles.right"
        @mouseenter="onSidebarHover('right', true)"
        @mouseleave="onSidebarHover('right', false)"
      >
        <!-- Sidebar Content -->
        <div class="sidebar-content">
          <PortContainer port="right" />
        </div>
        
        <!-- Resize Handle -->
        <div 
          v-if="!sidebarClasses.right.collapsed && !isMobile"
          class="resize-handle resize-handle-left"
          @mousedown="startResize('right', $event)"
        >
          <div class="resize-indicator"></div>
        </div>
        
        <!-- Collapse/Expand Button -->
        <button 
          v-if="!isMobile"
          class="sidebar-toggle-btn sidebar-toggle-right"
          @click="toggleSidebar('right')"
          :title="sidebarClasses.right.collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        >
          <svg class="toggle-icon" :class="{ 'rotate-180': !sidebarClasses.right.collapsed }">
            <path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </aside>

      <!-- Bottom Bar -->
      <footer
        v-if="isVisible('bottom')"
        class="modern-bottom-bar"
        :style="bottomStyle"
        role="contentinfo"
      >
        <PortContainer port="bottom" />
      </footer>
    </div>
    
    <!-- Mobile Sidebar Overlay -->
    <aside 
      v-if="isMobile && isVisible('left')"
      class="modern-left-sidebar mobile-sidebar"
      :class="{ 'mobile-open': mobileMenuOpen }"
    >
      <PortContainer port="left" />
    </aside>

    <!-- Mobile Overlay -->
    <div 
      v-if="isMobile && mobileMenuOpen"
      class="mobile-overlay"
      @click="closeMobileSidebar"
    ></div>
  </div>

  <!-- Global Modal -->
  <GlobalModal />
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useLayoutStore } from '@/core/stores/layout'
import PortContainer from '@/core/layout/ports/PortContainer.vue'
import GlobalModal from '@/core/layout/modal/GlobalModal.vue'

type BarKey = 'top' | 'bottom' | 'left' | 'right'
type SidebarSide = 'left' | 'right'

const layout = useLayoutStore()

// Reactive state
const isMobile = ref(false)
const isResizing = ref(false)
const resizingSide = ref<SidebarSide | null>(null)
const hoveredSide = ref<SidebarSide | null>(null)
const mobileMenuOpen = ref(false)

// Constants
const MOBILE_BREAKPOINT = 768
const MIN_SIDEBAR_WIDTH = 200
const MAX_SIDEBAR_WIDTH = 600
const COLLAPSED_WIDTH = 64
const AUTO_COLLAPSE_THRESHOLD = 120

const state = computed(() => layout.bars)

// Check if mobile
const checkMobile = () => {
  const width = window.innerWidth
  isMobile.value = width <= MOBILE_BREAKPOINT
  console.log(`[AppShell] Screen width: ${width}px, isMobile: ${isMobile.value}`)
}

// Top bar styles
const topStyle = computed(() => {
  const st = state.value.t
  if (st === 0) return { display: 'none' }
  return { height: '64px' }
})

// Bottom bar styles  
const bottomStyle = computed(() => {
  const st = state.value.b
  if (st === 0) return { display: 'none' }
  return { height: '48px' }
})

// Sidebar classes and styles
const sidebarClasses = computed(() => ({
  left: {
    'collapsed': state.value.l === 1,
    'expanded': state.value.l === 2,
    'hovered': hoveredSide.value === 'left',
    'resizing': isResizing.value && resizingSide.value === 'left',
    'mobile-open': isMobile.value && mobileMenuOpen.value
  },
  right: {
    'collapsed': state.value.r === 1,
    'expanded': state.value.r === 2,
    'hovered': hoveredSide.value === 'right',
    'resizing': isResizing.value && resizingSide.value === 'right'
  }
}))

const sidebarStyles = computed(() => ({
  left: {
    width: state.value.l === 1 ? '64px' : state.value.l === 2 ? `${layout.sizes.left.current}px` : '0px'
  },
  right: {
    width: state.value.r === 1 ? '64px' : state.value.r === 2 ? `${layout.sizes.right.current}px` : '0px'
  }
}))

function isVisible(key: BarKey) {
  const keyMap: Record<BarKey, keyof typeof state.value> = {
    'top': 't',
    'bottom': 'b',
    'left': 'l', 
    'right': 'r'
  }
  return state.value[keyMap[key]] >= 1
}

// Sidebar interactions
function toggleSidebar(side: SidebarSide) {
  const currentState = layout.bars[side === 'left' ? 'l' : 'r']
  if (currentState >= 2) {
    layout.setBarState(side === 'left' ? 'l' : 'r', 1) // Collapse
  } else {
    layout.setBarState(side === 'left' ? 'l' : 'r', 2) // Expand
  }
}

function onSidebarHover(side: SidebarSide, isHovering: boolean) {
  hoveredSide.value = isHovering ? side : null
}

// Resize functionality
let startX = 0
let startWidth = 0

function startResize(side: SidebarSide, event: MouseEvent) {
  isResizing.value = true
  resizingSide.value = side
  startX = event.clientX
  startWidth = layout.sizes[side].current
  
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  
  event.preventDefault()
}

function handleResize(event: MouseEvent) {
  if (!isResizing.value || !resizingSide.value) return
  
  const deltaX = event.clientX - startX
  const multiplier = resizingSide.value === 'left' ? 1 : -1
  let newWidth = startWidth + (deltaX * multiplier)
  
  // Get default width for the sidebar
  const defaultWidth = resizingSide.value === 'left' ? 280 : 320
  
  // Only allow resizing larger than default, not smaller
  newWidth = Math.max(defaultWidth, Math.min(MAX_SIDEBAR_WIDTH, newWidth))
  
  // Ensure sidebar is expanded
  const barKey = resizingSide.value === 'left' ? 'l' : 'r'
  if (layout.bars[barKey] === 1) {
    layout.setBarState(barKey, 2)
  }
  
  layout.setBarSize(resizingSide.value, newWidth)
}

function stopResize() {
  isResizing.value = false
  resizingSide.value = null
  
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
  
  layout.persistSizes()
}

// Mobile menu functions
function toggleMobileSidebar() {
  mobileMenuOpen.value = !mobileMenuOpen.value
}

function closeMobileSidebar() {
  mobileMenuOpen.value = false
}

// Responsive handling
function handleWindowResize() {
  const wasMobile = isMobile.value
  checkMobile()
  
  // Close mobile menu when switching to desktop
  if (wasMobile && !isMobile.value) {
    mobileMenuOpen.value = false
  }
}

// Handle mobile sidebar close event from navigation
function handleCloseMobileSidebar() {
  if (isMobile.value) {
    mobileMenuOpen.value = false
  }
}

// Handle sidebar toggle event from navigation
function handleToggleSidebar(event: CustomEvent) {
  const side = event.detail as SidebarSide
  toggleSidebar(side)
}

// Lifecycle
onMounted(() => {
  checkMobile()
  window.addEventListener('resize', handleWindowResize)
  window.addEventListener('close-mobile-sidebar', handleCloseMobileSidebar)
  window.addEventListener('toggle-sidebar', handleToggleSidebar as EventListener)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleWindowResize)
  window.removeEventListener('close-mobile-sidebar', handleCloseMobileSidebar)
  window.removeEventListener('toggle-sidebar', handleToggleSidebar as EventListener)
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
})
</script>

<!-- No styles - all styling via theme system -->

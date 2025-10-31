<template>
  <div class="sidebar-manager">
    <!-- Left Sidebar -->
    <div 
      v-if="leftSidebar.mounted"
      class="sidebar sidebar-left"
      :class="leftSidebar.classes"
      :style="leftSidebar.styles"
      @mouseenter="onSidebarHover('left', true)"
      @mouseleave="onSidebarHover('left', false)"
    >
      <!-- Resize Handle -->
      <div 
        v-if="leftSidebar.resizable"
        class="resize-handle resize-handle-right"
        @mousedown="startResize('left', $event)"
        @mouseenter="showResizeCursor"
        @mouseleave="hideResizeCursor"
      >
        <div class="resize-indicator"></div>
      </div>
      
      <!-- Sidebar Content -->
      <div class="sidebar-content">
        <slot name="left" />
      </div>
      
      <!-- Collapse Button -->
      <button 
        v-if="leftSidebar.showCollapseButton"
        class="sidebar-collapse-btn sidebar-collapse-btn-left"
        @click="toggleSidebar('left')"
        :title="leftSidebar.collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
      >
        <svg class="collapse-icon" :class="{ 'rotate-180': leftSidebar.collapsed }">
          <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>

    <!-- Main Content Area -->
    <div class="main-content-area">
      <slot name="main" />
    </div>

    <!-- Right Sidebar -->
    <div 
      v-if="rightSidebar.mounted"
      class="sidebar sidebar-right"
      :class="rightSidebar.classes"
      :style="rightSidebar.styles"
      @mouseenter="onSidebarHover('right', true)"
      @mouseleave="onSidebarHover('right', false)"
    >
      <!-- Resize Handle -->
      <div 
        v-if="rightSidebar.resizable"
        class="resize-handle resize-handle-left"
        @mousedown="startResize('right', $event)"
        @mouseenter="showResizeCursor"
        @mouseleave="hideResizeCursor"
      >
        <div class="resize-indicator"></div>
      </div>
      
      <!-- Sidebar Content -->
      <div class="sidebar-content">
        <slot name="right" />
      </div>
      
      <!-- Collapse Button -->
      <button 
        v-if="rightSidebar.showCollapseButton"
        class="sidebar-collapse-btn sidebar-collapse-btn-right"
        @click="toggleSidebar('right')"
        :title="rightSidebar.collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
      >
        <svg class="collapse-icon" :class="{ 'rotate-180': !rightSidebar.collapsed }">
          <path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>

    <!-- Expand Triggers (when sidebars are collapsed) -->
    <button 
      v-if="leftSidebar.showExpandTrigger"
      class="sidebar-expand-trigger sidebar-expand-trigger-left"
      @click="expandSidebar('left')"
      @mouseenter="onExpandTriggerHover('left', true)"
      @mouseleave="onExpandTriggerHover('left', false)"
      :title="'Expand left sidebar'"
    >
      <svg class="expand-icon">
        <path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>

    <button 
      v-if="rightSidebar.showExpandTrigger"
      class="sidebar-expand-trigger sidebar-expand-trigger-right"
      @click="expandSidebar('right')"
      @mouseenter="onExpandTriggerHover('right', true)"
      @mouseleave="onExpandTriggerHover('right', false)"
      :title="'Expand right sidebar'"
    >
      <svg class="expand-icon">
        <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>

    <!-- Mobile Overlay -->
    <div 
      v-if="mobileOverlay.show"
      class="mobile-overlay"
      @click="closeMobileSidebar"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useLayoutStore } from '@/core/stores/layout'

/**
 * SidebarManager.vue
 * 
 * Professional sidebar management system implementing de-facto standards:
 * - Drag-to-resize with visual feedback
 * - Collapse/expand with smooth animations
 * - Auto-collapse on small drag
 * - Expand triggers when collapsed
 * - Mobile-responsive behavior
 * - Persistent state management
 * - Hover effects and visual cues
 */

type SidebarSide = 'left' | 'right'

const layout = useLayoutStore()

// Reactive state
const isResizing = ref(false)
const resizingSide = ref<SidebarSide | null>(null)
const isMobile = ref(false)
const hoveredSide = ref<SidebarSide | null>(null)
const hoveredExpandTrigger = ref<SidebarSide | null>(null)

// Breakpoints (de-facto standards)
const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1024
const MIN_SIDEBAR_WIDTH = 200
const MAX_SIDEBAR_WIDTH = 600
const COLLAPSED_WIDTH = 64
const AUTO_COLLAPSE_THRESHOLD = 120

// Check if mobile
const checkMobile = () => {
  isMobile.value = window.innerWidth < MOBILE_BREAKPOINT
}

// Sidebar computed properties
const leftSidebar = computed(() => {
  const state = layout.bars.l  // Use 'l' instead of 'left'
  const size = layout.sizes.left
  const collapsed = state === 1
  const expanded = state === 2
  const hidden = state === 0
  const mobile = state === 4
  
  return {
    mounted: state > 0,
    collapsed,
    hidden,
    mobile,
    resizable: !collapsed && !mobile && !isMobile.value,
    showCollapseButton: state >= 2 && !isMobile.value,
    showExpandTrigger: collapsed && !isMobile.value,
    classes: {
      'sidebar-collapsed': collapsed,
      'sidebar-mobile': mobile,
      'sidebar-resizing': isResizing.value && resizingSide.value === 'left',
      'sidebar-hovered': hoveredSide.value === 'left'
    },
    styles: {
      width: mobile ? '100vw' : collapsed ? `${COLLAPSED_WIDTH}px` : `${size.current}px`,
      transform: mobile ? 'translateX(0)' : undefined,
      zIndex: mobile ? 1000 : undefined
    }
  }
})

const rightSidebar = computed(() => {
  const state = layout.bars.r  // Use 'r' instead of 'right'
  const size = layout.sizes.right
  const collapsed = state === 1
  const expanded = state === 2
  const hidden = state === 0
  const mobile = state === 4
  
  return {
    mounted: state > 0,
    collapsed,
    hidden,
    mobile,
    resizable: !collapsed && !mobile && !isMobile.value,
    showCollapseButton: state >= 2 && !isMobile.value,
    showExpandTrigger: collapsed && !isMobile.value,
    classes: {
      'sidebar-collapsed': collapsed,
      'sidebar-mobile': mobile,
      'sidebar-resizing': isResizing.value && resizingSide.value === 'right',
      'sidebar-hovered': hoveredSide.value === 'right'
    },
    styles: {
      width: mobile ? '100vw' : collapsed ? `${COLLAPSED_WIDTH}px` : `${size.current}px`,
      transform: mobile ? 'translateX(0)' : undefined,
      zIndex: mobile ? 1000 : undefined
    }
  }
})

const mobileOverlay = computed(() => ({
  show: (leftSidebar.value.mobile || rightSidebar.value.mobile) && isMobile.value
}))

// Resize functionality
let startX = 0
let startWidth = 0

const startResize = (side: SidebarSide, event: MouseEvent) => {
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

const handleResize = (event: MouseEvent) => {
  if (!isResizing.value || !resizingSide.value) return
  
  const deltaX = event.clientX - startX
  const multiplier = resizingSide.value === 'left' ? 1 : -1
  let newWidth = startWidth + (deltaX * multiplier)
  
  // Auto-collapse if dragged too small
  if (newWidth < AUTO_COLLAPSE_THRESHOLD) {
    layout.setBarState(resizingSide.value, 1) // Collapsed state
    return
  }
  
  // Constrain within bounds
  newWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, newWidth))
  
  // Ensure sidebar is expanded
  if (layout.bars[resizingSide.value] === 1) {
    layout.setBarState(resizingSide.value, 2)
  }
  
  layout.setBarSize(resizingSide.value, newWidth)
}

const stopResize = () => {
  isResizing.value = false
  resizingSide.value = null
  
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
  
  layout.persistSizes()
}

// Sidebar controls
const toggleSidebar = (side: SidebarSide) => {
  const currentState = layout.bars[side]
  if (currentState >= 2) {
    layout.setBarState(side, 1) // Collapse
  } else {
    layout.setBarState(side, 2) // Expand
  }
}

const expandSidebar = (side: SidebarSide) => {
  layout.setBarState(side, 2)
}

const closeMobileSidebar = () => {
  if (leftSidebar.value.mobile) {
    layout.setBarState('left', 0)
  }
  if (rightSidebar.value.mobile) {
    layout.setBarState('right', 0)
  }
}

// Hover effects
const onSidebarHover = (side: SidebarSide, isHovering: boolean) => {
  hoveredSide.value = isHovering ? side : null
}

const onExpandTriggerHover = (side: SidebarSide, isHovering: boolean) => {
  hoveredExpandTrigger.value = isHovering ? side : null
}

const showResizeCursor = () => {
  if (!isResizing.value) {
    document.body.style.cursor = 'col-resize'
  }
}

const hideResizeCursor = () => {
  if (!isResizing.value) {
    document.body.style.cursor = ''
  }
}

// Responsive handling
const handleWindowResize = () => {
  checkMobile()
  
  // Auto-adjust for mobile
  if (isMobile.value) {
    // Convert expanded sidebars to mobile mode
    if (layout.bars.left >= 2) {
      layout.setBarState('left', 4) // Mobile mode
    }
    if (layout.bars.right >= 2) {
      layout.setBarState('right', 4) // Mobile mode
    }
  } else {
    // Convert mobile sidebars back to desktop mode
    if (layout.bars.left === 4) {
      layout.setBarState('left', 2) // Expanded
    }
    if (layout.bars.right === 4) {
      layout.setBarState('right', 2) // Expanded
    }
  }
}

// Lifecycle
onMounted(() => {
  checkMobile()
  layout.loadSizes()
  window.addEventListener('resize', handleWindowResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleWindowResize)
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
})

// Expose methods for external control
defineExpose({
  toggleSidebar,
  expandSidebar,
  closeMobileSidebar
})
</script>

<style scoped>
@import './styles/sidebar.css';

/* Override specific styles that conflict */
.sidebar-manager {
  background: #f8fafc;
}

.main-content-area {
  background: #ffffff;
  border-radius: 12px 0 0 0;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.08);
  margin-left: 2px;
}

/* Fix resize handle color */
.resize-indicator {
  background: linear-gradient(180deg, #10b981 0%, #059669 100%) !important;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
}

.resize-handle:hover .resize-indicator {
  background: linear-gradient(180deg, #059669 0%, #047857 100%) !important;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

/* Fix expand trigger color */
.sidebar-expand-trigger {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
  box-shadow: 4px 0 16px rgba(16, 185, 129, 0.3);
}

.sidebar-expand-trigger:hover {
  background: linear-gradient(135deg, #059669 0%, #047857 100%) !important;
  box-shadow: 6px 0 24px rgba(16, 185, 129, 0.4);
}

/* Fix collapse button */
.sidebar-collapse-btn {
  background: linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%);
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.sidebar-collapse-btn:hover {
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
</style>
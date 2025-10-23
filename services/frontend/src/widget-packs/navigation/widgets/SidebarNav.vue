<template>
  <div 
    class="sidebar-nav"
    :class="[
      `theme-${theme}`,
      { 'collapsed': collapsed, 'searchable': searchable }
    ]"
    role="navigation"
    :aria-label="ariaLabel"
  >
    <!-- Header Slot -->
    <div v-if="$slots.header || searchable" class="sidebar-nav__header">
      <slot name="header">
        <!-- Search Component -->
        <div v-if="searchable && !collapsed" class="sidebar-nav__search">
          <slot name="search">
            <div class="search-input-wrapper">
              <input
                v-model="searchQuery"
                type="text"
                class="search-input"
                :placeholder="searchPlaceholder"
                :aria-label="searchAriaLabel"
                @input="handleSearch"
                @keydown.escape="clearSearch"
              />
              <div class="search-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
              </div>
              <button
                v-if="searchQuery"
                class="search-clear"
                @click="clearSearch"
                :aria-label="clearSearchAriaLabel"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </slot>
        </div>
      </slot>
    </div>

    <!-- Navigation Items -->
    <div class="sidebar-nav__content" role="tree" :aria-expanded="!collapsed">
      <div v-if="filteredItems.length === 0 && searchQuery" class="sidebar-nav__no-results">
        <div class="no-results-icon">🔍</div>
        <div class="no-results-text">{{ noResultsText }}</div>
      </div>
      
      <nav-item
        v-for="item in filteredItems"
        :key="item.id"
        :item="item"
        :collapsed="collapsed"
        :level="0"
        :search-query="searchQuery"
        :permissions="userPermissions"
        @navigate="handleNavigate"
        @expand="handleExpand"
        @badge-click="handleBadgeClick"
        @context-menu="handleContextMenu"
      >
        <template #icon="{ item }">
          <slot name="item-icon" :item="item">
            <span class="nav-item__icon">{{ item.icon }}</span>
          </slot>
        </template>
        
        <template #badge="{ item }">
          <slot name="item-badge" :item="item">
            <span 
              v-if="item.badge"
              class="nav-item__badge"
              :class="getBadgeClass(item.badge)"
              @click.stop="handleBadgeClick(item)"
            >
              {{ item.badge }}
            </span>
          </slot>
        </template>
      </nav-item>
    </div>

    <!-- Footer Slot -->
    <div v-if="$slots.footer" class="sidebar-nav__footer">
      <slot name="footer" />
    </div>

    <!-- Accessibility Live Region -->
    <div 
      class="sr-only" 
      role="status" 
      aria-live="polite" 
      aria-atomic="true"
    >
      {{ announceText }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, inject, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/core/stores/auth'
import NavItem from './NavItem.vue'

interface NavigationItem {
  id: string
  label: string
  icon?: string
  route?: string
  badge?: string | number
  children?: NavigationItem[]
  permissions?: string[]
  metadata?: Record<string, any>
  expanded?: boolean
  hidden?: boolean
}

interface Props {
  items?: NavigationItem[]
  collapsed?: boolean
  searchable?: boolean
  theme?: 'default' | 'dark' | 'minimal' | 'enterprise'
  searchPlaceholder?: string
  noResultsText?: string
  ariaLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  items: () => [],
  collapsed: false,
  searchable: true,
  theme: 'default',
  searchPlaceholder: 'Search navigation...',
  noResultsText: 'No items found',
  ariaLabel: 'Main navigation'
})

const emit = defineEmits<{
  navigate: [payload: { item: NavigationItem; route?: string; metadata?: Record<string, any> }]
  search: [payload: { query: string; results: NavigationItem[] }]
  expand: [payload: { item: NavigationItem; expanded: boolean }]
  'badge-click': [payload: { item: NavigationItem; badge: string | number }]
  'context-menu': [payload: { item: NavigationItem; event: MouseEvent }]
}>()

// Injected dependencies
const dispatchEvent = inject('dispatchEvent') as Function
const ctx = inject('ctx') as any
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// Reactive state
const searchQuery = ref('')
const expandedItems = ref<Set<string>>(new Set())
const announceText = ref('')

// Get user permissions from context
const userPermissions = computed(() => {
  return ctx?.user?.permissions || []
})

// Get navigation items from auth config or use props as fallback
const navigationItems = computed(() => {
  if (authStore.config?.pages && authStore.config.pages.length > 0) {
    // Convert pages from auth config to navigation items
    return authStore.config.pages.map(page => ({
      id: page.route.replace(/\//g, '-') || 'page',
      label: page.name,
      icon: getIconForRoute(page.route),
      route: page.route,
      permissions: getPermissionsForRoute(page.route)
    }))
  }
  
  // If props items are provided, use them
  if (props.items && props.items.length > 0) {
    return props.items
  }
  
  // Default fallback items if nothing else is available
  return [
    {
      id: 'home',
      label: 'Home',
      icon: '🏠',
      route: '/',
      permissions: []
    },
    {
      id: 'test',
      label: 'Test Page',
      icon: '🧪',
      route: '/test',
      permissions: []
    }
  ]
})

// Helper function to get icon for route
function getIconForRoute(route: string): string {
  if (route === '/') return '🏠'
  if (route === '/test') return '🧪'
  if (route === '/admin/theme-editor') return '🎨'
  return '📄'
}

// Helper function to get permissions for route
function getPermissionsForRoute(route: string): string[] {
  if (route === '/admin/theme-editor') return ['admin.theme.access']
  return []
}

// Computed properties
const searchAriaLabel = computed(() => `Search ${navigationItems.value.length} navigation items`)
const clearSearchAriaLabel = computed(() => 'Clear search')

// Filter items based on search and permissions
const filteredItems = computed(() => {
  let items = filterByPermissions(navigationItems.value)
  
  if (searchQuery.value) {
    items = filterBySearch(items, searchQuery.value.toLowerCase())
  }
  
  return items
})

// Permission filtering
function filterByPermissions(items: NavigationItem[]): NavigationItem[] {
  return items.filter(item => {
    if (item.hidden) return false
    
    // Check if user has required permissions
    if (item.permissions && item.permissions.length > 0) {
      // For superadmin, allow access to all items
      if (authStore.user?.role === 'SUPERADMIN') {
        return true
      }
      
      const hasPermission = item.permissions.some(permission => 
        userPermissions.value.includes(permission)
      )
      if (!hasPermission) return false
    }
    
    // Recursively filter children
    if (item.children) {
      const filteredChildren = filterByPermissions(item.children)
      return filteredChildren.length > 0 || item.route // Show parent if has route or visible children
    }
    
    return true
  }).map(item => ({
    ...item,
    children: item.children ? filterByPermissions(item.children) : undefined
  }))
}

// Search filtering
function filterBySearch(items: NavigationItem[], query: string): NavigationItem[] {
  const results: NavigationItem[] = []
  
  for (const item of items) {
    const matchesLabel = item.label.toLowerCase().includes(query)
    const matchesMetadata = item.metadata && 
      Object.values(item.metadata).some(value => 
        String(value).toLowerCase().includes(query)
      )
    
    if (matchesLabel || matchesMetadata) {
      results.push({
        ...item,
        expanded: true // Auto-expand matching items
      })
    } else if (item.children) {
      const matchingChildren = filterBySearch(item.children, query)
      if (matchingChildren.length > 0) {
        results.push({
          ...item,
          children: matchingChildren,
          expanded: true
        })
      }
    }
  }
  
  return results
}

// Event handlers
function handleSearch() {
  const results = filteredItems.value
  
  // Emit search event
  emit('search', {
    query: searchQuery.value,
    results
  })
  
  // Dispatch to backend if needed
  if (dispatchEvent) {
    dispatchEvent({
      name: 'navigation.search',
      scope: 'backend',
      payload: {
        query: searchQuery.value,
        resultsCount: results.length
      },
      permission: 'navigation.search'
    })
  }
  
  // Accessibility announcement
  announceText.value = `${results.length} items found for "${searchQuery.value}"`
}

function clearSearch() {
  searchQuery.value = ''
  announceText.value = 'Search cleared'
}

function handleNavigate(payload: { item: NavigationItem; route?: string; metadata?: Record<string, any> }) {
  // Check permissions
  if (!hasPermission('navigation.navigate')) {
    console.warn('Navigation not permitted')
    return
  }
  
  // Emit navigate event
  emit('navigate', payload)
  
  // Navigate using router if route provided
  if (payload.route && router) {
    router.push(payload.route)
  }
  
  // Navigation tracking happens automatically via page.get in route guards
  
  // Accessibility announcement
  announceText.value = `Navigated to ${payload.item.label}`
}

function handleExpand(payload: { item: NavigationItem; expanded: boolean }) {
  if (!hasPermission('navigation.expand')) return
  
  if (payload.expanded) {
    expandedItems.value.add(payload.item.id)
  } else {
    expandedItems.value.delete(payload.item.id)
  }
  
  emit('expand', payload)
  
  if (dispatchEvent) {
    dispatchEvent({
      name: 'navigation.expand',
      scope: 'backend',
      payload: {
        itemId: payload.item.id,
        expanded: payload.expanded
      },
      permission: 'navigation.expand'
    })
  }
  
  announceText.value = `${payload.item.label} ${payload.expanded ? 'expanded' : 'collapsed'}`
}

function handleBadgeClick(item: NavigationItem) {
  if (!hasPermission('navigation.badge.interact') || !item.badge) return
  
  emit('badge-click', { item, badge: item.badge })
  
  if (dispatchEvent) {
    dispatchEvent({
      name: 'navigation.badge.click',
      scope: 'backend',
      payload: {
        itemId: item.id,
        badge: item.badge
      },
      permission: 'navigation.badge.interact'
    })
  }
}

function handleContextMenu(payload: { item: NavigationItem; event: MouseEvent }) {
  if (!hasPermission('navigation.context')) return
  
  emit('context-menu', payload)
  
  if (dispatchEvent) {
    dispatchEvent({
      name: 'navigation.context',
      scope: 'ui',
      payload: {
        itemId: payload.item.id,
        position: { x: payload.event.clientX, y: payload.event.clientY }
      },
      permission: 'navigation.context'
    })
  }
}

// Utility functions
function hasPermission(permission: string): boolean {
  // Superadmin has all permissions
  if (authStore.user?.role === 'SUPERADMIN') {
    return true
  }
  
  return userPermissions.value.includes(permission) || 
         userPermissions.value.includes('*') ||
         userPermissions.value.includes('navigation.*')
}

function getBadgeClass(badge: string | number): string {
  if (typeof badge === 'number') return 'badge-number'
  if (badge === 'new') return 'badge-new'
  if (badge === 'hot') return 'badge-hot'
  if (badge === 'beta') return 'badge-beta'
  return 'badge-default'
}

// Lifecycle
onMounted(() => {
  // Auto-expand items based on current route
  if (route.path) {
    expandItemsForRoute(navigationItems.value, route.path)
  }
})

function expandItemsForRoute(items: NavigationItem[], currentPath: string) {
  for (const item of items) {
    if (item.route === currentPath || (item.children && hasActiveChild(item.children, currentPath))) {
      expandedItems.value.add(item.id)
    }
    if (item.children) {
      expandItemsForRoute(item.children, currentPath)
    }
  }
}

function hasActiveChild(children: NavigationItem[], currentPath: string): boolean {
  return children.some(child => 
    child.route === currentPath || 
    (child.children && hasActiveChild(child.children, currentPath))
  )
}

// Watch for route changes
watch(() => route.path, (newPath) => {
  if (newPath) {
    expandItemsForRoute(navigationItems.value, newPath)
  }
})

// Watch for auth config changes to update navigation
watch(() => authStore.config, (newConfig) => {
  // Re-expand items when navigation changes
  if (route.path) {
    expandItemsForRoute(navigationItems.value, route.path)
  }
}, { deep: true })

// Watch for auth user changes
watch(() => authStore.user, (newUser) => {
  // User changed, navigation may need to update
}, { deep: true })
</script>

<style scoped>
/* Base Styles */
.sidebar-nav {
  --nav-bg: var(--color-surface-primary, #ffffff);
  --nav-border: var(--color-border-primary, #e2e8f0);
  --nav-text: var(--color-text-primary, #1f2937);
  --nav-text-secondary: var(--color-text-secondary, #6b7280);
  --nav-hover: var(--color-surface-secondary, #f8fafc);
  --nav-active: var(--color-primary-50, #eff6ff);
  --nav-active-text: var(--color-primary-600, #2563eb);
  --nav-shadow: var(--shadow-sm, 0 1px 2px 0 rgba(0, 0, 0, 0.05));
  
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--nav-bg);
  border-right: 1px solid var(--nav-border);
  font-family: var(--font-family, system-ui, sans-serif);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Header */
.sidebar-nav__header {
  padding: 1rem;
  border-bottom: 1px solid var(--nav-border);
  flex-shrink: 0;
}

/* Search */
.sidebar-nav__search {
  position: relative;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  width: 100%;
  padding: 0.5rem 0.75rem 0.5rem 2.5rem;
  font-size: 0.875rem;
  border: 1px solid var(--nav-border);
  border-radius: 0.5rem;
  background: var(--nav-bg);
  color: var(--nav-text);
  transition: all 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--nav-active-text);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-input::placeholder {
  color: var(--nav-text-secondary);
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  color: var(--nav-text-secondary);
  pointer-events: none;
}

.search-clear {
  position: absolute;
  right: 0.5rem;
  padding: 0.25rem;
  border: none;
  background: none;
  color: var(--nav-text-secondary);
  cursor: pointer;
  border-radius: 0.25rem;
  transition: all 0.2s ease;
}

.search-clear:hover {
  background: var(--nav-hover);
  color: var(--nav-text);
}

/* Content */
.sidebar-nav__content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0.5rem 0;
}

/* No Results */
.sidebar-nav__no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  text-align: center;
  color: var(--nav-text-secondary);
}

.no-results-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  opacity: 0.5;
}

.no-results-text {
  font-size: 0.875rem;
}

/* Footer */
.sidebar-nav__footer {
  padding: 1rem;
  border-top: 1px solid var(--nav-border);
  flex-shrink: 0;
}

/* Theme Variants */
.theme-dark {
  --nav-bg: #1f2937;
  --nav-border: #374151;
  --nav-text: #f9fafb;
  --nav-text-secondary: #d1d5db;
  --nav-hover: #374151;
  --nav-active: #1e40af;
  --nav-active-text: #60a5fa;
}

.theme-minimal {
  --nav-border: transparent;
  --nav-shadow: none;
}

.theme-enterprise {
  --nav-active-text: #1e40af;
  --nav-active: #dbeafe;
}

/* Collapsed State */
.sidebar-nav.collapsed {
  width: 64px;
}

.sidebar-nav.collapsed .sidebar-nav__search,
.sidebar-nav.collapsed .sidebar-nav__footer {
  display: none;
}

/* Scrollbar */
.sidebar-nav__content::-webkit-scrollbar {
  width: 4px;
}

.sidebar-nav__content::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-nav__content::-webkit-scrollbar-thumb {
  background: var(--nav-border);
  border-radius: 2px;
}

.sidebar-nav__content::-webkit-scrollbar-thumb:hover {
  background: var(--nav-text-secondary);
}

/* Accessibility */
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

/* Focus Management */
.sidebar-nav:focus-within {
  outline: 2px solid var(--nav-active-text);
  outline-offset: -2px;
}

/* Responsive */
@media (max-width: 768px) {
  .sidebar-nav {
    width: 100%;
    max-width: 320px;
  }
}

/* High Contrast Mode */
@media (prefers-contrast: high) {
  .sidebar-nav {
    --nav-border: #000000;
    --nav-text: #000000;
    --nav-bg: #ffffff;
  }
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  .sidebar-nav,
  .search-input,
  .search-clear {
    transition: none;
  }
}
</style>
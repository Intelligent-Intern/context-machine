<template>
  <div 
    class="nav-item"
    :class="[
      `level-${level}`,
      {
        'has-children': hasChildren,
        'expanded': isExpanded,
        'active': isActive,
        'collapsed': collapsed,
        'highlighted': isHighlighted
      }
    ]"
    role="treeitem"
    :aria-expanded="hasChildren ? isExpanded : undefined"
    :aria-level="level + 1"
    :aria-selected="isActive"
  >
    <!-- Main Item -->
    <div 
      class="nav-item__main"
      :style="{ paddingLeft: `${level * 1.5 + 1}rem` }"
      @click="handleClick"
      @contextmenu="handleContextMenu"
      @keydown="handleKeydown"
      tabindex="0"
      role="button"
      :aria-label="itemAriaLabel"
    >
      <!-- Expand/Collapse Button -->
      <button
        v-if="hasChildren && !collapsed"
        class="nav-item__expand"
        @click.stop="toggleExpanded"
        :aria-label="expandAriaLabel"
        tabindex="-1"
      >
        <svg 
          class="expand-icon"
          :class="{ 'rotated': isExpanded }"
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          stroke-width="2"
        >
          <polyline points="9,18 15,12 9,6"/>
        </svg>
      </button>
      
      <!-- Icon -->
      <div class="nav-item__icon-wrapper">
        <slot name="icon" :item="item">
          <span v-if="item.icon" class="nav-item__icon">{{ item.icon }}</span>
          <div v-else class="nav-item__icon-placeholder"></div>
        </slot>
      </div>
      
      <!-- Label -->
      <span 
        v-if="!collapsed"
        class="nav-item__label"
        :class="{ 'highlighted-text': isHighlighted }"
      >
        <template v-if="searchQuery && isHighlighted">
          <span v-html="highlightedLabel"></span>
        </template>
        <template v-else>
          {{ item.label }}
        </template>
      </span>
      
      <!-- Badge -->
      <div v-if="!collapsed && item.badge" class="nav-item__badge-wrapper">
        <slot name="badge" :item="item">
          <span 
            class="nav-item__badge"
            :class="getBadgeClass(item.badge)"
            @click.stop="$emit('badge-click', item)"
          >
            {{ item.badge }}
          </span>
        </slot>
      </div>
      
      <!-- Loading State -->
      <div v-if="loading" class="nav-item__loading">
        <svg class="loading-spinner" width="16" height="16" viewBox="0 0 24 24">
          <circle 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            stroke-width="2" 
            fill="none" 
            stroke-dasharray="31.416" 
            stroke-dashoffset="31.416"
          >
            <animate 
              attributeName="stroke-dasharray" 
              dur="2s" 
              values="0 31.416;15.708 15.708;0 31.416" 
              repeatCount="indefinite"
            />
            <animate 
              attributeName="stroke-dashoffset" 
              dur="2s" 
              values="0;-15.708;-31.416" 
              repeatCount="indefinite"
            />
          </circle>
        </svg>
      </div>
    </div>
    
    <!-- Children -->
    <div 
      v-if="hasChildren && isExpanded && !collapsed"
      class="nav-item__children"
      role="group"
      :aria-label="`${item.label} submenu`"
    >
      <nav-item
        v-for="child in visibleChildren"
        :key="child.id"
        :item="child"
        :collapsed="collapsed"
        :level="level + 1"
        :search-query="searchQuery"
        :permissions="permissions"
        @navigate="$emit('navigate', $event)"
        @expand="$emit('expand', $event)"
        @badge-click="$emit('badge-click', $event)"
        @context-menu="$emit('context-menu', $event)"
      >
        <template #icon="slotProps">
          <slot name="icon" :item="slotProps.item" />
        </template>
        <template #badge="slotProps">
          <slot name="badge" :item="slotProps.item" />
        </template>
      </nav-item>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'

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
  item: NavigationItem
  collapsed?: boolean
  level?: number
  searchQuery?: string
  permissions?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  collapsed: false,
  level: 0,
  searchQuery: '',
  permissions: () => []
})

const emit = defineEmits<{
  navigate: [payload: { item: NavigationItem; route?: string; metadata?: Record<string, any> }]
  expand: [payload: { item: NavigationItem; expanded: boolean }]
  'badge-click': [item: NavigationItem]
  'context-menu': [payload: { item: NavigationItem; event: MouseEvent }]
}>()

const route = useRoute()
const expanded = ref(props.item.expanded || false)
const loading = ref(false)

// Computed properties
const hasChildren = computed(() => {
  return props.item.children && props.item.children.length > 0
})

const visibleChildren = computed(() => {
  if (!props.item.children) return []
  
  return props.item.children.filter(child => {
    // Check permissions
    if (child.permissions && child.permissions.length > 0) {
      return child.permissions.some(permission => 
        props.permissions.includes(permission)
      )
    }
    return !child.hidden
  })
})

const isExpanded = computed(() => {
  return expanded.value || props.item.expanded || false
})

const isActive = computed(() => {
  if (!props.item.route) return false
  return route.path === props.item.route || route.path.startsWith(props.item.route + '/')
})

const isHighlighted = computed(() => {
  if (!props.searchQuery) return false
  return props.item.label.toLowerCase().includes(props.searchQuery.toLowerCase())
})

const highlightedLabel = computed(() => {
  if (!props.searchQuery || !isHighlighted.value) return props.item.label
  
  const regex = new RegExp(`(${escapeRegExp(props.searchQuery)})`, 'gi')
  return props.item.label.replace(regex, '<mark class="search-highlight">$1</mark>')
})

const itemAriaLabel = computed(() => {
  let label = props.item.label
  if (props.item.badge) {
    label += ` (${props.item.badge})`
  }
  if (hasChildren.value) {
    label += `, ${isExpanded.value ? 'expanded' : 'collapsed'} submenu`
  }
  if (isActive.value) {
    label += ', current page'
  }
  return label
})

const expandAriaLabel = computed(() => {
  return `${isExpanded.value ? 'Collapse' : 'Expand'} ${props.item.label} submenu`
})

// Methods
function handleClick() {
  if (props.item.route) {
    emit('navigate', {
      item: props.item,
      route: props.item.route,
      metadata: props.item.metadata
    })
  } else if (hasChildren.value) {
    toggleExpanded()
  }
}

function toggleExpanded() {
  if (!hasChildren.value) return
  
  expanded.value = !expanded.value
  emit('expand', {
    item: props.item,
    expanded: expanded.value
  })
}

function handleContextMenu(event: MouseEvent) {
  event.preventDefault()
  emit('context-menu', {
    item: props.item,
    event
  })
}

function handleKeydown(event: KeyboardEvent) {
  switch (event.key) {
    case 'Enter':
    case ' ':
      event.preventDefault()
      handleClick()
      break
    case 'ArrowRight':
      if (hasChildren.value && !isExpanded.value) {
        event.preventDefault()
        toggleExpanded()
      }
      break
    case 'ArrowLeft':
      if (hasChildren.value && isExpanded.value) {
        event.preventDefault()
        toggleExpanded()
      }
      break
    case 'Home':
      event.preventDefault()
      // Focus first item (handled by parent)
      break
    case 'End':
      event.preventDefault()
      // Focus last item (handled by parent)
      break
  }
}

function getBadgeClass(badge: string | number): string {
  if (typeof badge === 'number') return 'badge-number'
  if (badge === 'new') return 'badge-new'
  if (badge === 'hot') return 'badge-hot'
  if (badge === 'beta') return 'badge-beta'
  if (badge === 'warning') return 'badge-warning'
  if (badge === 'error') return 'badge-error'
  return 'badge-default'
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
</script>

<style scoped>
/* Base Styles */
.nav-item {
  --item-height: 2.5rem;
  --item-padding: 0.75rem;
  --item-border-radius: 0.5rem;
  --item-transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  
  position: relative;
  margin: 0.125rem 0.5rem;
}

/* Main Item */
.nav-item__main {
  display: flex;
  align-items: center;
  min-height: var(--item-height);
  padding: 0.5rem var(--item-padding);
  border-radius: var(--item-border-radius);
  cursor: pointer;
  transition: var(--item-transition);
  position: relative;
  outline: none;
  text-decoration: none;
  color: var(--nav-text, #374151);
  background: transparent;
  border: 1px solid transparent;
}

.nav-item__main:hover {
  background: var(--nav-hover, #f8fafc);
  color: var(--nav-text, #1f2937);
}

.nav-item__main:focus {
  outline: 2px solid var(--nav-active-text, #2563eb);
  outline-offset: -2px;
}

.nav-item.active .nav-item__main {
  background: var(--nav-active, #eff6ff);
  color: var(--nav-active-text, #2563eb);
  font-weight: 600;
  border-color: var(--nav-active-text, #2563eb);
}

.nav-item.highlighted .nav-item__main {
  background: rgba(59, 130, 246, 0.1);
}

/* Expand Button */
.nav-item__expand {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  margin-right: 0.5rem;
  border: none;
  background: none;
  color: var(--nav-text-secondary, #6b7280);
  cursor: pointer;
  border-radius: 0.25rem;
  transition: var(--item-transition);
}

.nav-item__expand:hover {
  background: var(--nav-hover, #f3f4f6);
  color: var(--nav-text, #374151);
}

.expand-icon {
  transition: transform 0.2s ease;
}

.expand-icon.rotated {
  transform: rotate(90deg);
}

/* Icon */
.nav-item__icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  margin-right: 0.75rem;
  flex-shrink: 0;
}

.nav-item__icon {
  font-size: 1.125rem;
  line-height: 1;
}

.nav-item__icon-placeholder {
  width: 4px;
  height: 4px;
  background: var(--nav-text-secondary, #d1d5db);
  border-radius: 50%;
}

/* Label */
.nav-item__label {
  flex: 1;
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.highlighted-text :deep(.search-highlight) {
  background: rgba(59, 130, 246, 0.3);
  color: var(--nav-active-text, #2563eb);
  font-weight: 600;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
}

/* Badge */
.nav-item__badge-wrapper {
  margin-left: 0.5rem;
  flex-shrink: 0;
}

.nav-item__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0.125rem 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: var(--item-transition);
}

.badge-number {
  background: var(--color-primary-500, #3b82f6);
  color: white;
}

.badge-new {
  background: var(--color-success, #10b981);
  color: white;
}

.badge-hot {
  background: var(--color-error, #ef4444);
  color: white;
}

.badge-beta {
  background: var(--color-warning, #f59e0b);
  color: white;
}

.badge-warning {
  background: var(--color-warning, #f59e0b);
  color: white;
}

.badge-error {
  background: var(--color-error, #ef4444);
  color: white;
}

.badge-default {
  background: var(--nav-text-secondary, #6b7280);
  color: white;
}

.nav-item__badge:hover {
  transform: scale(1.05);
}

/* Loading */
.nav-item__loading {
  margin-left: 0.5rem;
  color: var(--nav-text-secondary, #6b7280);
}

.loading-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Children */
.nav-item__children {
  margin-top: 0.25rem;
}

/* Level Indentation */
.nav-item.level-0 .nav-item__main {
  font-weight: 500;
}

.nav-item.level-1 .nav-item__main {
  font-size: 0.8125rem;
}

.nav-item.level-2 .nav-item__main {
  font-size: 0.8125rem;
  opacity: 0.9;
}

.nav-item.level-3 .nav-item__main {
  font-size: 0.75rem;
  opacity: 0.8;
}

/* Collapsed State */
.nav-item.collapsed .nav-item__main {
  justify-content: center;
  padding: 0.5rem;
}

.nav-item.collapsed .nav-item__expand,
.nav-item.collapsed .nav-item__label,
.nav-item.collapsed .nav-item__badge-wrapper {
  display: none;
}

.nav-item.collapsed .nav-item__icon-wrapper {
  margin: 0;
}

/* Active State Indicator */
.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 1.5rem;
  background: var(--nav-active-text, #2563eb);
  border-radius: 0 2px 2px 0;
}

/* Hover Effects */
.nav-item:not(.active) .nav-item__main:hover {
  transform: translateX(2px);
}

/* Focus Management */
.nav-item__main:focus-visible {
  outline: 2px solid var(--nav-active-text, #2563eb);
  outline-offset: 2px;
}

/* High Contrast Mode */
@media (prefers-contrast: high) {
  .nav-item__main {
    border: 1px solid transparent;
  }
  
  .nav-item.active .nav-item__main {
    border-color: currentColor;
  }
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  .nav-item__main,
  .nav-item__expand,
  .nav-item__badge,
  .expand-icon {
    transition: none;
  }
  
  .loading-spinner {
    animation: none;
  }
}

/* Print Styles */
@media print {
  .nav-item__expand,
  .nav-item__badge {
    display: none;
  }
}
</style>
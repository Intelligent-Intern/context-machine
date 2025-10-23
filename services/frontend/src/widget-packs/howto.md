# Widget Pack Development Guide

## Overview

Widget Packs are the core building blocks of the Context Machine platform. They provide reusable, themeable, and enterprise-grade UI components that can be used across thousands of applications. This guide outlines the standards, patterns, and best practices for creating professional widget packs.

**Important:** Before developing widget packs, you must understand how the Context Machine frontend works. This is a **data-driven, manifest-based system** where the UI is dynamically composed at runtime.

## Table of Contents

1. [Frontend Architecture Understanding](#frontend-architecture-understanding)
2. [Widget Pack Architecture](#widget-pack-architecture)
3. [Directory Structure](#directory-structure)
4. [Manifest Specification](#manifest-specification)
5. [Component Development](#component-development)
6. [Event System](#event-system)
7. [Permission System](#permission-system)
8. [Theme System](#theme-system)
9. [Testing & Validation](#testing--validation)
10. [Best Practices](#best-practices)
11. [Quality Checklist](#quality-checklist)

---

## Frontend Architecture Understanding

### How Context Machine Frontend Works

The Context Machine frontend is **NOT a traditional static SPA**. It's a **dynamic, manifest-driven system** that builds its UI at runtime based on JSON data from the backend.

#### Key Concepts You Must Understand:

1. **Dynamic Page System** - Pages are defined by JSON manifests, not hardcoded routes
2. **Widget Registry** - Components are loaded dynamically using symbolic references
3. **AppShell Layout** - The UI has 5 regions: top, bottom, left, right, main
4. **Port System** - Each region contains "ports" that render widgets
5. **Manifest-Driven** - Everything is configured via JSON manifests from the backend

### The AppShell Layout System

```
┌─────────────────────────────────────┐
│              TOP BAR                │  ← Port: "top"
├─────────┬─────────────────┬─────────┤
│  LEFT   │                 │  RIGHT  │  ← Ports: "left", "main", "right"
│ SIDEBAR │   MAIN CONTENT  │ SIDEBAR │
│         │                 │         │
├─────────┴─────────────────┴─────────┤
│            BOTTOM BAR               │  ← Port: "bottom"
└─────────────────────────────────────┘
```

Each port can contain multiple widgets, defined by page manifests.

### Widget Reference System

Widgets are referenced using the format: `{pack-id}@{component-name}`

Examples:
- `navigation@SidebarNav` - SidebarNav component from navigation pack
- `table@DataTable` - DataTable component from table pack
- `forms@TextInput` - TextInput component from forms pack

### Page Manifest Example

```json
{
  "route": "/dashboard",
  "layout": {
    "top": true,
    "left": true,
    "main": true,
    "right": false,
    "bottom": false
  },
  "ports": {
    "top": [
      {
        "slot": 0,
        "widget": "navigation@TopNav",
        "bind": "topNavData"
      }
    ],
    "left": [
      {
        "slot": 0,
        "widget": "navigation@SidebarNav",
        "bind": "sidebarData",
        "visibleWhen": "ctx.user.permissions includes 'nav.view'"
      }
    ],
    "main": [
      {
        "slot": 0,
        "widget": "dashboard@Overview",
        "bind": "dashboardData"
      },
      {
        "slot": 1,
        "widget": "table@DataTable",
        "bind": "tableData",
        "visibleWhen": "ctx.user.role === 'admin'"
      }
    ]
  }
}
```

### Communication Architecture

#### Outgoing Messages (Frontend → Backend)
```javascript
// Format: Array of action objects
[
  {
    "a": "namespace.entity.action",  // Action name
    "p": { /* payload */ }           // Payload data
  }
]

// Example
[
  {
    "a": "table.data.load",
    "p": { "page": 1, "size": 10, "filters": {} }
  }
]
```

#### Incoming Messages (Backend → Frontend)
```javascript
// Format: Single event object
{
  "a": "namespace.entity.event",    // Event name
  "p": { /* payload */ }            // Event data
}

// Example
{
  "a": "table.data.loaded",
  "p": { 
    "data": [...],
    "total": 150,
    "page": 1
  }
}
```

### Widget Lifecycle in the System

1. **Backend sends page manifest** with widget references
2. **Frontend receives manifest** and updates layout store
3. **AppShell renders** based on layout configuration
4. **PortContainers** loop through assigned widgets
5. **Widget Registry resolves** symbolic references to actual components
6. **Components are dynamically imported** and mounted
7. **Context is injected** (user, permissions, dispatch functions)
8. **Widgets render** with provided data and context

### Critical Integration Points

#### 1. Context Injection
Every widget receives these injected dependencies:
```javascript
const dispatchEvent = inject('dispatchEvent') as Function  // Send events to backend
const ctx = inject('ctx') as any                          // User context & permissions
```

#### 2. Permission Checking
```javascript
function hasPermission(permission: string): boolean {
  const userPermissions = ctx?.user?.permissions || []
  return userPermissions.includes(permission) || 
         userPermissions.includes('*') ||
         userPermissions.includes(`${packName}.*`)
}
```

#### 3. Event Dispatching
```javascript
function handleAction(payload: any) {
  // Emit to parent component
  emit('action-name', payload)
  
  // Dispatch to backend
  if (dispatchEvent) {
    dispatchEvent({
      name: 'backend.action.name',
      scope: 'backend',
      payload,
      permission: 'required.permission'
    })
  }
}
```

#### 4. Conditional Rendering
```javascript
// In page manifest
{
  "widget": "admin@UserManager",
  "visibleWhen": "ctx.user.permissions includes 'admin.users'"
}
```

### Data Flow Architecture

```
Backend Manifest → Layout Store → AppShell → PortContainer → Widget Registry → Your Widget
     ↓                ↓             ↓           ↓              ↓               ↓
Page Config → Layout State → Regions → Widget Slots → Component → Rendered UI
```

### Why This Matters for Widget Development

1. **No Hardcoded Routes** - Your widgets must work in any layout position
2. **Dynamic Loading** - Components are loaded asynchronously via registry
3. **Context-Aware** - Always check permissions and user context
4. **Event-Driven** - All communication happens via events
5. **Manifest-Configured** - Widget behavior is controlled by manifests
6. **Theme-Agnostic** - Must work with any theme via design tokens

### Integration Requirements for Your Widgets

✅ **Must use symbolic references** in manifests (`pack@Component`)  
✅ **Must inject and use context** for permissions and user data  
✅ **Must emit structured events** for all user interactions  
✅ **Must check permissions** before performing actions  
✅ **Must use design tokens** for all styling  
✅ **Must handle loading/error/empty states** gracefully  
✅ **Must work in any layout position** (responsive)  
✅ **Must provide comprehensive test data** for manifests

---

## Widget Pack Architecture

### Core Principles

1. **Enterprise-Grade Quality** - Every widget must be production-ready for enterprise use
2. **Theme Designer Compatible** - All styling must be customizable via design tokens
3. **Permission-Aware** - Every action must respect user permissions
4. **Event-Driven** - All interactions must emit structured events
5. **Accessibility First** - WCAG 2.1 AA compliance is mandatory
6. **Performance Optimized** - Efficient rendering and memory usage
7. **Mobile Responsive** - Mobile-first design approach

### Widget Pack Ecosystem

```
Widget Pack
├── manifest.json          # Package definition & metadata
├── widgets/               # Vue components
│   ├── ComponentA.vue
│   └── ComponentB.vue
└── theme/                 # Theme system
    ├── variables.css      # Design tokens
    ├── themes.css         # Theme variants
    └── mixins.css         # Reusable styles
```

### How Widget Packs Integrate with the Frontend

1. **Registration Phase**
   - Backend sends widget pack configurations during authentication
   - Frontend registers components in Widget Registry using `pack@Component` format
   - Components are loaded asynchronously when needed

2. **Discovery Phase**
   - Backend sends page manifests with widget references
   - Frontend resolves symbolic references to actual components
   - Layout system determines where widgets should render

3. **Rendering Phase**
   - AppShell creates layout regions (ports)
   - PortContainers render widgets in assigned slots
   - Context and permissions are injected into each widget

4. **Interaction Phase**
   - User interactions trigger widget events
   - Events are dispatched to backend via unified messaging
   - Backend responses update widget state via WebSocket

---

## Directory Structure

### Required Structure

```
services/frontend/src/widget-packs/
└── {pack-name}/
    ├── manifest.json           # REQUIRED: Package definition
    ├── widgets/               # REQUIRED: Component directory
    │   ├── {Component}.vue    # Vue 3 components
    │   └── ...
    └── theme/                 # REQUIRED: Theme system
        ├── variables.css      # Design tokens
        ├── themes.css         # Theme variants
        └── mixins.css         # CSS utilities
```

### Naming Conventions

- **Pack Names**: `kebab-case` (e.g., `data-visualization`, `form-controls`)
- **Component Names**: `PascalCase` (e.g., `DataTable.vue`, `FormInput.vue`)
- **File Names**: Match component names exactly
- **CSS Variables**: `--{pack}-{category}-{property}` (e.g., `--table-cell-padding`)

---

## Manifest Specification

### Required Fields

```json
{
  "id": "pack-name",                    // REQUIRED: Unique identifier
  "name": "Human Readable Name",        // REQUIRED: Display name
  "version": "1.0.0",                   // REQUIRED: Semantic version
  "description": "Detailed description", // REQUIRED: Purpose & features
  "author": "Context Machine",          // REQUIRED: Author
  "license": "MIT",                     // REQUIRED: License
  "components": { /* ... */ },          // REQUIRED: Component definitions
  "theme": { /* ... */ },               // REQUIRED: Theme system
  "testData": { /* ... */ },            // REQUIRED: Test data for theme designer
  "dependencies": { /* ... */ },        // REQUIRED: Package dependencies
  "peerDependencies": { /* ... */ }     // OPTIONAL: Peer dependencies
}
```

### Component Definition

```json
{
  "ComponentName": {
    "path": "./widgets/ComponentName.vue",     // REQUIRED: Relative path
    "name": "Human Readable Name",             // REQUIRED: Display name
    "description": "Detailed description",    // REQUIRED: Purpose
    "category": "category-name",               // REQUIRED: UI category
    "tags": ["tag1", "tag2"],                 // REQUIRED: Search tags
    "props": { /* ... */ },                   // REQUIRED: Prop definitions
    "events": { /* ... */ },                  // REQUIRED: Event definitions
    "permissions": { /* ... */ },             // REQUIRED: Permission schema
    "slots": { /* ... */ }                    // OPTIONAL: Slot definitions
  }
}
```

### Props Schema

```json
{
  "propName": {
    "type": "string|number|boolean|array|object",  // REQUIRED
    "required": true|false,                         // REQUIRED
    "default": "default-value",                     // OPTIONAL
    "description": "Detailed description",         // REQUIRED
    "enum": ["option1", "option2"],                // OPTIONAL: For select types
    "schema": { /* JSON Schema */ }                 // OPTIONAL: For complex types
  }
}
```

### Event Definition

```json
{
  "event-name": {
    "description": "What this event does",         // REQUIRED
    "payload": {                                   // REQUIRED: Payload structure
      "field1": "type",
      "field2": "type"
    },
    "permissions": ["permission.name"]             // REQUIRED: Required permissions
  }
}
```

### Permission Schema

```json
{
  "permission.name": {
    "description": "What this permission allows",  // REQUIRED
    "default": true|false                          // REQUIRED: Default state
  }
}
```

---

## Component Development

### Vue 3 Component Template

```vue
<template>
  <div 
    class="widget-component"
    :class="[
      `theme-${theme}`,
      componentClasses
    ]"
    role="appropriate-role"
    :aria-label="ariaLabel"
  >
    <!-- Component content -->
    <slot name="default" />
    
    <!-- Accessibility live region -->
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
import { ref, computed, inject, onMounted } from 'vue'

// Props interface
interface Props {
  // Define all props with types
}

// Props with defaults
const props = withDefaults(defineProps<Props>(), {
  // Default values
})

// Events interface
const emit = defineEmits<{
  'event-name': [payload: EventPayload]
}>()

// Injected dependencies
const dispatchEvent = inject('dispatchEvent') as Function
const ctx = inject('ctx') as any

// Component logic here

// Permission checking
function hasPermission(permission: string): boolean {
  const userPermissions = ctx?.user?.permissions || []
  return userPermissions.includes(permission) || 
         userPermissions.includes('*') ||
         userPermissions.includes(`${packName}.*`)
}

// Event handling
function handleEvent(payload: any) {
  if (!hasPermission('required.permission')) {
    console.warn('Permission denied for action')
    return
  }
  
  // Emit to parent
  emit('event-name', payload)
  
  // Dispatch to backend if needed
  if (dispatchEvent) {
    dispatchEvent({
      name: 'backend.event.name',
      scope: 'backend',
      payload,
      permission: 'required.permission'
    })
  }
  
  // Accessibility announcement
  announceText.value = 'Action completed'
}
</script>

<style scoped>
/* Use CSS variables from theme system */
.widget-component {
  /* Base styles using design tokens */
  background: var(--pack-bg-primary);
  color: var(--pack-text-primary);
  border: 1px solid var(--pack-border-primary);
  border-radius: var(--pack-radius-md);
  transition: var(--pack-transition-normal);
}

/* Theme variants */
.theme-dark {
  /* Dark theme overrides */
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

/* Responsive design */
@media (max-width: 768px) {
  .widget-component {
    /* Mobile styles */
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .widget-component {
    /* High contrast styles */
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .widget-component {
    transition: none;
  }
}
</style>
```

### TypeScript Interfaces

```typescript
// Define clear interfaces for all data structures
interface ComponentProps {
  // All props with proper types
}

interface EventPayload {
  // Event payload structure
}

interface ComponentState {
  // Internal state structure
}
```

---

## Event System

### Event Naming Convention

- Format: `{category}.{action}` (e.g., `table.sort`, `nav.navigate`)
- Use lowercase with dots as separators
- Be specific and descriptive

### Event Payload Structure

```typescript
interface EventPayload {
  // Always include relevant context
  timestamp?: string
  userId?: string
  componentId?: string
  // Specific payload data
  [key: string]: any
}
```

### Event Handling Pattern

```typescript
function handleUserAction(data: any) {
  // 1. Check permissions
  if (!hasPermission('required.permission')) {
    return
  }
  
  // 2. Validate data
  if (!isValidData(data)) {
    return
  }
  
  // 3. Emit to parent component
  emit('event-name', {
    ...data,
    timestamp: new Date().toISOString(),
    componentId: componentId.value
  })
  
  // 4. Dispatch to backend if needed
  if (dispatchEvent) {
    dispatchEvent({
      name: 'backend.event.name',
      scope: 'backend',
      payload: data,
      permission: 'required.permission'
    })
  }
  
  // 5. Update accessibility
  announceText.value = 'Action completed successfully'
}
```

---

## Permission System

### Permission Naming Convention

- Format: `{pack}.{resource}.{action}` (e.g., `table.row.edit`, `nav.item.view`)
- Use hierarchical structure
- Be granular but not excessive

### Permission Checking

```typescript
// Standard permission check
function hasPermission(permission: string): boolean {
  const userPermissions = ctx?.user?.permissions || []
  
  // Check exact permission
  if (userPermissions.includes(permission)) return true
  
  // Check wildcard permissions
  if (userPermissions.includes('*')) return true
  
  // Check pack-level wildcard
  const packWildcard = permission.split('.')[0] + '.*'
  if (userPermissions.includes(packWildcard)) return true
  
  return false
}

// Multiple permission check (OR logic)
function hasAnyPermission(permissions: string[]): boolean {
  return permissions.some(permission => hasPermission(permission))
}

// Multiple permission check (AND logic)
function hasAllPermissions(permissions: string[]): boolean {
  return permissions.every(permission => hasPermission(permission))
}
```

### Permission-Based Rendering

```vue
<template>
  <!-- Conditional rendering based on permissions -->
  <button 
    v-if="hasPermission('table.row.edit')"
    @click="editRow"
    class="edit-button"
  >
    Edit
  </button>
  
  <!-- Disabled state for insufficient permissions -->
  <button 
    v-else
    disabled
    class="edit-button disabled"
    :title="'Insufficient permissions'"
  >
    Edit
  </button>
</template>
```

---

## Theme System

### Design Token Structure

```css
:root {
  /* Color Tokens */
  --pack-color-primary: #3b82f6;
  --pack-color-secondary: #6b7280;
  --pack-color-success: #10b981;
  --pack-color-warning: #f59e0b;
  --pack-color-error: #ef4444;
  
  /* Background Tokens */
  --pack-bg-primary: #ffffff;
  --pack-bg-secondary: #f8fafc;
  --pack-bg-hover: #f1f5f9;
  --pack-bg-active: #eff6ff;
  
  /* Text Tokens */
  --pack-text-primary: #1f2937;
  --pack-text-secondary: #6b7280;
  --pack-text-muted: #9ca3af;
  
  /* Border Tokens */
  --pack-border-primary: #e2e8f0;
  --pack-border-secondary: #cbd5e1;
  --pack-border-focus: #3b82f6;
  
  /* Spacing Tokens */
  --pack-space-xs: 0.25rem;
  --pack-space-sm: 0.5rem;
  --pack-space-md: 1rem;
  --pack-space-lg: 1.5rem;
  --pack-space-xl: 2rem;
  
  /* Typography Tokens */
  --pack-font-size-xs: 0.75rem;
  --pack-font-size-sm: 0.875rem;
  --pack-font-size-base: 1rem;
  --pack-font-size-lg: 1.125rem;
  --pack-font-weight-normal: 400;
  --pack-font-weight-medium: 500;
  --pack-font-weight-semibold: 600;
  
  /* Border Radius Tokens */
  --pack-radius-sm: 0.25rem;
  --pack-radius-md: 0.375rem;
  --pack-radius-lg: 0.5rem;
  
  /* Shadow Tokens */
  --pack-shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --pack-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --pack-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  
  /* Transition Tokens */
  --pack-transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --pack-transition-normal: 250ms cubic-bezier(0.4, 0, 0.2, 1);
  --pack-transition-slow: 350ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

### Theme Variants

```css
/* Dark Theme */
[data-theme="dark"] {
  --pack-bg-primary: #1f2937;
  --pack-bg-secondary: #374151;
  --pack-text-primary: #f9fafb;
  --pack-text-secondary: #d1d5db;
  --pack-border-primary: #4b5563;
}

/* High Contrast Theme */
[data-theme="high-contrast"] {
  --pack-bg-primary: #ffffff;
  --pack-text-primary: #000000;
  --pack-border-primary: #000000;
}

/* Compact Theme */
[data-theme="compact"] {
  --pack-space-sm: 0.25rem;
  --pack-space-md: 0.5rem;
  --pack-space-lg: 0.75rem;
  --pack-font-size-base: 0.875rem;
}
```

### CSS Best Practices

1. **Always use design tokens** - Never hardcode colors or spacing
2. **Mobile-first responsive design** - Start with mobile styles
3. **Accessibility considerations** - High contrast, focus states, reduced motion
4. **Performance optimization** - Efficient selectors, minimal repaints

---

## Testing & Validation

### Test Data Requirements

```json
{
  "testData": {
    "ComponentName": {
      // Realistic data that showcases all features
      "basicExample": { /* minimal example */ },
      "complexExample": { /* feature-rich example */ },
      "edgeCases": { /* boundary conditions */ },
      "errorStates": { /* error scenarios */ },
      "loadingStates": { /* loading scenarios */ },
      "emptyStates": { /* no data scenarios */ }
    }
  }
}
```

### Validation Checklist

- [ ] All props have proper TypeScript types
- [ ] All events are documented with payload structure
- [ ] All permissions are defined and checked
- [ ] Component works with all theme variants
- [ ] Responsive design works on all screen sizes
- [ ] Accessibility features are implemented
- [ ] Performance is optimized
- [ ] Test data covers all scenarios

---

## Best Practices

### Code Quality

1. **TypeScript First** - Use strict typing for all interfaces
2. **Composition API** - Use Vue 3 Composition API consistently
3. **Single Responsibility** - Each component should have one clear purpose
4. **Prop Validation** - Validate all props with proper types and defaults
5. **Error Handling** - Graceful error handling with user feedback
6. **Performance** - Optimize for large datasets and frequent updates

### User Experience

1. **Loading States** - Show loading indicators for async operations
2. **Empty States** - Provide helpful empty state messages
3. **Error States** - Clear error messages with recovery options
4. **Feedback** - Immediate feedback for user actions
5. **Consistency** - Follow established patterns and conventions

### Accessibility

1. **Semantic HTML** - Use appropriate HTML elements and roles
2. **ARIA Labels** - Provide descriptive labels for screen readers
3. **Keyboard Navigation** - Full keyboard accessibility
4. **Focus Management** - Proper focus handling and visual indicators
5. **Color Contrast** - Meet WCAG 2.1 AA contrast requirements
6. **Reduced Motion** - Respect user's motion preferences

### Performance

1. **Lazy Loading** - Load components and data on demand
2. **Virtual Scrolling** - For large lists and tables
3. **Memoization** - Cache expensive computations
4. **Efficient Updates** - Minimize unnecessary re-renders
5. **Bundle Size** - Keep component bundles small

---

## Quality Checklist

### Before Submitting a Widget Pack

#### ✅ **Manifest Validation**
- [ ] All required fields are present
- [ ] Component paths are correct
- [ ] Props are properly typed and documented
- [ ] Events include payload structure and permissions
- [ ] Permissions are granular and well-defined
- [ ] Test data covers all scenarios
- [ ] Theme tokens are comprehensive

#### ✅ **Component Quality**
- [ ] TypeScript interfaces for all data structures
- [ ] Proper prop validation with defaults
- [ ] Event emission with structured payloads
- [ ] Permission checking for all actions
- [ ] Error handling with user feedback
- [ ] Loading and empty states
- [ ] Responsive design (mobile-first)
- [ ] Accessibility compliance (WCAG 2.1 AA)

#### ✅ **Theme System**
- [ ] All styling uses design tokens
- [ ] Theme variants work correctly
- [ ] CSS variables are well-organized
- [ ] Responsive breakpoints are defined
- [ ] High contrast mode support
- [ ] Reduced motion support

#### ✅ **Documentation**
- [ ] Component purpose is clear
- [ ] Props are documented with examples
- [ ] Events are documented with payloads
- [ ] Permissions are explained
- [ ] Usage examples are provided
- [ ] Edge cases are covered

#### ✅ **Testing**
- [ ] Component renders without errors
- [ ] All props work as expected
- [ ] Events are emitted correctly
- [ ] Permissions are enforced
- [ ] Theme variants apply correctly
- [ ] Responsive design works
- [ ] Accessibility features function

#### ✅ **Performance**
- [ ] No memory leaks
- [ ] Efficient re-rendering
- [ ] Optimized for large datasets
- [ ] Bundle size is reasonable
- [ ] Loading performance is acceptable

---

## Common Patterns

### Data Loading Pattern

```vue
<script setup lang="ts">
const loading = ref(false)
const error = ref<string | null>(null)
const data = ref<any[]>([])

async function loadData() {
  loading.value = true
  error.value = null
  
  try {
    const response = await fetchData()
    data.value = response.data
  } catch (err) {
    error.value = err.message
    console.error('Failed to load data:', err)
  } finally {
    loading.value = false
  }
}
</script>
```

### Form Validation Pattern

```vue
<script setup lang="ts">
const form = ref({
  field1: '',
  field2: ''
})

const errors = ref<Record<string, string>>({})

function validateForm(): boolean {
  errors.value = {}
  
  if (!form.value.field1) {
    errors.value.field1 = 'Field 1 is required'
  }
  
  if (!form.value.field2) {
    errors.value.field2 = 'Field 2 is required'
  }
  
  return Object.keys(errors.value).length === 0
}

function handleSubmit() {
  if (!validateForm()) {
    announceText.value = 'Please fix form errors'
    return
  }
  
  // Submit form
}
</script>
```

### Infinite Scroll Pattern

```vue
<script setup lang="ts">
import { useIntersectionObserver } from '@vueuse/core'

const target = ref<HTMLElement>()
const items = ref<any[]>([])
const loading = ref(false)
const hasMore = ref(true)

const { stop } = useIntersectionObserver(
  target,
  ([{ isIntersecting }]) => {
    if (isIntersecting && !loading.value && hasMore.value) {
      loadMore()
    }
  }
)

async function loadMore() {
  loading.value = true
  
  try {
    const response = await fetchMoreItems(items.value.length)
    items.value.push(...response.data)
    hasMore.value = response.hasMore
  } catch (err) {
    console.error('Failed to load more items:', err)
  } finally {
    loading.value = false
  }
}
</script>
```

---

## Conclusion

Creating enterprise-grade widget packs requires attention to detail, adherence to standards, and a focus on user experience. By following this guide, you'll create widgets that are:

- **Professional and polished**
- **Accessible to all users**
- **Performant at scale**
- **Themeable and customizable**
- **Secure and permission-aware**
- **Maintainable and extensible**

Remember: These widgets will be used in thousands of applications. Quality is not optional—it's mandatory.

---

## Resources

- [Vue 3 Documentation](https://vuejs.org/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- [VueUse Utilities](https://vueuse.org/)

---

*Last updated: January 2024*
*Version: 1.0.0*
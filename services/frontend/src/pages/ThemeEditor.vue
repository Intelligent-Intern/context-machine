<template>
  <div class="theme-editor-page">
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">
          <span class="title-icon">🎨</span>
          Theme Editor
        </h1>
        <p class="page-description">
          Customize the appearance of your application with the advanced theme editor
        </p>
      </div>
      
      <div class="header-actions">
        <div class="theme-selector">
          <label for="current-theme">Current Theme:</label>
          <select 
            id="current-theme" 
            v-model="selectedThemeId" 
            @change="switchTheme"
            class="theme-select"
          >
            <option 
              v-for="theme in availableThemes" 
              :key="theme.id" 
              :value="theme.id"
            >
              {{ theme.display_name }}
            </option>
          </select>
        </div>
        
        <button 
          @click="createNewTheme" 
          class="btn btn-primary"
          :disabled="!canCreateThemes"
        >
          <span class="btn-icon">➕</span>
          New Theme
        </button>
      </div>
    </div>
    
    <div class="page-content">
      <theme-editor 
        :initial-theme="selectedThemeId"
        :show-preview="true"
        @theme-changed="handleThemeChanged"
        @theme-saved="handleThemeSaved"
        @theme-loaded="handleThemeLoaded"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useThemeStore } from '@/core/stores/theme'
import { resolveWidget } from '@/core/widgets/registry'

// Get the ThemeEditor widget component
const ThemeEditor = resolveWidget('theme@ThemeEditor')

// Theme store
const themeStore = useThemeStore()

// Reactive state
const selectedThemeId = ref<string | null>(null)

// Computed properties
const availableThemes = computed(() => themeStore.availableThemes)
const canCreateThemes = computed(() => themeStore.canEditThemes)

// Event handlers
function handleThemeChanged(payload: { themeId: string; changes: any }) {
  // Theme changed
}

function handleThemeSaved(payload: { themeId: string; themeName: string }) {
  selectedThemeId.value = payload.themeId
  
  // Show success message
  showNotification('Theme saved successfully!', 'success')
}

function handleThemeLoaded(payload: { themeId: string; themeName: string }) {
  selectedThemeId.value = payload.themeId
}

async function switchTheme() {
  if (!selectedThemeId.value) return
  
  try {
    await themeStore.applyTheme(selectedThemeId.value)
    showNotification('Theme applied successfully!', 'success')
  } catch (error) {
    console.error('[theme-editor-page] Failed to switch theme:', error)
    showNotification('Failed to apply theme', 'error')
  }
}

function createNewTheme() {
  // Start editing mode to create a new theme
  themeStore.startEditing()
  showNotification('Started creating new theme', 'info')
}

function showNotification(message: string, type: 'success' | 'error' | 'info' = 'info') {
  // Simple notification - could be replaced with a proper notification system
  // You could integrate with a toast/notification library here
  if (type === 'error') {
    alert(`Error: ${message}`)
  }
}

// Lifecycle
onMounted(async () => {
  // Initialize theme system if not already done
  if (!themeStore.currentTheme) {
    await themeStore.initialize()
  }
  
  // Set initial selected theme
  if (themeStore.currentTheme) {
    selectedThemeId.value = themeStore.currentTheme.id
  }
})
</script>

<style scoped>
.theme-editor-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--background-color, #ffffff);
  color: var(--text-color, #1f2937);
}

/* Page Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
  background: var(--surface-color, #f8fafc);
  flex-shrink: 0;
}

.header-content {
  flex: 1;
}

.page-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.875rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--text-color, #1f2937);
}

.title-icon {
  font-size: 2rem;
}

.page-description {
  margin: 0;
  font-size: 1rem;
  color: var(--text-secondary-color, #6b7280);
  line-height: 1.5;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex-shrink: 0;
}

.theme-selector {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.theme-selector label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-color, #1f2937);
}

.theme-select {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 6px;
  background: var(--background-color, #ffffff);
  color: var(--text-color, #1f2937);
  font-size: 0.875rem;
  min-width: 200px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.theme-select:focus {
  outline: none;
  border-color: var(--primary-color, #3b82f6);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.theme-select:hover {
  border-color: var(--primary-color, #3b82f6);
}

/* Page Content */
.page-content {
  flex: 1;
  overflow: hidden;
}

/* Button Styles */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border: 1px solid transparent;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  text-decoration: none;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--primary-color, #3b82f6);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover, #2563eb);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.3);
}

.btn-icon {
  font-size: 1rem;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .page-header {
    flex-direction: column;
    gap: 1.5rem;
    align-items: stretch;
  }
  
  .header-actions {
    justify-content: space-between;
  }
  
  .theme-selector {
    flex: 1;
  }
}

@media (max-width: 768px) {
  .page-header {
    padding: 1rem;
  }
  
  .page-title {
    font-size: 1.5rem;
  }
  
  .header-actions {
    flex-direction: column;
    gap: 1rem;
  }
  
  .theme-selector {
    width: 100%;
  }
  
  .theme-select {
    min-width: auto;
    width: 100%;
  }
}

/* Loading States */
.theme-editor-page.loading {
  pointer-events: none;
}

.theme-editor-page.loading::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

/* Dark Theme Support */
[data-theme="dark"] .theme-editor-page {
  --background-color: #1f2937;
  --surface-color: #374151;
  --text-color: #f9fafb;
  --text-secondary-color: #d1d5db;
  --border-color: #4b5563;
}

/* High Contrast Mode */
@media (prefers-contrast: high) {
  .theme-editor-page {
    --border-color: #000000;
    --text-color: #000000;
    --background-color: #ffffff;
  }
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  .btn,
  .theme-select {
    transition: none;
  }
  
  .btn-primary:hover:not(:disabled) {
    transform: none;
  }
}
</style>
<template>
  <div class="theme-editor" :class="{ 'preview-mode': previewMode }">
    <!-- Three-panel layout -->
    <div class="theme-editor-layout">
      <!-- Left Panel: Widget List -->
      <div class="theme-editor-sidebar left">
        <div class="sidebar-header">
          <h3>Widget Packs</h3>
          <div class="search-box">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search widgets..."
              class="search-input"
            />
          </div>
        </div>
        
        <div class="widget-list">
          <div
            v-for="pack in filteredWidgetPacks"
            :key="pack.packId"
            class="widget-pack-item"
            :class="{ active: selectedPackId === pack.packId }"
            @click="selectWidgetPack(pack.packId)"
          >
            <div class="pack-header">
              <span class="pack-name">{{ pack.packName }}</span>
              <span class="variable-count">{{ getPackVariableCount(pack) }}</span>
            </div>
            <div class="pack-description">{{ pack.packName }} theme variables</div>
          </div>
        </div>
      </div>

      <!-- Center Panel: Main Editor -->
      <div class="theme-editor-main">
        <div class="main-header">
          <div class="theme-info">
            <h2 v-if="currentTheme">{{ currentTheme.display_name }}</h2>
            <h2 v-else>Theme Editor</h2>
            <p v-if="currentTheme" class="theme-description">{{ currentTheme.description }}</p>
          </div>
          
          <div class="editor-actions">
            <button
              v-if="!isEditing"
              @click="startEditing"
              class="btn btn-primary"
              :disabled="!canEditThemes"
            >
              Edit Theme
            </button>
            
            <template v-if="isEditing">
              <button
                @click="saveTheme"
                class="btn btn-success"
                :disabled="!hasUnsavedChanges || isSaving"
              >
                {{ isSaving ? 'Saving...' : 'Save' }}
              </button>
              
              <button
                @click="cancelEditing"
                class="btn btn-secondary"
              >
                Cancel
              </button>
            </template>
            
            <button
              @click="togglePreview"
              class="btn btn-outline"
              :class="{ active: previewMode }"
            >
              {{ previewMode ? 'Hide Preview' : 'Show Preview' }}
            </button>
          </div>
        </div>

        <!-- Global Theme Settings -->
        <div class="global-settings-panel">
          <h3>Global Settings</h3>
          
          <div class="settings-grid">
            <div class="setting-group">
              <label>Primary Color</label>
              <input
                v-model="globalSettings.primaryColor"
                type="color"
                class="color-input"
                :disabled="!isEditing"
                @input="updateGlobalSetting('primaryColor', $event.target.value)"
              />
            </div>
            
            <div class="setting-group">
              <label>Secondary Color</label>
              <input
                v-model="globalSettings.secondaryColor"
                type="color"
                class="color-input"
                :disabled="!isEditing"
                @input="updateGlobalSetting('secondaryColor', $event.target.value)"
              />
            </div>
            
            <div class="setting-group">
              <label>Accent Color</label>
              <input
                v-model="globalSettings.accentColor"
                type="color"
                class="color-input"
                :disabled="!isEditing"
                @input="updateGlobalSetting('accentColor', $event.target.value)"
              />
            </div>
            
            <div class="setting-group">
              <label>Background Color</label>
              <input
                v-model="globalSettings.backgroundColor"
                type="color"
                class="color-input"
                :disabled="!isEditing"
                @input="updateGlobalSetting('backgroundColor', $event.target.value)"
              />
            </div>
            
            <div class="setting-group">
              <label>Text Color</label>
              <input
                v-model="globalSettings.textColor"
                type="color"
                class="color-input"
                :disabled="!isEditing"
                @input="updateGlobalSetting('textColor', $event.target.value)"
              />
            </div>
            
            <div class="setting-group">
              <label>Font Family</label>
              <select
                v-model="globalSettings.fontFamily"
                class="select-input"
                :disabled="!isEditing"
                @change="updateGlobalSetting('fontFamily', $event.target.value)"
              >
                <option value="Inter, system-ui, sans-serif">Inter</option>
                <option value="system-ui, sans-serif">System UI</option>
                <option value="Georgia, serif">Georgia</option>
                <option value="Monaco, monospace">Monaco</option>
              </select>
            </div>
            
            <div class="setting-group">
              <label>Font Size</label>
              <input
                v-model="globalSettings.fontSize"
                type="text"
                class="text-input"
                :disabled="!isEditing"
                @input="updateGlobalSetting('fontSize', $event.target.value)"
                placeholder="14px"
              />
            </div>
            
            <div class="setting-group">
              <label>Border Radius</label>
              <input
                v-model="globalSettings.borderRadius"
                type="text"
                class="text-input"
                :disabled="!isEditing"
                @input="updateGlobalSetting('borderRadius', $event.target.value)"
                placeholder="8px"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Right Panel: Widget-Specific Settings -->
      <div class="theme-editor-sidebar right">
        <div class="sidebar-header">
          <h3>Widget Settings</h3>
          <div v-if="selectedPackId" class="selected-pack-info">
            {{ getSelectedPackName() }}
          </div>
        </div>
        
        <div v-if="selectedPackId" class="widget-settings">
          <div
            v-for="(category, categoryName) in getSelectedPackCategories()"
            :key="categoryName"
            class="category-section"
          >
            <div class="category-header" @click="toggleCategory(categoryName)">
              <span class="category-icon">{{ category.icon || '📁' }}</span>
              <span class="category-name">{{ category.name }}</span>
              <span class="category-toggle" :class="{ expanded: expandedCategories[categoryName] }">
                ▼
              </span>
            </div>
            
            <div v-if="expandedCategories[categoryName]" class="category-variables">
              <div
                v-for="(variable, variableName) in category.variables"
                :key="variableName"
                class="variable-item"
              >
                <label class="variable-label">
                  {{ variable.description || variable.name }}
                </label>
                
                <div class="variable-input">
                  <!-- Color input -->
                  <input
                    v-if="variable.type === 'color'"
                    :value="getVariableValue(selectedPackId, variableName)"
                    type="color"
                    class="color-input"
                    :disabled="!isEditing"
                    @input="updateWidgetSetting(selectedPackId, variableName, $event.target.value)"
                  />
                  
                  <!-- Size/spacing input with range -->
                  <div v-else-if="variable.type === 'size' || variable.type === 'spacing'" class="size-input-group">
                    <input
                      :value="getVariableValue(selectedPackId, variableName)"
                      type="range"
                      :min="variable.min || 0"
                      :max="variable.max || 100"
                      :step="variable.step || 1"
                      class="range-input"
                      :disabled="!isEditing"
                      @input="updateWidgetSetting(selectedPackId, variableName, $event.target.value + (variable.unit || 'px'))"
                    />
                    <input
                      :value="getVariableValue(selectedPackId, variableName)"
                      type="text"
                      class="text-input small"
                      :disabled="!isEditing"
                      @input="updateWidgetSetting(selectedPackId, variableName, $event.target.value)"
                    />
                  </div>
                  
                  <!-- Font/select input -->
                  <select
                    v-else-if="variable.options && variable.options.length > 0"
                    :value="getVariableValue(selectedPackId, variableName)"
                    class="select-input"
                    :disabled="!isEditing"
                    @change="updateWidgetSetting(selectedPackId, variableName, $event.target.value)"
                  >
                    <option
                      v-for="option in variable.options"
                      :key="option"
                      :value="option"
                    >
                      {{ option }}
                    </option>
                  </select>
                  
                  <!-- Text input (default) -->
                  <input
                    v-else
                    :value="getVariableValue(selectedPackId, variableName)"
                    type="text"
                    class="text-input"
                    :disabled="!isEditing"
                    @input="updateWidgetSetting(selectedPackId, variableName, $event.target.value)"
                    :placeholder="variable.default"
                  />
                </div>
                
                <div v-if="variable.examples" class="variable-examples">
                  <span
                    v-for="example in variable.examples.slice(0, 3)"
                    :key="example"
                    class="example-value"
                    @click="updateWidgetSetting(selectedPackId, variableName, example)"
                  >
                    {{ example }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div v-else class="no-selection">
          <p>Select a widget pack to customize its theme variables</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useThemeStore } from '@/core/stores/theme'
import type { WidgetPackTheme } from '@/core/theme/registry'

interface Props {
  initialTheme?: string
  readonly?: boolean
  showPreview?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
  showPreview: true
})

const emit = defineEmits<{
  'theme-changed': [{ themeId: string; changes: any }]
  'theme-saved': [{ themeId: string; themeName: string }]
}>()

// Theme store
const themeStore = useThemeStore()

// Component state
const searchQuery = ref('')
const selectedPackId = ref<string | null>(null)
const previewMode = ref(props.showPreview)

// Computed properties
const currentTheme = computed(() => themeStore.currentTheme)
const isEditing = computed(() => themeStore.isEditing)
const hasUnsavedChanges = computed(() => themeStore.hasUnsavedChanges)
const isSaving = computed(() => themeStore.isSaving)
const canEditThemes = computed(() => themeStore.canEditThemes)
const globalSettings = computed(() => themeStore.globalSettings)
const widgetPackThemes = computed(() => themeStore.widgetPackThemes)

const filteredWidgetPacks = computed(() => {
  if (!searchQuery.value) return widgetPackThemes.value
  
  const query = searchQuery.value.toLowerCase()
  return widgetPackThemes.value.filter(pack =>
    pack.packName.toLowerCase().includes(query) ||
    pack.packId.toLowerCase().includes(query)
  )
})

// Methods
function selectWidgetPack(packId: string) {
  selectedPackId.value = packId
}

function getPackVariableCount(pack: WidgetPackTheme): number {
  return Object.values(pack.categories).reduce(
    (count, category) => count + Object.keys(category.variables).length,
    0
  )
}

function startEditing() {
  themeStore.startEditing()
}

function cancelEditing() {
  themeStore.stopEditing()
}

async function saveTheme() {
  try {
    if (currentTheme.value?.is_custom) {
      await themeStore.updateCurrentTheme()
    } else {
      // Save as new theme
      const name = prompt('Enter theme name:')
      if (name) {
        const displayName = prompt('Enter display name:', name)
        const description = prompt('Enter description (optional):') || ''
        
        const themeId = await themeStore.saveAsNewTheme(name, displayName || name, description)
        
        emit('theme-saved', { themeId, themeName: displayName || name })
      }
    }
  } catch (error) {
    console.error('[theme-editor] Failed to save theme:', error)
    alert('Failed to save theme: ' + (error as Error).message)
  }
}

function updateGlobalSetting(key: string, value: string) {
  if (!isEditing.value) return
  
  themeStore.updateGlobalSetting(key as any, value)
  
  emit('theme-changed', {
    themeId: currentTheme.value?.id || 'current',
    changes: { [key]: value }
  })
}

function togglePreview() {
  previewMode.value = !previewMode.value
}

// Widget pack methods
const expandedCategories = ref<Record<string, boolean>>({})

function getSelectedPackName(): string {
  if (!selectedPackId.value) return ''
  const pack = widgetPackThemes.value.find(p => p.packId === selectedPackId.value)
  return pack?.packName || selectedPackId.value
}

function getSelectedPackCategories() {
  if (!selectedPackId.value) return {}
  const pack = widgetPackThemes.value.find(p => p.packId === selectedPackId.value)
  return pack?.categories || {}
}

function toggleCategory(categoryName: string) {
  expandedCategories.value[categoryName] = !expandedCategories.value[categoryName]
}

function getVariableValue(packId: string, variableName: string): string {
  // Get current value from widget settings or default
  const widgetSettings = themeStore.widgetSettings[packId]
  if (widgetSettings && widgetSettings[variableName] !== undefined) {
    return String(widgetSettings[variableName])
  }
  
  // Get default from theme variable definition
  const pack = widgetPackThemes.value.find(p => p.packId === packId)
  if (pack) {
    for (const category of Object.values(pack.categories)) {
      const variable = category.variables[variableName]
      if (variable) {
        return variable.default
      }
    }
  }
  
  return ''
}

function updateWidgetSetting(packId: string, variableName: string, value: string) {
  if (!isEditing.value) return
  
  themeStore.updateWidgetSetting(packId, variableName, value)
  
  emit('theme-changed', {
    themeId: currentTheme.value?.id || 'current',
    changes: { [`${packId}.${variableName}`]: value }
  })
}

// Lifecycle
onMounted(async () => {
  // Load initial theme if specified
  if (props.initialTheme) {
    try {
      await themeStore.applyTheme(props.initialTheme)
    } catch (error) {
      console.error('[theme-editor] Failed to load initial theme:', error)
    }
  }
  
  // Select first widget pack by default
  if (widgetPackThemes.value.length > 0) {
    selectedPackId.value = widgetPackThemes.value[0].packId
  }
})
</script>
<style
 scoped>
.theme-editor {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--background-color, #ffffff);
  color: var(--text-color, #1f2937);
}

.theme-editor-layout {
  display: grid;
  grid-template-columns: 280px 1fr 320px;
  height: 100%;
  gap: 1px;
  background: var(--border-color, #e2e8f0);
}

/* === SIDEBAR STYLES === */
.theme-editor-sidebar {
  background: var(--surface-color, #f8fafc);
  border-right: 1px solid var(--border-color, #e2e8f0);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.theme-editor-sidebar.right {
  border-right: none;
  border-left: 1px solid var(--border-color, #e2e8f0);
}

.sidebar-header {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
  background: var(--background-color, #ffffff);
}

.sidebar-header h3 {
  margin: 0 0 0.75rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-color, #1f2937);
}

.search-box {
  position: relative;
}

.search-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 6px;
  font-size: 0.875rem;
  background: var(--background-color, #ffffff);
  color: var(--text-color, #1f2937);
}

.search-input:focus {
  outline: none;
  border-color: var(--primary-color, #3b82f6);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

/* === WIDGET LIST === */
.widget-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.widget-pack-item {
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  border: 1px solid transparent;
}

.widget-pack-item:hover {
  background: var(--hover-bg, #f1f5f9);
  border-color: var(--border-color, #e2e8f0);
}

.widget-pack-item.active {
  background: var(--active-bg, #eff6ff);
  border-color: var(--primary-color, #3b82f6);
  color: var(--primary-color, #3b82f6);
}

.pack-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.pack-name {
  font-weight: 500;
  font-size: 0.875rem;
}

.variable-count {
  background: var(--surface-color, #f8fafc);
  color: var(--text-secondary-color, #6b7280);
  padding: 0.125rem 0.375rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.pack-description {
  font-size: 0.75rem;
  color: var(--text-secondary-color, #6b7280);
  line-height: 1.4;
}

/* === MAIN EDITOR === */
.theme-editor-main {
  background: var(--background-color, #ffffff);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.main-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  background: var(--background-color, #ffffff);
}

.theme-info h2 {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-color, #1f2937);
}

.theme-description {
  margin: 0;
  color: var(--text-secondary-color, #6b7280);
  font-size: 0.875rem;
  line-height: 1.5;
}

.editor-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

/* === GLOBAL SETTINGS === */
.global-settings-panel {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
}

.global-settings-panel h3 {
  margin: 0 0 1rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-color, #1f2937);
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.setting-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.setting-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-color, #1f2937);
}

/* === WIDGET SETTINGS === */
.widget-settings {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.category-section {
  margin-bottom: 1rem;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 8px;
  overflow: hidden;
}

.category-header {
  padding: 0.75rem 1rem;
  background: var(--surface-color, #f8fafc);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  transition: background-color 0.15s ease;
}

.category-header:hover {
  background: var(--hover-bg, #f1f5f9);
}

.category-icon {
  font-size: 1rem;
}

.category-name {
  flex: 1;
  font-size: 0.875rem;
}

.category-toggle {
  transition: transform 0.2s ease;
  font-size: 0.75rem;
  color: var(--text-secondary-color, #6b7280);
}

.category-toggle.expanded {
  transform: rotate(180deg);
}

.category-variables {
  padding: 1rem;
  background: var(--background-color, #ffffff);
}

.variable-item {
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
}

.variable-item:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.variable-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-color, #1f2937);
  margin-bottom: 0.5rem;
}

.variable-input {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.size-input-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.variable-examples {
  margin-top: 0.5rem;
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.example-value {
  padding: 0.125rem 0.375rem;
  background: var(--surface-color, #f8fafc);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.example-value:hover {
  background: var(--hover-bg, #f1f5f9);
  border-color: var(--primary-color, #3b82f6);
}

.no-selection {
  padding: 2rem;
  text-align: center;
  color: var(--text-secondary-color, #6b7280);
}

.selected-pack-info {
  font-size: 0.75rem;
  color: var(--text-secondary-color, #6b7280);
  font-weight: 500;
}

/* === INPUT STYLES === */
.color-input {
  width: 60px;
  height: 36px;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 6px;
  cursor: pointer;
  background: none;
}

.color-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.text-input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 6px;
  font-size: 0.875rem;
  background: var(--background-color, #ffffff);
  color: var(--text-color, #1f2937);
}

.text-input.small {
  width: 80px;
  flex: none;
}

.text-input:focus {
  outline: none;
  border-color: var(--primary-color, #3b82f6);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.text-input:disabled {
  background: var(--surface-color, #f8fafc);
  opacity: 0.7;
  cursor: not-allowed;
}

.select-input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 6px;
  font-size: 0.875rem;
  background: var(--background-color, #ffffff);
  color: var(--text-color, #1f2937);
  cursor: pointer;
}

.select-input:focus {
  outline: none;
  border-color: var(--primary-color, #3b82f6);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.select-input:disabled {
  background: var(--surface-color, #f8fafc);
  opacity: 0.7;
  cursor: not-allowed;
}

.range-input {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: var(--surface-color, #f8fafc);
  outline: none;
  cursor: pointer;
}

.range-input::-webkit-slider-thumb {
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--primary-color, #3b82f6);
  cursor: pointer;
  border: 2px solid var(--background-color, #ffffff);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.range-input::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--primary-color, #3b82f6);
  cursor: pointer;
  border: 2px solid var(--background-color, #ffffff);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.range-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* === BUTTON STYLES === */
.btn {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  border: 1px solid transparent;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
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
}

.btn-success {
  background: var(--success-color, #10b981);
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: var(--success-hover, #059669);
}

.btn-secondary {
  background: var(--surface-color, #f8fafc);
  color: var(--text-color, #1f2937);
  border-color: var(--border-color, #e2e8f0);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--hover-bg, #f1f5f9);
}

.btn-outline {
  background: transparent;
  color: var(--text-color, #1f2937);
  border-color: var(--border-color, #e2e8f0);
}

.btn-outline:hover:not(:disabled) {
  background: var(--hover-bg, #f1f5f9);
}

.btn-outline.active {
  background: var(--primary-color, #3b82f6);
  color: white;
  border-color: var(--primary-color, #3b82f6);
}

/* === PREVIEW MODE === */
.theme-editor.preview-mode {
  /* Add preview-specific styles */
}

.theme-editor.preview-mode .theme-editor-layout {
  /* Adjust layout for preview */
}

/* === RESPONSIVE === */
@media (max-width: 1200px) {
  .theme-editor-layout {
    grid-template-columns: 240px 1fr 280px;
  }
}

@media (max-width: 900px) {
  .theme-editor-layout {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr auto;
  }
  
  .theme-editor-sidebar {
    border-right: none;
    border-bottom: 1px solid var(--border-color, #e2e8f0);
    max-height: 200px;
  }
  
  .theme-editor-sidebar.right {
    border-left: none;
    border-top: 1px solid var(--border-color, #e2e8f0);
    border-bottom: none;
  }
}

/* === SCROLLBAR STYLES === */
.widget-list::-webkit-scrollbar,
.widget-settings::-webkit-scrollbar,
.global-settings-panel::-webkit-scrollbar {
  width: 6px;
}

.widget-list::-webkit-scrollbar-track,
.widget-settings::-webkit-scrollbar-track,
.global-settings-panel::-webkit-scrollbar-track {
  background: var(--surface-color, #f8fafc);
}

.widget-list::-webkit-scrollbar-thumb,
.widget-settings::-webkit-scrollbar-thumb,
.global-settings-panel::-webkit-scrollbar-thumb {
  background: var(--border-color, #e2e8f0);
  border-radius: 3px;
}

.widget-list::-webkit-scrollbar-thumb:hover,
.widget-settings::-webkit-scrollbar-thumb:hover,
.global-settings-panel::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary-color, #6b7280);
}

/* === LOADING STATES === */
.theme-editor.loading {
  pointer-events: none;
}

.theme-editor.loading::after {
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

/* === VALIDATION STYLES === */
.variable-item.error .variable-input input,
.variable-item.error .variable-input select {
  border-color: var(--error-color, #ef4444);
}

.variable-item.warning .variable-input input,
.variable-item.warning .variable-input select {
  border-color: var(--warning-color, #f59e0b);
}

.validation-message {
  font-size: 0.75rem;
  margin-top: 0.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.validation-message.error {
  background: var(--error-bg, #fef2f2);
  color: var(--error-color, #ef4444);
  border: 1px solid var(--error-border, #fecaca);
}

.validation-message.warning {
  background: var(--warning-bg, #fffbeb);
  color: var(--warning-color, #f59e0b);
  border: 1px solid var(--warning-border, #fed7aa);
}
</style>
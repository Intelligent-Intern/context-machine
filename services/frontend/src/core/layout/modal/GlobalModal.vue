<template>
  <teleport to="body">
    <transition name="fade-quick">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
        role="dialog"
        aria-modal="true"
        @keydown.esc="close"
      >
        <div
          ref="panel"
          class="bg-surface rounded-2xl shadow-xl max-w-3xl w-full m-4 p-6 overflow-auto"
          role="document"
        >
          <slot />
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useA11y } from '@/composables/useA11y'
import { useUserStateStore } from '@/core/stores/userState'

/**
 * GlobalModal.vue
 *
 * Provides a single global modal root for the app.
 * Controlled via userState store (ui.modal.open, ui.modal.content).
 * Ensures focus trap and escape handling.
 */

const userState = useUserStateStore()
const { trapFocus, restoreFocus } = useA11y()

const panel = ref<HTMLElement | null>(null)
const open = ref(false)
let releaseTrap: (() => void) | null = null
let lastFocused: HTMLElement | null = null

watch(
  () => userState.data?.layout?.modal,
  (val) => {
    open.value = !!val?.open
  },
  { immediate: true }
)

function close() {
  userState.update('layout.modal.open', false)
}

onMounted(() => {
  watch(open, (o) => {
    if (o && panel.value) {
      lastFocused = document.activeElement as HTMLElement
      releaseTrap = trapFocus(panel.value)
      panel.value.focus()
    } else {
      if (releaseTrap) releaseTrap()
      if (lastFocused) restoreFocus(lastFocused)
    }
  })
})
</script>

<style scoped>
.fade-quick-enter-active, .fade-quick-leave-active { transition: opacity 120ms ease; }
.fade-quick-enter-from, .fade-quick-leave-to { opacity: 0; }
</style>
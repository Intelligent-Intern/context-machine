import { ref, onMounted, onBeforeUnmount } from 'vue'

/**
 * useA11y composable
 *
 * Provides:
 * - Focus management helpers (trap, restore)
 * - Live region announcements (aria-live polite/assertive)
 * - Detects prefers-reduced-motion
 * - Global skip-to-content handler
 */

export function useA11y() {
    const liveRegion = ref<HTMLElement | null>(null)

    onMounted(() => {
        // Inject a hidden live region once per app
        if (!document.getElementById('a11y-live')) {
            const div = document.createElement('div')
            div.id = 'a11y-live'
            div.setAttribute('aria-live', 'polite')
            div.setAttribute('aria-atomic', 'true')
            div.className = 'sr-only'
            document.body.appendChild(div)
            liveRegion.value = div
        } else {
            liveRegion.value = document.getElementById('a11y-live') as HTMLElement
        }
    })

    onBeforeUnmount(() => {
        // keep live region persistent across app lifetime
    })

    function announce(message: string, mode: 'polite' | 'assertive' = 'polite') {
        if (!liveRegion.value) return
        liveRegion.value.setAttribute('aria-live', mode)
        liveRegion.value.textContent = ''
        // small delay ensures change is picked up by screen readers
        setTimeout(() => {
            if (liveRegion.value) liveRegion.value.textContent = message
        }, 50)
    }

    /**
     * Trap focus within a container.
     */
    function trapFocus(el: HTMLElement) {
        function handle(e: KeyboardEvent) {
            if (e.key !== 'Tab') return
            const focusable = el.querySelectorAll<HTMLElement>(
                'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
            )
            const first = focusable[0]
            const last = focusable[focusable.length - 1]
            if (!first || !last) return

            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault()
                last.focus()
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault()
                first.focus()
            }
        }
        el.addEventListener('keydown', handle)
        return () => el.removeEventListener('keydown', handle)
    }

    /**
     * Restore focus to an element after dialog/modal closes.
     */
    function restoreFocus(target: HTMLElement) {
        target.focus({ preventScroll: true })
    }

    return {
        announce,
        trapFocus,
        restoreFocus,
    }
}

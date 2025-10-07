import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

/**
 * Tailwind-kompatible Breakpoints
 */
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
}

export type Breakpoint = keyof typeof breakpoints

/**
 * Vollwertiges Composable für Komponenten (nutzt Lifecycle-Hooks).
 */
export function useResponsive() {
  const width = ref(typeof window !== 'undefined' ? window.innerWidth : 0)
  const height = ref(typeof window !== 'undefined' ? window.innerHeight : 0)
  const orientation = ref<'portrait' | 'landscape'>('landscape')
  const reducedMotion = ref(false)

  const bp = computed(() => {
    const w = width.value
    return {
      sm: w >= breakpoints.sm,
      md: w >= breakpoints.md,
      lg: w >= breakpoints.lg,
      xl: w >= breakpoints.xl,
      x2l: w >= breakpoints['2xl']
    }
  })

  const current = computed<Breakpoint>(() => {
    if (width.value >= breakpoints['2xl']) return '2xl'
    if (width.value >= breakpoints.xl) return 'xl'
    if (width.value >= breakpoints.lg) return 'lg'
    if (width.value >= breakpoints.md) return 'md'
    return 'sm'
  })

  function onResize() {
    width.value = window.innerWidth
    height.value = window.innerHeight
    orientation.value = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
  }

  function onMotionChange(e: MediaQueryListEvent) {
    reducedMotion.value = e.matches
  }

  onMounted(() => {
    window.addEventListener('resize', onResize, { passive: true })
    onResize()

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedMotion.value = mq.matches
    mq.addEventListener('change', onMotionChange)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', onResize)
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    mq.removeEventListener('change', onMotionChange)
  })

  return {
    width,
    height,
    orientation,
    reducedMotion,
    bp,
    current
  }
}

/**
 * Snapshot-Funktion ohne Lifecycle-Hooks für Stores.
 * Kann in jedem Kontext aufgerufen werden.
 */
export function getResponsiveSnapshot() {
  const w = typeof window !== 'undefined' ? window.innerWidth : 0
  const h = typeof window !== 'undefined' ? window.innerHeight : 0
  const portrait = h >= w

  let current: Breakpoint = 'sm'
  if (w >= breakpoints['2xl']) current = '2xl'
  else if (w >= breakpoints.xl) current = 'xl'
  else if (w >= breakpoints.lg) current = 'lg'
  else if (w >= breakpoints.md) current = 'md'

  return {
    width: w,
    height: h,
    orientation: portrait ? 'portrait' : 'landscape',
    current
  }
}

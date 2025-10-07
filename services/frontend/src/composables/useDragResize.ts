import { onBeforeUnmount } from 'vue'

/**
 * useDragResize composable
 *
 * Provides generic drag+resize handling for bars, panels or widgets.
 * Encapsulates pointer event lifecycle with callbacks.
 *
 * Example usage:
 * const { start } = useDragResize({
 *   onMove: (dx, dy) => { ... },
 *   onEnd: () => { ... },
 *   axis: 'x'
 * })
 * <div @pointerdown="start" />
 */

interface Options {
    axis?: 'x' | 'y' | 'both'
    min?: number
    max?: number
    onMove?: (dx: number, dy: number) => void
    onEnd?: () => void
}

export function useDragResize(opts: Options) {
    let active = false
    let startX = 0
    let startY = 0

    function onPointerMove(e: PointerEvent) {
        if (!active) return
        let dx = e.clientX - startX
        let dy = e.clientY - startY

        if (opts.axis === 'x') dy = 0
        if (opts.axis === 'y') dx = 0

        if (opts.min !== undefined) {
            if (opts.axis === 'x' && dx < opts.min) dx = opts.min
            if (opts.axis === 'y' && dy < opts.min) dy = opts.min
        }
        if (opts.max !== undefined) {
            if (opts.axis === 'x' && dx > opts.max) dx = opts.max
            if (opts.axis === 'y' && dy > opts.max) dy = opts.max
        }

        opts.onMove?.(dx, dy)
    }

    function onPointerUp() {
        if (!active) return
        active = false
        window.removeEventListener('pointermove', onPointerMove)
        window.removeEventListener('pointerup', onPointerUp)
        opts.onEnd?.()
    }

    function start(e: PointerEvent) {
        active = true
        startX = e.clientX
        startY = e.clientY
        window.addEventListener('pointermove', onPointerMove)
        window.addEventListener('pointerup', onPointerUp)
    }

    onBeforeUnmount(() => {
        window.removeEventListener('pointermove', onPointerMove)
        window.removeEventListener('pointerup', onPointerUp)
    })

    return { start }
}
// src/core/stores/layout.ts
import { defineStore } from 'pinia'
import type { RouteLocationNormalized } from 'vue-router'
import { registerHandler } from '@/core/messaging/api'
import { useErrorStore } from '@/core/stores/error'
import { validateManifest, normalizePage } from '@/core/discovery/manifest-loader'
import { getResponsiveSnapshot } from '@/composables/useResponsive'

type BarKey = 'top' | 'bottom' | 'left' | 'right'
type BarState = 0 | 1 | 2 | 3 | 4

interface Sizes {
    default: number
    current: number
}

interface LayoutState {
    bars: Record<BarKey, BarState>
    sizes: Record<'left' | 'right', Sizes>
    activePage: string | null
    manifest: Record<string, any> | null
}

export const useLayoutStore = defineStore('layout', {
    state: (): LayoutState => ({
        bars: {
            top: 2,
            bottom: 1,
            left: 2,
            right: 0
        },
        sizes: {
            left: { default: 280, current: 280 },
            right: { default: 360, current: 360 }
        },
        activePage: null,
        manifest: null
    }),

    actions: {
        initHandlers() {
            const errorStore = useErrorStore()

            registerHandler('discovery.page', (action, p) => {
                if (action === 'get') {
                    if (validateManifest('page', p)) {
                        this.applyManifest(normalizePage(p))
                    } else {
                        errorStore.add({
                            source: 'discovery.page.get',
                            code: 'VALIDATION',
                            msg: 'Invalid page manifest received for layout',
                            details: { manifest: p }
                        })
                    }
                }
            })
        },

        setBarState(key: BarKey, state: BarState) {
            this.bars[key] = state
        },

        toggleBar(key: BarKey) {
            this.bars[key] = this.bars[key] >= 2 ? 0 : 2
        },

        setBarSize(side: 'left' | 'right', size: number) {
            this.sizes[side].current = size
        },

        persistSizes() {
            localStorage.setItem('layout.sizes', JSON.stringify(this.sizes))
        },

        loadSizes() {
            const raw = localStorage.getItem('layout.sizes')
            if (raw) {
                try {
                    this.sizes = JSON.parse(raw)
                } catch {
                    // parse error ignorieren
                }
            }
        },

        applyPageByRoute(route: RouteLocationNormalized) {
            this.activePage = (route.name as string) || route.path
        },

        applyManifest(manifest: any) {
            this.manifest = manifest

            if (manifest.bars) {
                this.bars = {
                    top: manifest.bars.top ?? this.bars.top,
                    bottom: manifest.bars.bottom ?? this.bars.bottom,
                    left: manifest.bars.left ?? this.bars.left,
                    right: manifest.bars.right ?? this.bars.right
                }
            }

            if (manifest.sizes) {
                if (manifest.sizes.left) {
                    this.sizes.left.default = manifest.sizes.left
                    this.sizes.left.current = manifest.sizes.left
                }
                if (manifest.sizes.right) {
                    this.sizes.right.default = manifest.sizes.right
                    this.sizes.right.current = manifest.sizes.right
                }
            }
        },

        applyResponsiveDefaults() {
            const snap = getResponsiveSnapshot()

            if (snap.width >= 1024) {
                this.bars = { top: 2, bottom: 1, left: 2, right: 2 }
            } else if (snap.width >= 768) {
                this.bars = { top: 2, bottom: 1, left: 1, right: 0 }
            } else {
                if (snap.orientation === 'portrait') {
                    this.bars = { top: 1, bottom: 0, left: 0, right: 0 }
                } else {
                    this.bars = { top: 1, bottom: 0, left: 1, right: 0 }
                }
            }
        }
    }
})

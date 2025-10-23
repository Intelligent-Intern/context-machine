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
            right: { default: 320, current: 320 }
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
            localStorage.setItem('layout.bars', JSON.stringify(this.bars))
        },

        loadSizes() {
            const rawSizes = localStorage.getItem('layout.sizes')
            if (rawSizes) {
                try {
                    this.sizes = JSON.parse(rawSizes)
                } catch {
                    // parse error ignorieren
                }
            }
            
            const rawBars = localStorage.getItem('layout.bars')
            if (rawBars) {
                try {
                    const savedBars = JSON.parse(rawBars)
                    // Only restore non-mobile states
                    Object.keys(savedBars).forEach(key => {
                        if (savedBars[key] !== 4) { // Don't restore mobile state
                            this.bars[key as BarKey] = savedBars[key]
                        }
                    })
                } catch {
                    // parse error ignorieren
                }
            }
        },

        applyPageByRoute(route: RouteLocationNormalized) {
            this.activePage = (route.name as string) || route.path
        },

        applyManifest(manifest: any) {
            // Convert new compact format to internal format
            const normalizedManifest = this.normalizeManifest(manifest)
            this.manifest = normalizedManifest

            if (normalizedManifest.bars) {
                this.bars = {
                    top: normalizedManifest.bars.top ?? this.bars.top,
                    bottom: normalizedManifest.bars.bottom ?? this.bars.bottom,
                    left: normalizedManifest.bars.left ?? this.bars.left,
                    right: normalizedManifest.bars.right ?? this.bars.right
                }
            }

            if (normalizedManifest.sizes) {
                if (normalizedManifest.sizes.left) {
                    this.sizes.left.default = normalizedManifest.sizes.left
                    this.sizes.left.current = normalizedManifest.sizes.left
                }
                if (normalizedManifest.sizes.right) {
                    this.sizes.right.default = normalizedManifest.sizes.right
                    this.sizes.right.current = normalizedManifest.sizes.right
                }
            }
        },

        normalizeManifest(manifest: any) {
            const normalized = { ...manifest }

            // Normalize bars: convert compact format (t,b,l,r) to full format (top,bottom,left,right)
            if (manifest.bars) {
                const bars = manifest.bars
                if (bars.t !== undefined || bars.b !== undefined || bars.l !== undefined || bars.r !== undefined) {
                    normalized.bars = {
                        top: bars.t ?? bars.top,
                        bottom: bars.b ?? bars.bottom,
                        left: bars.l ?? bars.left,
                        right: bars.r ?? bars.right
                    }
                }
            }

            // Normalize ports: convert compact format (t,l,m) to full format (top,left,main)
            if (manifest.ports) {
                const ports = manifest.ports
                const normalizedPorts: any = {}

                // Map compact port names to full names
                const portMapping: Record<string, string> = {
                    't': 'top',
                    'b': 'bottom', 
                    'l': 'left',
                    'r': 'right',
                    'm': 'main'
                }

                // Convert compact port names
                Object.entries(ports).forEach(([key, value]) => {
                    const fullKey = portMapping[key] || key
                    normalizedPorts[fullKey] = value
                })

                normalized.ports = normalizedPorts
            }

            return normalized
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

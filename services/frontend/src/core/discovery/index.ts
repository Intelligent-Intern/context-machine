/**
 * Central exports for discovery helpers.
 * Used by stores to validate and normalize manifests.
 */
export {
    validateManifest,
    normalizePage,
    normalizeModule,
    normalizeWidgetPack
} from './manifest-loader'

import {
    validateManifest,
    normalizePage,
    normalizeModule,
    normalizeWidgetPack
} from './manifest-loader'

export async function loadPageManifest(raw: any) {
    if (!validateManifest('page', raw)) return null
    return normalizePage(raw)
}

export async function loadModuleManifest(raw: any) {
    if (!validateManifest('module', raw)) return null
    return normalizeModule(raw)
}

export async function loadWidgetPackManifest(raw: any) {
    if (!validateManifest('widget-pack', raw)) return null
    return normalizeWidgetPack(raw)
}

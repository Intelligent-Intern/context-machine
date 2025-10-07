import Ajv from 'ajv'
import pageSchema from '@/core/schemas/page.schema.json'
import moduleSchema from '@/core/schemas/module.schema.json'
import widgetPackSchema from '@/core/schemas/widget-pack.schema.json'

const ajv = new Ajv({ allErrors: true, strict: false })
const validatePage = ajv.compile(pageSchema as any)
const validateModule = ajv.compile(moduleSchema as any)
const validateWidgetPack = ajv.compile(widgetPackSchema as any)

export type ManifestType = 'page' | 'module' | 'widget-pack'

export function validateManifest(type: ManifestType, manifest: any): boolean {
    switch (type) {
        case 'page':
            return !!validatePage(manifest)
        case 'module':
            return !!validateModule(manifest)
        case 'widget-pack':
            return !!validateWidgetPack(manifest)
        default:
            return false
    }
}

export function normalizePage(manifest: any) {
    return {
        ...manifest,
        bars: manifest.bars || { top: 2, bottom: 1, left: 2, right: 0 },
        ports: manifest.ports || {},
        sizes: manifest.sizes || {}
    }
}

export function normalizeModule(manifest: any) {
    return {
        ...manifest,
        dependsOn: manifest.dependsOn || [],
        navigation: manifest.navigation || [],
        pages: manifest.pages || []
    }
}

export function normalizeWidgetPack(manifest: any) {
    return {
        ...manifest,
        widgets: manifest.widgets || [],
        tokens: manifest.tokens || []
    }
}

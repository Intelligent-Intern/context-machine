// frontend/src/core/widgets/registry.ts
import { defineAsyncComponent, markRaw, type Component } from 'vue'

const packs: Record<string, Record<string, Component>> = {}

export function registerWidgetPack(
  pack: string,
  entries: Record<string, () => Promise<any>>
) {
  packs[pack] = packs[pack] || {}
  for (const key of Object.keys(entries)) {
    packs[pack][key] = markRaw(defineAsyncComponent(entries[key] as any))
  }
}

export function resolveWidget(widgetRef: string): Component | undefined {
  // widgetRef format: "<pack>@<key>"
  const [pack, key] = widgetRef.split('@')
  return packs[pack]?.[key]
}

export function hasWidget(widgetRef: string) {
  const [pack, key] = widgetRef.split('@')
  return Boolean(packs[pack]?.[key])
}

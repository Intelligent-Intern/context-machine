// src/core/utils/merge.ts
export function deepMerge(target: any, source: any): any {
  if (typeof target !== 'object' || typeof source !== 'object' || !target || !source) return source
  const out: any = Array.isArray(target) ? [...target] : { ...target }
  for (const key of Object.keys(source)) {
    if (typeof source[key] === 'object' && !Array.isArray(source[key]) && source[key] !== null) {
      out[key] = deepMerge(target[key] || {}, source[key])
    } else {
      out[key] = source[key]
    }
  }
  return out
}

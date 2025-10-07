// src/core/utils/uid.ts
export function uid(prefix = '') {
  return prefix + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

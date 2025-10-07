// src/core/utils/logger.ts
export function logInfo(source: string, msg: string, details?: any) {
  console.info(`[INFO] [${source}] ${msg}`, details || '')
}

export function logWarn(source: string, msg: string, details?: any) {
  console.warn(`[WARN] [${source}] ${msg}`, details || '')
}

export function logError(source: string, msg: string, details?: any) {
  console.error(`[ERROR] [${source}] ${msg}`, details || '')
}

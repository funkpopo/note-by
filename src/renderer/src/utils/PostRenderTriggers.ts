import { analysisCacheManager } from './AnalysisCacheManager'

// Simple debounce helper
const debounce = <F extends (...args: never[]) => void>(fn: F, wait = 1000) => {
  let t: number | null = null
  return (...args: Parameters<F>) => {
    if (t) window.clearTimeout(t)
    t = window.setTimeout(() => {
      t = null
      fn(...args)
    }, wait)
  }
}

const doInvalidateAnalysis = async (): Promise<void> => {
  try {
    // Clear only in-memory LRU; DB cache is guarded by fingerprint matching
    await analysisCacheManager.clearAllCache()
  } catch {
    // ignore non-critical failures
  }
}

export const scheduleAnalysisInvalidation = debounce(doInvalidateAnalysis, 1500)

// Convenience orchestration for editor finalization
export const onEditorFinalized = (): void => {
  scheduleAnalysisInvalidation()
}

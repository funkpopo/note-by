// Dedicated web worker for diff computation
// Moves expensive diffing off the main UI thread
import { smartDiff } from '../utils/diffUtils'

// Ensure correct worker global scope typing
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ctx: any = self

interface DiffRequest {
  original: string
  current: string
}

ctx.onmessage = (e: MessageEvent<DiffRequest>) => {
  try {
    const { original, current } = e.data
    const result = smartDiff(original || '', current || '')
    ctx.postMessage(result)
  } catch (err) {
    // In case of unexpected errors, return a no-change result
    ctx.postMessage({ diffs: [], hasChanges: false })
  }
}

export {}


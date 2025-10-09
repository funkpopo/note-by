// Web Worker to split large HTML into manageable chunks for progressive loading
// Keeps heavy parsing off the UI thread and enables incremental rendering

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ctx: any = self

interface ChunkRequest {
  html: string
  approxChunkSize?: number // target size per chunk, default ~50KB
  enableLazyMedia?: boolean // add loading="lazy" to images/iframes
}

interface ChunkResponse {
  chunks: string[]
}

function addLazyAttributes(html: string): string {
  // Add loading="lazy" to <img> and <iframe> if not present
  return html
    .replace(/<img(\s+[^>]*?)?>/gi, (m) => {
      if (/loading\s*=\s*"?lazy"?/i.test(m)) return m
      if (/\sloading\s*=/.test(m)) return m
      return m.replace('<img', '<img loading="lazy"')
    })
    .replace(/<iframe(\s+[^>]*?)?>/gi, (m) => {
      if (/loading\s*=\s*"?lazy"?/i.test(m)) return m
      if (/\sloading\s*=/.test(m)) return m
      return m.replace('<iframe', '<iframe loading="lazy"')
    })
}

function splitHtmlIntoBlocks(html: string): string[] {
  const marker = '__BLOCK_SPLIT_MARK__'
  // Insert a marker before common block-level tags to split
  const withMarkers = html.replace(
    /(<(?:(?:p|div|h[1-6]|ul|ol|li|pre|blockquote|table|thead|tbody|tr|td|th|hr|section|article|figure|figcaption|br|code|img|iframe)\b))/gi,
    `${marker}$1`
  )

  const rawBlocks = withMarkers.split(marker)
  const blocks = rawBlocks.filter((b) => b && b.trim().length > 0)
  return blocks
}

function groupBlocks(blocks: string[], approxSize = 50_000): string[] {
  const chunks: string[] = []
  let current = ''
  for (const b of blocks) {
    if (current.length + b.length > approxSize && current.length > 0) {
      chunks.push(current)
      current = ''
    }
    current += b
  }
  if (current.length > 0) chunks.push(current)
  return chunks
}

ctx.onmessage = (e: MessageEvent<ChunkRequest>) => {
  try {
    const { html, approxChunkSize = 50_000, enableLazyMedia = true } = e.data
    let input = html || ''
    if (enableLazyMedia) {
      input = addLazyAttributes(input)
    }
    const blocks = splitHtmlIntoBlocks(input)
    const chunks = groupBlocks(blocks, approxChunkSize)
    const response: ChunkResponse = { chunks }
    ctx.postMessage(response)
  } catch (err) {
    // On error, fall back to single chunk
    ctx.postMessage({ chunks: [e.data?.html || ''] } as ChunkResponse)
  }
}

export {}


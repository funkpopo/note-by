export function filterThinkingContent(text: string): string {
  if (!text) return ''
  // 匹配<think>或<thinking>标签及其内容，以及紧跟其后的空行
  return text.replace(/<(?:think|thinking)>[\s\S]*?<\/(?:think|thinking)>(\r?\n)?/gi, '')
}

export function containsThinkingTags(text: string): boolean {
  if (!text) return false
  // 检查是否包含<think>/<thinking>标签
  return /<(?:think|thinking)>[\s\S]*?<\/(?:think|thinking)>/i.test(text)
}

export function processThinkingContent(text: string): {
  hasThinking: boolean
  displayText: string
  thinkingContent?: string
} {
  if (!text) return { hasThinking: false, displayText: text }

  // 提取所有<think>/<thinking>块并拼接
  const regex = /<(think|thinking)>([\s\S]*?)<\/(think|thinking)>/gi
  const parts: string[] = []
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    // match[2] 为内容
    const content = (match[2] || '').trim()
    if (content) parts.push(content)
  }

  if (parts.length > 0) {
    const thinkingContent = parts.join('\n\n---\n\n')
    const displayText = text.replace(
      /<(?:think|thinking)>[\s\S]*?<\/(?:think|thinking)>(\r?\n)?/gi,
      ''
    )

    return {
      hasThinking: true,
      displayText,
      thinkingContent
    }
  }

  return { hasThinking: false, displayText: text }
}

// 在流式阶段用于 UI 显示：
// - 移除所有完整闭合的<think>/<thinking>块
// - 如果存在未闭合的思考块，截断从最后一个开标签到结尾，避免把“思考”内容渲染到界面
export function stripThinkingForStreaming(text: string): string {
  if (!text) return ''
  // 先移除所有已闭合的思考块
  let result = text.replace(/<(?:think|thinking)>[\s\S]*?<\/(?:think|thinking)>(\r?\n)?/gi, '')
  // 再移除尾部未闭合的思考块（从最后一个开标签到末尾）
  const lastOpenIndex = Math.max(
    result.toLowerCase().lastIndexOf('<think>'),
    result.toLowerCase().lastIndexOf('<thinking>')
  )
  if (lastOpenIndex !== -1 && !/(<\/think>|<\/thinking>)/i.test(result.slice(lastOpenIndex))) {
    result = result.slice(0, lastOpenIndex)
  }
  return result
}

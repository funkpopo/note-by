export function filterThinkingContent(text: string): string {
  if (!text) return ''
  // 修改正则表达式，匹配<think></think>标签及其内容，以及紧跟其后的空行
  return text.replace(/<think>[\s\S]*?<\/think>(\r?\n)?/g, '')
}

export function containsThinkingTags(text: string): boolean {
  if (!text) return false

  // 检查是否包含<think>和</think>标签
  return /<think>[\s\S]*?<\/think>/g.test(text)
}

export function processThinkingContent(text: string): {
  hasThinking: boolean
  displayText: string
  thinkingContent?: string
} {
  if (!text) return { hasThinking: false, displayText: text }

  const thinkingMatch = /<think>([\s\S]*?)<\/think>/g.exec(text)

  if (thinkingMatch) {
    const thinkingContent = thinkingMatch[1].trim()
    const displayText = text.replace(/<think>[\s\S]*?<\/think>(\r?\n)?/g, '').trim()

    return {
      hasThinking: true,
      displayText,
      thinkingContent
    }
  }

  return { hasThinking: false, displayText: text }
}

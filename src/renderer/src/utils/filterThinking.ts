export function filterThinkingContent(text: string): string {
  if (!text) return ''
  return text.replace(/<think>[\s\S]*?<\/think>/g, '')
}

export function containsThinkingTags(text: string): boolean {
  if (!text) return false

  // 检查是否包含<think>和</think>标签
  return /<think>[\s\S]*?<\/think>/g.test(text)
}

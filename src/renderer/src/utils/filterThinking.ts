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

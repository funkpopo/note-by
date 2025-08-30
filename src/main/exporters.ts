/**
 * 导出格式转换器
 */

/**
 * 转换为 Notion 格式
 * Notion 支持标准 Markdown，但有一些特殊的格式要求
 */
export function convertToNotionFormat(markdown: string): string {
  try {
    let content = markdown

    // Notion 特定的格式调整
    content = content
      // 调整代码块格式 - Notion 支持语法高亮
      .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
        return `\`\`\`${lang || 'text'}\n${code.trim()}\n\`\`\``
      })
      // 调整内联代码格式
      .replace(/`([^`]+)`/g, '`$1`')
      // 调整任务列表格式 - Notion 支持 todo
      .replace(/^(\s*)- \[ \]/gm, '$1- [ ]')
      .replace(/^(\s*)- \[x\]/gim, '$1- [x]')
      // 调整标题格式 - 确保标题前后有空行
      .replace(/^(#{1,6})\s+(.+)$/gm, '\n$1 $2\n')
      // 调整表格格式 - Notion 原生支持表格
      // 保持标准 Markdown 表格格式
      // 调整链接格式 - 保持标准格式
      .replace(/\[([^\]]*)\]\(([^)]*)\)/g, '[$1]($2)')
      // 调整图片格式
      .replace(/!\[([^\]]*)\]\(([^)]*)\)/g, '![$1]($2)')
      // 调整引用格式
      .replace(/^>\s*/gm, '> ')
      // 调整分隔线
      .replace(/^---+$/gm, '---')
      // 清理多余的空行
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    // 添加 Notion 导出标识
    const header = `<!-- 导出自 Note-by 应用 - Notion 格式 -->\n<!-- 导出时间: ${new Date().toLocaleString('zh-CN')} -->\n\n`

    return header + content
  } catch (error) {
    console.error('Notion 格式转换错误:', error)
    return markdown // 转换失败时返回原始内容
  }
}

/**
 * 转换为 Obsidian 格式
 * Obsidian 有自己的扩展语法，支持双向链接等特性
 */
export function convertToObsidianFormat(markdown: string): string {
  try {
    let content = markdown

    // Obsidian 特定的格式调整
    content = content
      // 转换标签格式 - Obsidian 使用 #tag 格式
      .replace(/@(\w+)/g, '#$1')
      // 转换内部链接为 Obsidian 格式的双向链接
      .replace(/\[([^\]]+)\]\((?!https?:\/\/)(?!mailto:)([^)]+)\)/g, '[[$1]]')
      // 保持外部链接的标准格式
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '[$1]($2)')
      .replace(/\[([^\]]+)\]\((mailto:[^)]+)\)/g, '[$1]($2)')
      // 调整代码块格式 - Obsidian 支持丰富的语法高亮
      .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
        return `\`\`\`${lang || 'text'}\n${code.trim()}\n\`\`\``
      })
      // 调整任务列表格式 - Obsidian 支持增强的任务语法
      .replace(/^(\s*)- \[ \]/gm, '$1- [ ]')
      .replace(/^(\s*)- \[x\]/gim, '$1- [x]')
      // 调整标题格式 - Obsidian 支持标题ID
      .replace(/^(#{1,6})\s+(.+)$/gm, '$1 $2')
      // 调整数学公式格式 - Obsidian 支持 LaTeX
      .replace(/\$\$([\s\S]*?)\$\$/g, '$$\n$1\n$$')
      .replace(/\$([^$\n]+)\$/g, '$$$1$$')
      // 调整高亮格式 - Obsidian 使用 == 语法
      .replace(/==(.*?)==/g, '==$1==')
      // 调整引用格式
      .replace(/^>\s*/gm, '> ')
      // 调整分隔线
      .replace(/^---+$/gm, '---')
      // 添加 Obsidian 特有的元数据区域
      .replace(
        /^/,
        '---\ntags: [note-by-export]\ncreated: ' + new Date().toISOString() + '\n---\n\n'
      )
      // 清理多余的空行
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    // 添加 Obsidian 导出说明
    const footer = `\n\n---\n> 📝 此文档由 Note-by 应用导出为 Obsidian 格式\n> 🕒 导出时间: ${new Date().toLocaleString('zh-CN')}`

    return content + footer
  } catch (error) {
    console.error('Obsidian 格式转换错误:', error)
    return markdown // 转换失败时返回原始内容
  }
}

/**
 * 清理和标准化 Markdown 内容
 */
export function cleanMarkdown(markdown: string): string {
  return (
    markdown
      // 标准化换行符
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // 清理行尾空格
      .replace(/ +$/gm, '')
      // 标准化空行
      .replace(/\n{4,}/g, '\n\n\n')
      .trim()
  )
}

/**
 * 提取文档元数据
 */
export function extractMetadata(markdown: string, filePath: string) {
  const lines = markdown.split('\n')
  let title = ''

  // 尝试从第一个标题提取标题
  for (const line of lines) {
    const match = line.match(/^#+\s+(.+)$/)
    if (match) {
      title = match[1].trim()
      break
    }
  }

  // 如果没有找到标题，使用文件名
  if (!title) {
    title = filePath.split('/').pop()?.replace('.md', '') || 'Untitled'
  }

  // 统计信息
  const wordCount = markdown.replace(/[^\u4e00-\u9fa5\w]/g, '').length
  const charCount = markdown.length
  const lineCount = lines.length

  return {
    title,
    wordCount,
    charCount,
    lineCount,
    exportTime: new Date().toISOString()
  }
}

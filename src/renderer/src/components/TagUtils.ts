export interface Editor {
  insertInlineContent: (content: unknown) => void
}

// 使用更灵活的内联内容类型
export interface InlineContent {
  type: string
  props?: {
    name?: string
    [key: string]: unknown
  }
  text?: string
}

// 使用更通用的文档块类型，兼容 BlockNote 编辑器的块
export interface TagMenuItem {
  title: string
  onItemClick: () => void
}

export const getTagMenuItems = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: any,
  existingTags: string[] = [],
  query?: string
): TagMenuItem[] => {
  // 根据查询过滤标签
  let filteredTags = existingTags
  if (query) {
    filteredTags = existingTags.filter((tag) => tag.toLowerCase().includes(query.toLowerCase()))
  }

  // 创建从过滤后的标签生成的菜单项
  const tagItems = filteredTags.map((tag) => ({
    title: tag,
    onItemClick: () => {
      editor.insertInlineContent([
        {
          type: 'tag',
          props: {
            name: tag
          }
        },
        ' ' // 在标签后添加空格
      ])
    }
  }))

  // 如果有查询文本，且不完全匹配任何现有标签
  if (query && !existingTags.some((tag) => tag.toLowerCase() === query.toLowerCase())) {
    // 添加"创建新标签"选项
    tagItems.unshift({
      title: `创建新标签: "${query}"`,
      onItemClick: () => {
        // 插入新标签
        editor.insertInlineContent([
          {
            type: 'tag',
            props: {
              name: query
            }
          },
          ' ' // 在标签后添加空格
        ])
      }
    })
  }

  return tagItems
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const extractTags = (content: any): string[] => {
  // 如果内容为空，返回空数组
  if (!content) return []

  // 提取标签的函数
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extractTagsFromBlock = (block: any): string[] => {
    const tags: string[] = []

    // 处理块的内容
    if (Array.isArray(block.content)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      block.content.forEach((item: any) => {
        if (item.type === 'tag' && item.props && item.props.name) {
          tags.push(item.props.name)
        }
      })
    }

    // 递归处理子块
    if (Array.isArray(block.children)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      block.children.forEach((child: any) => {
        tags.push(...extractTagsFromBlock(child))
      })
    }

    return tags
  }

  // 处理文档中的所有块
  const allTags: string[] = []
  if (Array.isArray(content)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    content.forEach((block: any) => {
      allTags.push(...extractTagsFromBlock(block))
    })
  } else {
    // 处理单个块的情况
    allTags.push(...extractTagsFromBlock(content))
  }

  // 去重并返回
  return [...new Set(allTags)]
}

// 新增: 从Markdown文本提取标签引用
// 匹配Markdown文本中的@标签模式
export const extractTagsFromMarkdown = (markdown: string): string[] => {
  if (!markdown) return []

  // 匹配Markdown中的@标签模式 @tagname
  const tagRegex = /@([a-zA-Z0-9_\u4e00-\u9fa5]+)/g
  const matches = markdown.matchAll(tagRegex)
  const tags: string[] = []

  for (const match of matches) {
    if (match[1]) {
      tags.push(match[1])
    }
  }

  // 去重并返回
  return [...new Set(tags)]
}

// 新增: 预处理Markdown内容，将@标签转换为特殊格式便于BlockNote识别
export const preprocessMarkdownForTags = (markdown: string): string => {
  if (!markdown) return markdown

  // 将@tag格式转换为特殊格式，以便BlockNote在解析时能正确识别
  // 使用特殊标记 {{@tag}} 来标识标签
  return markdown.replace(/@([a-zA-Z0-9_\u4e00-\u9fa5]+)/g, '{{@$1}}')
}

// 新增: 后处理编辑器内容，查找并将特殊标记转换为正确的Tag组件
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const postprocessBlocksForTags = (blocks: any): any => {
  if (!blocks || !Array.isArray(blocks)) return blocks

  // 深拷贝以避免修改原始内容
  const processedBlocks = JSON.parse(JSON.stringify(blocks))

  // 递归处理块内容
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const processBlock = (block: any): void => {
    // 处理块的内容
    if (Array.isArray(block.content)) {
      // 创建新的内容数组
      const newContent: any[] = []

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      block.content.forEach((item: any) => {
        // 检查文本内容是否包含标签标记 {{@tagname}}
        if (item.type === 'text' && item.text) {
          const tagRegex = /\{\{@([a-zA-Z0-9_\u4e00-\u9fa5]+)\}\}/g
          let lastIndex = 0
          let match

          // 重置正则表达式
          tagRegex.lastIndex = 0

          // 查找所有标签标记
          while ((match = tagRegex.exec(item.text)) !== null) {
            // 添加标记前的文本
            if (match.index > lastIndex) {
              newContent.push({
                type: 'text',
                text: item.text.substring(lastIndex, match.index),
                styles: { ...item.styles }
              })
            }

            // 添加标签
            newContent.push({
              type: 'tag',
              props: {
                name: match[1]
              }
            })

            lastIndex = tagRegex.lastIndex
          }

          // 添加剩余文本
          if (lastIndex < item.text.length) {
            newContent.push({
              type: 'text',
              text: item.text.substring(lastIndex),
              styles: { ...item.styles }
            })
          }
        } else {
          // 保留非文本内容
          newContent.push(item)
        }
      })

      // 更新块内容
      block.content = newContent
    }

    // 递归处理子块
    if (Array.isArray(block.children)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      block.children.forEach((child: any) => {
        processBlock(child)
      })
    }
  }

  // 处理所有块
  processedBlocks.forEach(processBlock)

  return processedBlocks
}

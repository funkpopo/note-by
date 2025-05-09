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

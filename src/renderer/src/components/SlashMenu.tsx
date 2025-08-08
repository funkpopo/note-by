import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react'
import { 
  IconH1,
  IconH2,
  IconList,
  IconOrderedList,
  IconGridStroked,
  IconCode,
  IconQuote,
  IconImage
} from '@douyinfe/semi-icons'
import './SlashMenu.css'

export interface SlashMenuItem {
  title: string
  description: string
  searchTerms: string[]
  icon: React.ReactNode
  command: ({ editor, range }: any) => void
}

export interface SlashMenuProps {
  items: SlashMenuItem[]
  command: (item: SlashMenuItem) => void
}

export interface SlashMenuRef {
  onKeyDown: (event: KeyboardEvent) => boolean
}

const SlashMenu = forwardRef<SlashMenuRef, SlashMenuProps>(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)

  const selectItem = (index: number) => {
    const item = items[index]
    if (item) {
      command(item)
    }
  }

  const scrollToItem = (index: number) => {
    const menuElement = menuRef.current
    if (!menuElement) return

    const itemElements = menuElement.querySelectorAll('.slash-menu-item')
    const targetItem = itemElements[index] as HTMLElement
    if (!targetItem) return

    const menuRect = menuElement.getBoundingClientRect()
    const itemRect = targetItem.getBoundingClientRect()

    // 检查项目是否在可见区域外
    const itemTop = itemRect.top - menuRect.top + menuElement.scrollTop
    const itemBottom = itemTop + itemRect.height
    const visibleTop = menuElement.scrollTop
    const visibleBottom = visibleTop + menuElement.clientHeight

    // 如果项目在可见区域上方，滚动到项目顶部
    if (itemTop < visibleTop) {
      menuElement.scrollTop = itemTop - 8 // 8px padding
    }
    // 如果项目在可见区域下方，滚动到项目底部可见
    else if (itemBottom > visibleBottom) {
      menuElement.scrollTop = itemBottom - menuElement.clientHeight + 8 // 8px padding
    }
  }

  const upHandler = () => {
    const newIndex = selectedIndex > 0 ? selectedIndex - 1 : items.length - 1
    setSelectedIndex(newIndex)
    scrollToItem(newIndex)
  }

  const downHandler = () => {
    const newIndex = selectedIndex < items.length - 1 ? selectedIndex + 1 : 0
    setSelectedIndex(newIndex)
    scrollToItem(newIndex)
  }

  const enterHandler = () => {
    selectItem(selectedIndex)
  }

  useEffect(() => {
    setSelectedIndex(0)
    // 当项目列表改变时，滚动到顶部
    if (menuRef.current) {
      menuRef.current.scrollTop = 0
    }
  }, [items])

  useEffect(() => {
    // 当选中项改变时，确保它在可见区域内
    scrollToItem(selectedIndex)
  }, [selectedIndex])

  useImperativeHandle(ref, () => ({
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp') {
        upHandler()
        return true
      }

      if (event.key === 'ArrowDown') {
        downHandler()
        return true
      }

      if (event.key === 'Enter') {
        enterHandler()
        return true
      }

      return false
    }
  }))

  return (
    <div className="slash-menu" ref={menuRef}>
      {items.length ? (
        <div className="slash-menu-items">
          {items.map((item, index) => (
            <div
              className={`slash-menu-item ${index === selectedIndex ? 'is-selected' : ''}`}
              onClick={() => selectItem(index)}
              key={index}
            >
              <div className="slash-menu-item-icon">
                {item.icon}
              </div>
              <div className="slash-menu-item-content">
                <div className="slash-menu-item-title">{item.title}</div>
                <div className="slash-menu-item-description">{item.description}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="slash-menu-empty">没有找到匹配的结果</div>
      )}
    </div>
  )
})

SlashMenu.displayName = 'SlashMenu'

export default SlashMenu

export const getSuggestionItems = ({ query }: { query: string }): SlashMenuItem[] => {
  const items: SlashMenuItem[] = [
    {
      title: '标题1',
      description: '大号标题',
      searchTerms: ['h1', 'heading', '标题', 'title'],
      icon: <IconH1 />,
      command: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setNode('heading', { level: 1 })
          .run()
      },
    },
    {
      title: '标题2',
      description: '中号标题',
      searchTerms: ['h2', 'heading', '标题', 'subtitle'],
      icon: <IconH2 />,
      command: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setNode('heading', { level: 2 })
          .run()
      },
    },
    {
      title: '标题3',
      description: '小号标题',
      searchTerms: ['h3', 'heading', '标题', 'subheading'],
      icon: <IconH2 />, // Using IconH2 as IconH3 doesn't exist
      command: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setNode('heading', { level: 3 })
          .run()
      },
    },
    {
      title: '无序列表',
      description: '创建一个简单的无序列表',
      searchTerms: ['unordered', 'bullet', 'list', '列表', '无序'],
      icon: <IconList />,
      command: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .toggleBulletList()
          .run()
      },
    },
    {
      title: '有序列表',
      description: '创建一个带数字的有序列表',
      searchTerms: ['ordered', 'numbered', 'list', '列表', '有序', '数字'],
      icon: <IconOrderedList />,
      command: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .toggleOrderedList()
          .run()
      },
    },
    {
      title: '任务列表',
      description: '创建一个可勾选的任务列表',
      searchTerms: ['task', 'todo', 'check', 'checkbox', '任务', '待办', '勾选'],
      icon: <IconList />, // Using IconList as IconCheckList doesn't exist
      command: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .toggleTaskList()
          .run()
      },
    },
    {
      title: '引用',
      description: '创建引用块',
      searchTerms: ['quote', 'blockquote', '引用', '块引用'],
      icon: <IconQuote />,
      command: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .toggleBlockquote()
          .run()
      },
    },
    {
      title: '代码块',
      description: '创建代码块',
      searchTerms: ['code', 'codeblock', '代码', '代码块'],
      icon: <IconCode />,
      command: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .toggleCodeBlock()
          .run()
      },
    },
    {
      title: '表格',
      description: '插入一个3x3表格',
      searchTerms: ['table', 'grid', '表格'],
      icon: <IconGridStroked />,
      command: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
          .run()
      },
    },
    {
      title: '分割线',
      description: '添加水平分割线',
      searchTerms: ['hr', 'divider', 'horizontal', '分割线', '分隔符'],
      icon: <span style={{ fontSize: '16px', fontWeight: 'bold' }}>—</span>, // Using text as IconDivider doesn't exist
      command: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setHorizontalRule()
          .run()
      },
    },
    {
      title: '图片',
      description: '插入图片',
      searchTerms: ['image', 'img', 'picture', '图片', '图像'],
      icon: <IconImage />,
      command: ({ editor, range }) => {
        const url = window.prompt('请输入图片地址:')
        if (url) {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .setImage({ src: url })
            .run()
        }
      },
    },
  ]

  return items.filter(item => {
    if (typeof query === 'string' && query.length > 0) {
      const search = query.toLowerCase()
      return (
        item.title.toLowerCase().includes(search) ||
        item.description.toLowerCase().includes(search) ||
        item.searchTerms.some(term => term.toLowerCase().includes(search))
      )
    }
    return true
  })
}
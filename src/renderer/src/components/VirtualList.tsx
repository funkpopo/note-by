import React, { memo } from 'react'
import { FixedSizeList as List, ListChildComponentProps } from 'react-window'

// 虚拟列表项的数据类型
export interface VirtualListItem {
  id: string | number
  content: React.ReactNode
  height?: number
}

// 虚拟列表组件的Props
export interface VirtualListProps {
  items: VirtualListItem[]
  height: number
  itemHeight: number
  width?: string | number
  className?: string
  style?: React.CSSProperties
}

// 列表项渲染组件
const ListItem: React.FC<ListChildComponentProps> = memo(({ index, style, data }) => {
  const item = data[index]

  return (
    <div style={style}>
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', padding: '8px 16px' }}>
        {item.content}
      </div>
    </div>
  )
})

ListItem.displayName = 'VirtualListItem'

// 虚拟列表主组件
export const VirtualList: React.FC<VirtualListProps> = memo(
  ({ items, height, itemHeight, width = '100%', className, style }) => {
    if (items.length === 0) {
      return (
        <div
          style={{
            height,
            width,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--semi-color-text-2)'
          }}
        >
          暂无数据
        </div>
      )
    }

    return (
      <div className={className} style={style}>
        <List
          height={height}
          itemCount={items.length}
          itemSize={itemHeight}
          itemData={items}
          width={width}
        >
          {ListItem}
        </List>
      </div>
    )
  }
)

VirtualList.displayName = 'VirtualList'

// 优化的文本列表组件
interface VirtualTextListProps {
  items: string[]
  height: number
  itemHeight?: number
  width?: string | number
  className?: string
  style?: React.CSSProperties
  renderItem?: (item: string, index: number) => React.ReactNode
}

export const VirtualTextList: React.FC<VirtualTextListProps> = memo(
  ({ items, height, itemHeight = 40, width = '100%', className, style, renderItem }) => {
    const virtualItems: VirtualListItem[] = items.map((item, index) => ({
      id: index,
      content: renderItem ? (
        renderItem(item, index)
      ) : (
        <div style={{ lineHeight: 1.6, padding: '4px 0' }}>{item}</div>
      )
    }))

    return (
      <VirtualList
        items={virtualItems}
        height={height}
        itemHeight={itemHeight}
        width={width}
        className={className}
        style={style}
      />
    )
  }
)

VirtualTextList.displayName = 'VirtualTextList'

// Default export for lazy loading
export default VirtualList

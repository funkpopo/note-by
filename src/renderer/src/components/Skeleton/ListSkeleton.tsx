import React from 'react'
import { Skeleton } from '@douyinfe/semi-ui'
import './skeleton.css'

export interface ListSkeletonProps {
  className?: string
  style?: React.CSSProperties
  itemCount?: number
  showHeader?: boolean
  showAvatar?: boolean
  showActions?: boolean
  variant?: 'default' | 'compact' | 'detailed'
}

/**
 * 通用列表骨架屏组件
 * 适用于各种列表场景：文件列表、历史记录、搜索结果等
 */
const ListSkeleton: React.FC<ListSkeletonProps> = ({
  className = '',
  style = {},
  itemCount = 6,
  showHeader = false,
  showAvatar = true,
  showActions = true,
  variant = 'default'
}) => {
  const renderListItem = (index: number) => {
    const itemProps = {
      key: index,
      className: `list-skeleton-item list-skeleton-item-${variant}`
    }

    switch (variant) {
      case 'compact':
        return (
          <div {...itemProps}>
            {showAvatar && (
              <Skeleton.Avatar size="small" style={{ width: 16, height: 16, marginRight: 8 }} />
            )}
            <Skeleton.Title
              style={{ width: `${50 + Math.random() * 30}%`, height: 16, marginBottom: 0 }}
            />
            {showActions && (
              <Skeleton.Button style={{ width: 20, height: 20, marginLeft: 'auto' }} />
            )}
          </div>
        )

      case 'detailed':
        return (
          <div {...itemProps}>
            {showAvatar && (
              <Skeleton.Avatar size="default" style={{ marginRight: 12, flex: 'none' }} />
            )}
            <div className="list-skeleton-content">
              <Skeleton.Title
                style={{ width: `${60 + Math.random() * 25}%`, height: 18, marginBottom: 8 }}
              />
              <Skeleton.Paragraph rows={2} style={{ marginBottom: 8 }} />
              <div className="list-skeleton-meta">
                <Skeleton.Title
                  style={{ width: 80, height: 12, marginBottom: 0, marginRight: 16 }}
                />
                <Skeleton.Title style={{ width: 60, height: 12, marginBottom: 0 }} />
              </div>
            </div>
            {showActions && (
              <div className="list-skeleton-actions">
                <Skeleton.Button style={{ width: 28, height: 28, marginBottom: 4 }} />
                <Skeleton.Button style={{ width: 28, height: 28, marginBottom: 4 }} />
                <Skeleton.Button style={{ width: 28, height: 28 }} />
              </div>
            )}
          </div>
        )

      default:
        return (
          <div {...itemProps}>
            {showAvatar && (
              <Skeleton.Avatar
                size="small"
                style={{ width: 20, height: 20, marginRight: 12, flex: 'none' }}
              />
            )}
            <div className="list-skeleton-content">
              <Skeleton.Title
                style={{ width: `${50 + Math.random() * 35}%`, height: 16, marginBottom: 4 }}
              />
              <Skeleton.Title
                style={{ width: `${30 + Math.random() * 20}%`, height: 12, marginBottom: 0 }}
              />
            </div>
            {showActions && (
              <Skeleton.Button style={{ width: 24, height: 24, marginLeft: 'auto' }} />
            )}
          </div>
        )
    }
  }

  return (
    <div className={`list-skeleton list-skeleton-${variant} ${className}`} style={style}>
      {showHeader && (
        <div className="list-skeleton-header">
          <Skeleton.Title style={{ width: '40%', height: 20, marginBottom: 16 }} />
        </div>
      )}
      <div className="list-skeleton-items">
        {Array.from({ length: itemCount }, (_, index) => renderListItem(index))}
      </div>
    </div>
  )
}

export default ListSkeleton
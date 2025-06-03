import React from 'react'
import { Skeleton, Space } from '@douyinfe/semi-ui'
import './skeleton.css'

interface NavigationSkeletonProps {
  className?: string
  style?: React.CSSProperties
  itemCount?: number
}

const NavigationSkeleton: React.FC<NavigationSkeletonProps> = ({
  className = '',
  style = {},
  itemCount = 8
}) => {
  return (
    <div className={`navigation-skeleton ${className}`} style={style}>
      {/* 搜索框骨架屏 */}
      <div className="navigation-skeleton-search">
        <Skeleton.Title
          style={{
            width: '100%',
            height: 32,
            marginBottom: 16
          }}
        />
      </div>

      {/* 文件列表骨架屏 */}
      <div className="navigation-skeleton-list">
        {Array.from({ length: itemCount }, (_, index) => {
          const isFolder = index % 3 === 0 // 每3个项目中有1个是文件夹
          const indentLevel = isFolder ? 0 : Math.floor(Math.random() * 2) // 文件可能有缩进

          return (
            <div
              key={index}
              className="navigation-skeleton-item"
              style={{
                marginLeft: indentLevel * 20,
                marginBottom: 8
              }}
            >
              <Space align="center">
                {/* 图标骨架屏 */}
                <Skeleton.Avatar
                  size="small"
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: isFolder ? '2px' : '1px'
                  }}
                />

                {/* 文件/文件夹名称骨架屏 */}
                <Skeleton.Title
                  style={{
                    width: `${50 + Math.random() * 40}%`,
                    height: 16,
                    marginBottom: 0
                  }}
                />
              </Space>

              {/* 如果是文件夹，添加一些子项目 */}
              {isFolder && index < itemCount - 3 && (
                <div className="navigation-skeleton-children">
                  {Array.from({ length: Math.floor(Math.random() * 3) + 1 }, (_, childIndex) => (
                    <div
                      key={childIndex}
                      className="navigation-skeleton-item"
                      style={{
                        marginLeft: 20,
                        marginTop: 6,
                        marginBottom: 6
                      }}
                    >
                      <Space align="center">
                        <Skeleton.Avatar
                          size="small"
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: '1px'
                          }}
                        />
                        <Skeleton.Title
                          style={{
                            width: `${40 + Math.random() * 35}%`,
                            height: 14,
                            marginBottom: 0
                          }}
                        />
                      </Space>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 底部操作按钮骨架屏 */}
      <div className="navigation-skeleton-actions">
        <Space>
          <Skeleton.Button style={{ width: 60, height: 28 }} />
          <Skeleton.Button style={{ width: 80, height: 28 }} />
        </Space>
      </div>
    </div>
  )
}

export default NavigationSkeleton

import React from 'react'
import { Skeleton, Card, Space } from '@douyinfe/semi-ui'
import './skeleton.css'

interface EditorSkeletonProps {
  className?: string
  style?: React.CSSProperties
}

/**
 * 编辑器专用骨架屏组件
 * 模拟编辑器的布局结构：工具栏 + 内容区域
 */
const EditorSkeleton: React.FC<EditorSkeletonProps> = ({ className = '', style = {} }) => {
  return (
    <div className={`editor-skeleton ${className}`} style={style}>
      {/* 工具栏骨架屏 */}
      <div className="editor-skeleton-toolbar">
        <Space>
          <Skeleton.Button style={{ width: 80, height: 32 }} />
          <Skeleton.Button style={{ width: 100, height: 32 }} />
          <Skeleton.Button style={{ width: 60, height: 32 }} />
          <div className="skeleton-divider" />
          <Skeleton.Button style={{ width: 120, height: 32 }} />
        </Space>
      </div>

      {/* 编辑器内容区域骨架屏 */}
      <Card
        className="editor-skeleton-content"
        bodyStyle={{
          padding: '24px',
          height: 'calc(100vh - 200px)',
          overflow: 'hidden'
        }}
      >
        <Skeleton
          placeholder={
            <div>
              {/* 标题区域 */}
              <Skeleton.Title
                style={{
                  width: '40%',
                  marginBottom: 24,
                  height: 32
                }}
              />

              {/* 内容段落 */}
              <Skeleton.Paragraph rows={2} style={{ marginBottom: 20 }} />

              {/* 代码块模拟 */}
              <div className="skeleton-code-block">
                <Skeleton.Paragraph
                  rows={4}
                  style={{
                    backgroundColor: 'var(--semi-color-fill-0)',
                    padding: '12px',
                    borderRadius: '6px',
                    marginBottom: 20
                  }}
                />
              </div>

              {/* 更多内容段落 */}
              <Skeleton.Paragraph rows={3} style={{ marginBottom: 20 }} />

              {/* 列表项模拟 */}
              <div className="skeleton-list">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="skeleton-list-item">
                    <Skeleton.Avatar
                      size="small"
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        marginRight: 8,
                        marginTop: 8
                      }}
                    />
                    <Skeleton.Title
                      style={{
                        width: `${60 + Math.random() * 30}%`,
                        height: 20,
                        marginBottom: 8
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* 底部段落 */}
              <Skeleton.Paragraph rows={2} style={{ marginTop: 20 }} />
            </div>
          }
          loading={true}
        />
      </Card>
    </div>
  )
}

export default EditorSkeleton

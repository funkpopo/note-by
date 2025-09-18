import React from 'react'
import { Skeleton, Card, Space } from '@douyinfe/semi-ui'
import './skeleton.css'

interface MindMapSkeletonProps {
  className?: string
  style?: React.CSSProperties
  nodeCount?: number
}

const MindMapSkeleton: React.FC<MindMapSkeletonProps> = ({
  className = '',
  style = {},
  nodeCount = 12
}) => {
  return (
    <div className={`mindmap-skeleton ${className}`} style={style}>
      {/* 工具栏 */}
      <div className="mindmap-skeleton-toolbar">
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Skeleton.Title style={{ width: 120, height: 24, marginBottom: 0 }} />
          </Space>
          <Space>
            <Skeleton.Button style={{ width: 80, height: 32 }} />
            <Skeleton.Button style={{ width: 100, height: 32 }} />
            <Skeleton.Button style={{ width: 60, height: 32 }} />
          </Space>
        </Space>
      </div>

      {/* 思维导图画布 */}
      <Card
        className="mindmap-skeleton-canvas"
        bodyStyle={{
          padding: 0,
          height: 'calc(100vh - 120px)',
          position: 'relative',
          overflow: 'hidden',
          background: 'var(--semi-color-fill-0)'
        }}
      >
        {/* 中心节点 */}
        <div className="mindmap-skeleton-center-node">
          <Skeleton.Avatar
            style={{
              width: 120,
              height: 60,
              borderRadius: '8px'
            }}
          />
        </div>

        {/* 分支节点 */}
        {Array.from({ length: nodeCount }, (_, index) => {
          const angle = (index * 360) / nodeCount
          const radius = 150 + Math.random() * 100
          const nodeSize = 80 + Math.random() * 40

          const x = Math.cos((angle * Math.PI) / 180) * radius
          const y = Math.sin((angle * Math.PI) / 180) * radius

          return (
            <div
              key={index}
              className="mindmap-skeleton-node"
              style={{
                left: `calc(50% + ${x}px)`,
                top: `calc(50% + ${y}px)`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              <Skeleton.Avatar
                style={{
                  width: nodeSize,
                  height: nodeSize * 0.6,
                  borderRadius: '6px'
                }}
              />
            </div>
          )
        })}

        {/* 连接线 */}
        {Array.from({ length: Math.floor(nodeCount / 2) }, (_, index) => {
          const angle = Math.random() * 360
          const length = 100 + Math.random() * 150

          return (
            <div
              key={index}
              className="mindmap-skeleton-edge"
              style={{
                left: `${20 + Math.random() * 60}%`,
                top: `${20 + Math.random() * 60}%`,
                width: length,
                height: 2,
                background: 'var(--semi-color-border)',
                transform: `rotate(${angle}deg)`,
                transformOrigin: 'left center',
                opacity: 0.3
              }}
            />
          )
        })}

        {/* 网格背景 */}
        <div className="mindmap-skeleton-grid">
          {Array.from({ length: 20 }, (_, index) => (
            <div
              key={`h-${index}`}
              className="mindmap-skeleton-grid-line"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: `${index * 5}%`,
                height: 1,
                background: 'var(--semi-color-border)',
                opacity: 0.1
              }}
            />
          ))}
          {Array.from({ length: 20 }, (_, index) => (
            <div
              key={`v-${index}`}
              className="mindmap-skeleton-grid-line"
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `${index * 5}%`,
                width: 1,
                background: 'var(--semi-color-border)',
                opacity: 0.1
              }}
            />
          ))}
        </div>
      </Card>
    </div>
  )
}

export default MindMapSkeleton

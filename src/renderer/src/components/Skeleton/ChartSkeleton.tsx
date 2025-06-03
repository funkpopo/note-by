import React from 'react'
import { Skeleton } from '@douyinfe/semi-ui'
import './skeleton.css'

interface ChartSkeletonProps {
  type?: 'line' | 'bar' | 'pie' | 'graph' | 'wordcloud'
  width?: number | string
  height?: number | string
  className?: string
  style?: React.CSSProperties
}

const ChartSkeleton: React.FC<ChartSkeletonProps> = ({
  type = 'line',
  width = '100%',
  height = 300,
  className = '',
  style = {}
}) => {
  const containerStyle = {
    width,
    height,
    ...style
  }

  const renderChartSkeleton = () => {
    switch (type) {
      case 'line':
        return (
          <div className="chart-skeleton-line">
            {/* Y轴 */}
            <div className="chart-skeleton-axis chart-skeleton-y-axis">
              {[1, 2, 3, 4, 5].map((item) => (
                <Skeleton.Title
                  key={item}
                  style={{
                    width: 30,
                    height: 12,
                    marginBottom: 20
                  }}
                />
              ))}
            </div>

            {/* 图表区域 */}
            <div className="chart-skeleton-content">
              {/* 网格线 */}
              <div className="chart-skeleton-grid">
                {[1, 2, 3, 4, 5].map((item) => (
                  <div key={item} className="chart-skeleton-grid-line" />
                ))}
              </div>

              {/* 折线 */}
              <div className="chart-skeleton-line-path" />
            </div>

            {/* X轴 */}
            <div className="chart-skeleton-axis chart-skeleton-x-axis">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <Skeleton.Title
                  key={item}
                  style={{
                    width: 40,
                    height: 12,
                    marginTop: 8
                  }}
                />
              ))}
            </div>
          </div>
        )

      case 'bar':
        return (
          <div className="chart-skeleton-bar">
            <div className="chart-skeleton-bars">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div
                  key={item}
                  className="chart-skeleton-bar-item"
                  style={{
                    height: `${30 + Math.random() * 60}%`
                  }}
                />
              ))}
            </div>
            <div className="chart-skeleton-axis chart-skeleton-x-axis">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <Skeleton.Title
                  key={item}
                  style={{
                    width: 30,
                    height: 12,
                    marginTop: 8
                  }}
                />
              ))}
            </div>
          </div>
        )

      case 'pie':
        return (
          <div className="chart-skeleton-pie">
            <div className="chart-skeleton-pie-chart">
              <Skeleton.Avatar
                size="large"
                style={{
                  width: 180,
                  height: 180,
                  borderRadius: '50%'
                }}
              />
            </div>
            <div className="chart-skeleton-pie-legend">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="chart-skeleton-legend-item">
                  <Skeleton.Avatar
                    size="small"
                    style={{
                      width: 12,
                      height: 12,
                      marginRight: 8
                    }}
                  />
                  <Skeleton.Title
                    style={{
                      width: 60,
                      height: 12,
                      marginBottom: 0
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )

      case 'graph':
        return (
          <div className="chart-skeleton-graph">
            {/* 节点 */}
            {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
              <div
                key={item}
                className="chart-skeleton-node"
                style={{
                  left: `${10 + Math.random() * 80}%`,
                  top: `${10 + Math.random() * 80}%`
                }}
              >
                <Skeleton.Avatar
                  size="small"
                  style={{
                    width: 20 + Math.random() * 20,
                    height: 20 + Math.random() * 20,
                    borderRadius: '50%'
                  }}
                />
              </div>
            ))}

            {/* 连接线 */}
            {[1, 2, 3, 4, 5].map((item) => (
              <div
                key={item}
                className="chart-skeleton-edge"
                style={{
                  left: `${Math.random() * 80}%`,
                  top: `${Math.random() * 80}%`,
                  width: `${20 + Math.random() * 40}%`,
                  transform: `rotate(${Math.random() * 360}deg)`
                }}
              />
            ))}
          </div>
        )

      case 'wordcloud':
        return (
          <div className="chart-skeleton-wordcloud">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((item) => (
              <Skeleton.Title
                key={item}
                style={{
                  width: `${30 + Math.random() * 80}px`,
                  height: `${12 + Math.random() * 16}px`,
                  position: 'absolute',
                  left: `${Math.random() * 80}%`,
                  top: `${Math.random() * 80}%`,
                  marginBottom: 0
                }}
              />
            ))}
          </div>
        )

      default:
        return (
          <Skeleton
            placeholder={
              <Skeleton.Image
                style={{
                  width: '100%',
                  height: '100%'
                }}
              />
            }
            loading={true}
          />
        )
    }
  }

  return (
    <div className={`chart-skeleton chart-skeleton-${type} ${className}`} style={containerStyle}>
      {renderChartSkeleton()}
    </div>
  )
}

export default ChartSkeleton

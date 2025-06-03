import React from 'react'
import { Skeleton, Card, Row, Col, Space } from '@douyinfe/semi-ui'
import ChartSkeleton from './ChartSkeleton'
import './skeleton.css'

interface DataAnalysisSkeletonProps {
  className?: string
  style?: React.CSSProperties
}

const DataAnalysisSkeleton: React.FC<DataAnalysisSkeletonProps> = ({
  className = '',
  style = {}
}) => {
  return (
    <div className={`data-analysis-skeleton ${className}`} style={style}>
      {/* 页面标题和操作按钮 */}
      <div className="data-analysis-skeleton-header">
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Skeleton.Title style={{ width: 200, height: 28, marginBottom: 0 }} />
          <Space>
            <Skeleton.Button style={{ width: 100, height: 32 }} />
            <Skeleton.Button style={{ width: 80, height: 32 }} />
          </Space>
        </Space>
      </div>

      {/* 统计卡片区域 */}
      <Row gutter={16} style={{ marginTop: 24, marginBottom: 24 }}>
        {[1, 2, 3, 4].map((item) => (
          <Col span={6} key={item}>
            <Card className="data-analysis-skeleton-stat-card">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Skeleton.Title style={{ width: '70%', height: 16, marginBottom: 8 }} />
                <Skeleton.Title style={{ width: '50%', height: 32, marginBottom: 0 }} />
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 图表区域 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card title={<Skeleton.Title style={{ width: 120, height: 20, marginBottom: 0 }} />}>
            <ChartSkeleton type="line" height={300} />
          </Card>
        </Col>
        <Col span={12}>
          <Card title={<Skeleton.Title style={{ width: 100, height: 20, marginBottom: 0 }} />}>
            <ChartSkeleton type="pie" height={300} />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card title={<Skeleton.Title style={{ width: 80, height: 20, marginBottom: 0 }} />}>
            <ChartSkeleton type="bar" height={250} />
          </Card>
        </Col>
        <Col span={16}>
          <Card title={<Skeleton.Title style={{ width: 140, height: 20, marginBottom: 0 }} />}>
            <ChartSkeleton type="graph" height={250} />
          </Card>
        </Col>
      </Row>

      {/* 分析结果区域 */}
      <Card
        title={<Skeleton.Title style={{ width: 100, height: 20, marginBottom: 0 }} />}
        className="data-analysis-skeleton-result"
      >
        <Row gutter={16}>
          <Col span={12}>
            <div className="data-analysis-skeleton-section">
              <Skeleton.Title style={{ width: '60%', height: 18, marginBottom: 12 }} />
              <Skeleton.Paragraph rows={3} style={{ marginBottom: 20 }} />

              <Skeleton.Title style={{ width: '50%', height: 18, marginBottom: 12 }} />
              <Skeleton.Paragraph rows={2} style={{ marginBottom: 20 }} />
            </div>
          </Col>
          <Col span={12}>
            <div className="data-analysis-skeleton-section">
              <Skeleton.Title style={{ width: '70%', height: 18, marginBottom: 12 }} />
              <Skeleton.Paragraph rows={4} style={{ marginBottom: 20 }} />

              {/* 建议列表模拟 */}
              <Skeleton.Title style={{ width: '40%', height: 18, marginBottom: 12 }} />
              <div className="data-analysis-skeleton-list">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="data-analysis-skeleton-list-item">
                    <Skeleton.Avatar
                      size="small"
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        marginRight: 8,
                        marginTop: 6
                      }}
                    />
                    <Skeleton.Title
                      style={{
                        width: `${60 + Math.random() * 30}%`,
                        height: 16,
                        marginBottom: 8
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  )
}

export default DataAnalysisSkeleton

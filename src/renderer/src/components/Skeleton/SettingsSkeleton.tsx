import React from 'react'
import { Skeleton, Card, Row, Col, Space, Divider } from '@douyinfe/semi-ui'
import './skeleton.css'

interface SettingsSkeletonProps {
  className?: string
  style?: React.CSSProperties
  sectionCount?: number
}

const SettingsSkeleton: React.FC<SettingsSkeletonProps> = ({
  className = '',
  style = {},
  sectionCount = 4
}) => {
  return (
    <div className={`settings-skeleton ${className}`} style={style}>
      {/* 页面标题 */}
      <div className="settings-skeleton-header">
        <Skeleton.Title style={{ width: 150, height: 32, marginBottom: 16 }} />
      </div>

      {/* 设置选项卡 */}
      <div className="settings-skeleton-tabs">
        <Space size="large">
          {[1, 2, 3, 4].map((tab) => (
            <Skeleton.Button key={tab} style={{ width: 80, height: 32 }} />
          ))}
        </Space>
        <Divider style={{ margin: '16px 0' }} />
      </div>

      {/* 设置内容 */}
      <div className="settings-skeleton-content">
        {Array.from({ length: sectionCount }, (_, index) => (
          <Card key={index} style={{ marginBottom: 16 }}>
            <div className="settings-skeleton-section">
              {/* 部分标题 */}
              <Space
                style={{
                  width: '100%',
                  justifyContent: 'space-between',
                  marginBottom: 16
                }}
              >
                <Skeleton.Title style={{ width: 120, height: 20, marginBottom: 0 }} />
                <Skeleton.Button style={{ width: 60, height: 28 }} />
              </Space>

              {/* 设置项目 */}
              {Array.from({ length: 2 + Math.floor(Math.random() * 3) }, (_, itemIndex) => (
                <Row key={itemIndex} style={{ marginBottom: 20 }}>
                  <Col span={8}>
                    <div className="settings-skeleton-label">
                      <Skeleton.Title style={{ width: '80%', height: 16, marginBottom: 4 }} />
                      <Skeleton.Paragraph rows={1} style={{ width: '90%', fontSize: '12px' }} />
                    </div>
                  </Col>
                  <Col span={16}>
                    <div className="settings-skeleton-control">
                      {itemIndex % 3 === 0 && <Skeleton.Button style={{ width: 60, height: 28 }} />}
                      {itemIndex % 3 === 1 && (
                        <Skeleton.Title style={{ width: 200, height: 32, marginBottom: 0 }} />
                      )}
                      {itemIndex % 3 === 2 && (
                        <Space>
                          <Skeleton.Button style={{ width: 120, height: 32 }} />
                          <Skeleton.Button style={{ width: 80, height: 32 }} />
                        </Space>
                      )}
                    </div>
                  </Col>
                </Row>
              ))}
            </div>
          </Card>
        ))}

        {/* 底部操作按钮 */}
        <div className="settings-skeleton-actions">
          <Space>
            <Skeleton.Button style={{ width: 80, height: 36 }} />
            <Skeleton.Button style={{ width: 100, height: 36 }} />
            <Skeleton.Button style={{ width: 60, height: 36 }} />
          </Space>
        </div>
      </div>
    </div>
  )
}

export default SettingsSkeleton

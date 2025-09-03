import React, { useState, useEffect } from 'react'
import { Typography, Card, Divider, Tabs, Button, Space } from '@douyinfe/semi-ui'
import { IconCloud, IconServer } from '@douyinfe/semi-icons'
import CloudStorageSettings from './CloudStorageSettings'
import VectorDatabaseManager from './VectorDatabaseManager'
import './Settings.css'
import {
  LanguageSettings,
  UpdateSettings,
  HistoryManagementSettings,
  ApiConfigSection,
  EmbeddingConfigSection,
  PerformanceMonitorSection
} from './Settings/index'
import { SettingsSkeleton } from './Skeleton'

const { Title, Text } = Typography

const Settings: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true)
  const [isVectorManagerOpen, setIsVectorManagerOpen] = useState(false)
  
  // 添加WebDAV同步完成回调
  const handleSyncComplete = (): void => {}

  // 模拟设置页面加载
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  // 显示骨架屏
  if (isLoading) {
    return <SettingsSkeleton />
  }

  return (
    <div className="settings-container">
      <div className="settings-body">
        <Tabs className="settings-tabs" type="card">
          {/* 通用设置标签 */}
          <Tabs.TabPane tab={<span className="tab-label">通用设置</span>} itemKey="general">
            <div className="tab-content">
              <LanguageSettings />
              <UpdateSettings />
              <HistoryManagementSettings />
            </div>
          </Tabs.TabPane>

          {/* AI API配置标签 */}
          <Tabs.TabPane tab={<span className="tab-label">AI 配置</span>} itemKey="api">
            <ApiConfigSection />
          </Tabs.TabPane>

          {/* 同步设置标签 */}
          <Tabs.TabPane tab={<span className="tab-label">同步设置</span>} itemKey="sync">
            <div className="tab-content">
              <Card className="settings-card animated-card">
                <div className="card-header">
                  <div className="card-icon-wrapper sync-icon">
                    <IconCloud size="large" />
                  </div>
                  <div className="card-content">
                    <Title heading={6}>云存储同步</Title>
                    <Text type="tertiary" className="card-description">
                      配置多种云存储服务实现数据同步
                    </Text>
                  </div>
                </div>
                <Divider className="settings-divider" />
                <CloudStorageSettings onSyncComplete={handleSyncComplete} />
              </Card>
            </div>
          </Tabs.TabPane>

          {/* 性能监控标签 */}
          <Tabs.TabPane tab={<span className="tab-label">性能监控</span>} itemKey="performance">
            <PerformanceMonitorSection />
          </Tabs.TabPane>

          {/* RAG设置标签 */}
          <Tabs.TabPane tab={<span className="tab-label">RAG设置</span>} itemKey="rag">
            <div className="tab-content">
              <Card className="settings-card animated-card">
                <div className="card-header">
                  <div className="card-icon-wrapper">
                    <IconServer size="large" style={{ color: 'var(--semi-color-primary)' }} />
                  </div>
                  <div className="card-content">
                    <Title heading={6}>Embedding模型配置</Title>
                    <Text type="tertiary" className="card-description">
                      配置向量化模型接口，用于文档向量化和智能检索
                    </Text>
                  </div>
                </div>
                <Divider className="settings-divider" />
                <EmbeddingConfigSection />
              </Card>
              
              <Card className="settings-card animated-card" style={{ marginTop: '16px' }}>
                <div className="card-header">
                  <div className="card-icon-wrapper">
                    <IconServer size="large" style={{ color: 'var(--semi-color-primary)' }} />
                  </div>
                  <div className="card-content">
                    <Title heading={6}>向量数据库管理</Title>
                    <Text type="tertiary" className="card-description">
                      管理本地文档的向量化和智能检索功能
                    </Text>
                  </div>
                </div>
                <Divider className="settings-divider" />
                <Space vertical style={{ width: '100%' }}>
                  <Button
                    icon={<IconServer />}
                    onClick={() => setIsVectorManagerOpen(true)}
                    type="primary"
                    style={{ marginBottom: '12px' }}
                  >
                    打开向量数据库管理器
                  </Button>
                  <Text size="small" type="tertiary">
                    通过向量数据库管理器可以：
                  </Text>
                  <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
                    <li><Text size="small" type="tertiary">初始化和配置向量数据库</Text></li>
                    <li><Text size="small" type="tertiary">批量向量化本地文档</Text></li>
                    <li><Text size="small" type="tertiary">查看数据库状态和统计信息</Text></li>
                    <li><Text size="small" type="tertiary">管理向量化数据</Text></li>
                  </ul>
                  <Text size="small" type="warning">
                    ⚠️ 向量化功能需要配置有效的Embedding API
                  </Text>
                </Space>
              </Card>
            </div>
          </Tabs.TabPane>
        </Tabs>

        {/* 向量数据库管理器模态框 */}
        <VectorDatabaseManager
          visible={isVectorManagerOpen}
          onClose={() => setIsVectorManagerOpen(false)}
        />
      </div>
    </div>
  )
}

export default Settings

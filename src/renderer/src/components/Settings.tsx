import React from 'react'
import { Typography, Card, Divider, Tabs } from '@douyinfe/semi-ui'
import { IconCloud } from '@douyinfe/semi-icons'
import CloudStorageSettings from './CloudStorageSettings'
import './Settings.css'
import {
  LanguageSettings,
  UpdateSettings,
  HistoryManagementSettings,
  ApiConfigSection,
  PerformanceMonitorSection
} from './Settings/index'

const { Title, Text } = Typography

const Settings: React.FC = () => {

  // 添加WebDAV同步完成回调
  const handleSyncComplete = (): void => {}


  return (
    <div className="settings-container">
      <div className="settings-body">
        <Tabs className="settings-tabs" type="card">
          {/* 通用设置标签 */}
          <Tabs.TabPane
            tab={
              <span className="tab-label">
                通用设置
              </span>
            }
            itemKey="general"
          >
            <div className="tab-content">
              <LanguageSettings />
              <UpdateSettings />
              <HistoryManagementSettings />
            </div>
          </Tabs.TabPane>

          {/* AI API配置标签 */}
          <Tabs.TabPane
            tab={
              <span className="tab-label">
                AI 配置
              </span>
            }
            itemKey="api"
          >
            <ApiConfigSection />
          </Tabs.TabPane>

          {/* 同步设置标签 */}
          <Tabs.TabPane
            tab={
              <span className="tab-label">
                同步设置
              </span>
            }
            itemKey="sync"
          >
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
        </Tabs>
      </div>

    </div>
  )
}

export default Settings

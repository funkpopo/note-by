import React, { useState, useCallback, useEffect } from 'react'
import {
  Typography,
  Card,
  Divider,
  Button,
  Toast,
  Form,
  Radio,
  Space,
  Tag
} from '@douyinfe/semi-ui'
import { IconHistogram, IconInfoCircle } from '@douyinfe/semi-icons'
import { useLanguage } from '../../locales'

const { Title, Text } = Typography

interface HistoryManagementSettings {
  type: 'count' | 'time'
  maxCount: number
  maxDays: number
}

const HistoryManagementSettings: React.FC = () => {
  const { t } = useLanguage()
  const [historyManagement, setHistoryManagement] = useState<HistoryManagementSettings>({
    type: 'count',
    maxCount: 20,
    maxDays: 7
  })

  const loadSettings = useCallback(async (): Promise<void> => {
    try {
      const settings = await window.api.settings.getAll()
      if (settings.historyManagement) {
        setHistoryManagement(settings.historyManagement as HistoryManagementSettings)
      }
    } catch {
      Toast.error('加载历史记录设置失败')
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const saveHistoryManagement = async (): Promise<void> => {
    try {
      const settingsToSave = {
        type: historyManagement.type,
        maxCount: historyManagement.type === 'count' ? historyManagement.maxCount : 20,
        maxDays: historyManagement.type === 'time' ? historyManagement.maxDays : 7
      }

      await window.api.settings.set('historyManagement', settingsToSave)
      Toast.success('历史记录管理设置已保存')
    } catch {
      Toast.error('保存历史记录管理设置失败')
    }
  }

  const handleHistoryTypeChange = (
    e: { target: { value: 'count' | 'time' } } | 'count' | 'time'
  ): void => {
    const newType = typeof e === 'object' && 'target' in e ? e.target.value : e
    setHistoryManagement({
      ...historyManagement,
      type: newType
    })
  }

  const handleMaxCountChange = (value: string | number): void => {
    const numValue = typeof value === 'string' ? parseInt(value, 10) : value
    if (!isNaN(numValue) && numValue > 0) {
      setHistoryManagement({
        ...historyManagement,
        maxCount: numValue
      })
    }
  }

  const handleMaxDaysChange = (value: string | number): void => {
    const numValue = typeof value === 'string' ? parseInt(value, 10) : value
    if (!isNaN(numValue) && numValue > 0) {
      setHistoryManagement({
        ...historyManagement,
        maxDays: numValue
      })
    }
  }

  return (
    <Card className="settings-card animated-card">
      <div className="card-header">
        <div className="card-icon-wrapper history-icon">
          <IconHistogram size="large" />
        </div>
        <div className="card-content">
          <Title heading={6}>{t('settings.history.title')}</Title>
          <Text type="tertiary" className="card-description">
            配置历史记录的保留策略
          </Text>
        </div>
        <Button type="primary" theme="solid" onClick={saveHistoryManagement} className="save-btn">
          保存设置
        </Button>
      </div>
      <Divider className="settings-divider" />
      <div className="history-settings-content">
        <Form className="history-form">
          <Form.RadioGroup
            field="historyType"
            label="保留方式"
            initValue={historyManagement.type}
            onChange={handleHistoryTypeChange}
            className="radio-group-modern"
          >
            <Radio value="count" className="radio-option">
              <Space>
                <span>按数量保留</span>
                <Tag size="small" color="blue">
                  推荐
                </Tag>
              </Space>
            </Radio>
            <Radio value="time" className="radio-option">
              按时间保留
            </Radio>
          </Form.RadioGroup>

          <div className="form-input-section">
            {historyManagement.type === 'count' && (
              <Form.InputNumber
                field="maxCount"
                label="保留记录数"
                initValue={historyManagement.maxCount}
                onChange={handleMaxCountChange}
                min={1}
                max={1000}
                step={1}
                className="modern-input"
                suffix="条"
              />
            )}

            {historyManagement.type === 'time' && (
              <Form.InputNumber
                field="maxDays"
                label="保留天数"
                initValue={historyManagement.maxDays}
                onChange={handleMaxDaysChange}
                min={1}
                max={365}
                step={1}
                suffix="天"
                className="modern-input"
              />
            )}
          </div>

          <div className="info-box">
            <IconInfoCircle className="info-icon" />
            <Text type="tertiary" size="small">
              {historyManagement.type === 'count'
                ? `系统将为每个文件保留最近的 ${historyManagement.maxCount} 条历史记录`
                : `系统将自动清理 ${historyManagement.maxDays} 天前的历史记录`}
            </Text>
          </div>
        </Form>
      </div>
    </Card>
  )
}

export default HistoryManagementSettings

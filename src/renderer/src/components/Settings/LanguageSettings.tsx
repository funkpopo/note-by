import React from 'react'
import { Typography, Card, Select, Space } from '@douyinfe/semi-ui'
import { IconLanguage } from '@douyinfe/semi-icons'
import { useLanguage } from '../../locales'

const { Title, Text } = Typography

const LanguageSettings: React.FC = () => {
  const { language, setLanguage, t } = useLanguage()

  return (
    <Card className="settings-card animated-card">
      <div className="card-header">
        <div className="card-icon-wrapper language-icon">
          <IconLanguage size="large" />
        </div>
        <div className="card-content">
          <Title heading={6}>{t('settings.language.title')}</Title>
          <Text type="tertiary" className="card-description">
            {t('settings.language.description')}
          </Text>
        </div>
        <div className="card-action">
          <Select
            value={language}
            onChange={(value) => setLanguage(value as 'zh-CN' | 'en-US')}
            className="language-select"
            size="large"
          >
            <Select.Option value="zh-CN">
              <Space>
                <span className="language-flag">🇨🇳</span>
                <span>简体中文</span>
              </Space>
            </Select.Option>
            <Select.Option value="en-US">
              <Space>
                <span className="language-flag">🇺🇸</span>
                <span>English</span>
              </Space>
            </Select.Option>
          </Select>
        </div>
      </div>
    </Card>
  )
}

export default LanguageSettings

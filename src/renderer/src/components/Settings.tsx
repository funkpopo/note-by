import React from 'react'
import { Typography, Card, Switch, Divider } from '@douyinfe/semi-ui'
import { IconMoon, IconSun } from '@douyinfe/semi-icons'
import { useTheme } from '../context/theme/useTheme'

const { Title, Paragraph, Text } = Typography

const Settings: React.FC = () => {
  const { isDarkMode, toggleTheme } = useTheme()

  return (
    <div>
      <Title heading={5}>设置</Title>
      <Card style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Text strong>主题模式</Text>
            <Paragraph spacing="normal" type="tertiary">
              {isDarkMode ? '当前使用深色主题' : '当前使用浅色主题'}
            </Paragraph>
          </div>
          <Switch
            onChange={toggleTheme}
            checked={isDarkMode}
            checkedText={<IconMoon style={{ fontSize: '16px' }} />}
            uncheckedText={<IconSun style={{ fontSize: '16px' }} />}
            size="large"
            style={{ marginLeft: '16px' }}
          />
        </div>
        <Divider />
        <Paragraph type="tertiary" style={{ fontSize: '13px' }}>
          主题设置会自动保存，下次打开应用时会保持您的选择
        </Paragraph>
      </Card>
    </div>
  )
}

export default Settings

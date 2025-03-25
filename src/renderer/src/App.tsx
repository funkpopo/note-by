import React, { useState } from 'react'
import { Layout } from '@douyinfe/semi-ui'
import Navigation from './components/Navigation'
import Settings from './components/Settings'
import EditorComponent from './components/Editor'

const App: React.FC = () => {
  const { Content } = Layout
  const [currentView, setCurrentView] = useState('Editor')

  const handleNavChange = (key: string): void => {
    setCurrentView(key)
  }

  const renderContent = (): React.ReactNode => {
    switch (currentView) {
      case 'Settings':
        return <Settings />
      case 'Editor':
        return <EditorComponent />
      default:
        return <div>分组管理内容</div>
    }
  }

  return (
    <Layout className="components-layout-demo" style={{ height: '100%', overflow: 'hidden' }}>
      <Layout style={{ flexDirection: 'row', height: '100%' }}>
        <div style={{ display: 'flex', flexShrink: 0 }}>
          <Navigation onNavChange={handleNavChange} />
        </div>
        <Layout style={{ flex: 1, minWidth: 0, height: '100%', overflow: 'hidden' }}>
          <Content
            style={{
              height: '100%',
              width: '100%',
              padding: 24,
              background: 'var(--semi-color-bg-0)',
              position: 'relative'
            }}
          >
            {renderContent()}
          </Content>
        </Layout>
      </Layout>
    </Layout>
  )
}

export default App

import React, { useState, Suspense } from 'react'
import { Layout } from '@douyinfe/semi-ui'
import Navigation from './components/Navigation'
import {
  LazySettings,
  LazyEditor,
  LazyDataAnalysis,
  LazyMindMapPage,
  LazyChatInterface,
  SettingsLoader,
  EditorLoader,
  DataAnalysisLoader,
  MindMapLoader,
  ChatLoader
} from './components/LazyComponents'

const App: React.FC = () => {
  const { Content } = Layout
  const [currentView, setCurrentView] = useState('Editor')
  const [currentFolder, setCurrentFolder] = useState<string | undefined>(undefined)
  const [currentFile, setCurrentFile] = useState<string | undefined>(undefined)
  const [fileListVersion, setFileListVersion] = useState(0)

  const handleNavChange = (key: string): void => {
    setCurrentView(key)
  }

  // 处理文件选择事件
  const handleFileSelect = (folder: string, file: string): void => {
    setCurrentFolder(folder)
    setCurrentFile(file)
    setCurrentView('Editor') // 确保切换到编辑器视图
  }

  // 文件内容变更后触发刷新
  const handleFileChanged = (): void => {
    setFileListVersion((prev) => prev + 1)
  }

  const renderContent = (): React.ReactNode => {
    switch (currentView) {
      case 'Settings':
        return (
          <Suspense fallback={<SettingsLoader />}>
            <LazySettings />
          </Suspense>
        )
      case 'Editor':
        return (
          <Suspense fallback={<EditorLoader />}>
            <LazyEditor
              currentFolder={currentFolder}
              currentFile={currentFile}
              onFileChanged={handleFileChanged}
            />
          </Suspense>
        )
      case 'DataAnalysis':
        return (
          <Suspense fallback={<DataAnalysisLoader />}>
            <LazyDataAnalysis />
          </Suspense>
        )
      case 'MindMap':
        return (
          <Suspense fallback={<MindMapLoader />}>
            <LazyMindMapPage />
          </Suspense>
        )
      case 'Chat':
        return (
          <Suspense fallback={<ChatLoader />}>
            <LazyChatInterface />
          </Suspense>
        )
      default:
        return <div>分组管理内容</div>
    }
  }

  return (
    <Layout
      className="components-layout-demo"
      style={{ height: '100vh', width: '100vw', overflow: 'hidden' }}
    >
      <Layout style={{ flexDirection: 'row', height: '100vh', width: '100vw' }}>
        <div style={{ display: 'flex', height: '100vh', position: 'relative' }}>
          <Navigation
            onNavChange={handleNavChange}
            onFileSelect={handleFileSelect}
            fileListVersion={fileListVersion}
          />
        </div>
        <Layout style={{ flex: 1, minWidth: 0, height: '100vh', overflow: 'hidden' }}>
          <Content
            style={{
              height: '100vh',
              width: '100%',
              padding: 24,
              background: 'var(--semi-color-bg-0)',
              position: 'relative',
              overflow: 'hidden'
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

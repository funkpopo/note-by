import React, { useState, useEffect } from 'react'
import { Layout } from '@douyinfe/semi-ui'
import Navigation from './components/Navigation'
import { StreamingOverlayProvider } from './components/StreamingOverlayContext'
import { performanceMonitor } from './utils/PerformanceMonitor'
import {
  SmartDataAnalysis,
  SmartMindMap,
  SmartChat,
  SmartSettings,
  withLazyLoad,
  LazyEditor,
  EditorLoader
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

  // 处理文件删除事件
  const handleFileDeleted = (folder: string, file: string): void => {
    // 如果删除的是当前打开的文件，清除当前文件状态
    if (currentFolder === folder && currentFile === file) {
      setCurrentFolder(undefined)
      setCurrentFile(undefined)
    }
  }

  // 启动性能监控
  useEffect(() => {
    // 启动性能监控并立即执行首次数据收集
    performanceMonitor.startMonitoring(true)

    // 组件卸载时清理性能监控
    return () => {
      performanceMonitor.cleanup()
    }
  }, [])

  // 监听来自主进程的导航事件
  useEffect(() => {
    const removeListener = window.api.navigation.onNavigate((viewKey: string) => {
      // 收到导航事件: viewKey
      handleNavChange(viewKey)
    })

    // 组件卸载时移除监听器
    return removeListener
  }, [])

  const renderContent = (): React.ReactNode => {
    switch (currentView) {
      case 'Settings':
        return <SmartSettings />
      case 'Editor':
        // Editor 需要特殊处理，因为它需要传递 props
        const EditorWithLazy = withLazyLoad(LazyEditor, EditorLoader)
        return (
          <EditorWithLazy
            currentFolder={currentFolder}
            currentFile={currentFile}
            onFileChanged={handleFileChanged}
          />
        )
      case 'DataAnalysis':
        return <SmartDataAnalysis />
      case 'MindMap':
        return <SmartMindMap />
      case 'Chat':
        return <SmartChat />
      default:
        return <div>分组管理内容</div>
    }
  }

  return (
    <StreamingOverlayProvider>
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
              onFileDeleted={handleFileDeleted}
              currentView={currentView}
            />
          </div>
          <Layout style={{ flex: 1, minWidth: 0, height: '100vh', overflow: 'hidden' }}>
            <Content
              style={{
                height: '100vh',
                width: '100%',
                padding: 0,
                background: 'var(--semi-color-bg-0)',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {renderContent()}
            </Content>
          </Layout>
        </Layout>
      </Layout>
    </StreamingOverlayProvider>
  )
}

export default App

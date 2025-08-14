import React, { useState, Suspense, useEffect } from 'react'
import { Layout } from '@douyinfe/semi-ui'
import Navigation from './components/Navigation'
import { performanceMonitor } from './utils/PerformanceMonitor'
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
  ChatLoader,
  SmartDataAnalysis,
  SmartMindMap,
  SmartChat,
  SmartSettings
} from './components/LazyComponents'
// 导入渲染优化器
import { scheduleRenderTask } from './utils/RenderOptimizer'

const App: React.FC = () => {
  const { Content } = Layout
  const [currentView, setCurrentView] = useState('Editor')
  const [currentFolder, setCurrentFolder] = useState<string | undefined>(undefined)
  const [currentFile, setCurrentFile] = useState<string | undefined>(undefined)
  const [fileListVersion, setFileListVersion] = useState(0)
  const [useSmartPreloading] = useState(true)

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

  // 启动性能监控和智能预加载
  useEffect(() => {
    // 启动性能监控并立即执行首次数据收集
    performanceMonitor.startMonitoring(true)

    // 基于用户行为的智能预加载
    if (useSmartPreloading) {
      const preloadComponents = async () => {
        // 延迟预加载常用组件
        await scheduleRenderTask({
          id: 'smart-preload-strategy',
          priority: 'low',
          callback: async () => {
            // 根据当前视图预测下一个可能访问的组件
            switch (currentView) {
              case 'Editor':
                // 编辑器用户可能会访问数据分析
                scheduleRenderTask({
                  id: 'preload-dataanalysis-from-editor',
                  priority: 'low',
                  callback: async () => {
                    await LazyDataAnalysis
                  }
                })
                break
              case 'DataAnalysis':
                // 数据分析用户可能会返回编辑器或查看思维导图
                scheduleRenderTask({
                  id: 'preload-mindmap-from-analysis',
                  priority: 'low',
                  callback: async () => {
                    await LazyMindMapPage
                  }
                })
                break
            }
          }
        })
      }

      // 延迟5秒后开始预加载，避免影响初始加载性能
      const timer = setTimeout(preloadComponents, 5000)

      // 组件卸载时清理性能监控
      return () => {
        clearTimeout(timer)
        performanceMonitor.cleanup()
      }
    } else {
      return () => {
        performanceMonitor.cleanup()
      }
    }
  }, [currentView, useSmartPreloading])

  // 监听来自主进程的导航事件
  useEffect(() => {
    const removeListener = window.api.navigation.onNavigate((viewKey: string) => {
      console.log('收到导航事件:', viewKey)
      handleNavChange(viewKey)
    })

    // 组件卸载时移除监听器
    return removeListener
  }, [])

  const renderContent = (): React.ReactNode => {
    // 根据设置选择是否使用智能预加载
    if (useSmartPreloading) {
      switch (currentView) {
        case 'Settings':
          return <SmartSettings />
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
          return <SmartDataAnalysis />
        case 'MindMap':
          return <SmartMindMap />
        case 'Chat':
          return <SmartChat />
        default:
          return <div>分组管理内容</div>
      }
    } else {
      // 传统懒加载方式
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
  )
}

export default App

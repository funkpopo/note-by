import React, { lazy, Suspense } from 'react'
import { Spin } from '@douyinfe/semi-ui'
// 导入渲染优化器
import { scheduleRenderTask } from '../utils/RenderOptimizer'

// 懒加载组件定义
export const LazyDataAnalysis = lazy(() => import('./DataAnalysis'))
export const LazyMindMapPage = lazy(() => import('./MindMapPage'))
export const LazyEditor = lazy(() => import('./Editor'))
export const LazyChatInterface = lazy(() => import('./ChatInterface'))
export const LazySettings = lazy(() => import('./Settings'))

// 通用加载组件
export const ComponentLoader: React.FC<{
  height?: string | number
  text?: string
}> = ({ height = '400px', text = '组件加载中...' }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height,
      flexDirection: 'column',
      gap: '12px'
    }}
  >
    <Spin size="large" />
    <span style={{ color: 'var(--semi-color-text-2)' }}>{text}</span>
  </div>
)

// 特定组件的加载状态
export const DataAnalysisLoader: React.FC = () => (
  <ComponentLoader height="600px" text="数据分析组件加载中..." />
)

export const EditorLoader: React.FC = () => (
  <ComponentLoader height="100vh" text="编辑器加载中..." />
)

export const MindMapLoader: React.FC = () => (
  <ComponentLoader height="100vh" text="思维导图加载中..." />
)

export const ChatLoader: React.FC = () => (
  <ComponentLoader height="500px" text="AI聊天界面加载中..." />
)

export const SettingsLoader: React.FC = () => (
  <ComponentLoader height="400px" text="设置页面加载中..." />
)

// 智能预加载容器组件
export const SmartPreloadContainer: React.FC<{
  componentKey: string
  Component: React.LazyExoticComponent<React.ComponentType<any>>
  Loader: React.ComponentType
  priority?: 'high' | 'medium' | 'low'
  preloadDelay?: number
  children?: React.ReactNode
}> = ({ componentKey, Component, Loader, priority = 'low', preloadDelay = 2000, children }) => {
  const [isPreloaded, setIsPreloaded] = React.useState(false)

  React.useEffect(() => {
    // 延迟预加载组件
    const preloadComponent = async () => {
      try {
        await scheduleRenderTask({
          id: `preload-${componentKey}`,
          priority,
          callback: async () => {
            // 预加载组件模块
            await (Component as any)._payload?._result?.catch?.(() => {})
            // 触发组件加载
            await Component
            setIsPreloaded(true)
          }
        })
      } catch (error) {
        // Failed to preload component
      }
    }

    const timer = setTimeout(preloadComponent, preloadDelay)
    return () => clearTimeout(timer)
  }, [componentKey, Component, priority, preloadDelay])

  return (
    <Suspense
      fallback={
        <div style={{ position: 'relative' }}>
          <Loader />
          {isPreloaded && (
            <div
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                fontSize: 12,
                color: 'var(--semi-color-success)',
                background: 'var(--semi-color-success-light-default)',
                padding: '2px 6px',
                borderRadius: 4
              }}
            >
              ✓ 预加载完成
            </div>
          )}
        </div>
      }
    >
      <Component>{children}</Component>
    </Suspense>
  )
}

// 导出预配置的智能预加载组件
export const SmartDataAnalysis: React.FC = () => (
  <SmartPreloadContainer
    componentKey="DataAnalysis"
    Component={LazyDataAnalysis}
    Loader={DataAnalysisLoader}
    priority="medium"
    preloadDelay={1000}
  />
)

export const SmartMindMap: React.FC = () => (
  <SmartPreloadContainer
    componentKey="MindMap"
    Component={LazyMindMapPage}
    Loader={MindMapLoader}
    priority="low"
    preloadDelay={3000}
  />
)

export const SmartChat: React.FC = () => (
  <SmartPreloadContainer
    componentKey="Chat"
    Component={LazyChatInterface}
    Loader={ChatLoader}
    priority="low"
    preloadDelay={2000}
  />
)

export const SmartSettings: React.FC = () => (
  <SmartPreloadContainer
    componentKey="Settings"
    Component={LazySettings}
    Loader={SettingsLoader}
    priority="medium"
    preloadDelay={1500}
  />
)

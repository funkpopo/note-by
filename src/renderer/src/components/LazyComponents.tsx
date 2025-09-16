import React, { lazy, Suspense } from 'react'
import { Spin } from '@douyinfe/semi-ui'

// 主要组件懒加载
export const LazyDataAnalysis = lazy(() => import('./DataAnalysis'))
export const LazyMindMapPage = lazy(() => import('./MindMapPage'))
export const LazyEditor = lazy(() => import('./Editor'))
export const LazyChatInterface = lazy(() => import('./ChatInterface'))
export const LazySettings = lazy(() => import('./Settings'))

// 小型组件懒加载
export const LazyDiffViewer = lazy(() => import('./DiffViewer'))
export const LazyVirtualList = lazy(() => import('./VirtualList'))
export const LazySlashMenu = lazy(() => import('./SlashMenu'))
export const LazyHighlightColorPicker = lazy(() => import('./HighlightColorPicker'))
export const LazyWebDAVSettings = lazy(() => import('./WebDAVSettings'))
export const LazyCustomDropdown = lazy(() => import('./CustomDropdown'))
export const LazyPasswordPrompt = lazy(() => import('./PasswordPrompt'))
export const LazyMessageRenderer = lazy(() => import('./MessageRenderer'))
export const LazyVirtualScrollEditor = lazy(() => import('./VirtualScrollEditor'))

// 对话框组件懒加载
export const LazyConfirmDialog = lazy(() => import('./ConfirmDialog'))
export const LazyRenameDialog = lazy(() => import('./RenameDialog'))
export const LazyCreateDialog = lazy(() => import('./CreateDialog'))

// 下拉菜单组件懒加载
export const LazyHistoryDropdown = lazy(() => import('./HistoryDropdown'))
export const LazyCustomHistoryDropdown = lazy(() => import('./CustomHistoryDropdown'))

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

// 小型组件加载器
export const SmallComponentLoader: React.FC<{ text?: string }> = ({ text = '组件加载中...' }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '40px',
      fontSize: '12px',
      color: 'var(--semi-color-text-2)'
    }}
  >
    <Spin size="small" style={{ marginRight: '8px' }} />
    {text}
  </div>
)

// 简化的包装组件，使用 React 内置的 Suspense
export const withLazyLoad = <P extends object>(
  Component: React.LazyExoticComponent<React.ComponentType<P>>,
  Loader: React.FC = ComponentLoader
): React.FC<P> => {
  return (props: P) => (
    <Suspense fallback={<Loader />}>
      <Component {...props} />
    </Suspense>
  )
}

// 导出简化的懒加载组件（向后兼容）
export const SmartDataAnalysis = withLazyLoad(LazyDataAnalysis, DataAnalysisLoader)
export const SmartMindMap = withLazyLoad(LazyMindMapPage, MindMapLoader)
export const SmartChat = withLazyLoad(LazyChatInterface, ChatLoader)
export const SmartSettings = withLazyLoad(LazySettings, SettingsLoader)
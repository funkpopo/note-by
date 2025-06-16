import React, { lazy } from 'react'
import { Spin } from '@douyinfe/semi-ui'

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

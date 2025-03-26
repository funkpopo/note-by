import React, { useEffect, useRef, useContext } from 'react'
import Cherry from 'cherry-markdown'
import 'cherry-markdown/dist/cherry-markdown.css'
import { Button, Typography, Space, Tooltip } from '@douyinfe/semi-ui'
import { IconSave, IconCopy, IconEdit } from '@douyinfe/semi-icons'
import { ThemeContext } from '../context/theme/ThemeContext'
import './Editor.css'

const Editor: React.FC = () => {
  const editorRef = useRef<HTMLDivElement>(null)
  const cherryRef = useRef<Cherry | null>(null)
  const { isDarkMode } = useContext(ThemeContext) || { isDarkMode: false }

  // 修复编辑器工具栏样式，确保窄屏下不显示滚动条
  const fixEditorLayout = (): void => {
    setTimeout(() => {
      // 给布局变化一点时间后再修复样式
      const editorContainer = document.querySelector('.cherry-editor') as HTMLElement
      const toolbar = document.querySelector('.cherry-toolbar') as HTMLElement
      const toolbarContent = document.querySelector('.cherry-toolbar-content') as HTMLElement

      if (editorContainer) {
        editorContainer.style.overflow = 'hidden'
        editorContainer.style.maxWidth = '100%'
      }

      if (toolbar) {
        toolbar.style.overflow = 'visible'
        toolbar.style.height = 'auto'
        toolbar.style.minHeight = '40px'
        toolbar.style.flexWrap = 'wrap'
      }

      if (toolbarContent) {
        toolbarContent.style.overflow = 'visible'
        toolbarContent.style.height = 'auto'
        toolbarContent.style.flexWrap = 'wrap'
      }
    }, 100)
  }

  // 设置Cherry Markdown主题
  const updateCherryTheme = (isDark: boolean): void => {
    if (!cherryRef.current) return

    // 应用主题
    if (isDark) {
      cherryRef.current.setTheme('dark')
    } else {
      cherryRef.current.setTheme('light')
    }
  }

  useEffect((): (() => void) => {
    if (editorRef.current && !cherryRef.current) {
      cherryRef.current = new Cherry({
        id: 'cherry-markdown',
        value: '# 欢迎使用 Cherry Markdown 编辑器\n\n开始写作吧！',
        toolbars: {
          toolbar: [
            'bold',
            'italic',
            'underline',
            'strikethrough',
            'size',
            'color',
            '|',
            'header',
            'list',
            'checklist',
            'justify',
            'panel',
            '|',
            'quote',
            'hr',
            'code',
            'table',
            'graph',
            '|',
            'link',
            'image',
            '|',
            'togglePreview',
            'switchModel'
          ],
          sidebar: ['undo', 'redo', 'toc', 'export']
        },
        editor: {
          defaultModel: 'edit&preview',
          height: '100%'
        },
        callback: {
          afterChange: (): void => {
            // 编辑器内容变化后的回调
          },
          afterInit: (): void => {
            // 编辑器初始化后修复布局
            fixEditorLayout()
            // 初始化后设置主题
            updateCherryTheme(isDarkMode)
          }
        }
      })

      // 添加窗口大小变化监听，确保编辑器布局自适应
      window.addEventListener('resize', fixEditorLayout)
    }

    return () => {
      // 清理资源
      cherryRef.current = null
      window.removeEventListener('resize', fixEditorLayout)
    }
  })

  // 监听主题变化，更新Cherry Markdown主题
  useEffect(() => {
    updateCherryTheme(isDarkMode)
  }, [isDarkMode])

  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div className="editor-header">
        <div className="editor-title-container">
          <Typography.Title heading={4} style={{ margin: 0 }}>
            笔记编辑器
          </Typography.Title>
          <Typography.Text type="tertiary" style={{ marginLeft: '12px' }}>
            上次编辑: 2023年11月20日
          </Typography.Text>
        </div>
        <Space className="editor-actions">
          <Tooltip content="复制全文">
            <Button icon={<IconCopy />} type="tertiary" />
          </Tooltip>
          <Button icon={<IconEdit />} type="secondary">
            AI助手
          </Button>
          <Button icon={<IconSave />} type="primary">
            保存
          </Button>
        </Space>
      </div>
      <div
        id="cherry-markdown"
        ref={editorRef}
        style={{
          flexGrow: 1,
          overflow: 'hidden',
          borderTop: '1px solid var(--semi-color-border)'
        }}
      />
    </div>
  )
}

export default Editor

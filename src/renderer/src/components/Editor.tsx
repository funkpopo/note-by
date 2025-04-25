import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Typography, Button, Space, Toast, Spin } from '@douyinfe/semi-ui'
import { IconSave } from '@douyinfe/semi-icons'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView, Theme, darkDefaultTheme, lightDefaultTheme } from '@blocknote/mantine'
import '@blocknote/core/fonts/inter.css'
import '@blocknote/mantine/style.css'
import './Editor.css'

interface EditorProps {
  currentFolder?: string
  currentFile?: string
  onFileChanged?: () => void
}

const Editor: React.FC<EditorProps> = ({ currentFolder, currentFile, onFileChanged }) => {
  const [title, setTitle] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isEditing, setIsEditing] = useState<boolean>(false)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [editorContent, setEditorContent] = useState<string>('')
  const [editorKey, setEditorKey] = useState<string>('editor-0')
  const lastSavedContentRef = useRef<string>('')
  const lastLoadedFileRef = useRef<string | null>(null)

  // Create custom light theme with enhanced selection colors
  const customLightTheme: Theme = {
    ...lightDefaultTheme,
    colors: {
      ...lightDefaultTheme.colors,
      selected: {
        text: '#ffffff',
        background: 'var(--semi-color-primary)'
      },
      hovered: {
        text: '#3f3f3f',
        background: 'var(--semi-color-primary-light-default)'
      }
    }
  }

  // Create custom dark theme with enhanced selection colors
  const customDarkTheme: Theme = {
    ...darkDefaultTheme,
    colors: {
      ...darkDefaultTheme.colors,
      editor: {
        text: 'var(--semi-color-text-0)',
        background: 'var(--semi-color-bg-0)'
      },
      menu: {
        text: 'var(--semi-color-text-0)',
        background: 'var(--semi-color-bg-1)'
      },
      selected: {
        text: '#ffffff',
        background: 'var(--semi-color-primary)'
      },
      hovered: {
        text: 'var(--semi-color-text-0)',
        background: 'var(--semi-color-primary-light-default)'
      },
      border: 'var(--semi-color-border)'
    }
  }

  // Combined themes object for automatic switching
  const editorThemes = {
    light: customLightTheme,
    dark: customDarkTheme
  }

  // Create a new editor instance
  const editor = useCreateBlockNote({
    // Provide at least one default paragraph block
    initialContent: [
      {
        type: 'paragraph',
        content: ''
      }
    ]
  })

  // 清空编辑器内容的辅助函数
  const clearEditor = useCallback(() => {
    editor.replaceBlocks(editor.document, [
      {
        type: 'paragraph',
        content: ''
      }
    ])
    setEditorContent('')
    lastSavedContentRef.current = ''
    setIsEditing(false)
  }, [editor])

  // Load file content
  const loadFileContent = useCallback(async () => {
    // 检查必要的参数
    if (!currentFolder || !currentFile) {
      setTitle('')
      clearEditor()
      lastLoadedFileRef.current = null
      return
    }

    // 这里不再尝试使用TypeScript断言，逻辑上我们已经确认了值不为undefined
    const filePath = currentFolder + '/' + currentFile

    // 如果请求加载的文件与当前已加载文件相同，则不重新加载
    if (lastLoadedFileRef.current === filePath) {
      return
    }

    // 清空之前的内容
    clearEditor()

    setIsLoading(true)

    try {
      // 这里传入文件路径，即使TypeScript警告有未定义的可能性，我们知道这是安全的
      const result = await window.api.markdown.readFile(filePath)

      if (result.success && result.content !== undefined) {
        // 更新当前加载的文件路径
        lastLoadedFileRef.current = filePath

        // 存储内容
        setEditorContent(result.content)
        // 保存初始内容以供比较
        lastSavedContentRef.current = result.content

        // 生成新的key强制重新挂载编辑器
        setEditorKey(`editor-${Date.now()}`)

        // 从文件名设置标题
        setTitle(currentFile.replace('.md', ''))

        // 在下一个事件循环中延迟加载内容到编辑器
        // 这确保了组件状态已经更新
        setTimeout(async () => {
          try {
            // 确保content是字符串
            const content = result.content || ''
            const blocks = await editor.tryParseMarkdownToBlocks(content)
            editor.replaceBlocks(editor.document, blocks)
            setIsEditing(false)
          } catch (err) {
            console.error('解析Markdown内容失败:', err)
          }
        }, 0)
      } else {
        Toast.error('无法加载文件内容')
        lastLoadedFileRef.current = null
      }
    } catch (error) {
      console.error('加载文件内容失败:', error)
      Toast.error('加载文件内容失败')
      lastLoadedFileRef.current = null
    } finally {
      setIsLoading(false)
    }
  }, [currentFolder, currentFile, editor, clearEditor])

  // Effect to reset editor when the key changes
  useEffect(() => {
    if (editorContent && editor) {
      const loadContentToEditor = async (): Promise<void> => {
        const blocks = await editor.tryParseMarkdownToBlocks(editorContent)
        editor.replaceBlocks(editor.document, blocks)
      }
      loadContentToEditor()
    }
  }, [editorKey, editor, editorContent])

  // Load file when current file changes
  useEffect(() => {
    loadFileContent()
  }, [currentFolder, currentFile, loadFileContent])

  // Save file content
  const saveFileContent = useCallback(async () => {
    if (!currentFolder || !currentFile) {
      Toast.warning('没有选择文件')
      return
    }

    setIsSaving(true)
    try {
      // Convert blocks to Markdown
      const markdown = await editor.blocksToMarkdownLossy(editor.document)

      const filePath = `${currentFolder}/${currentFile}`
      const result = await window.api.markdown.save(filePath, markdown)

      if (result.success) {
        Toast.success('文件保存成功')
        setIsEditing(false)
        // Update the last saved content
        lastSavedContentRef.current = markdown

        // Notify parent component that file has changed
        if (onFileChanged) {
          onFileChanged()
        }
      } else {
        Toast.error(`保存失败: ${result.error}`)
      }
    } catch (error) {
      console.error('保存文件内容失败:', error)
      Toast.error('保存文件内容失败')
    } finally {
      setIsSaving(false)
    }
  }, [currentFolder, currentFile, editor, onFileChanged])

  // Handler for when the editor's content changes
  const handleEditorChange = useCallback(async () => {
    try {
      // Convert current blocks to Markdown for comparison
      const currentMarkdown = await editor.blocksToMarkdownLossy(editor.document)

      // Only set editing state if content actually changed
      if (currentMarkdown !== lastSavedContentRef.current) {
        setIsEditing(true)
      } else {
        setIsEditing(false)
      }
    } catch (error) {
      console.error('比较内容变化失败:', error)
    }
  }, [editor])

  return (
    <div className="editor-container">
      <div className="editor-header">
        <div className="editor-title-container">
          <Typography.Title heading={4} style={{ margin: 0 }}>
            {title || '未选择文件'}
          </Typography.Title>
          {isEditing && (
            <span style={{ marginLeft: 10, color: 'var(--semi-color-warning)' }}>*</span>
          )}
        </div>
        <div className="editor-actions">
          <Space>
            {isEditing && (
              <Button
                theme="solid"
                type="primary"
                icon={<IconSave />}
                onClick={saveFileContent}
                loading={isSaving}
                disabled={!currentFile}
              >
                保存
              </Button>
            )}
          </Space>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', height: 'calc(100% - 60px)' }}>
        {isLoading ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%'
            }}
          >
            <Spin size="large" />
          </div>
        ) : !currentFile ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%'
            }}
          >
            <Typography.Text type="secondary">请从左侧边栏选择一个文件</Typography.Text>
          </div>
        ) : (
          <BlockNoteView
            key={editorKey}
            editor={editor}
            theme={editorThemes}
            style={{ height: '100%' }}
            onChange={handleEditorChange}
          />
        )}
      </div>
    </div>
  )
}

export default Editor

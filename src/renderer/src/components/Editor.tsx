import React, { useEffect, useState, useCallback } from 'react'
import { Typography, Button, Space, Toast, Spin } from '@douyinfe/semi-ui'
import { IconSave } from '@douyinfe/semi-icons'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
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

  // Load file content
  const loadFileContent = useCallback(async () => {
    if (!currentFolder || !currentFile) {
      setTitle('')
      return
    }

    setIsLoading(true)
    try {
      const filePath = `${currentFolder}/${currentFile}`
      const result = await window.api.markdown.readFile(filePath)

      if (result.success && result.content !== undefined) {
        // Parse Markdown to blocks
        const blocks = await editor.tryParseMarkdownToBlocks(result.content)
        editor.replaceBlocks(editor.document, blocks)

        // Set title from filename
        setTitle(currentFile.replace('.md', ''))
        setIsEditing(false)
      } else {
        Toast.error('无法加载文件内容')
      }
    } catch (error) {
      console.error('加载文件内容失败:', error)
      Toast.error('加载文件内容失败')
    } finally {
      setIsLoading(false)
    }
  }, [currentFolder, currentFile, editor])

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

  // Load file when current file changes
  useEffect(() => {
    loadFileContent()
  }, [currentFolder, currentFile, loadFileContent])

  // Handler for when the editor's content changes
  const handleEditorChange = useCallback(() => {
    setIsEditing(true)
  }, [])

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
            editor={editor}
            theme="light"
            style={{ height: '100%' }}
            onChange={handleEditorChange}
          />
        )}
      </div>
    </div>
  )
}

export default Editor

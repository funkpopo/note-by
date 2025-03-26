import React, { useEffect, useRef, useContext, useState } from 'react'
import Cherry from 'cherry-markdown'
import 'cherry-markdown/dist/cherry-markdown.css'
import { Button, Typography, Space, Tooltip, Toast, Modal, Form } from '@douyinfe/semi-ui'
import { IconSave, IconCopy, IconEdit } from '@douyinfe/semi-icons'
import { ThemeContext } from '../context/theme/ThemeContext'
import './Editor.css'

interface EditorProps {
  currentFolder?: string
  currentFile?: string
}

const Editor: React.FC<EditorProps> = ({ currentFolder, currentFile }) => {
  const editorRef = useRef<HTMLDivElement>(null)
  const cherryRef = useRef<Cherry | null>(null)
  const { isDarkMode } = useContext(ThemeContext) || { isDarkMode: false }
  const [folders, setFolders] = useState<string[]>([])
  const [saving, setSaving] = useState<boolean>(false)
  const [saveModalVisible, setSaveModalVisible] = useState<boolean>(false)
  const [fileName, setFileName] = useState<string>('')
  const [selectedFolder, setSelectedFolder] = useState<string>('')
  const [fileContent, setFileContent] = useState<string>(
    '# 欢迎使用 Cherry Markdown 编辑器\n\n开始写作吧！'
  )
  const [loading, setLoading] = useState<boolean>(false)

  // 加载文件夹列表
  const loadFolders = async (): Promise<void> => {
    try {
      const result = await window.api.markdown.getFolders()
      if (result.success && result.folders) {
        setFolders(result.folders)
        if (result.folders.length > 0 && !selectedFolder) {
          setSelectedFolder(result.folders[0])
        }
      }
    } catch (error) {
      console.error('加载文件夹列表失败:', error)
      Toast.error('加载文件夹列表失败')
    }
  }

  // 加载文件内容
  const loadFileContent = async (folder: string, file: string): Promise<void> => {
    setLoading(true)
    try {
      // 构建文件路径
      const filePath = `${folder}/${file}`

      // 读取文件内容
      const result = await window.api.markdown.readFile(filePath)
      if (result.success && result.content) {
        cherryRef.current?.setValue(result.content)
        setFileContent(result.content)
      } else {
        // 文件不存在或读取失败，创建新文件
        const mockContent = `# ${file.replace('.md', '')}\n\n这是一个新文档，开始编辑吧！`
        cherryRef.current?.setValue(mockContent)
        setFileContent(mockContent)
      }

      // 设置文件名（用于显示和保存）
      setFileName(file.replace('.md', ''))
      setSelectedFolder(folder)
    } catch (error) {
      console.error('加载文件内容失败:', error)
      Toast.error('加载文件内容失败')
    } finally {
      setLoading(false)
    }
  }

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

  // 保存当前文档
  const saveDocument = async (): Promise<void> => {
    if (!cherryRef.current) return

    // 获取当前编辑器内容
    const content = cherryRef.current.getMarkdown()
    setFileContent(content)

    // 如果已经有文件名和文件夹，直接保存
    if (currentFile && currentFolder) {
      await saveToFile(currentFolder, currentFile, content)
    } else {
      // 否则打开保存对话框
      setSaveModalVisible(true)
    }
  }

  // 保存到指定文件
  const saveToFile = async (folder: string, file: string, content: string): Promise<void> => {
    setSaving(true)
    try {
      // 文件名添加.md后缀（如果没有）
      const filename = file.endsWith('.md') ? file : `${file}.md`
      // 构建相对路径
      const filePath = `${folder}/${filename}`

      const result = await window.api.markdown.save(filePath, content)
      if (result.success) {
        Toast.success('文档保存成功')
      } else {
        Toast.error(`保存失败: ${result.error}`)
      }
    } catch (error) {
      console.error('保存文档失败:', error)
      Toast.error('保存文档失败')
    } finally {
      setSaving(false)
      setSaveModalVisible(false)
    }
  }

  // 处理保存对话框的确认
  const handleSaveConfirm = async (): Promise<void> => {
    if (!fileName.trim()) {
      Toast.warning('请输入文件名')
      return
    }

    if (!selectedFolder) {
      Toast.warning('请选择文件夹')
      return
    }

    await saveToFile(selectedFolder, fileName, fileContent)
  }

  // 处理复制全文
  const handleCopyContent = (): void => {
    if (!cherryRef.current) return

    const content = cherryRef.current.getMarkdown()
    navigator.clipboard
      .writeText(content)
      .then(() => Toast.success('已复制到剪贴板'))
      .catch(() => Toast.error('复制失败'))
  }

  useEffect((): (() => void) => {
    // 加载文件夹列表
    loadFolders()

    if (editorRef.current && !cherryRef.current) {
      cherryRef.current = new Cherry({
        id: 'cherry-markdown',
        value: fileContent,
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
  }, [])

  // 监听主题变化，更新Cherry Markdown主题
  useEffect(() => {
    updateCherryTheme(isDarkMode)
  }, [isDarkMode])

  // 当选中文件发生变化时，加载文件内容
  useEffect(() => {
    if (currentFolder && currentFile && cherryRef.current) {
      loadFileContent(currentFolder, currentFile)
    }
  }, [currentFolder, currentFile])

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
          <Typography.Title style={{ margin: 0, fontSize: 20 }}>
            {currentFile ? `${currentFile}` : '新文档'}
          </Typography.Title>
        </div>
        <Space className="editor-actions">
          <Tooltip content="复制全文">
            <Button icon={<IconCopy />} type="tertiary" onClick={handleCopyContent} />
          </Tooltip>
          <Button icon={<IconEdit />} type="secondary">
            AI助手
          </Button>
          <Button
            icon={<IconSave />}
            type="primary"
            onClick={saveDocument}
            loading={saving || loading}
          >
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

      {/* 保存文件对话框 */}
      <Modal
        title="保存笔记"
        visible={saveModalVisible}
        onOk={handleSaveConfirm}
        onCancel={() => setSaveModalVisible(false)}
        maskClosable={false}
        okText="保存"
        cancelText="取消"
        okButtonProps={{ loading: saving }}
      >
        <Form>
          <Form.Input
            field="fileName"
            label="文件名"
            placeholder="请输入文件名（如: my-note）"
            onChange={(value) => setFileName(value as string)}
            suffix=".md"
            required
          />
          <Form.Select
            field="folder"
            label="保存位置"
            placeholder="选择文件夹"
            onChange={(value) => setSelectedFolder(value as string)}
            optionList={folders.map((folder) => ({ label: folder, value: folder }))}
            style={{ width: '100%' }}
            emptyContent={
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <Typography.Text type="tertiary">无可用文件夹</Typography.Text>
              </div>
            }
          />
          <Typography.Text type="tertiary" style={{ display: 'block', marginTop: 12 }}>
            新文件夹将自动创建
          </Typography.Text>
        </Form>
      </Modal>
    </div>
  )
}

export default Editor

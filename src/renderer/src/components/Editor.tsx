import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Typography, Button, Space, Toast, Spin, Select } from '@douyinfe/semi-ui'
import { IconSave } from '@douyinfe/semi-icons'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView, Theme, darkDefaultTheme, lightDefaultTheme } from '@blocknote/mantine'
import '@blocknote/core/fonts/inter.css'
import '@blocknote/mantine/style.css'
import { codeBlock } from '@blocknote/code-block'
import './Editor.css'
import {
  BasicTextStyleButton,
  BlockTypeSelect,
  ColorStyleButton,
  CreateLinkButton,
  FileCaptionButton,
  FileReplaceButton,
  FormattingToolbar,
  FormattingToolbarController,
  NestBlockButton,
  TextAlignButton,
  UnnestBlockButton
} from '@blocknote/react'
import { TranslateButton } from './TranslateButton'
import { AnalyzeButton } from './AnalyzeButton'
import { ContinueButton } from './ContinueButton'
import { RewriteButton } from './RewriteButton'
import CreateDialog from './CreateDialog'

// 添加一个接口定义API配置
interface ApiConfig {
  id: string
  name: string
  apiKey: string
  apiUrl: string
  modelName: string
  temperature?: string
  maxTokens?: string
}

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

  // 添加API配置和选中模型状态
  const [apiConfigs, setApiConfigs] = useState<ApiConfig[]>([])
  const [selectedModelId, setSelectedModelId] = useState<string>('')

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

  // 加载API配置
  useEffect(() => {
    const loadApiConfigs = async (): Promise<void> => {
      try {
        const settings = await window.api.settings.getAll()
        if (settings.apiConfigs && Array.isArray(settings.apiConfigs)) {
          const configs = settings.apiConfigs as ApiConfig[]
          setApiConfigs(configs)

          // 如果有配置且没有选中的模型，默认选择第一个
          if (configs.length > 0 && !selectedModelId) {
            setSelectedModelId(configs[0].id)
          }
        }
      } catch (error) {
        console.error('加载API配置失败:', error)
      }
    }

    loadApiConfigs()
  }, [selectedModelId])

  // Create a new editor instance
  const editor = useCreateBlockNote({
    // Enable code block syntax highlighting with configuration
    codeBlock: {
      ...codeBlock,
      // Default language for new code blocks
      defaultLanguage: 'javascript',
      // Allow indenting with Tab key
      indentLineWithTab: true,
      // Define supported languages
      supportedLanguages: {
        javascript: {
          name: 'JavaScript',
          aliases: ['js']
        },
        typescript: {
          name: 'TypeScript',
          aliases: ['ts']
        },
        python: {
          name: 'Python',
          aliases: ['py']
        },
        java: {
          name: 'Java'
        },
        csharp: {
          name: 'C#',
          aliases: ['cs']
        },
        cpp: {
          name: 'C++',
          aliases: ['c++', 'cpp']
        },
        go: {
          name: 'Go'
        },
        rust: {
          name: 'Rust',
          aliases: ['rs']
        },
        php: {
          name: 'PHP'
        },
        css: {
          name: 'CSS'
        },
        html: {
          name: 'HTML'
        },
        json: {
          name: 'JSON'
        },
        xml: {
          name: 'XML'
        },
        markdown: {
          name: 'Markdown',
          aliases: ['md']
        },
        sql: {
          name: 'SQL'
        },
        bash: {
          name: 'Bash',
          aliases: ['sh', 'shell']
        }
      }
    },
    // Initial content with example
    initialContent: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: '请选择或创建一个Markdown文件开始编辑。你现在可以使用代码块功能了！',
            styles: {}
          }
        ]
      },
      {
        type: 'codeBlock',
        props: {
          language: 'javascript'
        },
        content: [
          {
            type: 'text',
            text: '// 这是一个JavaScript代码块示例\nconst greeting = "Hello, world!";\nconsole.log(greeting);',
            styles: {}
          }
        ]
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: '点击代码块上方的JavaScript标签可以选择不同的编程语言。',
            styles: {}
          }
        ]
      }
    ]
  })

  // 清空编辑器内容的辅助函数
  const clearEditor = useCallback(() => {
    editor.replaceBlocks(editor.document, [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: '请选择或创建一个Markdown文件开始编辑。你现在可以使用代码块功能了！',
            styles: {}
          }
        ]
      },
      {
        type: 'codeBlock',
        props: {
          language: 'javascript'
        },
        content: [
          {
            type: 'text',
            text: '// 这是一个JavaScript代码块示例\nconst greeting = "Hello, world!";\nconsole.log(greeting);',
            styles: {}
          }
        ]
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: '点击代码块上方的JavaScript标签可以选择不同的编程语言。',
            styles: {}
          }
        ]
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

  // 获取当前选中模型的详细信息
  const getSelectedModel = useCallback(() => {
    if (!selectedModelId || apiConfigs.length === 0) return null
    return apiConfigs.find((config) => config.id === selectedModelId) || null
  }, [selectedModelId, apiConfigs])

  // 将选中的模型信息存储到本地存储，以便AI功能组件获取
  useEffect(() => {
    const selectedModel = getSelectedModel()
    if (selectedModel) {
      // 将选中的模型信息设置到本地存储中，供AI功能组件使用
      window.localStorage.setItem('selectedModelId', selectedModelId)
    }
  }, [selectedModelId, getSelectedModel])

  const [showCreateDialog, setShowCreateDialog] = useState<boolean>(false)
  const [createDialogType, setCreateDialogType] = useState<'folder' | 'note'>('note')
  const [availableFolders, setAvailableFolders] = useState<string[]>(['default'])

  // Load available folders for the create dialog
  useEffect(() => {
    const loadFolders = async (): Promise<void> => {
      try {
        const result = await window.api.markdown.getFolders()
        if (result.success && result.folders && result.folders.length > 0) {
          setAvailableFolders(result.folders)
        } else {
          // Ensure we always have at least the default folder
          setAvailableFolders(['default'])
        }
      } catch (error) {
        console.error('加载文件夹列表失败:', error)
        setAvailableFolders(['default'])
      }
    }

    loadFolders()
  }, [])

  // Function to open file browser
  const handleOpenFileBrowser = useCallback(() => {
    // Trigger click on the first folder item in sidebar
    const folderElements = document.querySelectorAll('[data-key^="folder:"]')
    if (folderElements && folderElements.length > 0) {
      // Find the first folder and simulate click to expand it
      const firstFolder = folderElements[0] as HTMLElement
      firstFolder.click()
    } else {
      Toast.info('未找到可用的文件夹，请先创建一个文件夹')
    }
  }, [])

  // Function to open create dialog
  const handleOpenCreateFile = useCallback(() => {
    setCreateDialogType('note')
    setShowCreateDialog(true)
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
            {apiConfigs.length > 0 && (
              <Select
                value={selectedModelId}
                onChange={(value) => setSelectedModelId(value as string)}
                style={{ width: 150 }}
                placeholder="选择AI模型"
                disabled={apiConfigs.length === 0}
              >
                {apiConfigs.map((config) => (
                  <Select.Option key={config.id} value={config.id}>
                    {config.name}
                  </Select.Option>
                ))}
              </Select>
            )}
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
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              padding: '2rem',
              color: 'var(--semi-color-text-2)',
              textAlign: 'center'
            }}
          >
            <div style={{ marginBottom: '2rem' }}>
              <svg
                width="120"
                height="120"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"
                  stroke="var(--semi-color-primary)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M14 2V8H20"
                  stroke="var(--semi-color-primary)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M9 15H15"
                  stroke="var(--semi-color-primary)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M9 11H15"
                  stroke="var(--semi-color-primary)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <Typography.Title
              heading={3}
              style={{ margin: '0 0 1rem 0', color: 'var(--semi-color-text-0)' }}
            >
              欢迎使用Markdown编辑器
            </Typography.Title>
            <Typography.Paragraph
              style={{ fontSize: '16px', maxWidth: '500px', marginBottom: '1.5rem' }}
            >
              请从左侧边栏选择一个文件开始编辑，或者创建一个新的Markdown文件
            </Typography.Paragraph>
            <div
              style={{
                display: 'flex',
                gap: '1rem',
                flexWrap: 'wrap',
                justifyContent: 'center'
              }}
            >
              <Button
                theme="light"
                onClick={handleOpenFileBrowser}
                icon={
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M19 11H5M5 11L12 4M5 11L12 18"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                }
              >
                选择文件
              </Button>
              <Button
                theme="solid"
                onClick={handleOpenCreateFile}
                icon={
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 5V19M5 12H19"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                }
              >
                创建文件
              </Button>
            </div>
            <div
              style={{
                marginTop: '2rem',
                padding: '1rem',
                background: 'var(--semi-color-fill-0)',
                borderRadius: '8px',
                maxWidth: '500px'
              }}
            >
              <Typography.Text strong style={{ marginBottom: '0.5rem', display: 'block' }}>
                提示与快捷键:
              </Typography.Text>
              <ul style={{ textAlign: 'left', margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
                <li>
                  使用 <Typography.Text code>Ctrl+S</Typography.Text> 保存文件
                </li>
                <li>支持代码块高亮和Markdown格式化</li>
                <li>可以使用AI功能辅助内容创作</li>
              </ul>
            </div>
          </div>
        ) : (
          <BlockNoteView
            editor={editor}
            key={editorKey}
            theme={editorThemes}
            formattingToolbar={false}
            onChange={handleEditorChange}
            style={{ height: '100%' }}
          >
            <FormattingToolbarController
              formattingToolbar={() => (
                <FormattingToolbar>
                  <BlockTypeSelect key="blockTypeSelect" />
                  <TranslateButton key="translateButton" />
                  <AnalyzeButton key="analyzeButton" />
                  <ContinueButton key="continueButton" />
                  <RewriteButton key="rewriteButton" />
                  <FileCaptionButton key="fileCaptionButton" />
                  <FileReplaceButton key="replaceFileButton" />
                  <BasicTextStyleButton basicTextStyle="bold" key="boldStyleButton" />
                  <BasicTextStyleButton basicTextStyle="italic" key="italicStyleButton" />
                  <BasicTextStyleButton basicTextStyle="underline" key="underlineStyleButton" />
                  <BasicTextStyleButton basicTextStyle="strike" key="strikeStyleButton" />
                  <BasicTextStyleButton basicTextStyle="code" key="codeStyleButton" />
                  <TextAlignButton textAlignment="left" key="textAlignLeftButton" />
                  <TextAlignButton textAlignment="center" key="textAlignCenterButton" />
                  <TextAlignButton textAlignment="right" key="textAlignRightButton" />
                  <ColorStyleButton key="colorStyleButton" />
                  <NestBlockButton key="nestBlockButton" />
                  <UnnestBlockButton key="unnestBlockButton" />
                  <CreateLinkButton key="createLinkButton" />
                </FormattingToolbar>
              )}
            />
          </BlockNoteView>
        )}
      </div>

      {showCreateDialog && (
        <CreateDialog
          visible={showCreateDialog}
          title={createDialogType === 'folder' ? '创建文件夹' : '创建笔记'}
          type={createDialogType}
          folders={availableFolders}
          onCancel={() => setShowCreateDialog(false)}
          onConfirm={async (name, folder) => {
            try {
              // Create markdown file
              if (createDialogType === 'note') {
                const targetFolder = folder || 'default'
                const filePath = `${targetFolder}/${name}.md`
                const result = await window.api.markdown.save(filePath, '# ' + name)

                if (result.success) {
                  Toast.success('创建文件成功')
                  // Notify parent to refresh file list
                  if (onFileChanged) {
                    onFileChanged()
                  }
                } else {
                  Toast.error(`创建失败: ${result.error}`)
                }
              }
            } catch (error) {
              console.error('创建文件失败:', error)
              Toast.error('创建文件失败')
            } finally {
              setShowCreateDialog(false)
            }
          }}
        />
      )}
    </div>
  )
}

export default Editor

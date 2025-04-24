import React, { useState, useEffect, useContext } from 'react'
import { CKEditor } from '@ckeditor/ckeditor5-react'
import ClassicEditor from '@ckeditor/ckeditor5-build-classic'
import type { Editor } from '@ckeditor/ckeditor5-core'
import { Spin, Toast, Button, Dropdown, Typography } from '@douyinfe/semi-ui'
import { IconCopy, IconSetting, IconFile } from '@douyinfe/semi-icons'
import './Editor.css'
import { ThemeContext } from '../context/theme/ThemeContext'

// Define props interface
interface EditorProps {
  currentFolder?: string
  currentFile?: string
  onFileChanged?: () => void
}

// Define AI model options
const AI_MODELS = [
  { value: 'gpt-3.5', text: 'GPT-3.5' },
  { value: 'gpt-4', text: 'GPT-4' },
  { value: 'claude-3', text: 'Claude 3' },
  { value: 'gemini', text: 'Gemini' }
]

const EditorComponent: React.FC<EditorProps> = ({ currentFolder, currentFile, onFileChanged }) => {
  const [editorData, setEditorData] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null)
  const [selectedAIModel, setSelectedAIModel] = useState<string>('gpt-3.5')
  const { Text } = Typography

  // 使用ThemeContext获取当前主题状态
  const themeContext = useContext(ThemeContext)
  const isDarkMode = themeContext?.isDarkMode ?? false

  // Load file content when current file changes
  useEffect(() => {
    if (currentFolder && currentFile) {
      loadFileContent()
    } else {
      setEditorData('')
    }
  }, [currentFolder, currentFile])

  // Load file content from the filesystem
  const loadFileContent = async (): Promise<void> => {
    try {
      setLoading(true)
      // Using the markdown:read-file IPC channel
      const filePath = `${currentFolder}/${currentFile}`
      const result = await window.api.markdown.readFile(filePath)

      if (result.success && result.content !== undefined) {
        setEditorData(result.content)
      } else {
        throw new Error(result.error || 'Failed to load file')
      }
    } catch (error) {
      console.error('Error loading file:', error)
      Toast.error('文件加载失败')
    } finally {
      setLoading(false)
    }
  }

  // Save content to file
  const saveContent = async (content: string): Promise<void> => {
    if (!currentFolder || !currentFile) return

    try {
      // Using the markdown:save IPC channel
      const filePath = `${currentFolder}/${currentFile}`
      const result = await window.api.markdown.save(filePath, content)

      if (result.success) {
        Toast.success('保存成功')
        if (onFileChanged) {
          onFileChanged()
        }
      } else {
        throw new Error(result.error || 'Failed to save file')
      }
    } catch (error) {
      console.error('Error saving file:', error)
      Toast.error('保存失败')
    }
  }

  // Copy content to clipboard
  const copyContent = (): void => {
    if (editorData) {
      navigator.clipboard
        .writeText(editorData)
        .then(() => {
          Toast.success('内容已复制到剪贴板')
        })
        .catch((err) => {
          console.error('复制失败:', err)
          Toast.error('复制失败')
        })
    }
  }

  // Handle AI model selection
  const handleAIModelChange = (value: string): void => {
    setSelectedAIModel(value)
    Toast.info(`已选择 ${AI_MODELS.find((model) => model.value === value)?.text} 作为 AI 助手`)
  }

  // Handle editor initialization
  useEffect(() => {
    if (editorInstance) {
      // Make sure the editor can scroll properly
      try {
        const editorElement = editorInstance.ui.getEditableElement()
        if (editorElement) {
          // Ensure the editable area can scroll
          editorElement.style.overflow = 'auto'
          editorElement.style.height = '100%'
        }
      } catch (error) {
        console.error('Error adjusting editor DOM:', error)
      }
    }
  }, [editorInstance])

  // 更新编辑器主题样式
  useEffect(() => {
    if (editorInstance) {
      try {
        const editorElement = editorInstance.ui.getEditableElement()
        if (editorElement) {
          // 根据主题更新编辑器样式
          editorElement.style.backgroundColor = isDarkMode ? 'var(--semi-color-bg-0)' : '#ffffff'
          editorElement.style.color = isDarkMode ? 'var(--semi-color-text-0)' : 'rgba(0, 0, 0, 0.9)'

          // 获取所有工具栏按钮并更新样式
          const toolbar = editorInstance.ui.view?.toolbar?.element
          if (toolbar) {
            // 设置工具栏边框颜色
            toolbar.style.borderColor = isDarkMode ? 'transparent' : ''

            // 更新工具栏分隔符样式
            const separators = toolbar.querySelectorAll('.ck.ck-toolbar__separator')
            separators.forEach((separator) => {
              const separatorEl = separator as HTMLElement
              separatorEl.style.backgroundColor = isDarkMode ? 'var(--semi-color-border)' : ''
              separatorEl.style.opacity = isDarkMode ? '0.3' : ''
            })

            // 更新工具栏下拉按钮样式
            const dropdownButtons = toolbar.querySelectorAll('.ck.ck-dropdown__button')
            dropdownButtons.forEach((button) => {
              const buttonEl = button as HTMLElement
              const arrow = buttonEl.querySelector('.ck.ck-dropdown__arrow')
              if (arrow) {
                ;(arrow as HTMLElement).style.color = isDarkMode ? 'var(--semi-color-text-0)' : ''
                ;(arrow as HTMLElement).style.fill = isDarkMode ? 'var(--semi-color-text-0)' : ''
              }
            })

            // 更新工具栏图标样式
            const icons = toolbar.querySelectorAll('.ck.ck-icon')
            icons.forEach((icon) => {
              const iconEl = icon as HTMLElement
              iconEl.style.color = isDarkMode ? 'var(--semi-color-text-0)' : ''
              iconEl.style.fill = isDarkMode ? 'var(--semi-color-text-0)' : ''
            })
          }
        }
      } catch (error) {
        console.error('更新编辑器主题样式失败:', error)
      }
    }
  }, [editorInstance, isDarkMode])

  // Editor configuration
  const editorConfig = {
    toolbar: {
      items: [
        'undo',
        'redo',
        '|',
        'heading',
        '|',
        'bold',
        'italic',
        'link',
        '|',
        'bulletedList',
        'numberedList',
        '|',
        'uploadImage',
        'blockQuote',
        'insertTable',
        '|',
        'outdent',
        'indent'
      ],
      shouldNotGroupWhenFull: true
    },
    ui: {
      poweredBy: {
        position: 'inside' as const,
        side: 'right' as const,
        forceVisible: true
      }
    },
    // 配置链接功能
    link: {
      // 自定义链接工具栏
      toolbar: ['linkPreview', '|', 'editLink'],
      // 为链接添加默认协议
      defaultProtocol: 'https://',
      // 添加自定义协议支持
      allowedProtocols: ['http://', 'https://', 'tel:', 'mailto:', 'ftp://'],
      // 链接装饰器配置
      decorators: {
        // 自动为外部链接添加target和rel属性
        addTargetToExternalLinks: {
          mode: 'automatic' as const,
          callback: (url: string | null): boolean => {
            if (!url) return false
            return /^(https?:)?\/\//.test(url)
          },
          attributes: {
            target: '_blank',
            rel: 'noopener noreferrer'
          }
        },
        // 手动切换按钮，允许用户决定是否在新标签页打开链接
        openInNewTab: {
          mode: 'manual' as const,
          label: '在新标签页打开',
          defaultValue: false,
          attributes: {
            target: '_blank',
            rel: 'noopener noreferrer'
          }
        }
      }
    }
  }

  // Handle command+s or ctrl+s to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (editorInstance && editorData) {
          saveContent(editorData)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return (): void => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [editorData, editorInstance])

  return (
    <div className="editor-container">
      {loading ? (
        <div className="loading-container">
          <Spin size="large" />
        </div>
      ) : currentFolder && currentFile ? (
        <div className="editor-wrapper">
          <div className="editor-header">
            <div className="file-info">
              <Text icon={<IconFile />} strong>
                {currentFile} {currentFolder && `(${currentFolder})`}
              </Text>
            </div>
            <div className="editor-actions">
              <Button
                icon={<IconCopy />}
                theme="borderless"
                onClick={copyContent}
                title="复制全部内容"
              >
                复制全部
              </Button>
              <Dropdown
                trigger="click"
                position="bottomRight"
                render={
                  <Dropdown.Menu>
                    {AI_MODELS.map((model) => (
                      <Dropdown.Item
                        key={model.value}
                        active={selectedAIModel === model.value}
                        onClick={() => handleAIModelChange(model.value)}
                      >
                        {model.text}
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                }
              >
                <Button icon={<IconSetting />} theme="borderless" title="AI 助手配置">
                  {AI_MODELS.find((model) => model.value === selectedAIModel)?.text ||
                    '选择 AI 模型'}
                </Button>
              </Dropdown>
              <Button className="save-button" onClick={() => saveContent(editorData)}>
                保存
              </Button>
            </div>
          </div>
          <CKEditor
            editor={ClassicEditor}
            data={editorData}
            config={editorConfig}
            onReady={(editor: Editor) => {
              setEditorInstance(editor)
              // 设置编辑器实例并应用主题样式
              console.log('Editor is ready to use!', editor)

              // 显示可用的工具栏项目
              console.log(
                'Available toolbar items:',
                Array.from(editor.ui.componentFactory.names())
              )

              // 初始化时立即应用当前主题
              try {
                const editorElement = editor.ui.getEditableElement()
                if (editorElement) {
                  editorElement.style.backgroundColor = isDarkMode
                    ? 'var(--semi-color-bg-0)'
                    : '#ffffff'
                  editorElement.style.color = isDarkMode
                    ? 'var(--semi-color-text-0)'
                    : 'rgba(0, 0, 0, 0.9)'
                }

                // 获取所有工具栏按钮并更新样式
                const toolbar = editor.ui.view?.toolbar?.element
                if (toolbar) {
                  toolbar.style.borderColor = isDarkMode ? 'transparent' : ''

                  // 更新工具栏分隔符样式
                  const separators = toolbar.querySelectorAll('.ck.ck-toolbar__separator')
                  separators.forEach((separator) => {
                    const separatorEl = separator as HTMLElement
                    separatorEl.style.backgroundColor = isDarkMode ? 'var(--semi-color-border)' : ''
                    separatorEl.style.opacity = isDarkMode ? '0.3' : ''
                  })

                  // 更新工具栏下拉按钮样式
                  const dropdownButtons = toolbar.querySelectorAll('.ck.ck-dropdown__button')
                  dropdownButtons.forEach((button) => {
                    const buttonEl = button as HTMLElement
                    const arrow = buttonEl.querySelector('.ck.ck-dropdown__arrow')
                    if (arrow) {
                      ;(arrow as HTMLElement).style.color = isDarkMode
                        ? 'var(--semi-color-text-0)'
                        : ''
                      ;(arrow as HTMLElement).style.fill = isDarkMode
                        ? 'var(--semi-color-text-0)'
                        : ''
                    }
                  })

                  // 更新工具栏图标样式
                  const icons = toolbar.querySelectorAll('.ck.ck-icon')
                  icons.forEach((icon) => {
                    const iconEl = icon as HTMLElement
                    iconEl.style.color = isDarkMode ? 'var(--semi-color-text-0)' : ''
                    iconEl.style.fill = isDarkMode ? 'var(--semi-color-text-0)' : ''
                  })
                }
              } catch (error) {
                console.error('初始化编辑器主题样式失败:', error)
              }
            }}
            onChange={(_, editor: Editor) => {
              const data = editor.getData()
              setEditorData(data)
            }}
          />
        </div>
      ) : (
        <div className="no-file-selected">
          <p>请选择或创建一个文件</p>
        </div>
      )}
    </div>
  )
}

export default EditorComponent

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
  UnnestBlockButton,
  SuggestionMenuController,
  getDefaultReactSlashMenuItems
} from '@blocknote/react'
import { TranslateButton } from './TranslateButton'
import { AnalyzeButton } from './AnalyzeButton'
import { ContinueButton } from './ContinueButton'
import { RewriteButton } from './RewriteButton'
import { SummaryButton } from './SummaryButton'
import CreateDialog from './CreateDialog'

// 添加一个接口定义API配置
interface AiApiConfig {
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
  // 添加自动保存状态
  const [autoSaveStatus, setAutoSaveStatus] = useState<string>('') // 保存状态：'', 'saved', 'saving'
  const lastSavedContentRef = useRef<string>('')
  const lastLoadedFileRef = useRef<string | null>(null)
  // 添加自动保存相关引用
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastUserActionRef = useRef<number>(Date.now())

  // 添加API配置和选中模型状态
  const [AiApiConfigs, setApiConfigs] = useState<AiApiConfig[]>([])
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
        if (settings.AiApiConfigs && Array.isArray(settings.AiApiConfigs)) {
          const configs = settings.AiApiConfigs as AiApiConfig[]
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
    // 自定义配置，通过CSS处理图片尺寸
    domAttributes: {
      // 添加自定义CSS类，用于设置图片尺寸
      editor: {
        class: 'custom-blocknote-editor'
      }
    },
    // 添加uploadFile函数，用于处理文件上传
    uploadFile: async (file: File): Promise<string> => {
      try {
        console.log('正在上传文件:', file.name)

        // 创建图片元素以获取原始尺寸信息
        const getImageDimensions = (
          imageFile: File
        ): Promise<{ width: number; height: number }> => {
          return new Promise((resolve) => {
            const img = new Image()
            img.onload = () => {
              // 获取原始尺寸
              resolve({
                width: img.naturalWidth,
                height: img.naturalHeight
              })
              // 清理URL对象
              URL.revokeObjectURL(img.src)
            }
            // 创建临时URL用于加载图片
            img.src = URL.createObjectURL(imageFile)
          })
        }

        // 如果是图片文件，获取其原始尺寸
        let imageDimensions: { width: number; height: number } | null = null
        if (file.type.startsWith('image/')) {
          imageDimensions = await getImageDimensions(file)
          console.log('原始图片尺寸:', imageDimensions)
        }

        // 确保有当前文件夹和文件
        if (!currentFolder || !currentFile) {
          console.log('未选择文件，使用根目录临时文件')
          // 构造默认文件路径（使用纯文件名，不包含目录部分）
          const filePath = 'temp_assets.md'

          // 使用FileReader读取文件内容
          const fileContent = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = (e) => {
              if (e.target?.result) {
                resolve(e.target.result as string)
              } else {
                reject(new Error('读取文件失败'))
              }
            }
            reader.onerror = () => reject(reader.error)
            reader.readAsDataURL(file) // 读取为Data URL (base64格式)
          })

          // 通过IPC调用上传文件
          const result = await window.api.markdown.uploadFile(filePath, fileContent, file.name)

          if (!result.success) {
            throw new Error(result.error || '文件上传失败')
          }

          console.log('文件上传成功，URL:', result.url)

          // 确保URL格式正确
          const imageUrl = result.url
          // 记录实际路径信息，帮助调试
          console.log('图片保存到:', imageUrl)

          return imageUrl
        }

        // 构造文件路径（当前打开的markdown文件路径）
        const filePath = `${currentFolder}/${currentFile}`

        // 使用FileReader读取文件内容
        const fileContent = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (e) => {
            if (e.target?.result) {
              resolve(e.target.result as string)
            } else {
              reject(new Error('读取文件失败'))
            }
          }
          reader.onerror = () => reject(reader.error)
          reader.readAsDataURL(file) // 读取为Data URL (base64格式)
        })

        // 通过IPC调用上传文件
        const result = await window.api.markdown.uploadFile(filePath, fileContent, file.name)

        if (!result.success) {
          throw new Error(result.error || '文件上传失败')
        }
        console.log('文件上传成功，URL:', result.url)

        // 确保URL格式正确
        const imageUrl = result.url
        // 记录实际路径信息，帮助调试
        console.log('图片保存到:', imageUrl)

        return imageUrl
      } catch (error) {
        console.error('文件上传失败:', error)
        Toast.error(`文件上传失败: ${error instanceof Error ? error.message : String(error)}`)
        throw error
      }
    },
    // 添加 resolveFileUrl 函数以确保图片 URL 能正确解析
    resolveFileUrl: async (url: string): Promise<string> => {
      console.log('正在解析文件 URL:', url)

      // 如果 URL 已经是 http/https/data 格式，直接返回
      if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
        return url
      }

      // 如果已经是 file:// 协议，尝试修复可能的编码问题
      if (url.startsWith('file://')) {
        try {
          // 首先解码URL以处理百分比编码字符
          let decodedUrl = url
          try {
            // 尝试解码URL
            decodedUrl = decodeURI(url)
            console.log('解码URL:', decodedUrl)
          } catch (e) {
            // 解码失败，尝试不解码的方式
            console.warn('解码URL失败，尝试其他方式:', e)
          }

          // 处理编码的反斜杠 %5C
          if (url.includes('%5C')) {
            try {
              // 先将%5C替换为/
              const fixedUrl = url.replace(/%5C/g, '/')
              console.log('解析文件 URL 中的 %5C:', url)
              console.log('解码并修正 file:// URL:', fixedUrl)

              // 检查是否包含双斜杠问题
              const doubleDriveSlashRegex = /file:\/\/\/([A-Za-z]:)\/\//
              if (doubleDriveSlashRegex.test(fixedUrl)) {
                const correctedUrl = fixedUrl.replace(doubleDriveSlashRegex, 'file:///$1/')
                console.log('修正Windows盘符后的双斜杠问题:', correctedUrl)
                return correctedUrl
              }

              return fixedUrl
            } catch (e) {
              console.error('处理编码的反斜杠失败:', e)
            }
          }

          // 确保使用正斜杠
          const normalizedUrl = decodedUrl.replace(/\\/g, '/')

          // 修复Windows盘符路径格式
          // 如果URL格式是 file:///D: 需要确保是 file:///D:/
          const windowsDriveRegex = /file:\/\/\/([A-Za-z]:)\//
          if (windowsDriveRegex.test(normalizedUrl)) {
            return normalizedUrl
          }

          // 修复Windows盘符后的双斜杠问题
          const doubleDriveSlashRegex = /file:\/\/\/([A-Za-z]:)\/\//
          if (doubleDriveSlashRegex.test(normalizedUrl)) {
            const fixedUrl = normalizedUrl.replace(doubleDriveSlashRegex, 'file:///$1/')
            console.log('修正Windows盘符后的双斜杠问题:', fixedUrl)
            return fixedUrl
          }

          // 修复可能的错误格式
          const badDrivePathRegex = /file:\/\/\/([A-Za-z]:)([^/])/
          const match = badDrivePathRegex.exec(normalizedUrl)
          if (match) {
            const fixedUrl = normalizedUrl.replace(badDrivePathRegex, 'file:///$1/$2')
            console.log('修复Windows盘符路径:', fixedUrl)
            return fixedUrl
          }

          console.log('使用标准化的 file:// URL:', normalizedUrl)
          return normalizedUrl
        } catch (e) {
          console.error('处理 file:// URL 时出错:', e)
          return url
        }
      }

      // 检查URL中是否包含 .assets 路径
      if (url.includes('.assets/') || url.includes('.assets\\')) {
        try {
          // 确保使用正确的 file:// 路径格式
          // 1. 移除前导斜杠
          let cleanPath = url.replace(/^\/+/, '')
          // 2. 替换所有反斜杠为正斜杠
          cleanPath = cleanPath.replace(/\\/g, '/')
          // 3. 处理盘符格式，确保是 file:///D:/path 格式
          if (cleanPath.match(/^[A-Za-z]:/)) {
            const fileUrl = `file:///${cleanPath}`
            console.log('处理 .assets 资源文件绝对路径 URL:', fileUrl)
            return fileUrl
          } else {
            // 没有盘符，可能是相对路径
            const fileUrl = `file:///${cleanPath}`
            console.log('处理 .assets 资源文件相对路径 URL:', fileUrl)
            return fileUrl
          }
        } catch (e) {
          console.error('处理 .assets 路径失败:', e)
          return url
        }
      }

      // 处理绝对路径 (包括 Windows 盘符路径)
      if (url.match(/^[A-Za-z]:/) || url.startsWith('/')) {
        try {
          // 移除前导斜杠并统一使用正斜杠
          let cleanPath = url.replace(/^\/+/, '')
          cleanPath = cleanPath.replace(/\\/g, '/')
          const fileUrl = `file:///${cleanPath}`
          console.log('将绝对路径转换为标准 file:// URL:', fileUrl)
          return fileUrl
        } catch (e) {
          console.error('处理绝对路径失败:', e)
          return url
        }
      }

      // 处理相对路径
      if (url.startsWith('./') || url.startsWith('../')) {
        try {
          // 移除前导的 ./ 并转换为正斜杠格式
          let cleanPath = url.replace(/^\.\//, '')
          cleanPath = cleanPath.replace(/\\/g, '/')
          const fileUrl = `file:///${cleanPath}`
          console.log('将相对路径转换为 file:// URL:', fileUrl)
          return fileUrl
        } catch (e) {
          console.error('处理相对路径失败:', e)
          return url
        }
      }

      // 默认情况：假设是不带协议的路径，添加 file:// 协议
      if (!url.includes('://')) {
        try {
          // 转换为正斜杠格式
          const cleanPath = url.replace(/\\/g, '/')
          const fileUrl = `file:///${cleanPath}`
          console.log('将普通路径转换为 file:// URL:', fileUrl)
          return fileUrl
        } catch (e) {
          console.error('处理普通路径失败:', e)
          return url
        }
      }

      // 其他情况返回原始 URL
      return url
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

  // 添加清理函数，在组件卸载时清除定时器
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [])

  // Save file content
  const saveFileContent = useCallback(async () => {
    if (!currentFolder || !currentFile) {
      Toast.warning('没有选择文件')
      return
    }

    setIsSaving(true)
    setAutoSaveStatus('saving')
    try {
      // Convert blocks to Markdown
      const markdown = await editor.blocksToMarkdownLossy(editor.document)

      const filePath = `${currentFolder}/${currentFile}`
      const result = await window.api.markdown.save(filePath, markdown)

      if (result.success) {
        Toast.success('文件保存成功')
        setIsEditing(false)
        setAutoSaveStatus('saved')

        // Update the last saved content
        lastSavedContentRef.current = markdown

        // Notify parent component that file has changed
        if (onFileChanged) {
          onFileChanged()
        }

        // 5秒后清除"已保存"状态
        setTimeout(() => {
          setAutoSaveStatus('')
        }, 5000)
      } else {
        Toast.error(`保存失败: ${result.error}`)
        setAutoSaveStatus('')
      }
    } catch (error) {
      console.error('保存文件内容失败:', error)
      Toast.error('保存文件内容失败')
      setAutoSaveStatus('')
    } finally {
      setIsSaving(false)
    }
  }, [currentFolder, currentFile, editor, onFileChanged])

  // 添加自动保存触发函数
  const triggerAutoSave = useCallback(() => {
    // 清除旧的定时器
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }

    // 只有在有文件打开并且内容有修改的情况下才设置自动保存
    if (currentFile && isEditing) {
      // 设置10秒后自动保存
      autoSaveTimerRef.current = setTimeout(async () => {
        // 检查距离上次用户操作是否已经10秒
        if (Date.now() - lastUserActionRef.current >= 10000) {
          await saveFileContent()
        }
      }, 10000)
    }
  }, [currentFile, isEditing, saveFileContent])

  // Handler for when the editor's content changes
  const handleEditorChange = useCallback(async () => {
    try {
      // 更新最后用户操作时间
      lastUserActionRef.current = Date.now()

      // Convert current blocks to Markdown for comparison
      const currentMarkdown = await editor.blocksToMarkdownLossy(editor.document)

      // Only set editing state if content actually changed
      if (currentMarkdown !== lastSavedContentRef.current) {
        setIsEditing(true)

        // 触发自动保存计时
        triggerAutoSave()
      } else {
        setIsEditing(false)
      }
    } catch (error) {
      console.error('比较内容变化失败:', error)
    }
  }, [editor, triggerAutoSave])

  // 获取当前选中模型的详细信息
  const getSelectedModel = useCallback(() => {
    if (!selectedModelId || AiApiConfigs.length === 0) return null
    return AiApiConfigs.find((config) => config.id === selectedModelId) || null
  }, [selectedModelId, AiApiConfigs])

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

  // Function to open create dialog
  const handleOpenCreateFile = useCallback(() => {
    setCreateDialogType('note')
    setShowCreateDialog(true)
  }, [])

  // 添加键盘快捷键支持 - 放在组件末尾，确保saveFileContent已定义
  useEffect(() => {
    // 键盘事件处理函数
    const handleKeyDown = (e: KeyboardEvent): void => {
      // 检测Ctrl+S组合键
      if (e.ctrlKey && e.key === 's') {
        // 防止浏览器默认的保存行为
        e.preventDefault()

        // 只在当前有文件打开时才执行保存
        if (currentFolder && currentFile) {
          // 调用保存函数
          saveFileContent()
        }
      }
    }

    // 添加键盘事件监听器
    window.addEventListener('keydown', handleKeyDown)

    // 清理函数：移除键盘事件监听器
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [currentFolder, currentFile, saveFileContent])

  return (
    <div
      className="editor-container"
      tabIndex={0} // 确保div可以接收键盘事件
    >
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
            {AiApiConfigs.length > 0 && (
              <Select
                value={selectedModelId}
                onChange={(value) => setSelectedModelId(value as string)}
                style={{ width: 150 }}
                placeholder="选择AI模型"
                disabled={AiApiConfigs.length === 0}
              >
                {AiApiConfigs.map((config) => (
                  <Select.Option key={config.id} value={config.id}>
                    {config.name}
                  </Select.Option>
                ))}
              </Select>
            )}
            {currentFile && (
              <>
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
                {autoSaveStatus === 'saving' && (
                  <Typography.Text type="tertiary">自动保存...</Typography.Text>
                )}
                {autoSaveStatus === 'saved' && (
                  <Typography.Text type="success">已保存</Typography.Text>
                )}
              </>
            )}
          </Space>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflow: currentFile ? 'auto' : 'hidden',
          height: 'calc(100% - 60px)'
        }}
      >
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
                width="80"
                height="80"
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
            filePanel={true}
            linkToolbar={true}
            slashMenu={false}
            onChange={handleEditorChange}
            style={{ height: '100%' }}
          >
            <FormattingToolbarController
              formattingToolbar={() => (
                <FormattingToolbar>
                  <BlockTypeSelect key="blockTypeSelect" />
                  <SummaryButton key="summaryButton" />
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
            <SuggestionMenuController
              triggerCharacter="/"
              getItems={async (query) => {
                // 获取默认斜杠菜单项
                const defaultItems = getDefaultReactSlashMenuItems(editor)

                // 过滤掉Video、Audio和File插入选项，只保留Image和其他选项
                const filteredItems = defaultItems.filter((item) => {
                  // 排除包含 "Video"、"Audio" 或 "File" 的标题，但保留 "Image"
                  return !(
                    (item.title.includes('Video') ||
                      item.title.includes('Audio') ||
                      item.title.includes('File')) &&
                    !item.title.includes('Image')
                  )
                })

                // 根据用户输入的查询过滤菜单项
                return filteredItems.filter((item) => {
                  const itemTitle = item.title.toLowerCase()
                  const itemSubtext = (item.subtext || '').toLowerCase()
                  const itemAliases = item.aliases || []
                  const queryLower = query.toLowerCase()

                  return (
                    itemTitle.includes(queryLower) ||
                    itemSubtext.includes(queryLower) ||
                    itemAliases.some((alias) => alias.toLowerCase().includes(queryLower))
                  )
                })
              }}
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

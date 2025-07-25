import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Typography, Button, Space, Toast, Dropdown } from '@douyinfe/semi-ui'
import { IconSave, IconFile, IconChevronDown } from '@douyinfe/semi-icons'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView, Theme, darkDefaultTheme, lightDefaultTheme } from '@blocknote/mantine'
import '@blocknote/core/fonts/inter.css'
import '@blocknote/mantine/style.css'
import { codeBlock } from '@blocknote/code-block'
import './Editor.css'
import { zhCN } from '../locales'
// 导入智能保存相关工具
import { SmartDebouncer } from '../utils/SmartDebouncer'
import { ConflictDetector } from '../utils/ConflictDetector'
// 导入内存管理器
import { editorMemoryManager } from '../utils/EditorMemoryManager'
// 导入性能监控器
import { performanceMonitor } from '../utils/PerformanceMonitor'
// 导入渲染优化器
import { scheduleRenderTask, processBatch } from '../utils/RenderOptimizer'
import {
  SuggestionMenuController,
  getDefaultReactSlashMenuItems
} from '@blocknote/react'
import { BlockNoteSchema, defaultInlineContentSpecs } from '@blocknote/core'
import CreateDialog from './CreateDialog'
import HistoryDropdown from './HistoryDropdown'
import { Tag } from './Tag'
import {
  getTagMenuItems,
  extractTags,
  preprocessMarkdownForTags,
  postprocessBlocksForTags,
  extractTagsFromMarkdown,
  getGlobalTagSuggestions,
  refreshGlobalTagCache
} from './TagUtils'
import globalTagManager from '../utils/GlobalTagManager'
import { EditorSkeleton } from './Skeleton'
import {
  BasicTextStyleButton,
  BlockTypeSelect,
  ColorStyleButton,
  CreateLinkButton,
  FileCaptionButton,
  FileReplaceButton,
  FormattingToolbar,
  FormattingToolbarController,
  TextAlignButton
} from '@blocknote/react'

// 创建标准格式工具栏组件  
const StandardFormattingToolbar = (): JSX.Element => {
  return (
    <FormattingToolbarController
      formattingToolbar={() => (
        <FormattingToolbar>
          <BlockTypeSelect key="blockTypeSelect" />
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
          <CreateLinkButton key="createLinkButton" />
        </FormattingToolbar>
      )}
    />
  )
}

// 创建标准斜杠菜单组件
const StandardSuggestionMenu = ({
  editor
}: {
  editor: any
}): JSX.Element => {
  return (
    <SuggestionMenuController
      triggerCharacter="/"
      getItems={async (query) => {
        // 获取默认斜杠菜单项
        const defaultItems = getDefaultReactSlashMenuItems(editor)

        // 过滤掉Video、Audio和File插入选项，只保留Image和其他选项
        const filteredItems = defaultItems.filter((item) => {
          return !(
            (item.title.includes('Video') ||
              item.title.includes('视频') ||
              item.title.includes('Audio') ||
              item.title.includes('音频') ||
              item.title.includes('File') ||
              item.title.includes('文件')) &&
            !(item.title.includes('Image') || item.title.includes('图片'))
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
  )
}

// 添加接口定义
interface MarkdownAPI {
  save: (
    filePath: string,
    content: string
  ) => Promise<{ success: boolean; path?: string; error?: string }>
  exportToPdf: (
    filePath: string,
    content: string
  ) => Promise<{ success: boolean; path?: string; error?: string }>
  exportToDocx: (
    filePath: string,
    content: string
  ) => Promise<{ success: boolean; path?: string; error?: string }>
  exportToHtml: (
    filePath: string,
    content: string
  ) => Promise<{ success: boolean; path?: string; error?: string }>
  checkFileExists: (
    filePath: string
  ) => Promise<{ success: boolean; exists: boolean; error?: string }>
  getFolders: () => Promise<{ success: boolean; folders?: string[]; error?: string }>
  getFiles: (folderName: string) => Promise<{ success: boolean; files?: string[]; error?: string }>
  readFile: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>
  createFolder: (folderName: string) => Promise<{ success: boolean; path?: string; error?: string }>
  deleteFolder: (folderName: string) => Promise<{ success: boolean; error?: string }>
  renameFolder: (
    oldFolderName: string,
    newFolderName: string
  ) => Promise<{ success: boolean; error?: string }>
  createNote: (
    folderName: string,
    fileName: string,
    content: string
  ) => Promise<{ success: boolean; path?: string; error?: string }>
  deleteFile: (filePath: string) => Promise<{ success: boolean; error?: string }>
  renameFile: (
    oldFilePath: string,
    newFilePath: string
  ) => Promise<{ success: boolean; error?: string }>
  uploadFile: (
    filePath: string,
    fileData: string,
    fileName: string
  ) => Promise<{ success: boolean; url?: string; path?: string; error?: string }>
  getHistory: (filePath: string) => Promise<{
    success: boolean
    history?: Array<{ id: number; filePath: string; content: string; timestamp: number }>
    error?: string
  }>
  getHistoryById: (historyId: number) => Promise<{
    success: boolean
    history?: { id: number; filePath: string; content: string; timestamp: number }
    error?: string
  }>
}

export interface EditorProps {
  currentFolder?: string
  currentFile?: string
  onFileChanged?: () => void
}

// 创建自定义schema，添加标签支持
const schema = BlockNoteSchema.create({
  inlineContentSpecs: {
    // 添加所有默认内联内容
    ...defaultInlineContentSpecs,
    // 添加自定义标签
    tag: Tag
  }
})

const Editor: React.FC<EditorProps> = ({ currentFolder, currentFile, onFileChanged }) => {
  const [title, setTitle] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isEditing, setIsEditing] = useState<boolean>(false)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [isExporting, setIsExporting] = useState<boolean>(false)
  const [editorContent, setEditorContent] = useState<string>('')
  const [editorKey, setEditorKey] = useState<string>('editor-0')
  // 添加自动保存状态
  const [autoSaveStatus, setAutoSaveStatus] = useState<string>('') // 保存状态：'', 'saved', 'saving'
  const lastSavedContentRef = useRef<string>('')
  const lastLoadedFileRef = useRef<string | null>(null)
  // 智能保存相关实例
  const smartDebouncerRef = useRef<SmartDebouncer>(
    new SmartDebouncer({
      fastTypingDelay: 1500, // 快速输入时1.5秒后保存
      normalDelay: 2500, // 正常输入时2.5秒后保存
      pauseDelay: 800, // 停顿后0.8秒保存
      minContentChange: 5 // 至少5个字符变化才触发保存
    })
  )
  const conflictDetectorRef = useRef<ConflictDetector>(new ConflictDetector())
  // 添加编辑器容器引用，用于定位下拉菜单
  const editorContainerRef = useRef<HTMLDivElement>(null)

  // 存储标签列表的状态
  const [tagList, setTagList] = useState<string[]>([])

  // 内存管理相关状态
  const [memoryWarning, setMemoryWarning] = useState<string>('')
  const memoryCheckIntervalRef = useRef<NodeJS.Timeout>()

  // 初始化内存管理
  useEffect(() => {
    // 监听内存事件
    const handleMemoryEvent = (
      eventType: 'pressure' | 'cleanup' | 'warning' | 'critical',
      data: {
        level: 'low' | 'moderate' | 'high' | 'critical'
        usage: any
        message: string
        timestamp: number
      }
    ) => {
      switch (eventType) {
        case 'warning':
          setMemoryWarning(data.message)
          // 5秒后清除警告
          setTimeout(() => setMemoryWarning(''), 5000)
          break
        case 'critical':
          Toast.warning(data.message)
          setMemoryWarning('内存使用严重！正在清理...')
          break
        case 'cleanup':
          if (memoryWarning) {
            setMemoryWarning('')
          }
          break
      }
    }

    // 注册事件监听器
    editorMemoryManager.addEventListener('warning', handleMemoryEvent)
    editorMemoryManager.addEventListener('critical', handleMemoryEvent)
    editorMemoryManager.addEventListener('cleanup', handleMemoryEvent)

    // 定期检查内存并缓存内容
    memoryCheckIntervalRef.current = setInterval(async () => {
      // 缓存当前编辑器内容（如果有文件打开）
      if (currentFile && editorContent) {
        const cacheKey = `${currentFolder}/${currentFile}`
        editorMemoryManager.cacheContent(cacheKey, editorContent, 4) // 高优先级
      }
    }, 30000) // 每30秒检查一次

    return () => {
      // 清理事件监听器
      editorMemoryManager.removeEventListener('warning', handleMemoryEvent)
      editorMemoryManager.removeEventListener('critical', handleMemoryEvent)
      editorMemoryManager.removeEventListener('cleanup', handleMemoryEvent)

      if (memoryCheckIntervalRef.current) {
        clearInterval(memoryCheckIntervalRef.current)
      }
    }
  }, [currentFile, currentFolder, editorContent, memoryWarning])

  // 添加复制事件监听，处理代码块复制问题
  useEffect(() => {
    const handleCodeCopy = (e: ClipboardEvent) => {
      // 检查是否是代码块的复制操作
      if (isCodeBlockSelection()) {
        // 获取选中的内容
        const selection = document.getSelection()
        if (selection && selection.toString()) {
          // 清除每行末尾的反斜杠
          const cleanedText = removeTrailingBackslashes(selection.toString())

          // 将处理后的文本放入剪贴板
          e.preventDefault()
          e.clipboardData?.setData('text/plain', cleanedText)
        }
      }
    }

    // 检查当前选中内容是否在代码块中
    const isCodeBlockSelection = (): boolean => {
      const selection = document.getSelection()
      if (!selection || !selection.anchorNode) return false

      // 查找最近的代码块容器
      let node: Node | null = selection.anchorNode
      while (node && node.nodeName !== 'BODY') {
        if (
          node.nodeName === 'PRE' ||
          (node instanceof HTMLElement &&
            (node.classList.contains('bn-code-block') || node.closest('.bn-code-block')))
        ) {
          return true
        }
        node = node.parentNode
      }
      return false
    }

    // 清除每行末尾的反斜杠
    const removeTrailingBackslashes = (text: string): string => {
      return text
        .split('\n')
        .map((line) => {
          if (line.endsWith('\\')) {
            return line.slice(0, -1)
          }
          return line
        })
        .join('\n')
    }

    // 添加复制事件监听器
    document.addEventListener('copy', handleCodeCopy)

    // 组件卸载时移除事件监听器
    return () => {
      document.removeEventListener('copy', handleCodeCopy)
    }
  }, [])

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

  // 预加载全局标签数据
  useEffect(() => {
    const preloadGlobalTags = async (): Promise<void> => {
      try {
        // 预加载全局标签数据，不阻塞界面
        globalTagManager.preloadTags()
      } catch (error) {}
    }

    preloadGlobalTags()
  }, [])

  // Create a new editor instance with custom schema
  const editor = useCreateBlockNote(
    {
      schema,
      dictionary: {
        ...zhCN
      },
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
      // 添加uploadFile函数，用于处理文件上传（集成内存管理和图片优化）
      uploadFile: async (file: File): Promise<string> => {
        try {
          // 如果是图片文件，先进行优化
          let processedFile = file
          if (file.type.startsWith('image/')) {
            try {
              // 读取文件为Blob
              const originalBlob = new Blob([file], { type: file.type })

              // 使用内存管理器优化图片
              const optimizedBlob = await editorMemoryManager.optimizeAndCacheImage(
                `upload_${Date.now()}_${file.name}`,
                originalBlob,
                {
                  maxWidth: 1920,
                  maxHeight: 1080,
                  quality: 0.8,
                  format: 'auto'
                }
              )

              // 创建优化后的File对象
              processedFile = new File([optimizedBlob], file.name, { type: optimizedBlob.type })

              console.log(
                `Image optimized: ${(file.size / 1024).toFixed(2)}KB -> ${(processedFile.size / 1024).toFixed(2)}KB`
              )
            } catch (optimizationError) {
              console.warn('Image optimization failed, using original file:', optimizationError)
              // 优化失败时使用原文件
              processedFile = file
            }
          }

          // 确保有当前文件夹和文件
          if (!currentFolder || !currentFile) {
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
              reader.readAsDataURL(processedFile) // 使用处理后的文件
            })

            // 通过IPC调用上传文件
            const result = await window.api.markdown.uploadFile(
              filePath,
              fileContent,
              processedFile.name
            )

            if (!result.success) {
              throw new Error(result.error || '文件上传失败')
            }

            // 确保URL格式正确
            const imageUrl = result.url
            if (!imageUrl) {
              throw new Error('上传成功但未返回URL')
            }

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
            reader.readAsDataURL(processedFile) // 使用处理后的文件
          })

          // 通过IPC调用上传文件
          const result = await window.api.markdown.uploadFile(
            filePath,
            fileContent,
            processedFile.name
          )

          if (!result.success) {
            throw new Error(result.error || '文件上传失败')
          }

          // 确保URL格式正确
          const imageUrl = result.url
          if (!imageUrl) {
            throw new Error('上传成功但未返回URL')
          }

          return imageUrl
        } catch (error) {
          Toast.error(`文件上传失败: ${error instanceof Error ? error.message : String(error)}`)
          throw error
        }
      },
      // 添加 resolveFileUrl 函数以确保图片 URL 能正确解析
      resolveFileUrl: async (url: string): Promise<string> => {
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
            } catch (e) {
              // 解码失败，尝试不解码的方式
              console.warn('解码URL失败，尝试其他方式:', e)
            }

            // 处理编码的反斜杠 %5C
            if (url.includes('%5C')) {
              try {
                // 先将%5C替换为/
                const fixedUrl = url.replace(/%5C/g, '/')

                // 检查是否包含双斜杠问题
                const doubleDriveSlashRegex = /file:\/\/\/([A-Za-z]:)\/\//
                if (doubleDriveSlashRegex.test(fixedUrl)) {
                  const correctedUrl = fixedUrl.replace(doubleDriveSlashRegex, 'file:///$1/')

                  return correctedUrl
                }

                return fixedUrl
              } catch (e) {}
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
              return fixedUrl
            }

            // 修复可能的错误格式
            const badDrivePathRegex = /file:\/\/\/([A-Za-z]:)([^/])/
            const match = badDrivePathRegex.exec(normalizedUrl)
            if (match) {
              const fixedUrl = normalizedUrl.replace(badDrivePathRegex, 'file:///$1/$2')

              return fixedUrl
            }

            return normalizedUrl
          } catch (e) {
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

              return fileUrl
            } else {
              // 没有盘符，可能是相对路径
              const fileUrl = `file:///${cleanPath}`

              return fileUrl
            }
          } catch (e) {
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

            return fileUrl
          } catch (e) {
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

            return fileUrl
          } catch (e) {
            return url
          }
        }

        // 默认情况：假设是不带协议的路径，添加 file:// 协议
        if (!url.includes('://')) {
          try {
            // 转换为正斜杠格式
            const cleanPath = url.replace(/\\/g, '/')
            const fileUrl = `file:///${cleanPath}`

            return fileUrl
          } catch (e) {
            return url
          }
        }

        // 其他情况返回原始 URL
        return url
      }
    },
    [schema]
  )

  // 清空编辑器内容的辅助函数
  const clearEditor = useCallback(() => {
    editor.replaceBlocks(editor.document, [
      {
        type: 'paragraph',
        content: []
      }
    ])
    setEditorContent('')
    lastSavedContentRef.current = ''
    setIsEditing(false)

    // 清除智能防抖器和冲突检测状态
    smartDebouncerRef.current.cancel()
    conflictDetectorRef.current.clearAllSnapshots()
  }, [editor])

  // Load file content - 优化版本，使用渲染优化器
  const loadFileContent = useCallback(async () => {
    if (!currentFolder || !currentFile) {
      return
    }

    const filePath = `${currentFolder}/${currentFile}`

    // 检查文件是否已经加载
    if (filePath === lastLoadedFileRef.current) {
      return
    }

    // 记录加载开始时间
    const loadStartTime = performance.now()

    // 在加载新文件之前，将当前编辑器内容清空
    clearEditor()
    setIsLoading(true)

    try {
      // 这里传入文件路径，即使TypeScript警告有未定义的可能性，我们知道这是安全的
      const result = await window.api.markdown.readFile(filePath)

      if (result.success && result.content !== undefined) {
        // 更新当前加载的文件路径
        lastLoadedFileRef.current = filePath

        // 使用渲染优化器进行内容处理
        const processedData = await scheduleRenderTask({
          id: `process-content-${filePath}`,
          priority: 'high',
          callback: async () => {
            // 尝试从内容中提取标签信息
            const tagsMatch = result.content!.match(/<!-- tags: ([^>]*) -->/)
            let extractedTags: string[] = []

            if (tagsMatch && tagsMatch[1]) {
              extractedTags = tagsMatch[1].split(',').map((tag) => tag.trim())
            }

            // 移除标签信息行，避免在编辑器中显示
            let contentWithoutTags = result.content!.replace(/<!-- tags: ([^>]*) -->\n\n/, '')

            // 预处理Markdown内容，将@tag格式转换为可识别的特殊格式
            // 同时提取内联的@标签
            const inlineTagsFromMarkdown = extractTagsFromMarkdown(contentWithoutTags)

            // 合并所有标签
            const allTags = [...new Set([...extractedTags, ...inlineTagsFromMarkdown])]

            // 预处理Markdown将@tag转换为特殊标记以便后续处理
            contentWithoutTags = preprocessMarkdownForTags(contentWithoutTags)

            return { contentWithoutTags, allTags }
          }
        })

        // 立即设置状态
        setTagList(processedData.allTags)
        setEditorContent(processedData.contentWithoutTags)
        setEditorKey(`editor-${Date.now()}`)
        setTitle(currentFile.replace('.md', ''))

        // 异步处理编辑器渲染（中等优先级）
        scheduleRenderTask({
          id: `render-editor-${filePath}`,
          priority: 'medium',
          callback: async () => {
            try {
              // 解析Markdown内容为块结构
              let blocks = await editor.tryParseMarkdownToBlocks(processedData.contentWithoutTags)

              // 使用批处理优化标签后处理
              if (blocks.length > 10) {
                blocks = await processBatch(
                  blocks,
                  async (block) => {
                    const processedBlocks = postprocessBlocksForTags([block])
                    return processedBlocks[0]
                  },
                  { batchSize: 10, useIdleCallback: true }
                )
              } else {
                blocks = postprocessBlocksForTags(blocks)
              }

              // 使用处理后的块更新编辑器
              editor.replaceBlocks(editor.document, blocks)
              setIsEditing(false)

              // 记录加载完成时间和性能指标
              const loadEndTime = performance.now()
              const loadDuration = loadEndTime - loadStartTime
              performanceMonitor.recordEditorPerformance('load', loadDuration)
              performanceMonitor.recordUserAction('load')

              return blocks
            } catch (err) {
              console.warn('编辑器内容解析失败:', err)
              return []
            }
          }
        })

        // 异步设置基准内容（低优先级）
        scheduleRenderTask({
          id: `set-baseline-${filePath}`,
          priority: 'low',
          callback: async () => {
            try {
              await new Promise(resolve => setTimeout(resolve, 100)) // 等待编辑器稳定
              const standardizedContent = await editor.blocksToMarkdownLossy(editor.document)
              lastSavedContentRef.current = standardizedContent

              // 创建冲突检测快照
              await conflictDetectorRef.current.createSnapshot(filePath, standardizedContent)
            } catch (err) {
              console.warn('设置基准内容失败:', err)
            }
          }
        })

      } else {
        Toast.error('无法加载文件内容')
        lastLoadedFileRef.current = null
      }
    } catch (error) {
      Toast.error('加载文件内容失败')
      lastLoadedFileRef.current = null
    } finally {
      setIsLoading(false)
    }
  }, [currentFolder, currentFile, editor, clearEditor, setTagList, editorContent])

  // Effect to reset editor when the key changes
  useEffect(() => {
    if (editorContent && editor) {
      const loadContentToEditor = async (): Promise<void> => {
        // 解析Markdown内容为块结构
        let blocks = await editor.tryParseMarkdownToBlocks(editorContent)

        // 后处理块，确保特殊标记被转换为Tag内联内容
        blocks = postprocessBlocksForTags(blocks)

        // 使用处理后的块更新编辑器
        editor.replaceBlocks(editor.document, blocks)
      }
      loadContentToEditor()
    }
  }, [editorKey, editor, editorContent])

  // Load file when current file changes
  useEffect(() => {
    loadFileContent()
  }, [currentFolder, currentFile, loadFileContent])

  // 添加清理函数，在组件卸载时清除智能防抖器
  useEffect(() => {
    return () => {
      smartDebouncerRef.current.cancel()
    }
  }, [])

  // 添加新的useEffect来处理编辑器内容稳定后的状态同步
  useEffect(() => {
    if (editor && currentFile && lastLoadedFileRef.current) {
      // 延迟检查编辑器状态，确保内容已完全加载
      const timer = setTimeout(async () => {
        try {
          const currentMarkdown = await editor.blocksToMarkdownLossy(editor.document)
          const normalizedCurrent = currentMarkdown.trim()
          const normalizedSaved = lastSavedContentRef.current.trim()

          // 如果内容一致，确保编辑状态为false
          if (normalizedCurrent === normalizedSaved) {
            setIsEditing(false)
          }
        } catch (error) {}
      }, 500)

      return () => clearTimeout(timer)
    }

    return undefined
  }, [editor, currentFile, lastLoadedFileRef.current])

  // Internal save function with auto-save flag
  const saveFileContentInternal = useCallback(
    async (isAutoSave: boolean = false) => {
      if (!currentFolder || !currentFile) {
        if (!isAutoSave) {
          Toast.warning('没有选择文件')
        }
        return
      }

      // 记录保存开始时间
      const saveStartTime = performance.now()

      // 取消正在进行的自动保存
      smartDebouncerRef.current.cancel()

      // 只有手动保存才改变UI状态，自动保存保持完全静默
      if (!isAutoSave) {
        setIsSaving(true)
        setAutoSaveStatus('saving')
      }
      try {
        // 获取编辑器内容的JSON格式（保留标签信息）
        const blocks = editor.topLevelBlocks

        // 提取标签信息
        const tags = extractTags(blocks)

        // 更新标签列表状态
        setTagList(tags)

        // Convert blocks to Markdown for saving
        const markdown = await editor.blocksToMarkdownLossy(editor.document)

        const filePath = `${currentFolder}/${currentFile}`

        // 将标签信息添加到保存数据中
        const tagsHeader = tags.length > 0 ? `<!-- tags: ${tags.join(',')} -->\n\n` : ''
        const contentWithTags = tagsHeader + markdown

        const result = await window.api.markdown.save(filePath, contentWithTags)

        if (result.success) {
          // 记录保存完成时间和性能指标
          const saveEndTime = performance.now()
          const saveDuration = saveEndTime - saveStartTime
          performanceMonitor.recordEditorPerformance('save', saveDuration)
          performanceMonitor.recordUserAction('save')

          // 只有手动保存才显示成功提示
          if (!isAutoSave) {
            Toast.success('文件保存成功')
            setIsEditing(false) // 只有手动保存才重置编辑状态
          }

          // 只有手动保存才更新UI状态
          if (!isAutoSave) {
            setAutoSaveStatus('saved')
            // 5秒后清除"已保存"状态
            setTimeout(() => {
              setAutoSaveStatus('')
            }, 5000)
          }

          // Update the last saved content - 无论是否自动保存都要更新基准
          lastSavedContentRef.current = markdown

          // 更新冲突检测快照
          await conflictDetectorRef.current.createSnapshot(filePath, markdown)

          // 只有手动保存才通知父组件文件已改变，避免自动保存引起侧边栏闪烁
          if (!isAutoSave && onFileChanged) {
            onFileChanged()
          }

          // 刷新全局标签缓存（异步执行，不阻塞保存流程）
          refreshGlobalTagCache().catch(() => {
            // 刷新失败，继续执行
          })
        } else {
          // 只有手动保存才显示错误提示
          if (!isAutoSave) {
            Toast.error(`保存失败: ${result.error}`)
          }
          setAutoSaveStatus('')
        }
      } catch (error) {
        // 只有手动保存才显示错误提示
        if (!isAutoSave) {
          Toast.error('保存文件内容失败')
        }
        setAutoSaveStatus('')
      } finally {
        // 只有手动保存才重置loading状态
        if (!isAutoSave) {
          setIsSaving(false)
        }
      }
    },
    [currentFolder, currentFile, editor, onFileChanged, setTagList]
  )

  // Public save function for manual saves (button clicks, keyboard shortcuts)
  const saveFileContent = useCallback(async () => {
    await saveFileContentInternal(false)
  }, [saveFileContentInternal])

  // 智能自动保存处理函数
  const handleSmartAutoSave = useCallback(async () => {
    if (!currentFile || !currentFolder) return

    try {
      // 获取当前内容
      const markdown = await editor.blocksToMarkdownLossy(editor.document)
      const filePath = `${currentFolder}/${currentFile}`

      // 检查冲突
      const conflictResult = await conflictDetectorRef.current.checkConflict(filePath, markdown)

      if (conflictResult.hasConflict) {
        // 发现冲突，暂停自动保存并提示用户
        Toast.warning(`检测到文件冲突: ${conflictResult.message}`)
        return
      }

      // 执行自动保存
      await saveFileContentInternal(true)
    } catch (error) {
      // 保存失败，不显示错误提示（自动保存应该静默失败）
    }
  }, [currentFile, currentFolder, editor, saveFileContentInternal])

  // Handler for when the editor's content changes
  const handleEditorChange = useCallback(async () => {
    try {
      // Convert current blocks to Markdown for comparison
      const currentMarkdown = await editor.blocksToMarkdownLossy(editor.document)

      // 标准化内容比较：去除首尾空白字符
      const normalizedCurrent = currentMarkdown.trim()
      const normalizedSaved = lastSavedContentRef.current.trim()

      // Only set editing state if content actually changed
      if (normalizedCurrent !== normalizedSaved) {
        setIsEditing(true)

        // 记录编辑操作
        performanceMonitor.recordUserAction('edit')

        // 使用智能防抖器触发自动保存
        smartDebouncerRef.current.debounce(currentMarkdown, handleSmartAutoSave)
      } else {
        setIsEditing(false)
      }
    } catch (error) {
      // 处理内容变化检测错误
    }
  }, [editor, handleSmartAutoSave])

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

  // 处理恢复历史版本
  const handleRestoreHistory = async (content: string): Promise<void> => {
    if (editor && content) {
      try {
        setEditorContent(content)
        const timestamp = Date.now()
        setEditorKey(`editor-${timestamp}`)

        Toast.success('已恢复历史版本')
        setIsEditing(true)
      } catch (error) {
        Toast.error('恢复历史版本失败')
      }
    }
  }

  // 添加一个useEffect用于监听编辑器加载完成后的处理
  useEffect(() => {
    if (editor && currentFile) {
      // 在编辑器加载完成后，检查并修复可能的渲染问题
      const checkAndFixTagRendering = (): void => {
        try {
          // 获取当前编辑器的顶级块
          const blocks = editor.topLevelBlocks

          // 应用后处理，确保所有标签被正确渲染
          const processedBlocks = postprocessBlocksForTags(blocks)

          // 只有在处理前后有差异时才更新编辑器
          if (JSON.stringify(blocks) !== JSON.stringify(processedBlocks)) {
            editor.replaceBlocks(editor.document, processedBlocks)
          }
        } catch (error) {
          // 标签渲染检查失败，继续执行
        }
      }

      // 延迟执行，确保编辑器内容已完全加载
      const timer = setTimeout(checkAndFixTagRendering, 500)

      // 清理定时器
      return () => clearTimeout(timer)
    }

    return undefined
  }, [editor, currentFile])

  // 导出PDF文件
  const exportToPdf = useCallback(async () => {
    if (!currentFolder || !currentFile) {
      Toast.warning('没有选择文件')
      return
    }

    setIsExporting(true)
    try {
      // 获取编辑器内容
      const markdown = await editor.blocksToMarkdownLossy(editor.document)
      const filePath = `${currentFolder}/${currentFile}`

      // 调用API导出PDF
      const result = await (window.api.markdown as MarkdownAPI).exportToPdf(filePath, markdown)

      if (result.success) {
        Toast.success('PDF导出成功')
      } else {
        Toast.error(`导出失败: ${result.error}`)
      }
    } catch (error) {
      Toast.error('导出PDF失败')
    } finally {
      setIsExporting(false)
    }
  }, [currentFolder, currentFile, editor])

  // 导出DOCX文件
  const exportToDocx = useCallback(async () => {
    if (!currentFolder || !currentFile) {
      Toast.warning('没有选择文件')
      return
    }

    setIsExporting(true)
    try {
      // 获取编辑器内容
      const markdown = await editor.blocksToMarkdownLossy(editor.document)
      const filePath = `${currentFolder}/${currentFile}`

      // 调用API导出DOCX
      const result = await (window.api.markdown as MarkdownAPI).exportToDocx(filePath, markdown)

      if (result.success) {
        Toast.success('DOCX导出成功')
      } else {
        Toast.error(`导出失败: ${result.error}`)
      }
    } catch (error) {
      Toast.error('导出DOCX失败')
    } finally {
      setIsExporting(false)
    }
  }, [currentFolder, currentFile, editor])

  // 导出HTML文件
  const exportToHtml = useCallback(async () => {
    if (!currentFolder || !currentFile) {
      Toast.warning('没有选择文件')
      return
    }

    setIsExporting(true)
    try {
      // 获取编辑器内容
      const markdown = await editor.blocksToMarkdownLossy(editor.document)
      const filePath = `${currentFolder}/${currentFile}`

      // 调用API导出HTML
      const result = await (window.api.markdown as MarkdownAPI).exportToHtml(filePath, markdown)

      if (result.success) {
        Toast.success('HTML导出成功')
      } else {
        Toast.error(`导出失败: ${result.error}`)
      }
    } catch (error) {
      Toast.error('导出HTML失败')
    } finally {
      setIsExporting(false)
    }
  }, [currentFolder, currentFile, editor])

  return (
    <div
      className="editor-container"
      tabIndex={0} // 确保div可以接收键盘事件
      ref={editorContainerRef}
    >
      {currentFile && (
        <div className="editor-header">
          <div className="editor-title-container">
            <Typography.Title heading={4} style={{ margin: 0 }}>
              {title || ''}
            </Typography.Title>
            {isEditing && (
              <span style={{ marginLeft: 10, color: 'var(--semi-color-warning)' }}>*</span>
            )}
          </div>
          <div className="editor-right">
            <Space>
              {currentFile && (
                <>
                  <HistoryDropdown
                    filePath={
                      currentFolder && currentFile ? `${currentFolder}/${currentFile}` : undefined
                    }
                    onRestore={handleRestoreHistory}
                    disabled={!currentFile}
                    containerRef={editorContainerRef}
                  />
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
                  <Dropdown
                    render={
                      <Dropdown.Menu>
                        <Dropdown.Item onClick={exportToPdf}>导出PDF</Dropdown.Item>
                        <Dropdown.Item onClick={exportToDocx}>导出DOCX</Dropdown.Item>
                        <Dropdown.Item onClick={exportToHtml}>导出HTML</Dropdown.Item>
                      </Dropdown.Menu>
                    }
                    position="leftBottom"
                    autoAdjustOverflow={false}
                    trigger="click"
                    getPopupContainer={() => editorContainerRef.current || document.body}
                  >
                    <Button
                      theme="solid"
                      type="tertiary"
                      icon={<IconFile />}
                      suffix={<IconChevronDown />}
                      loading={isExporting}
                      disabled={!currentFile}
                    >
                      导出
                    </Button>
                  </Dropdown>
                  {autoSaveStatus === 'saving' && (
                    <Typography.Text type="tertiary">自动保存...</Typography.Text>
                  )}
                  {memoryWarning && (
                    <Typography.Text type="warning" style={{ fontSize: '12px' }}>
                      {memoryWarning}
                    </Typography.Text>
                  )}
                </>
              )}
            </Space>
          </div>
        </div>
      )}

      <div
        style={{
          flex: 1,
          overflow: currentFile ? 'auto' : 'hidden',
          height: 'calc(100% - 60px)'
        }}
      >
        {isLoading ? (
          <EditorSkeleton
            style={{
              height: '100%',
              width: '100%'
            }}
          />
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
                <li>使用@符号可以添加标签</li>
              </ul>
            </div>
          </div>
        ) : (
          <BlockNoteView
            editor={editor}
            key={editorKey}
            theme={editorThemes}
            // 禁用默认的 slash menu 以使用自定义的
            slashMenu={false}
            // 禁用默认的 formatting toolbar
            formattingToolbar={false}
            onChange={handleEditorChange}
            style={{ height: '100%' }}
          >
            {/* 使用标准格式工具栏 */}
            <StandardFormattingToolbar />
            {/* 使用标准斜杠菜单 */}
            <StandardSuggestionMenu editor={editor} />
            {/* 恢复标签功能的@菜单 - 支持全局标签 */}
            <SuggestionMenuController
              triggerCharacter="@"
              getItems={async (query) => {
                try {
                  // 获取全局标签建议
                  const globalTagItems = await getGlobalTagSuggestions(editor, query)

                  // 获取当前文档的标签建议
                  const localTagItems = getTagMenuItems(editor, tagList, query)

                  // 合并全局标签和本地标签，去重并排序
                  const allItems = [...globalTagItems, ...localTagItems]

                  // 去重：如果全局标签和本地标签有重复，优先显示全局标签
                  const uniqueItems = allItems.filter((item, index, arr) => {
                    const itemName = item.title
                      .replace('@', '')
                      .replace(' (已使用)', '')
                      .replace(' (本文档)', '')
                    return (
                      arr.findIndex((i) => {
                        const iName = i.title
                          .replace('@', '')
                          .replace(' (已使用)', '')
                          .replace(' (本文档)', '')
                        return iName === itemName
                      }) === index
                    )
                  })

                  return uniqueItems
                } catch (error) {
                  // 降级到仅使用本地标签
                  return getTagMenuItems(editor, tagList, query)
                }
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

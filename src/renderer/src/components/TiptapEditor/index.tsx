import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Toast, Dropdown } from '@douyinfe/semi-ui'
import { FiSave, FiFile, FiChevronDown } from 'react-icons/fi'
import { Content, Editor, EditorContent, useEditor } from '@tiptap/react'
import Placeholder from '@tiptap/extension-placeholder'
import { DndContext, closestCenter } from '@dnd-kit/core'
import { defaultExtensions } from './default-extensions'
import { cn } from './utils'
import './styles/tiptap-editor.css'
import EnhancedBubbleMenu from './EnhancedBubbleMenu'
import TableBubbleMenu from './TableBubbleMenu'
import ModelSelector from './ModelSelector'
import SlashMenu from './SlashMenu'
import { SmartDebouncer } from '../../utils/SmartDebouncer'
import { ConflictDetector } from '../../utils/ConflictDetector'
import { editorMemoryManager } from '../../utils/EditorMemoryManager'
import { performanceMonitor } from '../../utils/PerformanceMonitor'
import { scheduleRenderTask } from '../../utils/RenderOptimizer'
import CreateDialog from '../CreateDialog'
import HistoryDropdown from '../HistoryDropdown'
import { EditorSkeleton } from '../Skeleton'

// 预处理markdown内容，确保图片正确转换
const preprocessMarkdownContent = (content: string): string => {
  let processedContent = content
  
  // 处理图片语法: ![alt](src "title") 或 ![alt](src)
  processedContent = processedContent.replace(
    /!\[([^\]]*)\]\(([^)]+?)(?:\s+"([^"]*)")?\)/g,
    (_, alt, src, title) => {
      // 清理alt text中的特殊字符
      const cleanAlt = alt.replace(/"/g, '&quot;')
      const cleanTitle = title ? title.replace(/"/g, '&quot;') : cleanAlt
      
      return `<img src="${src}" alt="${cleanAlt}" title="${cleanTitle}" class="image" />`
    }
  )
  
  // 处理简单的markdown格式以避免显示为原始文本
  // 但保留复杂的格式让tiptap处理
  processedContent = processedContent
    // 处理粗体
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // 处理斜体
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // 处理代码
    .replace(/`([^`]+)`/g, '<code>$1</code>')
  
  return processedContent
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

export interface TiptapEditorProps {
  currentFolder?: string
  currentFile?: string
  onFileChanged?: () => void
}

interface BlockEditorProps {
  content?: Content
  placeholder?: string
  onCreate?: (editor: Editor) => void
  onUpdate?: (editor: Editor) => void
  currentFolder?: string
  currentFile?: string
}

  const BlockEditor = ({
    content,
    placeholder,
    onCreate,
    onUpdate,
    currentFolder,
    currentFile,
  }: BlockEditorProps) => {
    const [showSlashMenu, setShowSlashMenu] = useState(false)
    const [slashMenuPosition, setSlashMenuPosition] = useState<{ top: number; left: number } | undefined>()
    const editor = useEditor({
    extensions: [
      ...defaultExtensions,
      Placeholder.configure({
        placeholder: placeholder ?? '开始输入内容...',
        emptyEditorClass: cn('is-editor-empty text-gray-400'),
        emptyNodeClass: cn('is-empty text-gray-400'),
      }),
    ],
    content: content,
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    enableInputRules: false,
    enablePasteRules: false,
    enableCoreExtensions: true,
    editorProps: {
      attributes: {
        spellcheck: 'false',
        class: 'prose dark:prose-invert focus:outline-none max-w-full z-0',
        style: 'outline: none !important; border: none !important; box-shadow: none !important;'
      },
      handleDOMEvents: {
        // 优化滚动性能
        scroll: () => {
          return false
        },
        // 防抖输入事件
        input: () => {
          return false
        }
      },
    },
    onCreate: ({ editor }) => {
      onCreate?.(editor)
    },
    onUpdate: ({ editor }) => {
      onUpdate?.(editor)
      
      // Check if we should show the slash menu
      const { selection } = editor.state
      const { $from } = selection
      
      // 只在光标位置检查，不是选择范围
      if (selection.from !== selection.to) {
        if (showSlashMenu) {
          setShowSlashMenu(false)
          setSlashMenuPosition(undefined)
        }
        return
      }
      
      // 获取当前行的内容，检查是否是行首的"/"
      const currentLine = $from.parent.textContent
      const currentPos = $from.parentOffset
      
      // 检查是否是行首的"/"或者前面只有空格的"/"
      const textBeforeSlash = currentLine.substring(0, currentPos - 1)
      const isSlashAtLineStart = currentPos > 0 && 
        $from.parent.textBetween(currentPos - 1, currentPos) === '/' &&
        (textBeforeSlash.trim() === '' || textBeforeSlash === '')
      
      if (isSlashAtLineStart) {
        // 获取光标位置
        const coords = editor.view.coordsAtPos($from.pos)
        setSlashMenuPosition({ top: coords.top, left: coords.left })
        setShowSlashMenu(true)
      } else if (showSlashMenu) {
        // 如果用户继续输入其他内容，关闭slash menu
        const textAfterSlash = currentLine.substring(currentPos - 1)
        if (!textAfterSlash.startsWith('/')) {
          setShowSlashMenu(false)
          setSlashMenuPosition(undefined)
        }
      }
    },
    onContentError: ({ error }) => {
      console.error(error)
    },
  })

  // Clean up effect to ensure editor is properly destroyed
  useEffect(() => {
    return () => {
      if (editor) {
        editor.destroy()
      }
    }
  }, [editor])

  // Handle drag events
  const handleDragEnd = (event: any) => {
    const { active, over } = event

    if (active.id !== over.id) {
      // Implement block reordering logic
      // Specific sorting implementation can be added here
    }
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="block-editor-wrapper">
        {editor && (
          <>
            <EnhancedBubbleMenu editor={editor} />
            <TableBubbleMenu editor={editor} />
            <SlashMenu 
              editor={editor} 
              isOpen={showSlashMenu}
              onClose={() => {
                setShowSlashMenu(false)
                setSlashMenuPosition(undefined)
                // 确保编辑器重新获得焦点
                setTimeout(() => {
                  editor.commands.focus()
                }, 100)
              }}
              onOpen={() => setShowSlashMenu(true)}
              position={slashMenuPosition}
              currentFolder={currentFolder}
              currentFile={currentFile}
            />
          </>
        )}
        <EditorContent
          editor={editor}
          className="tiptap-editor-content"
        />
      </div>
    </DndContext>
  )
}

const TiptapEditor: React.FC<TiptapEditorProps> = ({ currentFolder, currentFile, onFileChanged }) => {
  const [title, setTitle] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isEditing, setIsEditing] = useState<boolean>(false)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [isExporting, setIsExporting] = useState<boolean>(false)
  const [editorContent, setEditorContent] = useState<string>('')
  const [editorKey, setEditorKey] = useState<string>('tiptap-editor-0')
  const [autoSaveStatus, setAutoSaveStatus] = useState<string>('')
  const [currentModelId, setCurrentModelId] = useState<string>('')
  const lastSavedContentRef = useRef<string>('')
  const lastLoadedFileRef = useRef<string | null>(null)
  const editorRef = useRef<Editor | null>(null)
  const editorContainerRef = useRef<HTMLDivElement>(null)

  // 智能保存相关实例 - 3秒无操作自动保存
  const smartDebouncerRef = useRef<SmartDebouncer>(
    new SmartDebouncer({
      fastTypingDelay: 3000,    // 快速输入时3秒保存
      normalDelay: 3000,        // 正常输入时3秒保存
      pauseDelay: 3000,         // 停顿后3秒保存
      minContentChange: 1       // 最小1个字符变化即触发
    })
  )
  const conflictDetectorRef = useRef<ConflictDetector>(new ConflictDetector())

  const [memoryWarning, setMemoryWarning] = useState<string>('')
  const memoryCheckIntervalRef = useRef<NodeJS.Timeout>()

  const [showCreateDialog, setShowCreateDialog] = useState<boolean>(false)
  const [createDialogType, setCreateDialogType] = useState<'folder' | 'note'>('note')
  const [availableFolders, setAvailableFolders] = useState<string[]>(['default'])

  // 内存管理初始化
  useEffect(() => {
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

    editorMemoryManager.addEventListener('warning', handleMemoryEvent)
    editorMemoryManager.addEventListener('critical', handleMemoryEvent)
    editorMemoryManager.addEventListener('cleanup', handleMemoryEvent)

    memoryCheckIntervalRef.current = setInterval(async () => {
      if (currentFile && editorContent) {
        const cacheKey = `${currentFolder}/${currentFile}`
        editorMemoryManager.cacheContent(cacheKey, editorContent, 4)
      }
    }, 30000)

    return () => {
      editorMemoryManager.removeEventListener('warning', handleMemoryEvent)
      editorMemoryManager.removeEventListener('critical', handleMemoryEvent)
      editorMemoryManager.removeEventListener('cleanup', handleMemoryEvent)

      if (memoryCheckIntervalRef.current) {
        clearInterval(memoryCheckIntervalRef.current)
      }
    }
  }, [currentFile, currentFolder, editorContent, memoryWarning])

  // 清空编辑器内容的辅助函数
  const clearEditor = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.commands.setContent('')
    }
    setEditorContent('')
    lastSavedContentRef.current = ''
    setIsEditing(false)
    smartDebouncerRef.current.cancel()
    conflictDetectorRef.current.clearAllSnapshots()
  }, [])

  // 加载文件内容
  const loadFileContent = useCallback(async () => {
    if (!currentFolder || !currentFile) {
      return
    }

    const filePath = `${currentFolder}/${currentFile}`

    if (filePath === lastLoadedFileRef.current) {
      return
    }

    const loadStartTime = performance.now()

    clearEditor()
    setIsLoading(true)

    try {
      const result = await window.api.markdown.readFile(filePath)

      if (result.success && result.content !== undefined) {
        lastLoadedFileRef.current = filePath

        const processedData = await scheduleRenderTask({
          id: `process-content-${filePath}`,
          priority: 'high',
          callback: async () => {
            // 移除标签信息行
            let contentWithoutTags = result.content!.replace(/<!-- tags: ([^>]*) -->\n\n/, '')
            return { contentWithoutTags }
          }
        })

        setEditorContent(processedData.contentWithoutTags)
        setEditorKey(`tiptap-editor-${Date.now()}`)
        setTitle(currentFile.replace('.md', ''))

        // 设置编辑器内容 - 确保markdown正确解析
        if (editorRef.current) {
          try {
            // 方法1: 首先尝试直接设置内容
            editorRef.current.commands.setContent(processedData.contentWithoutTags)
            
            // 等待内容设置完成后检查是否正确解析
            setTimeout(() => {
              if (editorRef.current) {
                const currentHTML = editorRef.current.getHTML()
                const hasImageMarkdown = processedData.contentWithoutTags.includes('![')
                const hasImageHTML = currentHTML.includes('<img')
                
                console.log('Image parsing check:', {
                  hasImageMarkdown,
                  hasImageHTML,
                  originalContent: processedData.contentWithoutTags,
                  currentHTML
                })
                
                // 如果有图片markdown但没有转换为HTML，使用替代方法
                if (hasImageMarkdown && !hasImageHTML) {
                  console.log('Images not parsed, applying manual preprocessing')
                  // 方法2: 手动预处理markdown内容
                  const preprocessedContent = preprocessMarkdownContent(processedData.contentWithoutTags)
                  console.log('Preprocessed content:', preprocessedContent)
                  editorRef.current.commands.setContent(preprocessedContent)
                }
              }
            }, 200)
            
          } catch (error) {
            console.warn('Failed to set content with markdown parsing:', error)
            // 后备方案：使用预处理的HTML
            const fallbackHTML = preprocessMarkdownContent(processedData.contentWithoutTags)
            editorRef.current.commands.setContent(fallbackHTML)
          }
        }

        setIsEditing(false)

        const loadEndTime = performance.now()
        const loadDuration = loadEndTime - loadStartTime
        performanceMonitor.recordEditorPerformance('load', loadDuration)
        performanceMonitor.recordUserAction('load')

        // 设置基准内容
        scheduleRenderTask({
          id: `set-baseline-${filePath}`,
          priority: 'low',
          callback: async () => {
            try {
              await new Promise(resolve => setTimeout(resolve, 100))
              if (editorRef.current) {
                const markdown = editorRef.current.getText() || processedData.contentWithoutTags
                lastSavedContentRef.current = markdown
                await conflictDetectorRef.current.createSnapshot(filePath, markdown)
              }
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
  }, [currentFolder, currentFile, clearEditor])

  // 当前文件改变时加载内容
  useEffect(() => {
    loadFileContent()
  }, [currentFolder, currentFile, loadFileContent])

  // 智能自动保存处理函数
  const handleSmartAutoSave = useCallback(async () => {
    if (!currentFile || !currentFolder || !editorRef.current) return

    try {
      // Type assertion to access markdown storage
      const markdown = (editorRef.current.storage as any).markdown?.getMarkdown() || editorRef.current.getHTML()
      const filePath = `${currentFolder}/${currentFile}`

      const conflictResult = await conflictDetectorRef.current.checkConflict(filePath, markdown)

      if (conflictResult.hasConflict) {
        Toast.warning(`检测到文件冲突: ${conflictResult.message}`)
        return
      }

      await saveFileContentInternal(true)
    } catch (error) {
      // 自动保存失败，静默处理
    }
  }, [currentFile, currentFolder])

  // 内部保存函数
  const saveFileContentInternal = useCallback(
    async (isAutoSave: boolean = false) => {
      if (!currentFolder || !currentFile || !editorRef.current) {
        if (!isAutoSave) {
          Toast.warning('没有选择文件')
        }
        return
      }

      const saveStartTime = performance.now()

      smartDebouncerRef.current.cancel()

      if (!isAutoSave) {
        setIsSaving(true)
        setAutoSaveStatus('saving')
      }

      try {
        const markdown = (editorRef.current.storage as any).markdown?.getMarkdown() || editorRef.current.getHTML()
        const filePath = `${currentFolder}/${currentFile}`

        const result = await window.api.markdown.save(filePath, markdown)

        if (result.success) {
          const saveEndTime = performance.now()
          const saveDuration = saveEndTime - saveStartTime
          performanceMonitor.recordEditorPerformance('save', saveDuration)
          performanceMonitor.recordUserAction('save')

          // 无论是手动保存还是自动保存，都需要清除编辑状态指示器
          setIsEditing(false)

          if (!isAutoSave) {
            Toast.success('文件保存成功')
            setAutoSaveStatus('saved')
            setTimeout(() => {
              setAutoSaveStatus('')
            }, 5000)
          }

          lastSavedContentRef.current = markdown
          await conflictDetectorRef.current.createSnapshot(filePath, markdown)

          if (!isAutoSave && onFileChanged) {
            onFileChanged()
          }

        } else {
          if (!isAutoSave) {
            Toast.error(`保存失败: ${result.error}`)
          }
          setAutoSaveStatus('')
        }
      } catch (error) {
        if (!isAutoSave) {
          Toast.error('保存文件内容失败')
        }
        setAutoSaveStatus('')
      } finally {
        if (!isAutoSave) {
          setIsSaving(false)
        }
      }
    },
    [currentFolder, currentFile, onFileChanged]
  )

  // 公共保存函数
  const saveFileContent = useCallback(async () => {
    await saveFileContentInternal(false)
  }, [saveFileContentInternal])

  // 编辑器内容变化处理
  const handleEditorChange = useCallback(async () => {
    if (!editorRef.current) return

    try {
      const currentMarkdown = (editorRef.current.storage as any).markdown?.getMarkdown() || editorRef.current.getHTML()
      const normalizedCurrent = currentMarkdown.trim()
      const normalizedSaved = lastSavedContentRef.current.trim()

      if (normalizedCurrent !== normalizedSaved) {
        setIsEditing(true)
        performanceMonitor.recordUserAction('edit')
        smartDebouncerRef.current.debounce(currentMarkdown, handleSmartAutoSave)
      } else {
        setIsEditing(false)
      }
    } catch (error) {
      // 处理内容变化检测错误
    }
  }, [handleSmartAutoSave])

  // 编辑器创建回调
  const handleEditorCreate = useCallback((editor: Editor) => {
    editorRef.current = editor
  }, [])

  // 键盘快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault()
        if (currentFolder && currentFile) {
          saveFileContent()
        }
      }
      
      // 防止ESC键触发焦点高亮，但优先让BubbleMenu处理ESC
      if (e.key === 'Escape') {
        // 检查是否有文本选择（BubbleMenu可见）
        if (editorRef.current) {
          const selection = editorRef.current.state.selection
          const { from, to } = selection
          
          if (from !== to) {
            // 有文本选择时，让BubbleMenu处理ESC键
            return
          }
        }
        
        // 没有文本选择时，才处理焦点高亮
        e.preventDefault()
        if (document.activeElement) {
          (document.activeElement as HTMLElement).blur()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [currentFolder, currentFile, saveFileContent])

  // 加载可用文件夹
  useEffect(() => {
    const loadFolders = async (): Promise<void> => {
      try {
        const result = await window.api.markdown.getFolders()
        if (result.success && result.folders && result.folders.length > 0) {
          setAvailableFolders(result.folders)
        } else {
          setAvailableFolders(['default'])
        }
      } catch (error) {
        setAvailableFolders(['default'])
      }
    }

    loadFolders()
  }, [])

  const handleOpenCreateFile = useCallback(() => {
    setCreateDialogType('note')
    setShowCreateDialog(true)
  }, [])

  const handleRestoreHistory = async (content: string): Promise<void> => {
    if (editorRef.current && content) {
      try {
        setEditorContent(content)
        
        // 使用和加载文件相同的逻辑处理内容
        editorRef.current.commands.setContent(content)
        
        // 检查图片是否正确解析
        setTimeout(() => {
          if (editorRef.current) {
            const currentHTML = editorRef.current.getHTML()
            const hasImageMarkdown = content.includes('![')
            const hasImageHTML = currentHTML.includes('<img')
            
            if (hasImageMarkdown && !hasImageHTML) {
              const preprocessedContent = preprocessMarkdownContent(content)
              editorRef.current.commands.setContent(preprocessedContent)
            }
          }
        }, 200)
        
        const timestamp = Date.now()
        setEditorKey(`tiptap-editor-${timestamp}`)

        Toast.success('已恢复历史版本')
        setIsEditing(true)
      } catch (error) {
        Toast.error('恢复历史版本失败')
      }
    }
  }

  // 导出功能
  const exportToPdf = useCallback(async () => {
    if (!currentFolder || !currentFile || !editorRef.current) {
      Toast.warning('没有选择文件')
      return
    }

    setIsExporting(true)
    try {
      const markdown = (editorRef.current.storage as any).markdown?.getMarkdown() || editorRef.current.getHTML()
      const filePath = `${currentFolder}/${currentFile}`

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
  }, [currentFolder, currentFile])

  const exportToDocx = useCallback(async () => {
    if (!currentFolder || !currentFile || !editorRef.current) {
      Toast.warning('没有选择文件')
      return
    }

    setIsExporting(true)
    try {
      const markdown = (editorRef.current.storage as any).markdown?.getMarkdown() || editorRef.current.getHTML()
      const filePath = `${currentFolder}/${currentFile}`

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
  }, [currentFolder, currentFile])

  const exportToHtml = useCallback(async () => {
    if (!currentFolder || !currentFile || !editorRef.current) {
      Toast.warning('没有选择文件')
      return
    }

    setIsExporting(true)
    try {
      const markdown = (editorRef.current.storage as any).markdown?.getMarkdown() || editorRef.current.getHTML()
      const filePath = `${currentFolder}/${currentFile}`

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
  }, [currentFolder, currentFile])

  return (
    <div
      className="editor-container"
      tabIndex={0}
      ref={editorContainerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
      }}
    >
      {currentFile && (
        <div className="editor-header">
          <div className="editor-title-container">
            <h4 style={{ margin: 0 }}>
              {title || ''}
            </h4>
            {isEditing && (
              <span className="editing-indicator">*</span>
            )}
          </div>
          <div className="editor-right">
            <div className="editor-actions">
              {currentFile && (
                <>
                  <ModelSelector 
                    onModelChange={setCurrentModelId} 
                    currentModelId={currentModelId} 
                  />
                  <HistoryDropdown
                    filePath={
                      currentFolder && currentFile ? `${currentFolder}/${currentFile}` : undefined
                    }
                    onRestore={handleRestoreHistory}
                    disabled={!currentFile}
                    containerRef={editorContainerRef}
                  />
                  <button
                    className="editor-button primary"
                    onClick={saveFileContent}
                    disabled={isSaving || !currentFile}
                  >
                    {isSaving ? (
                      <div className="spinner"></div>
                    ) : (
                      <FiSave size={16} />
                    )}
                    <span>保存</span>
                  </button>
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
                    <button
                      className="editor-button tertiary"
                      disabled={isExporting || !currentFile}
                    >
                      {isExporting ? (
                        <div className="spinner"></div>
                      ) : (
                        <>
                          <FiFile size={16} />
                          <span>导出</span>
                          <FiChevronDown size={16} />
                        </>
                      )}
                    </button>
                  </Dropdown>
                  {autoSaveStatus === 'saving' && (
                    <span className="auto-save-status">自动保存...</span>
                  )}
                  {memoryWarning && (
                    <span className="memory-warning">{memoryWarning}</span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="editor-content"
        style={{
          flex: 1,
          overflow: currentFile ? 'auto' : 'hidden',
          minHeight: 0
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
            <p style={{ fontSize: '16px', maxWidth: '500px', marginBottom: '1.5rem' }}>
              请从左侧边栏选择一个文件开始编辑，或者创建一个新的Markdown文件
            </p>
            <div
              style={{
                display: 'flex',
                gap: '1rem',
                flexWrap: 'wrap',
                justifyContent: 'center'
              }}
            >
              <button
                className="editor-button primary"
                onClick={handleOpenCreateFile}
              >
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
                <span>创建文件</span>
              </button>
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
              <strong style={{ marginBottom: '0.5rem', display: 'block' }}>
                提示与快捷键:
              </strong>
              <ul style={{ textAlign: 'left', margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
                <li>
                  使用 <code>Ctrl+S</code> 保存文件
                </li>
                <li>支持代码块高亮和Markdown格式化</li>
                <li>基于Tiptap的现代化编辑器</li>
              </ul>
            </div>
          </div>
        ) : (
          <BlockEditor
            content={editorContent}
            key={editorKey}
            placeholder="开始输入内容..."
            onCreate={handleEditorCreate}
            onUpdate={handleEditorChange}
            currentFolder={currentFolder}
            currentFile={currentFile}
          />
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
              if (createDialogType === 'note') {
                const targetFolder = folder || 'default'
                const filePath = `${targetFolder}/${name}.md`
                const result = await window.api.markdown.save(filePath, '# ' + name)

                if (result.success) {
                  Toast.success('创建文件成功')
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

export default TiptapEditor
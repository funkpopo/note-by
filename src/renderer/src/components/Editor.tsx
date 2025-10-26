/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable react/prop-types */
import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useEditor, EditorContent, ReactRenderer, ReactNodeViewRenderer } from '@tiptap/react'
import { StarterKit } from '@tiptap/starter-kit'
import { Placeholder } from '@tiptap/extension-placeholder'
import { Underline } from '@tiptap/extension-underline'
import { Typography } from '@tiptap/extension-typography'
import { Highlight } from '@tiptap/extension-highlight'
import { TextAlign } from '@tiptap/extension-text-align'
import { Link } from '@tiptap/extension-link'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableHeader } from '@tiptap/extension-table-header'
import { TableCell } from '@tiptap/extension-table-cell'
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { CharacterCount } from '@tiptap/extension-character-count'
import { Toast } from '@douyinfe/semi-ui'
import { EditorSkeleton } from './Skeleton'
import { withLazyLoad, SmallComponentLoader, LazyVersionComparison } from './LazyComponents'
const VersionComparisonLazy = withLazyLoad(LazyVersionComparison, SmallComponentLoader)
import { InlineDiffExtension } from '../extensions/InlineDiffExtension'
import { editorMemoryManager } from '../utils/EditorMemoryManager'
import SlashMenu, { getSuggestionItems } from './SlashMenu'
import tippy from 'tippy.js'
import { IconEdit } from '@douyinfe/semi-icons'
import { EditorHeader } from './EditorHeader'
import { onEditorFinalized } from '../utils/PostRenderTriggers'
import { TableBubbleMenu, TextBubbleMenu } from './EditorBubbleMenus'
import { uploadImage } from './editorUtils'
import {
  CustomImageExtension,
  IframeExtension,
  SlashCommands,
  MarkdownShortcuts,
  CodeBlockComponent,
  lowlight
} from './EditorExtensions'
import './Editor.css'

export interface EditorProps {
  content?: string
  placeholder?: string
  onUpdate?: (content: string) => void
  editable?: boolean
  className?: string
  currentFolder?: string
  currentFile?: string
  onFileChanged?: () => void
}

// 欢迎页面组件
const WelcomePage: React.FC = () => {
  return (
    <div className="welcome-page">
      <div className="welcome-content">
        <div className="welcome-icon">
          <IconEdit size="extra-large" />
        </div>
        <h1 className="welcome-title">开始写作</h1>
        <p className="welcome-description">选择左侧的文件夹和文档开始编辑，或者创建新的文档。</p>
      </div>
    </div>
  )
}

const Editor: React.FC<EditorProps> = ({
  content = '',
  placeholder = '开始写作...',
  onUpdate,
  editable = true,
  className = '',
  currentFolder,
  currentFile,
  onFileChanged
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [loadedContent, setLoadedContent] = useState('')
  const [isProgressiveLoading, setIsProgressiveLoading] = useState(false)
  const progressiveCancelRef = useRef<{ token: string } | null>(null)
  const pendingAppendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const currentFileRef = useRef<{ folder?: string; file?: string }>({})
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastEditTimeRef = useRef<number>(0)
  const isEditingRef = useRef<boolean>(false)
  const hasUnsavedChangesRef = useRef(hasUnsavedChanges)
  const unsavedChangeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editorUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onUpdateRef = useRef(onUpdate)

  // 冲突对比视图状态
  const [conflictVisible, setConflictVisible] = useState(false)
  const [conflictHistory, setConflictHistory] = useState<{
    id: number
    filePath: string
    content: string
    timestamp: number
  } | null>(null)

  useEffect(() => {
    hasUnsavedChangesRef.current = hasUnsavedChanges
  }, [hasUnsavedChanges])

  useEffect(() => {
    onUpdateRef.current = onUpdate
  }, [onUpdate])

  // 清理所有未处理的diff节点（优化版本）
  const clearAllDiffNodes = useCallback((editorInstance: any) => {
    if (!editorInstance) return

    const { state } = editorInstance
    const { tr } = state
    let hasChanges = false
    const diffNodes: { pos: number; size: number; originalText: string }[] = []

    // 收集所有diff节点信息
    state.doc.descendants((node: any, pos: number) => {
      if (node.type.name === 'inlineDiff') {
        diffNodes.push({
          pos,
          size: node.nodeSize,
          originalText: node.attrs.originalText || ''
        })
        return false
      }
      return true
    })

    // 从后往前处理，避免位置偏移
    diffNodes.reverse().forEach(({ pos, size, originalText }) => {
      tr.replaceWith(pos, pos + size, editorInstance.schema.text(originalText))
      hasChanges = true
    })

    if (hasChanges) {
      tr.setMeta('addToHistory', false) // keep history intact when removing diff nodes
      editorInstance.view.dispatch(tr)

      // 释放内存
      diffNodes.length = 0

      // 通知垃圾回收
      if (typeof window !== 'undefined' && (window as any).gc) {
        setTimeout(() => (window as any).gc(), 100)
      }
    }
  }, [])

  // 读取文档内容
  const loadDocument = useCallback(async (folder: string, file: string) => {
    if (!folder || !file) return

    setIsLoading(true)
    try {
      // cancel any previous progressive appends
      if (pendingAppendTimerRef.current) {
        clearTimeout(pendingAppendTimerRef.current)
        pendingAppendTimerRef.current = null
      }
      progressiveCancelRef.current = null

      const filePath = `${folder}/${file}`
      const result = await window.api.markdown.readFile(filePath)

      if (result.success && result.content !== undefined) {
        const html = result.content
        // 对超大文档启用渐进分块加载，避免一次性注入导致卡顿
        const PROGRESSIVE_THRESHOLD = 120_000 // ~120KB
        const useProgressive = typeof html === 'string' && html.length > PROGRESSIVE_THRESHOLD

        if (useProgressive) {
          setIsProgressiveLoading(true)
          setLoadedContent('') // 初始不向 useEditor 注入，避免重建
          // 生成新取消令牌
          const token = `${Date.now()}_${Math.random()}`
          progressiveCancelRef.current = { token }

          try {
            const worker = new Worker(new URL('../workers/htmlChunkWorker.ts', import.meta.url), {
              type: 'module'
            })
            worker.onmessage = (evt: MessageEvent<{ chunks: string[] }>) => {
              const chunks = evt.data?.chunks || [html]
              // 若已切换文档或取消，直接丢弃
              if (!progressiveCancelRef.current || progressiveCancelRef.current.token !== token) {
                worker.terminate()
                return
              }
              // 首批内容
              const first = chunks.shift() || ''
              if (editor) {
                // 使用 setContent 注入首批内容
                editor.commands.setContent(first, false, { preserveWhitespace: false })
              } else {
                // 若编辑器尚未可用，暂存到状态（触发一次性初始化）
                setLoadedContent(first)
              }

              // 逐批追加剩余内容
              const appendBatches = () => {
                if (!progressiveCancelRef.current || progressiveCancelRef.current.token !== token) {
                  return
                }
                if (!editor || chunks.length === 0) {
                  setIsProgressiveLoading(false)
                  return
                }
                const batch = chunks.shift() as string
                // 将光标移到末尾以追加
                try {
                  const endPos = editor.state.doc.content.size
                  editor.commands.setTextSelection(endPos)
                  editor.chain().insertContent(batch).run()
                } catch {
                  // 回退：合并剩余直接替换
                  editor.commands.setContent(editor.getHTML() + batch)
                }
                // 使用小延迟或空闲回调，避免长任务阻塞
                pendingAppendTimerRef.current = setTimeout(appendBatches, 8)
              }

              pendingAppendTimerRef.current = setTimeout(appendBatches, 0)
              worker.terminate()
            }
            worker.postMessage({ html, approxChunkSize: 60_000, enableLazyMedia: true })
          } catch {
            // 失败时回退为一次性注入
            setLoadedContent(html)
            setIsProgressiveLoading(false)
          }
        } else {
          setLoadedContent(html)
        }
        setHasUnsavedChanges(false)
      } else {
        Toast.error(`加载文档失败: ${result.error || '未知错误'}`)
        setLoadedContent('')
      }
    } catch (error) {
      console.error('Error loading document:', error)
      Toast.error(`加载文档失败: ${error instanceof Error ? error.message : '未知错误'}`)
      setLoadedContent('')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 判断是否同一文件（使用相对路径结尾匹配）
  const isSameCurrentFile = useCallback(
    (absLocalPath: string): boolean => {
      if (!currentFolder || !currentFile) return false
      const rel = `${currentFolder}/${currentFile}`.replace(/\\/g, '/').replace(/^\/?/, '')
      const norm = (absLocalPath || '').replace(/\\/g, '/')
      return norm.endsWith('/' + rel) || norm === rel
    },
    [currentFolder, currentFile]
  )

  // 打开冲突版本对比
  const openConflictComparison = useCallback(
    async (payload: { localPath: string; conflictFilePath: string; timestamp?: number }) => {
      if (!isSameCurrentFile(payload.localPath)) {
        try {
          sessionStorage.setItem('pendingConflict', JSON.stringify(payload))
        } catch {}
        return
      }
      try {
        const res = await window.api.markdown.readFile(payload.conflictFilePath)
        if (!res.success || res.content === undefined) return
        // 记录冲突副本为“历史项”，用于 VersionComparison props
        setConflictHistory({
          id: Date.now(),
          filePath: payload.conflictFilePath,
          content: String(res.content),
          timestamp: payload.timestamp || Date.now()
        })
        setConflictVisible(true)
      } catch {}
    },
    [isSameCurrentFile]
  )

  // 监听冲突事件（云存储统一）
  useEffect(() => {
    const off = window.api.cloudStorage?.onConflict?.((payload) => {
      void openConflictComparison(payload)
    })
    return () => {
      try {
        off && off()
      } catch {}
    }
  }, [openConflictComparison])

  // 初始挂载或切换文件时检查是否有挂起的冲突
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('pendingConflict')
      if (raw) {
        const payload = JSON.parse(raw)
        if (payload && payload.localPath && payload.conflictFilePath) {
          if (isSameCurrentFile(payload.localPath)) {
            sessionStorage.removeItem('pendingConflict')
            void openConflictComparison(payload)
          }
        }
      }
    } catch {}
  }, [currentFolder, currentFile, isSameCurrentFile, openConflictComparison])

  // 序列化操作较重，封装成函数便于复用和调度
  const flushEditorUpdate = useCallback((editorInstance: any) => {
    if (!editorInstance) return

    const html = editorInstance.getHTML()
    onUpdateRef.current?.(html)
  }, [])

  // 使用短延迟批量处理 onUpdate，减少连续输入时的阻塞
  const scheduleSerializedUpdate = useCallback(
    (editorInstance: any) => {
      if (editorUpdateTimeoutRef.current) {
        clearTimeout(editorUpdateTimeoutRef.current)
      }

      editorUpdateTimeoutRef.current = setTimeout(() => {
        editorUpdateTimeoutRef.current = null
        flushEditorUpdate(editorInstance)
      }, 200)
    },
    [flushEditorUpdate]
  )

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          code: false,
          codeBlock: false
        }),
        Placeholder.configure({
          placeholder
        }),
        Underline,
        Typography,
        Highlight.configure({
          multicolor: true,
          HTMLAttributes: {
            class: 'editor-highlight'
          }
        }),
        TextAlign.configure({
          types: ['heading', 'paragraph']
        }),
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            class: 'editor-link'
          }
        }),
        CustomImageExtension,
        Table.configure({
          resizable: true
        }),
        TableRow,
        TableHeader,
        TableCell,
        CodeBlockLowlight.configure({
          lowlight,
          defaultLanguage: 'plaintext'
        }).extend({
          addNodeView() {
            return ReactNodeViewRenderer(CodeBlockComponent)
          }
        }),
        CharacterCount.configure({
          limit: 50000
        }),
        SlashCommands.configure({
          suggestion: {
            items: (props: any) =>
              getSuggestionItems({
                ...props,
                currentFolder,
                currentFile,
                uploadImageFn: async (file: File) => {
                  if (!currentFolder || !currentFile) {
                    throw new Error('请先选择或创建一个文档')
                  }
                  return uploadImage(file, currentFolder, currentFile)
                }
              }),
            render: () => {
              let component: ReactRenderer | null = null
              let popup: any = null

              return {
                onStart: (props: any) => {
                  component = new ReactRenderer(SlashMenu, {
                    props,
                    editor: props.editor
                  })

                  if (!props.clientRect) {
                    return
                  }

                  popup = tippy('body', {
                    getReferenceClientRect: props.clientRect,
                    appendTo: () => document.body,
                    content: component.element,
                    showOnCreate: true,
                    interactive: true,
                    trigger: 'manual',
                    placement: 'bottom-start'
                  })
                },

                onUpdate(props: any) {
                  component?.updateProps(props)

                  if (!props.clientRect) {
                    return
                  }

                  popup?.[0]?.setProps({
                    getReferenceClientRect: props.clientRect
                  })
                },

                onKeyDown(props: any) {
                  if (props.event.key === 'Escape') {
                    popup?.[0]?.hide()
                    return true
                  }

                  return (component?.ref as any)?.onKeyDown?.(props.event) || false
                },

                onExit() {
                  popup?.[0]?.destroy()
                  component?.destroy()
                }
              }
            }
          }
        }),
        MarkdownShortcuts,
        IframeExtension,
        InlineDiffExtension
      ],
      content: loadedContent || content,
      editable,
      onUpdate: ({ editor }) => {
        // 更新编辑时间，但延迟设置 hasUnsavedChanges 以减少频繁触发
        lastEditTimeRef.current = Date.now()
        isEditingRef.current = true

        if (!hasUnsavedChangesRef.current) {
          if (unsavedChangeTimerRef.current) {
            clearTimeout(unsavedChangeTimerRef.current)
          }

          unsavedChangeTimerRef.current = setTimeout(() => {
            unsavedChangeTimerRef.current = null
            hasUnsavedChangesRef.current = true
            setHasUnsavedChanges(true)
          }, 500)
        }

        scheduleSerializedUpdate(editor)
      },
      editorProps: {
        attributes: {
          class: 'editor-content'
        },
        handleDrop: (view, event, _slice, moved) => {
          if (
            !moved &&
            event.dataTransfer &&
            event.dataTransfer.files &&
            event.dataTransfer.files[0]
          ) {
            const file = event.dataTransfer.files[0]

            // 检查是否为图片文件
            if (file.type.startsWith('image/')) {
              // 检查文件大小 (5MB)
              if (file.size > 5 * 1024 * 1024) {
                Toast.error('图片文件不能超过 5MB')
                return true
              }

              // 上传图片
              if (currentFolder && currentFile) {
                Toast.info('正在上传图片...')
                uploadImage(file, currentFolder, currentFile)
                  .then((url) => {
                    const { schema } = view.state
                    const coordinates = view.posAtCoords({
                      left: event.clientX,
                      top: event.clientY
                    })
                    if (coordinates) {
                      const node = schema.nodes.image.create({ src: url })
                      const transaction = view.state.tr.insert(coordinates.pos, node)
                      view.dispatch(transaction)
                      Toast.success('图片上传成功')
                    }
                  })
                  .catch((error) => {
                    Toast.error(error instanceof Error ? error.message : '图片上传失败')
                  })
              } else {
                Toast.error('请先选择或创建一个文档')
              }
              return true
            }
          }
          return false
        }
      }
    },
    [loadedContent, content, editable, placeholder, currentFolder, currentFile]
  )

  // 保存文档内容
  const saveDocument = useCallback(
    async (isAutoSave = false) => {
      if (!currentFolder || !currentFile || !editor) return

      // 保存前先清理所有未处理的diff节点
      clearAllDiffNodes(editor)

      setIsSaving(true)
      try {
        const filePath = `${currentFolder}/${currentFile}`
        const content = editor.getHTML()
        const result = await window.api.markdown.save(filePath, content)

        if (result.success) {
          setHasUnsavedChanges(false)
          hasUnsavedChangesRef.current = false
          if (unsavedChangeTimerRef.current) {
            clearTimeout(unsavedChangeTimerRef.current)
            unsavedChangeTimerRef.current = null
          }
          // 只有手动保存才显示Toast提示
          if (!isAutoSave) {
            Toast.success(`文档已保存`)
          }
          onFileChanged?.()
          // Trigger tag refresh and analysis invalidation after a finalized save (debounced)
          try {
            onEditorFinalized()
          } catch {}
        } else {
          Toast.error(`保存失败: ${result.error || '未知错误'}`)
        }
      } catch (error) {
        console.error('Error saving document:', error)
        Toast.error(`保存失败: ${error instanceof Error ? error.message : '未知错误'}`)
      } finally {
        setIsSaving(false)
      }
    },
    [currentFolder, currentFile, onFileChanged, editor, clearAllDiffNodes]
  )

  // 自动保存功能（优化版本 - 增强防抖机制）
  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }

    // 记录编辑状态和时间
    const now = Date.now()
    lastEditTimeRef.current = now
    isEditingRef.current = true

    // 停止编辑状态的检测定时器
    setTimeout(() => {
      // 如果 1 秒内没有新的编辑，认为用户停止了编辑
      if (Date.now() - lastEditTimeRef.current >= 1000) {
        isEditingRef.current = false
      }
    }, 1000)

    autoSaveTimeoutRef.current = setTimeout(() => {
      // 检查用户是否仍在编辑
      if (isEditingRef.current && Date.now() - lastEditTimeRef.current < 2000) {
        // 用户仍在编辑，延迟自动保存
        scheduleAutoSave()
        return
      }

      // 检查内存压力
      const editorElement = editor?.view?.dom?.closest('.tiptap-editor')
      const isAIProcessing = editorElement?.classList.contains('ai-processing')

      // 检查是否有AI相关窗口
      const hasAIWindows = !!(
        document.querySelector('.ai-loading-menu') ||
        document.querySelector('.ai-bubble-menu') ||
        document.querySelector('.inline-diff-wrapper')
      )

      // 检查内存使用情况
      const memoryPressure = editorMemoryManager
        ?.getCurrentMemoryUsage()
        .then((usage) => usage.percentage > 0.8)
        .catch(() => false)

      Promise.resolve(memoryPressure).then((highMemoryPressure) => {
        // 如果内存压力高，推迟自动保存
        if (highMemoryPressure) {
          setTimeout(() => scheduleAutoSave(), 5000)
          return
        }

        if (
          hasUnsavedChanges &&
          currentFolder &&
          currentFile &&
          editor &&
          !isAIProcessing &&
          !hasAIWindows &&
          !isEditingRef.current
        ) {
          saveDocument(true) // 传入 true 表示这是自动保存
        }
      })
    }, 10000) // 延长自动保存间隔到 10 秒
  }, [hasUnsavedChanges, currentFolder, currentFile, editor, saveDocument])

  // 当选中的文件发生变化时，加载新文档
  useEffect(() => {
    const prevFile = currentFileRef.current
    currentFileRef.current = { folder: currentFolder, file: currentFile }

    // 如果文件切换，清理所有diff节点
    if (prevFile.folder !== currentFolder || prevFile.file !== currentFile) {
      if (editor) {
        clearAllDiffNodes(editor)
      }
    }

    if (
      currentFolder &&
      currentFile &&
      (prevFile.folder !== currentFolder || prevFile.file !== currentFile)
    ) {
      loadDocument(currentFolder, currentFile)
    }
  }, [currentFolder, currentFile, loadDocument, clearAllDiffNodes, editor])

  // 当加载的内容发生变化时，更新编辑器内容
  useEffect(() => {
    if (editor && loadedContent !== editor.getHTML()) {
      if (unsavedChangeTimerRef.current) {
        clearTimeout(unsavedChangeTimerRef.current)
        unsavedChangeTimerRef.current = null
      }

      if (editorUpdateTimeoutRef.current) {
        clearTimeout(editorUpdateTimeoutRef.current)
        editorUpdateTimeoutRef.current = null
      }

      if (pendingAppendTimerRef.current) {
        clearTimeout(pendingAppendTimerRef.current)
        pendingAppendTimerRef.current = null
      }

      progressiveCancelRef.current = null

      editor.commands.setContent(loadedContent)
      setHasUnsavedChanges(false)
      hasUnsavedChangesRef.current = false

      // 确保字符统计正确更新
      setTimeout(() => {
        if (editor.storage.characterCount) {
          editor.view.dispatch(editor.state.tr)
        }
      }, 0)
    }
  }, [loadedContent, editor])

  // 当内容变化时触发自动保存
  useEffect(() => {
    if (hasUnsavedChanges) {
      scheduleAutoSave()
    }
  }, [hasUnsavedChanges, scheduleAutoSave])

  // 组件卸载时清理定时器和diff节点，启动内存监控
  useEffect(() => {
    // 启动内存监控
    editorMemoryManager.startMonitoring()

    // 添加内存事件监听器
    const memoryEventListener = (eventType: string) => {
      if (eventType === 'critical') {
        Toast.warning('内存使用率过高，建议保存并刷新页面')
      }
      // 内存警告已通过 Toast 提示，不需要额外的 console 输出
    }

    editorMemoryManager.addEventListener('critical', memoryEventListener)
    editorMemoryManager.addEventListener('warning', memoryEventListener)

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }

      if (unsavedChangeTimerRef.current) {
        clearTimeout(unsavedChangeTimerRef.current)
        unsavedChangeTimerRef.current = null
      }

      if (editorUpdateTimeoutRef.current) {
        clearTimeout(editorUpdateTimeoutRef.current)
        editorUpdateTimeoutRef.current = null
      }

      if (editor) {
        flushEditorUpdate(editor)
      }

      // 清理所有diff节点
      if (editor) {
        clearAllDiffNodes(editor)
      }

      // 移除事件监听器并停止监控
      editorMemoryManager.removeEventListener('critical', memoryEventListener)
      editorMemoryManager.removeEventListener('warning', memoryEventListener)

      // 执行最终清理
      editorMemoryManager.performMemoryCleanup(true).finally(() => {
        // 清理完成
      })
    }
  }, [clearAllDiffNodes, editor, flushEditorUpdate])

  // 页面可见性变化监听，隐藏时清理diff节点
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && editor) {
        clearAllDiffNodes(editor)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [clearAllDiffNodes, editor])

  // 键盘快捷键保存
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault()
        saveDocument()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [saveDocument])

  if (!editor) {
    return <div className="editor-loading">编辑器加载中...</div>
  }

  // 如果没有选中文档，显示欢迎页面
  if (!currentFolder || !currentFile) {
    return (
      <div className={`tiptap-editor ${className}`}>
        <WelcomePage />
      </div>
    )
  }

  return (
    <div className={`tiptap-editor ${className}`}>
      {editable && (
        <EditorHeader
          currentFolder={currentFolder}
          currentFile={currentFile}
          hasUnsavedChanges={hasUnsavedChanges}
          isLoading={isLoading}
          isSaving={isSaving}
          currentContent={editor?.getHTML() || ''}
          onSave={saveDocument}
          onContentRestore={(content) => {
            editor.commands.setContent(content)
            setHasUnsavedChanges(true)
            Toast.success('历史版本已恢复')
          }}
        />
      )}

      {isLoading ? (
        <EditorSkeleton />
      ) : (
        <div className="editor-wrapper">
          <EditorContent editor={editor} />
          {isProgressiveLoading && (
            <div className="progressive-loading-indicator">正在分块加载长文档...</div>
          )}
          {editable && (
            <>
              <TableBubbleMenu
                editor={editor}
                currentFolder={currentFolder}
                currentFile={currentFile}
              />
              <TextBubbleMenu
                editor={editor}
                currentFolder={currentFolder}
                currentFile={currentFile}
              />
            </>
          )}
        </div>
      )}

      {editable && (
        <div className="editor-footer">
          <span className="character-count">{editor.storage.characterCount.characters()} 字</span>
        </div>
      )}
      {conflictVisible && conflictHistory && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            background: 'var(--semi-color-bg-0)'
          }}
        >
          <VersionComparisonLazy
            currentContent={editor?.getHTML() || ''}
            historyItem={conflictHistory}
            onClose={() => setConflictVisible(false)}
            onRestore={(content) => {
              try {
                editor.commands.setContent(content)
                setConflictVisible(false)
              } catch {}
            }}
          />
        </div>
      )}
    </div>
  )
}

export default Editor

/**
 * 虚拟滚动编辑器组件
 * 用于优化大文档的内存使用和渲染性能
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { StarterKit } from '@tiptap/starter-kit'
import { editorMemoryManager } from '../utils/EditorMemoryManager'
import { renderOptimizer, type RenderTask } from '../utils/RenderOptimizer'
import './VirtualScrollEditor.css'

interface VirtualScrollEditorProps {
  content: string
  onUpdate?: (content: string) => void
  itemHeight?: number
  containerHeight?: number
  overscan?: number
  chunkSize?: number
}

interface VirtualItem {
  index: number
  start: number
  size: number
  content: string
  rendered: boolean
}

const VirtualScrollEditor: React.FC<VirtualScrollEditorProps> = ({
  content,
  onUpdate,
  itemHeight = 24,
  containerHeight = 600,
  overscan = 5,
  chunkSize = 50
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [isScrolling, setIsScrolling] = useState(false)
  const [virtualItems, setVirtualItems] = useState<VirtualItem[]>([])
  const scrollTimeoutRef = useRef<NodeJS.Timeout>()

  // 将内容分割成行
  const lines = useMemo(() => {
    return content.split('\n')
  }, [content])

  // 创建虚拟项目
  const createVirtualItems = useCallback(() => {
    const items: VirtualItem[] = []
    let offset = 0

    for (let i = 0; i < lines.length; i++) {
      items.push({
        index: i,
        start: offset,
        size: itemHeight,
        content: lines[i],
        rendered: false
      })
      offset += itemHeight
    }

    return items
  }, [lines, itemHeight])

  // 计算可见范围
  const getVisibleRange = useCallback(() => {
    const start = Math.floor(scrollTop / itemHeight)
    const end = Math.min(
      start + Math.ceil(containerHeight / itemHeight),
      virtualItems.length - 1
    )

    return {
      start: Math.max(0, start - overscan),
      end: Math.min(virtualItems.length - 1, end + overscan)
    }
  }, [scrollTop, itemHeight, containerHeight, overscan, virtualItems.length])

  // 渲染可见项目
  const renderVisibleItems = useCallback(async () => {
    const { start, end } = getVisibleRange()
    
    // 分批渲染以避免阻塞主线程
    const tasks: RenderTask[] = []
    for (let i = start; i <= end; i += chunkSize) {
      const batchEnd = Math.min(i + chunkSize - 1, end)
      tasks.push({
        id: `render-batch-${i}-${batchEnd}`,
        priority: 'high',
        callback: async () => {
          // 批量更新虚拟项目的渲染状态
          setVirtualItems(prev => 
            prev.map(item => {
              if (item.index >= i && item.index <= batchEnd) {
                return { ...item, rendered: true }
              }
              return item
            })
          )
        }
      })
    }

    // 使用渲染优化器处理任务
    await Promise.all(tasks.map(task => renderOptimizer.addTask(task)))

    // 清理不可见的项目以节省内存
    setVirtualItems(prev => 
      prev.map(item => {
        if (item.index < start - overscan || item.index > end + overscan) {
          return { ...item, rendered: false }
        }
        return item
      })
    )
  }, [getVisibleRange, chunkSize, overscan])

  // 处理滚动事件
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop
    setScrollTop(newScrollTop)
    setIsScrolling(true)

    // 防抖处理
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }

    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false)
      
      // 在停止滚动后触发内存清理
      editorMemoryManager.performMemoryCleanup().catch(() => {
        // 清理失败，忽略错误
      })
    }, 150)

    // 立即更新可见项目
    renderVisibleItems()
  }, [renderVisibleItems])

  // 初始化虚拟项目
  useEffect(() => {
    const items = createVirtualItems()
    setVirtualItems(items)
  }, [createVirtualItems])

  // 初始渲染
  useEffect(() => {
    if (virtualItems.length > 0) {
      renderVisibleItems()
    }
  }, [virtualItems.length, renderVisibleItems])

  // 获取总高度
  const totalHeight = useMemo(() => {
    return virtualItems.length * itemHeight
  }, [virtualItems.length, itemHeight])

  // 获取可见项目
  const visibleItems = useMemo(() => {
    const { start, end } = getVisibleRange()
    return virtualItems.slice(start, end + 1).filter(item => item.rendered)
  }, [virtualItems, getVisibleRange])

  // 创建编辑器实例 - 只为可见内容创建
  const visibleContent = useMemo(() => {
    return visibleItems.map(item => item.content).join('\n')
  }, [visibleItems])

  const editor = useEditor({
    extensions: [
      StarterKit
    ],
    content: visibleContent,
    onUpdate: ({ editor }) => {
      if (!isScrolling) {
        const newContent = editor.getHTML()
        onUpdate?.(newContent)
      }
    },
    editorProps: {
      attributes: {
        class: 'virtual-editor-content'
      }
    }
  }, [visibleContent, isScrolling])

  // 清理函数
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
      editor?.destroy()
    }
  }, [editor])

  return (
    <div className="virtual-scroll-editor">
      <div
        ref={containerRef}
        className="virtual-scroll-container"
        style={{
          height: containerHeight,
          overflow: 'auto',
          position: 'relative'
        }}
        onScroll={handleScroll}
      >
        {/* 虚拟滚动区域 */}
        <div
          style={{
            height: totalHeight,
            position: 'relative'
          }}
        >
          {/* 可见内容容器 */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              transform: `translateY(${scrollTop}px)`
            }}
          >
            {editor && (
              <div className="virtual-editor-wrapper">
                {isScrolling && (
                  <div className="scroll-indicator">
                    正在滚动...
                  </div>
                )}
                <EditorContent editor={editor} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 性能统计 */}
      <div className="virtual-scroll-stats">
        <span>总行数: {virtualItems.length}</span>
        <span>可见行数: {visibleItems.length}</span>
        <span>内存使用: {Math.round(visibleItems.length / virtualItems.length * 100)}%</span>
      </div>
    </div>
  )
}

export default VirtualScrollEditor
import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  useEditor,
  EditorContent,
  NodeViewWrapper,
  NodeViewContent,
  ReactNodeViewRenderer
} from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
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
import { Extension, Node, mergeAttributes } from '@tiptap/core'
import { wrappingInputRule, InputRule } from '@tiptap/core'
import { Suggestion } from '@tiptap/suggestion'
import { createLowlight } from 'lowlight'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import java from 'highlight.js/lib/languages/java'
import cpp from 'highlight.js/lib/languages/cpp'
import c from 'highlight.js/lib/languages/c'
import csharp from 'highlight.js/lib/languages/csharp'
import go from 'highlight.js/lib/languages/go'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import json from 'highlight.js/lib/languages/json'
import sql from 'highlight.js/lib/languages/sql'
import bash from 'highlight.js/lib/languages/bash'
import dockerfile from 'highlight.js/lib/languages/dockerfile'
import {
  Toast,
  Button,
  Space,
  Spin,
  Breadcrumb,
  Select,
  Dropdown,
  List,
  Typography as SemiTypography
} from '@douyinfe/semi-ui'
import CustomDropdown from './CustomDropdown'
import CustomHistoryDropdown from './CustomHistoryDropdown'
import { smartDiff } from '../utils/diffUtils'
import { InlineDiffExtension } from '../extensions/InlineDiffExtension'
import { modelSelectionService, type AiApiConfig } from '../services/modelSelectionService'
import { editorMemoryManager } from '../utils/EditorMemoryManager'
import {
  IconSave,
  IconBold,
  IconItalic,
  IconUnderline,
  IconStrikeThrough,
  IconLink,
  IconH1,
  IconH2,
  IconList,
  IconOrderedList,
  IconCode,
  IconFile,
  IconEdit,
  IconGridStroked,
  IconCopy,
  IconDelete,
  IconImage,
  IconPlay,
  IconChevronDown as IconChevronDownSemi
} from '@douyinfe/semi-icons'
import { IconChevronDown } from './Icons'
import {
  RiDeleteColumn,
  RiInsertColumnLeft,
  RiInsertColumnRight,
  RiInsertRowBottom,
  RiInsertRowTop,
  RiDeleteRow,
  RiMergeCellsHorizontal,
  RiSplitCellsHorizontal
} from 'react-icons/ri'
import SlashMenu, { getSuggestionItems } from './SlashMenu'
import HighlightColorPicker from './HighlightColorPicker'
import { ReactRenderer } from '@tiptap/react'
import tippy from 'tippy.js'
import './Editor.css'

const lowlight = createLowlight()

// 注册需要的语言
lowlight.register('javascript', javascript)
lowlight.register('typescript', typescript)
lowlight.register('python', python)
lowlight.register('java', java)
lowlight.register('cpp', cpp)
lowlight.register('c', c)
lowlight.register('csharp', csharp)
lowlight.register('go', go)
lowlight.register('xml', xml)
lowlight.register('css', css)
lowlight.register('json', json)
lowlight.register('sql', sql)
lowlight.register('bash', bash)
lowlight.register('dockerfile', dockerfile)
lowlight.register('plaintext', () => ({
  name: 'plaintext',
  keywords: [],
  contains: []
})) // 纯文本不需要高亮

// 支持的编程语言列表（常见语言）
const SUPPORTED_LANGUAGES = [
  { value: 'plaintext', label: 'Plain Text' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'c', label: 'C' },
  { value: 'csharp', label: 'C#' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'xml', label: 'XML' },
  { value: 'sql', label: 'SQL' },
  { value: 'shell', label: 'Shell' },
  { value: 'bash', label: 'Bash' },
  { value: 'dockerfile', label: 'Dockerfile' },
  { value: 'markdown', label: 'Markdown' }
]

// Slash Commands extension
const SlashCommands = Extension.create({
  name: 'slashCommands',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        command: ({ editor, range, props }: any) => {
          props.command({ editor, range })
        }
      }
    }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion
      })
    ]
  }
})

// Markdown shortcuts extension
const MarkdownShortcuts = Extension.create({
  name: 'markdownShortcuts',

  addInputRules() {
    return [
      // Heading shortcuts
      new InputRule({
        find: /^(#{1,6})\s(.+)$/,
        handler: ({ range, match, commands }) => {
          const level = match[1].length as 1 | 2 | 3 | 4 | 5 | 6
          const text = match[2]

          commands.deleteRange({ from: range.from, to: range.to })
          commands.setNode('heading', { level })
          commands.insertContent(text)
        }
      }),

      // Code block shortcuts
      new InputRule({
        find: /^```([a-z]*)?$/,
        handler: ({ range, commands, match }) => {
          const language = match[1] || 'plaintext'

          commands.deleteRange({ from: range.from, to: range.to })
          commands.insertContent({
            type: 'codeBlock',
            attrs: { language }
          })
        }
      }),

      // Horizontal rule shortcuts
      new InputRule({
        find: /^---$/,
        handler: ({ range, commands }) => {
          commands.deleteRange({ from: range.from, to: range.to })
          commands.setHorizontalRule()
        }
      }),

      // Bullet list shortcuts
      wrappingInputRule({
        find: /^([-*+])\s(.*)$/,
        type: this.editor.schema.nodes.bulletList
      }),

      // Ordered list shortcuts
      wrappingInputRule({
        find: /^(\d+\.)\s(.*)$/,
        type: this.editor.schema.nodes.orderedList
      }),

      // Blockquote shortcuts
      wrappingInputRule({
        find: /^>\s(.*)$/,
        type: this.editor.schema.nodes.blockquote
      })
    ]
  },

  addKeyboardShortcuts() {
    return {
      'Mod-b': () => this.editor.commands.toggleBold(),
      'Mod-i': () => this.editor.commands.toggleItalic(),
      'Mod-u': () => this.editor.commands.toggleUnderline(),
      'Mod-Shift-s': () => this.editor.commands.toggleStrike(),
      'Mod-e': () => this.editor.commands.toggleCode(),
      'Mod-Shift-h': () => this.editor.commands.toggleHighlight(),
      'Mod-k': () => {
        // Create a simple input dialog
        const modalContent = document.createElement('div')
        modalContent.innerHTML = `
          <div style="padding: 16px;">
            <div style="margin-bottom: 12px;">
              <label style="display: block; margin-bottom: 8px; font-weight: 500;">链接地址:</label>
              <input 
                id="link-url-input" 
                type="url" 
                placeholder="https://example.com" 
                style="width: 100%; padding: 8px 12px; border: 1px solid var(--semi-color-border); border-radius: 4px; font-size: 14px;"
              />
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;">
              <button id="link-cancel-btn" style="padding: 8px 16px; border: 1px solid var(--semi-color-border); background: var(--semi-color-bg-2); border-radius: 4px; cursor: pointer;">取消</button>
              <button id="link-ok-btn" style="padding: 8px 16px; border: none; background: var(--semi-color-primary); color: white; border-radius: 4px; cursor: pointer;">确定</button>
            </div>
          </div>
        `

        const overlay = document.createElement('div')
        overlay.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
        `

        const modal = document.createElement('div')
        modal.style.cssText = `
          background: var(--semi-color-bg-0);
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          min-width: 400px;
          max-width: 500px;
        `

        modal.appendChild(modalContent)
        overlay.appendChild(modal)
        document.body.appendChild(overlay)

        const input = modal.querySelector('#link-url-input') as HTMLInputElement
        const okBtn = modal.querySelector('#link-ok-btn') as HTMLButtonElement
        const cancelBtn = modal.querySelector('#link-cancel-btn') as HTMLButtonElement

        setTimeout(() => {
          input.focus()
        }, 100)

        const cleanup = () => {
          document.body.removeChild(overlay)
        }

        const handleOk = () => {
          const url = input.value.trim()
          if (url) {
            this.editor.commands.setLink({ href: url })
          }
          cleanup()
        }

        okBtn.addEventListener('click', handleOk)
        cancelBtn.addEventListener('click', cleanup)
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) cleanup()
        })

        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            handleOk()
          } else if (e.key === 'Escape') {
            e.preventDefault()
            cleanup()
          }
        })

        return true
      }
    }
  }
})

// 图片上传函数
const uploadImage = async (
  file: File,
  currentFolder?: string,
  currentFile?: string
): Promise<string> => {
  if (!currentFolder || !currentFile) {
    throw new Error('请先选择或创建一个文档')
  }

  // 验证文件类型
  if (!file.type.startsWith('image/')) {
    throw new Error('请选择图片文件')
  }

  // 验证文件大小 (5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('图片文件不能超过 5MB')
  }

  try {
    // 读取文件为base64
    const fileData = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

    // 调用API上传文件
    const result = await window.api.markdown.uploadFile(
      `${currentFolder}/${currentFile}`,
      fileData,
      file.name
    )

    if (result.success && result.url) {
      return result.url
    } else {
      throw new Error(result.error || '上传失败')
    }
  } catch (error) {
    throw new Error(`上传图片失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

// 复制到剪贴板函数
const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // 降级方案
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    const success = document.execCommand('copy')
    document.body.removeChild(textArea)
    return success
  }
}

// Image extension type definitions
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    image: {
      setImage: (options: {
        src: string
        alt?: string
        width?: string
        height?: string
      }) => ReturnType
    }
  }
}

// Iframe 扩展
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    iframe: {
      setIframe: (options: { src: string; width?: string; height?: string }) => ReturnType
    }
  }
}

// 自定义 Iframe 组件
const IframeComponent: React.FC<any> = ({ node, updateAttributes, deleteNode }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [src, setSrc] = useState(node.attrs.src)
  const [width, setWidth] = useState(node.attrs.width || '100%')
  const [height, setHeight] = useState(node.attrs.height || '300px')

  const handleSave = () => {
    updateAttributes({
      src: src.trim(),
      width: width || '100%',
      height: height || '400px'
    })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setSrc(node.attrs.src)
    setWidth(node.attrs.width || '100%')
    setHeight(node.attrs.height || '300px')
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <NodeViewWrapper className="iframe-wrapper editing">
        <div className="iframe-edit-form">
          <div className="iframe-edit-header">
            <span>编辑嵌入内容</span>
          </div>
          <div className="iframe-edit-body">
            <Space vertical style={{ width: '100%' }}>
              <div>
                <label>嵌入地址:</label>
                <Select
                  value={src}
                  onChange={setSrc}
                  placeholder="输入或选择嵌入地址"
                  filter
                  style={{ marginTop: '4px', width: '100%' }}
                  showClear
                >
                  <Select.Option value="https://www.youtube.com/">YouTube 示例</Select.Option>
                </Select>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label>宽度:</label>
                  <Select
                    value={width}
                    onChange={setWidth}
                    style={{ marginTop: '4px', width: '100%' }}
                  >
                    <Select.Option value="25%">25%</Select.Option>
                    <Select.Option value="50%">50%</Select.Option>
                    <Select.Option value="75%">75%</Select.Option>
                    <Select.Option value="100%">100%</Select.Option>
                  </Select>
                </div>
                <div style={{ flex: 1 }}>
                  <label>高度:</label>
                  <Select
                    value={height}
                    onChange={setHeight}
                    style={{ marginTop: '4px', width: '100%' }}
                  >
                    <Select.Option value="200px">小（200px）</Select.Option>
                    <Select.Option value="300px">中（300px）</Select.Option>
                    <Select.Option value="500px">大（500px）</Select.Option>
                    <Select.Option value="700px">特大（700px）</Select.Option>
                  </Select>
                </div>
              </div>
            </Space>
          </div>
          <div className="iframe-edit-footer">
            <Space>
              <Button onClick={handleCancel} size="small">
                取消
              </Button>
              <Button onClick={handleSave} type="primary" size="small" disabled={!src.trim()}>
                保存
              </Button>
            </Space>
          </div>
        </div>
      </NodeViewWrapper>
    )
  }

  return (
    <NodeViewWrapper className="iframe-wrapper">
      <div className="iframe-container">
        <div className="iframe-controls">
          <span className="iframe-url">{node.attrs.src}</span>
          <Space>
            <Button
              icon={<IconEdit />}
              size="small"
              type="tertiary"
              onClick={() => setIsEditing(true)}
              title="编辑"
            />
            <Button
              icon={<IconDelete />}
              size="small"
              type="tertiary"
              onClick={() => deleteNode()}
              title="删除"
            />
          </Space>
        </div>
        <div className="iframe-content">
          <iframe
            src={node.attrs.src}
            width={node.attrs.width || '100%'}
            height={node.attrs.height || '300px'}
            frameBorder="0"
            allowFullScreen
            title="嵌入内容"
            style={{
              borderRadius: '4px',
              border: '1px solid var(--semi-color-border)'
            }}
          />
        </div>
      </div>
    </NodeViewWrapper>
  )
}

// 自定义 Image 扩展定义
const CustomImageExtension = Node.create({
  name: 'image',

  group: 'block',

  atom: true,

  selectable: true,

  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => element.getAttribute('src'),
        renderHTML: (attributes) => {
          if (!attributes.src) {
            return {}
          }
          return {
            src: attributes.src
          }
        }
      },
      alt: {
        default: null,
        parseHTML: (element) => element.getAttribute('alt'),
        renderHTML: (attributes) => {
          if (!attributes.alt) {
            return {}
          }
          return {
            alt: attributes.alt
          }
        }
      },
      width: {
        default: '100%',
        parseHTML: (element) => element.getAttribute('width') || element.style.width,
        renderHTML: (attributes) => {
          return {
            width: attributes.width
          }
        }
      },
      height: {
        default: 'auto',
        parseHTML: (element) => element.getAttribute('height') || element.style.height,
        renderHTML: (attributes) => {
          return {
            height: attributes.height
          }
        }
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'img'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(HTMLAttributes)]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageComponent)
  },

  addCommands() {
    return {
      setImage:
        (options: { src: string; alt?: string; width?: string; height?: string }) =>
        ({ commands }: { commands: any }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options
          })
        }
    }
  }
})

// Iframe 扩展定义
const IframeExtension = Node.create({
  name: 'iframe',

  group: 'block',

  atom: true,

  selectable: true,

  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => element.getAttribute('src'),
        renderHTML: (attributes) => {
          if (!attributes.src) {
            return {}
          }
          return {
            src: attributes.src
          }
        }
      },
      width: {
        default: '100%',
        parseHTML: (element) => element.getAttribute('width'),
        renderHTML: (attributes) => {
          return {
            width: attributes.width
          }
        }
      },
      height: {
        default: '300px',
        parseHTML: (element) => element.getAttribute('height'),
        renderHTML: (attributes) => {
          return {
            height: attributes.height
          }
        }
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'iframe'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['iframe', mergeAttributes(HTMLAttributes)]
  },

  addNodeView() {
    return ReactNodeViewRenderer(IframeComponent)
  },

  addCommands() {
    return {
      setIframe:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options
          })
        }
    }
  }
})

// 自定义图片组件（内存优化版本）
const ImageComponent: React.FC<any> = ({ node, updateAttributes, deleteNode }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [src, setSrc] = useState(node.attrs.src)
  const [width, setWidth] = useState(node.attrs.width || '100%')
  const [height, setHeight] = useState(node.attrs.height || 'auto')
  const [alt, setAlt] = useState(node.attrs.alt || '')
  const [, setIsLoaded] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // 懒加载和内存优化
  useEffect(() => {
    if (!containerRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsVisible(true)
            observer.unobserve(entry.target)
          }
        })
      },
      { rootMargin: '50px' }
    )

    observer.observe(containerRef.current)

    return () => {
      observer.disconnect()
    }
  }, [])

  // 图片加载完成后清理内存
  const handleImageLoad = useCallback(() => {
    setIsLoaded(true)
    
    // 使用 editorMemoryManager 优化图片
    if (imgRef.current && editorMemoryManager) {
      fetch(node.attrs.src)
        .then(response => response.blob())
        .then(blob => {
          editorMemoryManager.optimizeAndCacheImage(node.attrs.src, blob)
        })
        .catch(() => {
          // 图片优化失败，忽略错误
        })
    }
  }, [node.attrs.src])

  const handleSave = useCallback(() => {
    updateAttributes({
      src: src.trim(),
      width: width || '100%',
      height: height || 'auto',
      alt: alt.trim()
    })
    setIsEditing(false)
  }, [src, width, height, alt, updateAttributes])

  const handleCancel = useCallback(() => {
    setSrc(node.attrs.src)
    setWidth(node.attrs.width || '100%')
    setHeight(node.attrs.height || 'auto')
    setAlt(node.attrs.alt || '')
    setIsEditing(false)
  }, [node.attrs])

  if (isEditing) {
    return (
      <NodeViewWrapper className="image-wrapper editing">
        <div className="image-edit-form">
          <div className="image-edit-header">
            <span>编辑图片</span>
          </div>
          <div className="image-edit-body">
            <Space vertical style={{ width: '100%' }}>
              <div>
                <label>图片地址:</label>
                <input
                  type="text"
                  value={src}
                  onChange={(e) => setSrc(e.target.value)}
                  placeholder="输入图片地址"
                  style={{
                    marginTop: '4px',
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--semi-color-border)',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontFamily: 'inherit'
                  }}
                />
              </div>
              <div>
                <label>替代文本:</label>
                <input
                  type="text"
                  value={alt}
                  onChange={(e) => setAlt(e.target.value)}
                  placeholder="图片的替代文本"
                  style={{
                    marginTop: '4px',
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--semi-color-border)',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontFamily: 'inherit'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label>宽度:</label>
                  <Select
                    value={width}
                    onChange={setWidth}
                    style={{ marginTop: '4px', width: '100%' }}
                  >
                    <Select.Option value="25%">25%</Select.Option>
                    <Select.Option value="33%">33%</Select.Option>
                    <Select.Option value="50%">50%</Select.Option>
                    <Select.Option value="66%">66%</Select.Option>
                    <Select.Option value="75%">75%</Select.Option>
                    <Select.Option value="100%">100%</Select.Option>
                    <Select.Option value="200px">小 (200px)</Select.Option>
                    <Select.Option value="400px">中 (400px)</Select.Option>
                    <Select.Option value="600px">大 (600px)</Select.Option>
                    <Select.Option value="800px">特大 (800px)</Select.Option>
                  </Select>
                </div>
                <div style={{ flex: 1 }}>
                  <label>高度:</label>
                  <Select
                    value={height}
                    onChange={setHeight}
                    style={{ marginTop: '4px', width: '100%' }}
                  >
                    <Select.Option value="auto">自动</Select.Option>
                    <Select.Option value="150px">小 (150px)</Select.Option>
                    <Select.Option value="300px">中 (300px)</Select.Option>
                    <Select.Option value="450px">大 (450px)</Select.Option>
                    <Select.Option value="600px">特大 (600px)</Select.Option>
                  </Select>
                </div>
              </div>
            </Space>
          </div>
          <div className="image-edit-footer">
            <Space>
              <Button onClick={handleCancel} size="small">
                取消
              </Button>
              <Button onClick={handleSave} type="primary" size="small" disabled={!src.trim()}>
                保存
              </Button>
            </Space>
          </div>
        </div>
      </NodeViewWrapper>
    )
  }

  return (
    <NodeViewWrapper className="image-wrapper" ref={containerRef}>
      <div
        className="image-container"
        style={{
          width: node.attrs.width || '100%',
          maxWidth: '100%',
          display: 'inline-block'
        }}
      >
        <div className="image-controls">
          <span className="image-info">
            {width} × {height}
            {alt && ` - ${alt}`}
          </span>
          <Space>
            <Button
              icon={<IconEdit />}
              size="small"
              type="tertiary"
              onClick={() => setIsEditing(true)}
              title="编辑图片"
            />
            <Button
              icon={<IconDelete />}
              size="small"
              type="tertiary"
              onClick={() => deleteNode()}
              title="删除图片"
            />
          </Space>
        </div>
        <div className="image-content">
          {isVisible ? (
            <img
              ref={imgRef}
              src={node.attrs.src}
              alt={node.attrs.alt || ''}
              loading="lazy"
              decoding="async"
              onLoad={handleImageLoad}
              style={{
                width: '100%',
                height: node.attrs.height || 'auto',
                display: 'block'
              }}
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                const errorDiv = document.createElement('div')
                errorDiv.style.cssText = `
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  background: var(--semi-color-fill-0);
                  color: var(--semi-color-text-2);
                  border: 1px dashed var(--semi-color-border);
                  border-radius: 4px;
                  padding: 40px;
                  font-size: 14px;
                  width: 100%;
                  box-sizing: border-box;
                `
                errorDiv.textContent = '图片加载失败'
                target.parentNode?.insertBefore(errorDiv, target)
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: node.attrs.height === 'auto' ? '200px' : node.attrs.height,
                background: 'var(--semi-color-fill-0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--semi-color-text-2)',
                fontSize: '14px'
              }}
            >
              图片加载中...
            </div>
          )}
        </div>
      </div>
    </NodeViewWrapper>
  )
}

// 自定义代码块组件
const CodeBlockComponent: React.FC<any> = ({ node, updateAttributes }) => {
  const [isCopied, setIsCopied] = useState(false)
  const language = node.attrs.language || 'plaintext'

  const handleLanguageChange = (
    value: string | number | any[] | Record<string, any> | undefined
  ) => {
    if (typeof value === 'string') {
      updateAttributes({ language: value })
    }
  }

  const handleCopy = async () => {
    const codeContent = node.textContent || ''
    const success = await copyToClipboard(codeContent)

    if (success) {
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    }
  }

  return (
    <NodeViewWrapper className="code-block-wrapper">
      <div className="code-block-header">
        <Select
          value={language}
          onChange={handleLanguageChange}
          style={{ width: 120 }}
          size="small"
          placeholder="语言"
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <Select.Option key={lang.value} value={lang.value}>
              {lang.label}
            </Select.Option>
          ))}
        </Select>

        <Button
          icon={<IconCopy />}
          size="small"
          type="tertiary"
          onClick={handleCopy}
          className={isCopied ? 'copied' : ''}
        >
          {isCopied ? '已复制' : '复制'}
        </Button>
      </div>

      <div className="code-block-content">
        <NodeViewContent as="div" />
      </div>
    </NodeViewWrapper>
  )
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

// AI模型选择下拉菜单组件
const AIModelDropdown: React.FC = () => {
  const [availableModels, setAvailableModels] = useState<AiApiConfig[]>([])
  const [selectedModelId, setSelectedModelId] = useState<string>('')
  const [loading, setLoading] = useState(false)

  // 加载可用模型
  const loadModels = useCallback(async () => {
    setLoading(true)
    try {
      const models = await modelSelectionService.getAvailableModels()
      const currentModelId = await modelSelectionService.getSelectedModelId()
      setAvailableModels(models)
      setSelectedModelId(currentModelId)
    } catch (error) {
      console.error('加载AI模型失败:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // 处理模型选择
  const handleModelSelect = useCallback(async (modelId: string) => {
    try {
      await modelSelectionService.setSelectedModelId(modelId)
      setSelectedModelId(modelId)
      Toast.success('AI模型已切换')
    } catch (error) {
      Toast.error('切换AI模型失败')
    }
  }, [])

  useEffect(() => {
    loadModels()
  }, [loadModels])

  const selectedModel = availableModels.find((model) => model.id === selectedModelId)

  return (
    <Dropdown
      trigger="click"
      position="bottomLeft"
      render={
        <div style={{ minWidth: '200px', maxWidth: '250px' }}>
          {loading ? (
            <div style={{ padding: '12px', textAlign: 'center' }}>
              <Spin size="middle" />
            </div>
          ) : availableModels.length === 0 ? (
            <div style={{ padding: '12px', textAlign: 'center' }}>
              <SemiTypography.Text type="tertiary">暂无可用模型</SemiTypography.Text>
              <div style={{ marginTop: '8px' }}>
                <SemiTypography.Text type="tertiary" size="small">
                  请在设置中配置AI API
                </SemiTypography.Text>
              </div>
            </div>
          ) : (
            <List
              dataSource={availableModels}
              renderItem={(item) => (
                <List.Item
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    backgroundColor:
                      item.id === selectedModelId ? 'var(--semi-color-fill-0)' : 'transparent'
                  }}
                  onClick={() => handleModelSelect(item.id)}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                    <SemiTypography.Text
                      strong={item.id === selectedModelId}
                      style={{ fontSize: '14px' }}
                    >
                      {item.name}
                    </SemiTypography.Text>
                    <SemiTypography.Text type="tertiary" size="small" style={{ marginTop: '2px' }}>
                      {item.modelName}
                    </SemiTypography.Text>
                  </div>
                </List.Item>
              )}
            />
          )}
        </div>
      }
    >
      <Button
        icon={<IconChevronDownSemi />}
        iconPosition="right"
        type="tertiary"
        size="default"
        disabled={loading || availableModels.length === 0}
      >
        {loading ? '加载中...' : selectedModel ? selectedModel.name : 'AI模型'}
      </Button>
    </Dropdown>
  )
}

interface EditorProps {
  content?: string
  placeholder?: string
  onUpdate?: (content: string) => void
  editable?: boolean
  className?: string
  currentFolder?: string
  currentFile?: string
  onFileChanged?: () => void
}

// 顶部标题栏组件
const EditorHeader: React.FC<{
  currentFolder?: string
  currentFile?: string
  hasUnsavedChanges: boolean
  isLoading: boolean
  isSaving: boolean
  onSave: () => void
  onContentRestore?: (content: string) => void
}> = ({ currentFolder, currentFile, hasUnsavedChanges, isSaving, onSave, onContentRestore }) => {
  if (!currentFolder || !currentFile) return null

  const filePath = `${currentFolder}/${currentFile}`

  return (
    <div className="editor-header">
      <div className="editor-header-left">
        <div className="file-info">
          <IconFile size="small" style={{ color: 'var(--semi-color-text-2)' }} />
          <Breadcrumb separator="/">
            <Breadcrumb.Item href="#">{currentFolder}</Breadcrumb.Item>
            <Breadcrumb.Item>{currentFile.replace('.md', '')}</Breadcrumb.Item>
          </Breadcrumb>
          {hasUnsavedChanges && (
            <div className="unsaved-indicator">
              <span>●</span>
              <span>未保存</span>
            </div>
          )}
        </div>
        <AIModelDropdown />
      </div>

      <div className="editor-header-right">
        <Space>
          <CustomHistoryDropdown
            filePath={filePath}
            onRestore={onContentRestore}
            disabled={hasUnsavedChanges}
          />
          <Button
            icon={<IconSave />}
            type="primary"
            size="default"
            onClick={onSave}
            disabled={isSaving || !hasUnsavedChanges}
          >
            {isSaving ? <Spin size="small" /> : '保存'}
          </Button>
        </Space>
      </div>
    </div>
  )
}

// 表格专用 BubbleMenu 组件
const TableBubbleMenu: React.FC<{ editor: any; currentFolder?: string; currentFile?: string }> = ({
  editor,
  currentFolder: _currentFolder,
  currentFile: _currentFile
}) => {
  if (!editor) return null

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ state }) => {
        const { selection } = state
        const { $from } = selection
        // 只在表格区域且不是图片和iframe时显示
        return (
          ($from.parent.type.name === 'tableCell' || $from.parent.type.name === 'tableHeader') &&
          !editor.isActive('image') &&
          !editor.isActive('iframe')
        ) // 当图片或iframe被选中时不显示菜单
      }}
    >
      <div className="bubble-menu table-bubble-menu">
        <div className="bubble-menu-label">
          <span>表格工具</span>
        </div>
        <Space>
          <Button
            icon={<IconBold />}
            size="small"
            type={editor.isActive('bold') ? 'primary' : 'tertiary'}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="加粗"
          />
          <Button
            icon={<IconItalic />}
            size="small"
            type={editor.isActive('italic') ? 'primary' : 'tertiary'}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="斜体"
          />
          <Button
            icon={<IconUnderline />}
            size="small"
            type={editor.isActive('underline') ? 'primary' : 'tertiary'}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            title="下划线"
          />
          <Button
            icon={<IconStrikeThrough />}
            size="small"
            type={editor.isActive('strike') ? 'primary' : 'tertiary'}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="删除线"
          />
          <HighlightColorPicker editor={editor} isActive={editor.isActive('highlight')} />
          <Button
            icon={<IconLink />}
            size="small"
            type={editor.isActive('link') ? 'primary' : 'tertiary'}
            onClick={() => {
              // Create a simple input dialog
              const modalContent = document.createElement('div')
              modalContent.innerHTML = `
                <div style="padding: 16px;">
                  <div style="margin-bottom: 12px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 500;">链接地址:</label>
                    <input 
                      id="table-link-url-input" 
                      type="url" 
                      placeholder="https://example.com" 
                      style="width: 100%; padding: 8px 12px; border: 1px solid var(--semi-color-border); border-radius: 4px; font-size: 14px;"
                    />
                  </div>
                  <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;">
                    <button id="table-link-cancel-btn" style="padding: 8px 16px; border: 1px solid var(--semi-color-border); background: var(--semi-color-bg-2); border-radius: 4px; cursor: pointer;">取消</button>
                    <button id="table-link-ok-btn" style="padding: 8px 16px; border: none; background: var(--semi-color-primary); color: white; border-radius: 4px; cursor: pointer;">确定</button>
                  </div>
                </div>
              `

              const overlay = document.createElement('div')
              overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
              `

              const modal = document.createElement('div')
              modal.style.cssText = `
                background: var(--semi-color-bg-0);
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                min-width: 400px;
                max-width: 500px;
              `

              modal.appendChild(modalContent)
              overlay.appendChild(modal)
              document.body.appendChild(overlay)

              const input = modal.querySelector('#table-link-url-input') as HTMLInputElement
              const okBtn = modal.querySelector('#table-link-ok-btn') as HTMLButtonElement
              const cancelBtn = modal.querySelector('#table-link-cancel-btn') as HTMLButtonElement

              setTimeout(() => {
                input.focus()
              }, 100)

              const cleanup = () => {
                document.body.removeChild(overlay)
              }

              const handleOk = () => {
                const url = input.value.trim()
                if (url) {
                  editor.chain().focus().setLink({ href: url }).run()
                }
                cleanup()
              }

              okBtn.addEventListener('click', handleOk)
              cancelBtn.addEventListener('click', cleanup)
              overlay.addEventListener('click', (e) => {
                if (e.target === overlay) cleanup()
              })

              input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleOk()
                } else if (e.key === 'Escape') {
                  e.preventDefault()
                  cleanup()
                }
              })
            }}
            title="链接"
          />
          <div className="bubble-menu-divider" />
          <Button
            icon={<RiInsertColumnLeft />}
            size="small"
            type="tertiary"
            onClick={() => editor.chain().focus().addColumnBefore().run()}
            title="在前面添加列"
          />
          <Button
            icon={<RiInsertColumnRight />}
            size="small"
            type="tertiary"
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            title="在后面添加列"
          />
          <Button
            icon={<RiInsertRowTop />}
            size="small"
            type="tertiary"
            onClick={() => editor.chain().focus().addRowBefore().run()}
            title="在上面添加行"
          />
          <Button
            icon={<RiInsertRowBottom />}
            size="small"
            type="tertiary"
            onClick={() => editor.chain().focus().addRowAfter().run()}
            title="在下面添加行"
          />
          <Button
            icon={<RiDeleteColumn />}
            size="small"
            type="tertiary"
            onClick={() => editor.chain().focus().deleteColumn().run()}
            title="删除列"
          />
          <Button
            icon={<RiDeleteRow />}
            size="small"
            type="tertiary"
            onClick={() => editor.chain().focus().deleteRow().run()}
            title="删除行"
          />
          <div className="bubble-menu-divider" />
          <Button
            icon={<RiMergeCellsHorizontal />}
            size="small"
            type="tertiary"
            onClick={() => editor.chain().focus().mergeCells().run()}
            title="合并单元格"
          />
          <Button
            icon={<RiSplitCellsHorizontal />}
            size="small"
            type="tertiary"
            onClick={() => editor.chain().focus().splitCell().run()}
            title="拆分单元格"
          />
          <Button
            icon={<IconDelete />}
            size="small"
            type="tertiary"
            onClick={() => editor.chain().focus().deleteTable().run()}
            title="删除表格"
          />
        </Space>
      </div>
    </BubbleMenu>
  )
}

// 纯文本专用 BubbleMenu 组件（内存优化版本）
const TextBubbleMenu: React.FC<{ editor: any; currentFolder?: string; currentFile?: string }> = ({
  editor,
  currentFolder,
  currentFile
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [loadingFeature, setLoadingFeature] = useState<string | null>(null)
  const [apiConfigs, setApiConfigs] = useState<any[]>([])
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null)
  const [bubbleMenuPosition, setBubbleMenuPosition] = useState<{
    top: number
    left: number
  } | null>(null)
  const [preservedSelection, setPreservedSelection] = useState<{ from: number; to: number } | null>(
    null
  )

  // 内存优化：使用 useCallback 防止不必要的重新渲染
  const cleanupRef = useRef<() => void>()

  // 加载API配置 - 优化版本
  const loadApiConfigs = useCallback(async () => {
    try {
      const settings = await window.api.settings.getAll()
      if (settings.AiApiConfigs && Array.isArray(settings.AiApiConfigs)) {
        setApiConfigs(settings.AiApiConfigs)
        if (!selectedConfigId && settings.AiApiConfigs.length > 0) {
          setSelectedConfigId(settings.AiApiConfigs[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to load API configs:', error)
    }
  }, [selectedConfigId])

  // 组件加载时获取API配置
  useEffect(() => {
    loadApiConfigs()
  }, [loadApiConfigs])

  // 管理AI处理时的编辑器样式类名 - 内存优化
  useEffect(() => {
    const editorElement = editor?.view?.dom?.closest('.tiptap-editor')
    if (!editorElement) return

    if (isLoading && loadingFeature) {
      editorElement.classList.add('ai-processing')
      
      // 防抖处理选中状态恢复
      const debounceSelection = () => {
        if (preservedSelection && editor) {
          try {
            const selection = editor.state.selection
            if (
              selection.empty ||
              selection.from !== preservedSelection.from ||
              selection.to !== preservedSelection.to
            ) {
              editor.commands.setTextSelection(preservedSelection)
            }
          } catch {
            // Failed to maintain selection during processing
          }
        }
      }

      const timeoutId = setTimeout(debounceSelection, 50)
      cleanupRef.current = () => clearTimeout(timeoutId)
    } else {
      editorElement.classList.remove('ai-processing')
      cleanupRef.current?.()
    }

    return () => {
      editorElement.classList.remove('ai-processing')
      cleanupRef.current?.()
    }
  }, [isLoading, loadingFeature, editor, preservedSelection])

  // 获取选中的文本 - 优化版本
  const getSelectedText = useCallback((): string => {
    if (!editor?.state) return ''
    const { from, to } = editor.state.selection
    return editor.state.doc.textBetween(from, to, ' ')
  }, [editor])

  // 获取当前选中的API配置 - 优化版本
  const getCurrentConfig = useCallback(() => {
    return apiConfigs.find((config) => config.id === selectedConfigId) || null
  }, [apiConfigs, selectedConfigId])

  // 调用AI API - 内存优化版本
  const callAI = useCallback(
    async (prompt: string, selectedText: string): Promise<string> => {
      const config = getCurrentConfig()
      if (!config) {
        throw new Error('请先在设置中配置AI API')
      }

      if (!config.apiKey || !config.apiUrl || !config.modelName) {
        throw new Error('API配置不完整，请检查设置')
      }

      try {
        const result = await window.api.openai.generate({
          config,
          messages: [
            {
              role: 'user',
              content: `${prompt}\n\n${selectedText}`
            }
          ],
          maxTokens: parseInt(config.maxTokens || '2000'),
          temperature: parseFloat(config.temperature || '0.7')
        })

        if (!result.success) {
          throw new Error(result.error || '生成失败')
        }

        return result.content || ''
      } catch (error) {
        throw error
      }
    },
    [getCurrentConfig]
  )

  // AI功能
  const AI_FEATURES = [
    {
      key: 'summarize',
      label: '总结',
      prompt:
        '请总结以下内容的主要要点，用简洁的语言概括核心信息。\n\n重要要求：\n- 直接输出总结内容，不要任何前缀、后缀或说明\n- 不要包含"总结如下"、"主要内容包括"等引导语\n- 不要添加任何解释、介绍或额外文字\n- 输出格式应该直接是总结的正文内容\n\n需要总结的内容：'
    },
    {
      key: 'expand',
      label: '扩写',
      prompt:
        '请对以下内容进行扩写，增加更多细节、例子或解释，使其更加丰富和详细。\n\n重要要求：\n- 直接输出扩写后的完整内容，替换原文\n- 不要包含"扩写如下"、"详细内容为"等引导语\n- 不要添加任何解释、介绍或额外说明\n- 输出格式应该直接是扩写后的正文内容\n\n需要扩写的内容：'
    },
    {
      key: 'continue',
      label: '续写',
      prompt:
        '请根据以下内容的语境和风格，自然地续写后续内容。\n\n重要要求：\n- 直接输出续写的部分，无缝衔接原文\n- 不要包含"续写如下"、"后续内容为"等引导语\n- 不要添加任何解释、介绍或额外说明\n- 输出格式应该直接是续写的正文内容\n\n需要续写的内容：'
    },
    {
      key: 'check',
      label: '检查',
      prompt:
        '请检查以下文本的语法、拼写、标点和表达错误，并直接输出修改后的正确版本。\n\n重要要求：\n- 直接输出修正后的完整内容，替换原文\n- 不要包含"修正如下"、"正确版本为"等引导语\n- 不要添加任何修改说明、错误列表或解释\n- 输出格式应该直接是修正后的正文内容\n\n需要检查的内容：'
    }
  ]

  // 翻译语言选项
  const TRANSLATION_LANGUAGES = [
    { key: 'translate_zh', label: '翻译为中文', targetLang: '中文' },
    { key: 'translate_en', label: '翻译为英文', targetLang: '英文' },
    { key: 'translate_ja', label: '翻译为日文', targetLang: '日文' },
    { key: 'translate_ko', label: '翻译为韩文', targetLang: '韩文' },
    { key: 'translate_fr', label: '翻译为法文', targetLang: '法文' },
    { key: 'translate_ru', label: '翻译为俄文', targetLang: '俄文' }
  ]

  // 捕获bubble menu位置
  const captureBubbleMenuPosition = useCallback(() => {
    try {
      // 获取当前bubble menu的位置
      const bubbleMenuElement = document.querySelector('.text-bubble-menu')
      if (bubbleMenuElement) {
        const rect = bubbleMenuElement.getBoundingClientRect()

        // 确保位置在视口范围内
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight
        const menuWidth = 200 // AI加载菜单的最大宽度
        const menuHeight = 50 // AI加载菜单的大概高度

        let adjustedTop = rect.top
        let adjustedLeft = rect.left

        // 防止菜单超出右边界
        if (adjustedLeft + menuWidth > viewportWidth) {
          adjustedLeft = viewportWidth - menuWidth - 10
        }

        // 防止菜单超出左边界
        if (adjustedLeft < 10) {
          adjustedLeft = 10
        }

        // 防止菜单超出上边界
        if (adjustedTop < 10) {
          adjustedTop = rect.bottom + 5
        }

        // 防止菜单超出下边界
        if (adjustedTop + menuHeight > viewportHeight) {
          adjustedTop = Math.max(10, rect.top - menuHeight - 5)
        }

        setBubbleMenuPosition({
          top: adjustedTop,
          left: adjustedLeft
        })

        // Captured bubble menu position
      } else {
        // Text bubble menu element not found
      }
    } catch (error) {
      console.error('Error capturing bubble menu position:', error)
      setBubbleMenuPosition(null)
    }
  }, [])

  // 处理翻译功能
  const handleTranslation = useCallback(
    async (targetLanguage: string) => {
      const selectedText = getSelectedText()
      if (!selectedText.trim()) {
        Toast.error('请先选择要处理的文本')
        return
      }

      if (apiConfigs.length === 0) {
        Toast.error('请先在设置中配置AI API')
        return
      }

      const config = getCurrentConfig()
      if (!config) {
        Toast.error('请先选择一个API配置')
        return
      }

      const finalPrompt = `请将以下内容翻译成${targetLanguage}。

重要要求：
- 直接输出翻译后的内容，不要任何前缀、后缀或说明
- 不要包含"翻译如下"、"翻译结果为"等引导语
- 不要添加任何解释、介绍或额外文字
- 输出格式应该直接是翻译后的正文内容
- 保持原文的格式和结构

需要翻译的内容：`

      // 在开始处理前保存当前bubble menu的位置和选中状态
      captureBubbleMenuPosition()
      const { from, to } = editor.state.selection
      setPreservedSelection({ from, to })
      setIsLoading(true)
      setLoadingFeature('translate')

      try {
        const result = await callAI(finalPrompt, selectedText)

        if (result.trim()) {
          // 计算diff
          const diffResult = smartDiff(selectedText, result.trim())

          // 在选中位置插入内联diff节点
          const { from, to } = editor.state.selection
          editor
            .chain()
            .focus()
            .setTextSelection({ from, to })
            .deleteSelection()
            .setInlineDiff({
              originalText: selectedText,
              newText: result.trim(),
              diffResult,
              feature: { key: 'translate', label: '翻译' }
            })
            .run()

          Toast.success('翻译完成')
        } else {
          Toast.error('AI返回了空结果')
        }
      } catch (error) {
        console.error('AI 翻译失败:', error)
        Toast.error(`翻译失败: ${error instanceof Error ? error.message : '未知错误'}`)
      } finally {
        setIsLoading(false)
        setLoadingFeature(null)
        setBubbleMenuPosition(null)
        setPreservedSelection(null)
      }
    },
    [getSelectedText, apiConfigs, getCurrentConfig, callAI, editor, captureBubbleMenuPosition]
  )

  // 处理AI功能
  const handleAIFeature = useCallback(
    async (feature: any) => {
      const selectedText = getSelectedText()
      if (!selectedText.trim()) {
        Toast.error('请先选择要处理的文本')
        return
      }

      if (apiConfigs.length === 0) {
        Toast.error('请先在设置中配置AI API')
        return
      }

      const config = getCurrentConfig()
      if (!config) {
        Toast.error('请先选择一个API配置')
        return
      }

      // 在开始处理前保存当前bubble menu的位置和选中状态
      captureBubbleMenuPosition()
      const { from, to } = editor.state.selection
      setPreservedSelection({ from, to })
      setIsLoading(true)
      setLoadingFeature(feature.key)

      try {
        const result = await callAI(feature.prompt, selectedText)

        if (result.trim()) {
          // 计算diff
          const diffResult = smartDiff(selectedText, result.trim())

          // 在选中位置插入内联diff节点
          const { from, to } = editor.state.selection
          editor
            .chain()
            .focus()
            .setTextSelection({ from, to })
            .deleteSelection()
            .setInlineDiff({
              originalText: selectedText,
              newText: result.trim(),
              diffResult,
              feature
            })
            .run()

          Toast.success(`${feature.label}完成`)
        } else {
          Toast.error('AI返回了空结果')
        }
      } catch (error) {
        console.error(`AI ${feature.label} failed:`, error)
        Toast.error(`${feature.label}失败: ${error instanceof Error ? error.message : '未知错误'}`)
      } finally {
        setIsLoading(false)
        setLoadingFeature(null)
        setBubbleMenuPosition(null)
        setPreservedSelection(null)
      }
    },
    [getSelectedText, apiConfigs, getCurrentConfig, callAI, editor, captureBubbleMenuPosition]
  )

  if (!editor) return null

  // 如果正在加载AI功能，显示加载状态
  if (isLoading && loadingFeature) {
    const currentFeature =
      AI_FEATURES.find((f) => f.key === loadingFeature) ||
      TRANSLATION_LANGUAGES.find(() => loadingFeature === 'translate')
    const featureLabel = loadingFeature === 'translate' ? '翻译' : currentFeature?.label

    return (
      <BubbleMenu
        editor={editor}
        shouldShow={() => {
          // 确保在加载期间保持显示，并尝试保持选中状态
          if (preservedSelection && editor) {
            try {
              const { from, to } = preservedSelection
              // 检查选择范围是否有效
              if (from <= editor.state.doc.content.size && to <= editor.state.doc.content.size) {
                editor.commands.setTextSelection({ from, to })
              }
            } catch (error) {
              // Failed to restore selection
            }
          }
          return true
        }}
        updateDelay={0}
      >
        <div
          className="bubble-menu ai-bubble-menu ai-loading-menu"
          style={
            bubbleMenuPosition
              ? {
                  position: 'fixed',
                  top: bubbleMenuPosition.top,
                  left: bubbleMenuPosition.left,
                  zIndex: 10000
                }
              : undefined
          }
        >
          <div className="ai-loading-content">
            <div className="ai-loading-text">
              <Spin size="small" />
              AI正在{featureLabel}中
            </div>
            <Button
              size="small"
              type="danger"
              theme="borderless"
              onClick={() => {
                setIsLoading(false)
                setLoadingFeature(null)
                setBubbleMenuPosition(null)
                setPreservedSelection(null)
                // 恢复编辑器焦点
                editor.commands.focus()
              }}
            >
              停止
            </Button>
          </div>
        </div>
      </BubbleMenu>
    )
  }

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ state, from, to }) => {
        const { selection } = state
        const { $from } = selection
        // 只在非表格区域、非代码块区域、非图片区域、非iframe区域且有选中文本时显示
        return (
          from !== to &&
          $from.parent.type.name !== 'tableCell' &&
          $from.parent.type.name !== 'tableHeader' &&
          $from.parent.type.name !== 'codeBlock' &&
          $from.parent.type.name !== 'iframe' &&
          !editor.isActive('image') &&
          !editor.isActive('iframe')
        )
      }}
    >
      <div className="bubble-menu text-bubble-menu">
        <div className="bubble-menu-label">
          <span>文本工具</span>
        </div>
        <Space>
          {/* AI功能下拉菜单 - 第一个位置 */}
          <CustomDropdown
            trigger="click"
            position="bottomLeft"
            menu={[
              ...AI_FEATURES.map((feature) => ({
                node: 'item' as const,
                name: feature.label,
                onClick: () => handleAIFeature(feature),
                disabled: isLoading
              })),
              {
                node: 'divider' as const
              },
              {
                node: 'title' as const,
                name: '翻译功能'
              },
              ...TRANSLATION_LANGUAGES.map((lang) => ({
                node: 'item' as const,
                name: lang.label,
                onClick: () => handleTranslation(lang.targetLang),
                disabled: isLoading
              }))
            ]}
            disabled={isLoading}
            dropdownStyle={{
              maxHeight: '300px',
              overflowY: 'auto',
              zIndex: 9999
            }}
            className="ai-features-dropdown"
          >
            <Button
              rightIcon={<IconChevronDown />}
              size="small"
              type="primary"
              disabled={isLoading}
              style={{ marginRight: '8px' }}
            >
              AI助手
            </Button>
          </CustomDropdown>

          {/* API配置选择（如果有多个配置） */}
          {apiConfigs.length > 1 && (
            <Select
              value={selectedConfigId || undefined}
              onChange={(value) => setSelectedConfigId(value as string)}
              size="small"
              style={{ width: 120, marginRight: '8px' }}
              placeholder="选择API"
            >
              {apiConfigs.map((config) => (
                <Select.Option key={config.id} value={config.id}>
                  {config.name}
                </Select.Option>
              ))}
            </Select>
          )}

          <div className="bubble-menu-divider" />

          <Button
            icon={<IconBold />}
            size="small"
            type={editor.isActive('bold') ? 'primary' : 'tertiary'}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="加粗"
          />
          <Button
            icon={<IconItalic />}
            size="small"
            type={editor.isActive('italic') ? 'primary' : 'tertiary'}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="斜体"
          />
          <Button
            icon={<IconUnderline />}
            size="small"
            type={editor.isActive('underline') ? 'primary' : 'tertiary'}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            title="下划线"
          />
          <Button
            icon={<IconStrikeThrough />}
            size="small"
            type={editor.isActive('strike') ? 'primary' : 'tertiary'}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="删除线"
          />
          <HighlightColorPicker editor={editor} isActive={editor.isActive('highlight')} />
          <Button
            icon={<IconLink />}
            size="small"
            type={editor.isActive('link') ? 'primary' : 'tertiary'}
            onClick={() => {
              // Create a simple input dialog
              const modalContent = document.createElement('div')
              modalContent.innerHTML = `
                <div style="padding: 16px;">
                  <div style="margin-bottom: 12px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 500;">链接地址:</label>
                    <input 
                      id="text-link-url-input" 
                      type="url" 
                      placeholder="https://example.com" 
                      style="width: 100%; padding: 8px 12px; border: 1px solid var(--semi-color-border); border-radius: 4px; font-size: 14px;"
                    />
                  </div>
                  <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;">
                    <button id="text-link-cancel-btn" style="padding: 8px 16px; border: 1px solid var(--semi-color-border); background: var(--semi-color-bg-2); border-radius: 4px; cursor: pointer;">取消</button>
                    <button id="text-link-ok-btn" style="padding: 8px 16px; border: none; background: var(--semi-color-primary); color: white; border-radius: 4px; cursor: pointer;">确定</button>
                  </div>
                </div>
              `

              const overlay = document.createElement('div')
              overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
              `

              const modal = document.createElement('div')
              modal.style.cssText = `
                background: var(--semi-color-bg-0);
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                min-width: 400px;
                max-width: 500px;
              `

              modal.appendChild(modalContent)
              overlay.appendChild(modal)
              document.body.appendChild(overlay)

              const input = modal.querySelector('#text-link-url-input') as HTMLInputElement
              const okBtn = modal.querySelector('#text-link-ok-btn') as HTMLButtonElement
              const cancelBtn = modal.querySelector('#text-link-cancel-btn') as HTMLButtonElement

              setTimeout(() => {
                input.focus()
              }, 100)

              const cleanup = () => {
                document.body.removeChild(overlay)
              }

              const handleOk = () => {
                const url = input.value.trim()
                if (url) {
                  editor.chain().focus().setLink({ href: url }).run()
                }
                cleanup()
              }

              okBtn.addEventListener('click', handleOk)
              cancelBtn.addEventListener('click', cleanup)
              overlay.addEventListener('click', (e) => {
                if (e.target === overlay) cleanup()
              })

              input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleOk()
                } else if (e.key === 'Escape') {
                  e.preventDefault()
                  cleanup()
                }
              })
            }}
            title="链接"
          />
          <div className="bubble-menu-divider" />
          <Button
            icon={<IconH1 />}
            size="small"
            type={editor.isActive('heading', { level: 1 }) ? 'primary' : 'tertiary'}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            title="标题1"
          />
          <Button
            icon={<IconH2 />}
            size="small"
            type={editor.isActive('heading', { level: 2 }) ? 'primary' : 'tertiary'}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            title="标题2"
          />
          <Button
            icon={<IconList />}
            size="small"
            type={editor.isActive('bulletList') ? 'primary' : 'tertiary'}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="无序列表"
          />
          <Button
            icon={<IconOrderedList />}
            size="small"
            type={editor.isActive('orderedList') ? 'primary' : 'tertiary'}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="有序列表"
          />
          <Button
            icon={<IconGridStroked />}
            size="small"
            type={editor.isActive('table') ? 'primary' : 'tertiary'}
            onClick={() =>
              editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
            }
            title="插入表格"
            disabled={editor.isActive('table')}
          />
          <Button
            icon={<IconCode />}
            size="small"
            type={editor.isActive('codeBlock') ? 'primary' : 'tertiary'}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            title="代码块"
          />
          <Button
            icon={<IconImage />}
            size="small"
            type="tertiary"
            onClick={() => {
              if (!currentFolder || !currentFile) {
                Toast.error('请先选择或创建一个文档')
                return
              }

              const input = document.createElement('input')
              input.type = 'file'
              input.accept = 'image/*'
              input.onchange = async (e) => {
                const target = e.target as HTMLInputElement
                const file = target.files?.[0]
                if (file) {
                  try {
                    Toast.info('正在上传图片...')
                    const url = await uploadImage(file, currentFolder, currentFile)
                    editor.chain().focus().setImage({ src: url }).run()
                    Toast.success('图片上传成功')
                  } catch (error) {
                    Toast.error(error instanceof Error ? error.message : '图片上传失败')
                  }
                }
              }
              input.click()
            }}
            title="插入图片"
          />
          <Button
            icon={<IconPlay />}
            size="small"
            type="tertiary"
            onClick={() => {
              // Get selected text from editor
              const { from, to } = editor.state.selection
              const selectedText = editor.state.doc.textBetween(from, to, ' ').trim()

              // Create a more sophisticated modal dialog with Semi Design theme styling
              const modalContent = document.createElement('div')
              modalContent.innerHTML = `
                <div class="iframe-edit-form">
                  <div class="iframe-edit-header">
                    <span>插入嵌入内容</span>
                  </div>
                  <div class="iframe-edit-body">
                    <div style="margin-bottom: 12px;">
                      <label style="display: block; font-size: 12px; font-weight: 500; color: var(--semi-color-text-1); margin-bottom: 8px;">嵌入地址:</label>
                      <input 
                        id="iframe-url-input" 
                        type="url" 
                        placeholder="输入嵌入地址 (如: https://www.youtube.com/)" 
                        value="${selectedText || ''}"
                        style="width: 100%; padding: 8px 12px; border: 1px solid var(--semi-color-border); border-radius: 4px; font-size: 14px; background: var(--semi-color-bg-0); color: var(--semi-color-text-0); margin-top: 4px;"
                      />
                    </div>
                    <div style="display: flex; gap: 12px;">
                      <div style="flex: 1;">
                        <label style="display: block; font-size: 12px; font-weight: 500; color: var(--semi-color-text-1); margin-bottom: 4px;">宽度:</label>
                        <select 
                          id="iframe-width-select"
                          style="width: 100%; padding: 8px 12px; border: 1px solid var(--semi-color-border); border-radius: 4px; font-size: 14px; background: var(--semi-color-bg-0); color: var(--semi-color-text-0); margin-top: 4px;"
                        >
                          <option value="25%">25%</option>
                          <option value="50%">50%</option>
                          <option value="75%">75%</option>
                          <option value="100%" selected>100%</option>
                        </select>
                      </div>
                      <div style="flex: 1;">
                        <label style="display: block; font-size: 12px; font-weight: 500; color: var(--semi-color-text-1); margin-bottom: 4px;">高度:</label>
                        <select 
                          id="iframe-height-select"
                          style="width: 100%; padding: 8px 12px; border: 1px solid var(--semi-color-border); border-radius: 4px; font-size: 14px; background: var(--semi-color-bg-0); color: var(--semi-color-text-0); margin-top: 4px;"
                        >
                          <option value="200px">小（200px）</option>
                          <option value="300px" selected>中（300px）</option>
                          <option value="500px">大（500px）</option>
                          <option value="700px">特大（700px）</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div class="iframe-edit-footer">
                    <div style="display: flex; gap: 8px;">
                      <button 
                        id="iframe-cancel-btn" 
                        style="padding: 8px 16px; border: 1px solid var(--semi-color-border); background: var(--semi-color-bg-0); color: var(--semi-color-text-1); border-radius: 4px; cursor: pointer; font-size: 12px; transition: all 0.2s ease;"
                      >
                        取消
                      </button>
                      <button 
                        id="iframe-ok-btn" 
                        style="padding: 8px 16px; border: none; background: var(--semi-color-primary); color: var(--semi-color-white); border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500; transition: all 0.2s ease;"
                      >
                        确定
                      </button>
                    </div>
                  </div>
                </div>
              `

              // Create modal overlay with consistent styling
              const overlay = document.createElement('div')
              overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                backdrop-filter: blur(4px);
                animation: fadeIn 0.2s ease;
              `

              const modal = document.createElement('div')
              modal.style.cssText = `
                background: var(--semi-color-bg-0);
                border: 1px solid var(--semi-color-border);
                border-radius: 8px;
                box-shadow: var(--semi-shadow-elevated);
                min-width: 480px;
                max-width: 600px;
                max-height: 80vh;
                overflow: hidden;
                animation: slideIn 0.2s ease-out;
              `

              // Add animation styles
              const style = document.createElement('style')
              style.textContent = `
                @keyframes fadeIn {
                  from { opacity: 0; }
                  to { opacity: 1; }
                }
                @keyframes slideIn {
                  from { 
                    opacity: 0; 
                    transform: translateY(-20px) scale(0.95); 
                  }
                  to { 
                    opacity: 1; 
                    transform: translateY(0) scale(1); 
                  }
                }
              `
              document.head.appendChild(style)

              modal.appendChild(modalContent)
              overlay.appendChild(modal)
              document.body.appendChild(overlay)

              const input = modal.querySelector('#iframe-url-input') as HTMLInputElement
              const widthSelect = modal.querySelector('#iframe-width-select') as HTMLSelectElement
              const heightSelect = modal.querySelector('#iframe-height-select') as HTMLSelectElement
              const okBtn = modal.querySelector('#iframe-ok-btn') as HTMLButtonElement
              const cancelBtn = modal.querySelector('#iframe-cancel-btn') as HTMLButtonElement

              // Add hover effects
              okBtn.addEventListener('mouseenter', () => {
                okBtn.style.background = 'var(--semi-color-primary-hover)'
                okBtn.style.transform = 'translateY(-1px)'
                okBtn.style.boxShadow = '0 2px 8px rgba(var(--semi-blue-5), 0.3)'
              })

              okBtn.addEventListener('mouseleave', () => {
                okBtn.style.background = 'var(--semi-color-primary)'
                okBtn.style.transform = 'translateY(0)'
                okBtn.style.boxShadow = 'none'
              })

              cancelBtn.addEventListener('mouseenter', () => {
                cancelBtn.style.background = 'var(--semi-color-fill-0)'
                cancelBtn.style.borderColor = 'var(--semi-color-primary-light-default)'
              })

              cancelBtn.addEventListener('mouseleave', () => {
                cancelBtn.style.background = 'var(--semi-color-bg-0)'
                cancelBtn.style.borderColor = 'var(--semi-color-border)'
              })

              // Focus the input and select text if pre-filled
              setTimeout(() => {
                input.focus()
                if (selectedText) {
                  input.select() // Select all text if there was selected content
                }
              }, 100)

              const cleanup = () => {
                document.body.removeChild(overlay)
                document.head.removeChild(style)
              }

              const handleOk = () => {
                const url = input.value.trim()

                if (url) {
                  const width = widthSelect.value
                  const height = heightSelect.value

                  editor
                    .chain()
                    .focus()
                    .setIframe({
                      src: url,
                      width: width,
                      height: height
                    })
                    .run()
                  Toast.success('嵌入内容插入成功')
                } else {
                  Toast.error('请输入有效的嵌入地址')
                  return
                }
                cleanup()
              }

              okBtn.addEventListener('click', handleOk)
              cancelBtn.addEventListener('click', cleanup)
              overlay.addEventListener('click', (e) => {
                if (e.target === overlay) cleanup()
              })

              // Handle Enter key
              input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleOk()
                } else if (e.key === 'Escape') {
                  e.preventDefault()
                  cleanup()
                }
              })
            }}
            title="插入嵌入内容"
          />
        </Space>
      </div>
    </BubbleMenu>
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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const currentFileRef = useRef<{ folder?: string; file?: string }>({})
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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
      const filePath = `${folder}/${file}`
      const result = await window.api.markdown.readFile(filePath)

      if (result.success && result.content !== undefined) {
        setLoadedContent(result.content)
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
        const html = editor.getHTML()
        setHasUnsavedChanges(true)
        onUpdate?.(html)
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
  const saveDocument = useCallback(async () => {
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
        Toast.success(`文档已保存`)
        onFileChanged?.()
      } else {
        Toast.error(`保存失败: ${result.error || '未知错误'}`)
      }
    } catch (error) {
      console.error('Error saving document:', error)
      Toast.error(`保存失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setIsSaving(false)
    }
  }, [currentFolder, currentFile, onFileChanged, editor, clearAllDiffNodes])

  // 自动保存功能（内存优化版本）
  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
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
      const memoryPressure = editorMemoryManager?.getCurrentMemoryUsage()
        .then(usage => usage.percentage > 0.8)
        .catch(() => false)

      Promise.resolve(memoryPressure).then(highMemoryPressure => {
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
          !hasAIWindows
        ) {
          saveDocument()
        }
      })
    }, 3000)
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
      editor.commands.setContent(loadedContent)
      setHasUnsavedChanges(false)

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
    const memoryEventListener = (eventType: string, data: any) => {
      if (eventType === 'critical') {
        Toast.warning('内存使用率过高，建议保存并刷新页面')
      } else if (eventType === 'warning') {
        console.warn('内存警告:', data.message)
      }
    }

    editorMemoryManager.addEventListener('critical', memoryEventListener)
    editorMemoryManager.addEventListener('warning', memoryEventListener)

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
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
  }, [clearAllDiffNodes, editor])

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
          onSave={saveDocument}
          onContentRestore={(content) => {
            editor.commands.setContent(content)
            setHasUnsavedChanges(true)
            Toast.success('历史版本已恢复')
          }}
        />
      )}

      {isLoading ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '200px',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          <Spin size="large" />
          <span style={{ color: 'var(--semi-color-text-2)' }}>加载文档中...</span>
        </div>
      ) : (
        <div className="editor-wrapper">
          <EditorContent editor={editor} />
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
          <span className="character-count">
            {editor.storage.characterCount.characters()} / 50000 字符
          </span>
          <span className="word-count">{editor.storage.characterCount.words()} 词</span>
        </div>
      )}
    </div>
  )
}

export default Editor

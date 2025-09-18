/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable react-refresh/only-export-components */
import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Extension, Node, mergeAttributes, InputRule, wrappingInputRule } from '@tiptap/core'
import { NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer } from '@tiptap/react'
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
import { Button, Select, Space } from '@douyinfe/semi-ui'
import { IconEdit, IconDelete, IconCopy } from '@douyinfe/semi-icons'
import { editorMemoryManager } from '../utils/EditorMemoryManager'
import { copyToClipboard } from './editorUtils'

export const lowlight = createLowlight()

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
}))

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
  { value: 'xml', label: 'XML/HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'sql', label: 'SQL' },
  { value: 'bash', label: 'Bash' },
  { value: 'dockerfile', label: 'Dockerfile' }
]

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

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    iframe: {
      setIframe: (options: { src: string; width?: string; height?: string }) => ReturnType
    }
  }
}

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

const ImageComponent: React.FC<any> = ({ node, updateAttributes, deleteNode }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [src, setSrc] = useState(node.attrs.src)
  const [width, setWidth] = useState(node.attrs.width || '100%')
  const [height, setHeight] = useState(node.attrs.height || 'auto')
  const [, setIsLoaded] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
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

  const handleImageLoad = useCallback(() => {
    setIsLoaded(true)

    if (imgRef.current && editorMemoryManager) {
      fetch(node.attrs.src)
        .then((response) => response.blob())
        .then((blob) => {
          editorMemoryManager.optimizeAndCacheImage(node.attrs.src, blob)
        })
        .catch(() => {})
    }
  }, [node.attrs.src])

  const handleSave = useCallback(() => {
    updateAttributes({
      src: src.trim(),
      width: width || '100%',
      height: height || 'auto'
    })
    setIsEditing(false)
  }, [src, width, height, updateAttributes])

  const handleCancel = useCallback(() => {
    setSrc(node.attrs.src)
    setWidth(node.attrs.width || '100%')
    setHeight(node.attrs.height || 'auto')
    setIsEditing(false)
  }, [node.attrs])

  if (isEditing) {
    return (
      <NodeViewWrapper className="image-wrapper editing">
        <div
          className="image-edit-form"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => {
            const target = e.target as HTMLElement
            if (
              target.classList.contains('image-edit-form') ||
              target.classList.contains('image-edit-header') ||
              target.classList.contains('image-edit-body') ||
              target.classList.contains('image-edit-footer')
            ) {
              e.preventDefault()
            }
          }}
        >
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
                  onClick={(e) => e.stopPropagation()}
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
          display: 'inline-block',
          position: 'relative'
        }}
      >
        <div className="image-buttons">
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

export const CodeBlockComponent: React.FC<any> = ({ node, updateAttributes }) => {
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

export const CustomImageExtension = Node.create({
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
        renderHTML: (attributes) => ({ src: attributes.src })
      },
      alt: {
        default: null,
        parseHTML: (element) => element.getAttribute('alt'),
        renderHTML: (attributes) => ({
          alt: attributes.alt,
          'data-alt': attributes.alt
        })
      },
      width: {
        default: '100%',
        parseHTML: (element) => element.getAttribute('width') || element.style.width,
        renderHTML: (attributes) => ({ width: attributes.width })
      },
      height: {
        default: 'auto',
        parseHTML: (element) => element.getAttribute('height') || element.style.height,
        renderHTML: (attributes) => ({ height: attributes.height })
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'img[src]'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(HTMLAttributes, { class: 'editor-image' })]
  },

  addCommands() {
    return {
      setImage:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options
          })
        }
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageComponent)
  }
})

export const IframeExtension = Node.create({
  name: 'iframe',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => element.getAttribute('src'),
        renderHTML: (attributes) => ({ src: attributes.src })
      },
      width: {
        default: '100%',
        parseHTML: (element) => element.getAttribute('width') || element.style.width,
        renderHTML: (attributes) => ({ width: attributes.width })
      },
      height: {
        default: '400px',
        parseHTML: (element) => element.getAttribute('height') || element.style.height,
        renderHTML: (attributes) => ({ height: attributes.height })
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'iframe[src]'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['iframe', mergeAttributes(HTMLAttributes, { class: 'editor-iframe' })]
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
  },

  addNodeView() {
    return ReactNodeViewRenderer(IframeComponent)
  }
})

export const SlashCommands = Extension.create({
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

export const MarkdownShortcuts = Extension.create({
  name: 'markdownShortcuts',

  addInputRules() {
    return [
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
      new InputRule({
        find: /^---$/,
        handler: ({ range, commands }) => {
          commands.deleteRange({ from: range.from, to: range.to })
          commands.setHorizontalRule()
        }
      }),
      wrappingInputRule({
        find: /^([-*+])\s(.*)$/,
        type: this.editor.schema.nodes.bulletList
      }),
      wrappingInputRule({
        find: /^(\d+\.)\s(.*)$/,
        type: this.editor.schema.nodes.orderedList
      }),
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

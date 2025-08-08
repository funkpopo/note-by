import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useEditor, EditorContent, NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import { StarterKit } from '@tiptap/starter-kit'
import { Placeholder } from '@tiptap/extension-placeholder'
import { Underline } from '@tiptap/extension-underline'
import { Typography } from '@tiptap/extension-typography'
import { Highlight } from '@tiptap/extension-highlight'
import { TextAlign } from '@tiptap/extension-text-align'
import { Link } from '@tiptap/extension-link'
import { Image } from '@tiptap/extension-image'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableHeader } from '@tiptap/extension-table-header'
import { TableCell } from '@tiptap/extension-table-cell'
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { CharacterCount } from '@tiptap/extension-character-count'
import { Extension } from '@tiptap/core'
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
import { Toast, Button, Space, Spin, Breadcrumb, Select } from '@douyinfe/semi-ui'
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
  IconImage
} from '@douyinfe/semi-icons'
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
        },
      },
    }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ]
  },
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
        type: this.editor.schema.nodes.bulletList,
      }),
      
      // Ordered list shortcuts
      wrappingInputRule({
        find: /^(\d+\.)\s(.*)$/,
        type: this.editor.schema.nodes.orderedList,
      }),
      
      // Blockquote shortcuts  
      wrappingInputRule({
        find: /^>\s(.*)$/,
        type: this.editor.schema.nodes.blockquote,
      }),
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
        const url = window.prompt('链接地址:')
        if (url) {
          this.editor.commands.setLink({ href: url })
        }
        return true
      },
    }
  },
})

// 图片上传函数
const uploadImage = async (file: File, currentFolder?: string, currentFile?: string): Promise<string> => {
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

// 自定义代码块组件
const CodeBlockComponent: React.FC<any> = ({ node, updateAttributes }) => {
  const [isCopied, setIsCopied] = useState(false)
  const language = node.attrs.language || 'plaintext'

  const handleLanguageChange = (value: string | number | any[] | Record<string, any> | undefined) => {
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
          {SUPPORTED_LANGUAGES.map(lang => (
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
        <p className="welcome-description">
          选择左侧的文件夹和文档开始编辑，或者创建新的文档。
        </p>
      </div>
    </div>
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
}> = ({ currentFolder, currentFile, hasUnsavedChanges, isSaving, onSave }) => {
  if (!currentFolder || !currentFile) return null

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
      </div>
      
      <div className="editor-header-right">
        <Space>
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
const TableBubbleMenu: React.FC<{ editor: any; currentFolder?: string; currentFile?: string }> = ({ editor, currentFolder: _currentFolder, currentFile: _currentFile }) => {
  if (!editor) return null

  return (
    <BubbleMenu 
      editor={editor}
      shouldShow={({ state }) => {
        const { selection } = state
        const { $from } = selection
        // 只在表格区域且不是图片时显示
        return ($from.parent.type.name === 'tableCell' || $from.parent.type.name === 'tableHeader') &&
               !editor.isActive('image') // 当图片被选中时不显示菜单
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
          <HighlightColorPicker
            editor={editor}
            isActive={editor.isActive('highlight')}
          />
          <Button
            icon={<IconLink />}
            size="small"
            type={editor.isActive('link') ? 'primary' : 'tertiary'}
            onClick={() => {
              const url = window.prompt('链接地址:')
              if (url) {
                editor.chain().focus().setLink({ href: url }).run()
              }
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

// 纯文本专用 BubbleMenu 组件
const TextBubbleMenu: React.FC<{ editor: any; currentFolder?: string; currentFile?: string }> = ({ editor, currentFolder, currentFile }) => {
  if (!editor) return null

  return (
    <BubbleMenu 
      editor={editor}
      shouldShow={({ state, from, to }) => {
        const { selection } = state
        const { $from } = selection
        // 只在非表格区域、非代码块区域、非图片区域且有选中文本时显示
        return from !== to && 
               $from.parent.type.name !== 'tableCell' && 
               $from.parent.type.name !== 'tableHeader' &&
               $from.parent.type.name !== 'codeBlock' &&
               !editor.isActive('image') // 当图片被选中时不显示菜单
      }}
    >
      <div className="bubble-menu text-bubble-menu">
        <div className="bubble-menu-label">
          <span>文本工具</span>
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
          <HighlightColorPicker
            editor={editor}
            isActive={editor.isActive('highlight')}
          />
          <Button
            icon={<IconLink />}
            size="small"
            type={editor.isActive('link') ? 'primary' : 'tertiary'}
            onClick={() => {
              const url = window.prompt('链接地址:')
              if (url) {
                editor.chain().focus().setLink({ href: url }).run()
              }
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
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
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

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        code: false,
        codeBlock: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
      Underline,
      Typography,
      Highlight.configure({
        multicolor: true,
        HTMLAttributes: {
          class: 'editor-highlight',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'editor-link',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'editor-image',
        },
        inline: false, // 图片作为块级元素
        allowBase64: true, // 允许 base64 图片
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: 'plaintext',
      }).extend({
        addNodeView() {
          return ReactNodeViewRenderer(CodeBlockComponent)
        },
      }),
      CharacterCount.configure({
        limit: 50000,
      }),
      SlashCommands.configure({
        suggestion: {
          items: (props: any) => getSuggestionItems({
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
                  editor: props.editor,
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
                  placement: 'bottom-start',
                })
              },

              onUpdate(props: any) {
                component?.updateProps(props)

                if (!props.clientRect) {
                  return
                }

                popup?.[0]?.setProps({
                  getReferenceClientRect: props.clientRect,
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
              },
            }
          },
        },
      }),
      MarkdownShortcuts,
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
        class: 'editor-content',
      },
      handleDrop: (view, event, _slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
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
                .then(url => {
                  const { schema } = view.state
                  const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY })
                  if (coordinates) {
                    const node = schema.nodes.image.create({ src: url })
                    const transaction = view.state.tr.insert(coordinates.pos, node)
                    view.dispatch(transaction)
                    Toast.success('图片上传成功')
                  }
                })
                .catch(error => {
                  Toast.error(error instanceof Error ? error.message : '图片上传失败')
                })
            } else {
              Toast.error('请先选择或创建一个文档')
            }
            return true
          }
        }
        return false
      },
    },
  }, [loadedContent, content, editable, placeholder, currentFolder, currentFile])

  // 保存文档内容
  const saveDocument = useCallback(async () => {
    if (!currentFolder || !currentFile || !editor) return
    
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
  }, [currentFolder, currentFile, onFileChanged, editor])

  // 自动保存功能
  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }
    
    autoSaveTimeoutRef.current = setTimeout(() => {
      if (hasUnsavedChanges && currentFolder && currentFile && editor) {
        saveDocument()
      }
    }, 3000) // 3秒后自动保存
  }, [hasUnsavedChanges, currentFolder, currentFile, editor, saveDocument])

  // 当选中的文件发生变化时，加载新文档
  useEffect(() => {
    const prevFile = currentFileRef.current
    currentFileRef.current = { folder: currentFolder, file: currentFile }

    if (currentFolder && currentFile && 
        (prevFile.folder !== currentFolder || prevFile.file !== currentFile)) {
      loadDocument(currentFolder, currentFile)
    }
  }, [currentFolder, currentFile, loadDocument])

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

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [])

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
        />
      )}
      
      {isLoading ? (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '200px',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <Spin size="large" />
          <span style={{ color: 'var(--semi-color-text-2)' }}>加载文档中...</span>
        </div>
      ) : (
        <div className="editor-wrapper">
          <EditorContent editor={editor} />
          {editable && (
            <>
              <TableBubbleMenu editor={editor} currentFolder={currentFolder} currentFile={currentFile} />
              <TextBubbleMenu editor={editor} currentFolder={currentFolder} currentFile={currentFile} />
            </>
          )}
        </div>
      )}

      {editable && (
        <div className="editor-footer">
          <span className="character-count">
            {editor.storage.characterCount.characters()} / 50000 字符
          </span>
          <span className="word-count">
            {editor.storage.characterCount.words()} 词
          </span>
        </div>
      )}
    </div>
  )
}

export default Editor
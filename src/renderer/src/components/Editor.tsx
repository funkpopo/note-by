import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import { StarterKit } from '@tiptap/starter-kit'
import { Placeholder } from '@tiptap/extension-placeholder'
import { Underline } from '@tiptap/extension-underline'
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
import { common, createLowlight } from 'lowlight'
import { Toast, Button, Space, Spin, Breadcrumb } from '@douyinfe/semi-ui'
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
  IconFolder
} from '@douyinfe/semi-icons'
import './Editor.css'

const lowlight = createLowlight(common)

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

// BubbleMenu组件
const EditorBubbleMenu: React.FC<{ editor: any }> = ({ editor }) => {
  if (!editor) return null

  return (
    <BubbleMenu 
      editor={editor} 
      shouldShow={({ from, to }) => from !== to}
    >
      <div className="bubble-menu">
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
          <Button
            icon={<span>H</span>}
            size="small"
            type={editor.isActive('highlight') ? 'primary' : 'tertiary'}
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            title="高亮"
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
            icon={<IconCode />}
            size="small"
            type={editor.isActive('codeBlock') ? 'primary' : 'tertiary'}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            title="代码块"
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
        codeBlock: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
      Underline,
      Highlight.configure({
        multicolor: true,
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
      }),
      CharacterCount.configure({
        limit: 50000,
      }),
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
    },
  })

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
    }
  }, [loadedContent, editor])

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
          {editable && <EditorBubbleMenu editor={editor} />}
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
import React, { useEffect, useRef, useContext, useState } from 'react'
import Cherry from 'cherry-markdown'
import 'cherry-markdown/dist/cherry-markdown.css'
import { Button, Typography, Space, Tooltip, Toast, Modal, Form, Dropdown } from '@douyinfe/semi-ui'
import {
  IconSave,
  IconCopy,
  IconEdit,
  IconMore,
  IconLanguage,
  IconRefresh,
  IconDoubleChevronRight,
  IconSearch
} from '@douyinfe/semi-icons'
import { ThemeContext } from '../context/theme/ThemeContext'
import FloatingToolbox from './FloatingToolbox'
import './Editor.css'

interface EditorProps {
  currentFolder?: string
  currentFile?: string
  onFileChanged?: () => void
}

// AI助手模型接口
interface AIModel {
  id: string
  name: string
}

// 添加AI提示配置接口，与Settings.tsx保持一致
interface AIPrompts {
  rewrite: string
  continue: string
  translate: string
}

// 浮动窗口状态接口
interface FloatingToolboxState {
  visible: boolean
  title: string
  content?: string
  loading: boolean
  position?: { x: number; y: number }
  action: 'rewrite' | 'continue' | 'translate' | 'analyze' | null
  isAiResponse?: boolean
  streamingContent?: boolean
  selectedText?: string // 保存用户选中的文本
}

// 在文件顶部添加一个接口定义
interface OpenAIAPI {
  testConnection: (apiConfig: {
    id: string
    name: string
    apiKey: string
    apiUrl: string
    modelName: string
  }) => Promise<{ success: boolean; message: string }>
  generateContent: (request: {
    apiKey: string
    apiUrl: string
    modelName: string
    prompt: string
    maxTokens?: number
    stream?: boolean
  }) => Promise<{ success: boolean; content?: string; error?: string }>
  streamGenerateContent: (
    request: {
      apiKey: string
      apiUrl: string
      modelName: string
      prompt: string
      maxTokens?: number
    },
    callbacks: {
      onData: (chunk: string) => void
      onDone: (content: string) => void
      onError: (error: string) => void
    }
  ) => Promise<{ success: boolean; streamId?: string; error?: string }>
}

// 语言代码到语言名称的映射
const languageNameMap: Record<string, string> = {
  zh: '中文',
  en: '英文',
  ja: '日语',
  fr: '法语'
}

// 语言翻译选项接口
interface TranslationOption {
  sourceLanguage: string
  targetLanguage: string
  label: string
  prompt: string
}

const Editor: React.FC<EditorProps> = ({ currentFolder, currentFile, onFileChanged }) => {
  const editorRef = useRef<HTMLDivElement>(null)
  const cherryRef = useRef<Cherry | null>(null)
  const { isDarkMode } = useContext(ThemeContext) || { isDarkMode: false }
  const [folders, setFolders] = useState<string[]>([])
  const [saving, setSaving] = useState<boolean>(false)
  const [saveModalVisible, setSaveModalVisible] = useState<boolean>(false)
  const [fileName, setFileName] = useState<string>('')
  const [selectedFolder, setSelectedFolder] = useState<string>('')
  const [fileContent, setFileContent] = useState<string>('# 欢迎使用 Note-By \n\n开始写作吧！')
  const [loading, setLoading] = useState<boolean>(false)
  const [models, setModels] = useState<AIModel[]>([])
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [confirmOverwriteVisible, setConfirmOverwriteVisible] = useState<boolean>(false)

  // 添加浮动窗口状态
  const [toolboxState, setToolboxState] = useState<FloatingToolboxState>({
    visible: false,
    title: '',
    content: '',
    loading: false,
    position: undefined,
    action: null,
    isAiResponse: false,
    streamingContent: false,
    selectedText: undefined // 初始化selectedText为undefined
  })

  // 添加翻译语言选项
  const translationOptions: TranslationOption[] = [
    {
      sourceLanguage: 'en',
      targetLanguage: 'zh',
      label: '英译中',
      prompt: '请将以下${sourceLanguage}文本翻译成${targetLanguage}：\n\n${content}'
    },
    {
      sourceLanguage: 'zh',
      targetLanguage: 'en',
      label: '中译英',
      prompt: '请将以下${sourceLanguage}文本翻译成${targetLanguage}：\n\n${content}'
    },
    {
      sourceLanguage: 'ja',
      targetLanguage: 'zh',
      label: '日译中',
      prompt: '请将以下${sourceLanguage}文本翻译成${targetLanguage}：\n\n${content}'
    },
    {
      sourceLanguage: 'zh',
      targetLanguage: 'ja',
      label: '中译日',
      prompt: '请将以下${sourceLanguage}文本翻译成${targetLanguage}：\n\n${content}'
    },
    {
      sourceLanguage: 'fr',
      targetLanguage: 'zh',
      label: '法译中',
      prompt: '请将以下${sourceLanguage}文本翻译成${targetLanguage}：\n\n${content}'
    },
    {
      sourceLanguage: 'zh',
      targetLanguage: 'fr',
      label: '中译法',
      prompt: '请将以下${sourceLanguage}文本翻译成${targetLanguage}：\n\n${content}'
    }
  ]

  // 加载文件夹列表
  const loadFolders = async (): Promise<void> => {
    try {
      const result = await window.api.markdown.getFolders()
      if (result.success && result.folders) {
        setFolders(result.folders)
        if (result.folders.length > 0 && !selectedFolder) {
          setSelectedFolder(result.folders[0])
        }
      }
    } catch (error) {
      console.error('加载文件夹列表失败:', error)
      Toast.error('加载文件夹列表失败')
    }
  }

  // 加载文件内容
  const loadFileContent = async (folder: string, file: string): Promise<void> => {
    setLoading(true)
    try {
      // 构建文件路径
      const filePath = `${folder}/${file}`

      // 读取文件内容
      const result = await window.api.markdown.readFile(filePath)
      if (result.success && result.content) {
        cherryRef.current?.setValue(result.content)
        setFileContent(result.content)
      } else {
        // 文件不存在或读取失败，创建新文件
        const mockContent = `# ${file.replace('.md', '')}\n\n这是一个新文档，开始编辑吧！`
        cherryRef.current?.setValue(mockContent)
        setFileContent(mockContent)
      }

      // 设置文件名（用于显示和保存）
      setFileName(file.replace('.md', ''))
      setSelectedFolder(folder)
    } catch (error) {
      console.error('加载文件内容失败:', error)
      Toast.error('加载文件内容失败')
    } finally {
      setLoading(false)
    }
  }

  // 修复编辑器工具栏样式，确保窄屏下不显示滚动条
  const fixEditorLayout = (): void => {
    setTimeout(() => {
      // 给布局变化一点时间后再修复样式
      const editorContainer = document.querySelector('.cherry-editor') as HTMLElement
      const toolbar = document.querySelector('.cherry-toolbar') as HTMLElement
      const toolbarContent = document.querySelector('.cherry-toolbar-content') as HTMLElement

      if (editorContainer) {
        editorContainer.style.overflow = 'hidden'
        editorContainer.style.maxWidth = '100%'
      }

      if (toolbar) {
        toolbar.style.overflow = 'visible'
        toolbar.style.height = 'auto'
        toolbar.style.minHeight = '40px'
        toolbar.style.flexWrap = 'wrap'
      }

      if (toolbarContent) {
        toolbarContent.style.overflow = 'visible'
        toolbarContent.style.height = 'auto'
        toolbarContent.style.flexWrap = 'wrap'
      }
    }, 100)
  }

  // 设置Cherry Markdown主题
  const updateCherryTheme = (isDark: boolean): void => {
    if (!cherryRef.current) return

    // 应用主题
    if (isDark) {
      cherryRef.current.setTheme('dark')
    } else {
      cherryRef.current.setTheme('light')
    }
  }

  // 保存当前文档
  const saveDocument = async (): Promise<void> => {
    if (!cherryRef.current) return

    // 获取当前编辑器内容
    const content = cherryRef.current.getMarkdown()
    setFileContent(content)

    // 如果已经有文件名和文件夹，直接保存
    if (currentFile && currentFolder) {
      await saveToFile(currentFolder, currentFile, content)
    } else {
      // 否则打开保存对话框
      setSaveModalVisible(true)
    }
  }

  // 保存到指定文件
  const saveToFile = async (folder: string, file: string, content: string): Promise<void> => {
    setSaving(true)
    try {
      // 文件名添加.md后缀（如果没有）
      const filename = file.endsWith('.md') ? file : `${file}.md`
      // 构建相对路径
      const filePath = `${folder}/${filename}`

      // 检查文件是否已存在
      const checkResult = await window.api.markdown.checkFileExists(filePath)

      if (checkResult.success && checkResult.exists) {
        // 如果是当前已打开的文件，直接覆盖
        if (currentFile === filename && currentFolder === folder) {
          const result = await window.api.markdown.save(filePath, content)
          if (result.success) {
            Toast.success('文档保存成功')
            // 通知文件列表更新
            if (onFileChanged) {
              onFileChanged()
            }
          } else {
            Toast.error(`保存失败: ${result.error}`)
          }
          setSaving(false)
          setSaveModalVisible(false)
        } else {
          // 显示确认对话框
          setConfirmOverwriteVisible(true)
          setSaving(false)
          // 不关闭保存对话框，等待用户确认
        }
      } else {
        // 文件不存在，直接保存
        const result = await window.api.markdown.save(filePath, content)
        if (result.success) {
          Toast.success('文档保存成功')
          // 通知文件列表更新
          if (onFileChanged) {
            onFileChanged()
          }
        } else {
          Toast.error(`保存失败: ${result.error}`)
        }
        setSaving(false)
        setSaveModalVisible(false)
      }
    } catch (error) {
      console.error('保存文档失败:', error)
      Toast.error('保存文档失败')
      setSaving(false)
      setSaveModalVisible(false)
    }
  }

  // 处理覆盖保存
  const handleOverwriteConfirm = async (): Promise<void> => {
    setConfirmOverwriteVisible(false)
    setSaving(true)
    try {
      // 文件名添加.md后缀（如果没有）
      const filename = fileName.endsWith('.md') ? fileName : `${fileName}.md`
      // 构建相对路径
      const filePath = `${selectedFolder}/${filename}`

      const result = await window.api.markdown.save(filePath, fileContent)
      if (result.success) {
        Toast.success('文档覆盖保存成功')
        // 通知文件列表更新
        if (onFileChanged) {
          onFileChanged()
        }
      } else {
        Toast.error(`保存失败: ${result.error}`)
      }
    } catch (error) {
      console.error('保存文档失败:', error)
      Toast.error('保存文档失败')
    } finally {
      setSaving(false)
      setSaveModalVisible(false)
    }
  }

  // 处理创建副本
  const handleCreateCopy = async (): Promise<void> => {
    setConfirmOverwriteVisible(false)
    setSaving(true)
    try {
      // 生成副本文件名（添加(1), (2)等后缀）
      let copyIndex = 1
      let copyFileName = fileName
      let filename = ''
      let filePath = ''
      let checkResult = { success: true, exists: true }

      // 循环查找可用的文件名
      while (checkResult.exists) {
        copyFileName = `${fileName}(${copyIndex})`
        filename = copyFileName.endsWith('.md') ? copyFileName : `${copyFileName}.md`
        filePath = `${selectedFolder}/${filename}`
        checkResult = await window.api.markdown.checkFileExists(filePath)
        if (checkResult.exists) {
          copyIndex++
        }
      }

      // 保存副本
      const result = await window.api.markdown.save(filePath, fileContent)
      if (result.success) {
        Toast.success(`文档已保存为 ${filename}`)
        // 通知文件列表更新
        if (onFileChanged) {
          onFileChanged()
        }
      } else {
        Toast.error(`保存失败: ${result.error}`)
      }
    } catch (error) {
      console.error('保存文档副本失败:', error)
      Toast.error('保存文档副本失败')
    } finally {
      setSaving(false)
      setSaveModalVisible(false)
    }
  }

  // 处理取消保存
  const handleCancelSave = (): void => {
    setConfirmOverwriteVisible(false)
    // 保持保存对话框打开，允许用户重命名
  }

  // 处理保存对话框的确认
  const handleSaveConfirm = async (): Promise<void> => {
    if (!fileName.trim()) {
      Toast.warning('请输入文件名')
      return
    }

    if (!selectedFolder) {
      Toast.warning('请选择文件夹')
      return
    }

    await saveToFile(selectedFolder, fileName, fileContent)
  }

  // 处理复制全文
  const handleCopyContent = (): void => {
    if (!cherryRef.current) return

    const content = cherryRef.current.getMarkdown()
    navigator.clipboard
      .writeText(content)
      .then(() => Toast.success('已复制到剪贴板'))
      .catch(() => Toast.error('复制失败'))
  }

  // 加载AI模型列表
  const loadAIModels = async (): Promise<void> => {
    try {
      const settings = await window.api.settings.getAll()
      if (settings.apiConfigs && Array.isArray(settings.apiConfigs)) {
        const apiConfigs = settings.apiConfigs as Array<{
          id: string
          name: string
          apiKey: string
          apiUrl: string
          modelName: string
        }>

        const models = apiConfigs.map((config) => ({
          id: config.id,
          name: config.name
        }))

        setModels(models)

        // 设置当前选中的模型
        if (settings.selectedModelId) {
          setSelectedModel(settings.selectedModelId as string)
        } else if (models.length > 0) {
          setSelectedModel(models[0].id)
        }
      }
    } catch (error) {
      console.error('加载AI模型列表失败:', error)
      Toast.error('加载AI模型列表失败')
    }
  }

  // 设置默认AI模型
  const setDefaultModel = async (modelId: string): Promise<void> => {
    try {
      await window.api.settings.set('selectedModelId', modelId)
      setSelectedModel(modelId)
      Toast.success('默认模型已设置')
    } catch (error) {
      console.error('设置默认模型失败:', error)
      Toast.error('设置默认模型失败')
    }
  }

  // 关闭浮动窗口
  const closeToolbox = (): void => {
    setToolboxState((prev) => ({
      ...prev,
      visible: false,
      action: null,
      selectedText: undefined // 清空保存的选中文本
    }))
  }

  // 处理键盘事件，按ESC键关闭浮动窗口
  const handleKeyDown = (e: KeyboardEvent): void => {
    // 如果按了ESC键且浮动窗口可见，则关闭浮动窗口
    if (e.key === 'Escape' && toolboxState.visible) {
      // 立即阻止事件传播，确保其他组件不会处理这个事件
      e.stopPropagation()
      e.preventDefault()
      closeToolbox()
    }
  }

  // 应用AI生成的内容
  const applyAIContent = (aiContent: string): void => {
    if (!cherryRef.current) return

    // 优先使用保存在状态中的selectedText
    const textToReplace = toolboxState.selectedText || window.getSelection()?.toString()

    if (!textToReplace) {
      Toast.warning('无法确定应用位置')
      return
    }

    try {
      // 获取当前编辑器内容
      const currentContent = cherryRef.current.getMarkdown()

      // 直接替换编辑器中的内容
      const newContent = currentContent.replace(textToReplace, aiContent)
      cherryRef.current.setValue(newContent)

      // 通知用户
      Toast.success('内容已替换')
    } catch (error) {
      console.error('替换内容失败:', error)
      // 降级为剪贴板复制
      navigator.clipboard.writeText(aiContent).then(() => {
        Toast.info('替换失败，内容已复制到剪贴板')
      })
    }

    // 关闭浮动窗口
    closeToolbox()
  }

  // 添加右键菜单事件监听
  const handleContextMenu = (e: MouseEvent): void => {
    // 阻止默认右键菜单
    e.preventDefault()

    // 检查是否有文本被选中
    const selection = window.getSelection()?.toString()
    if (!selection || selection.trim() === '') return

    // 检查点击是否在编辑器内
    let isClickInEditor = false
    let currentElement = e.target as HTMLElement | null

    while (currentElement) {
      if (
        currentElement.classList &&
        (currentElement.classList.contains('cherry-editor') ||
          currentElement.id === 'cherry-markdown')
      ) {
        isClickInEditor = true
        break
      }
      currentElement = currentElement.parentElement
    }

    if (!isClickInEditor) return

    // 显示浮动工具箱在鼠标位置，同时保存选中的文本
    setToolboxState({
      visible: true,
      title: 'AI助手',
      content: selection,
      loading: false,
      position: { x: e.clientX, y: e.clientY },
      action: null,
      selectedText: selection // 保存选中的文本
    })
  }

  // 处理点击事件，关闭浮动窗口
  const handleDocumentClick = (e: MouseEvent): void => {
    // 如果浮动窗口不可见，不处理
    if (!toolboxState.visible) return

    // 检查点击是否在浮动窗口内
    let isClickInToolbox = false
    let currentElement = e.target as HTMLElement | null

    while (currentElement) {
      if (currentElement.classList && currentElement.classList.contains('floating-toolbox')) {
        isClickInToolbox = true
        break
      }
      currentElement = currentElement.parentElement
    }

    // 如果点击在浮动窗口外，关闭浮动窗口
    if (!isClickInToolbox) {
      closeToolbox()
    }
  }

  // 处理翻译请求
  const handleTranslate = async (option: TranslationOption): Promise<void> => {
    // 显示翻译加载状态
    setToolboxState((prev) => ({
      ...prev,
      loading: true,
      title: `${option.label}翻译`,
      action: 'translate',
      content: prev.content // 保留原始内容
    }))

    try {
      // 查找当前选中的模型配置
      const settings = await window.api.settings.getAll()
      const apiConfigs = settings.apiConfigs as Array<{
        id: string
        name: string
        apiKey: string
        apiUrl: string
        modelName: string
      }>

      const modelConfig = apiConfigs.find((config) => config.id === selectedModel)

      if (!modelConfig) {
        throw new Error('未找到选中的模型配置')
      }

      // 构建请求参数
      const sourceLanguageName = languageNameMap[option.sourceLanguage] || option.sourceLanguage
      const targetLanguageName = languageNameMap[option.targetLanguage] || option.targetLanguage

      let prompt = option.prompt
        .replace(/\${sourceLanguage}/g, sourceLanguageName)
        .replace(/\${targetLanguage}/g, targetLanguageName)
        .replace(/\${content}/g, toolboxState.content || '')

      // 如果存在自定义提示，则使用自定义提示
      if (settings.aiPrompts && typeof settings.aiPrompts === 'object') {
        const aiPrompts = settings.aiPrompts as AIPrompts
        if (aiPrompts.translate && typeof aiPrompts.translate === 'string') {
          prompt = aiPrompts.translate
            .replace(/\${content}/g, toolboxState.content || '')
            .replace(/\${sourceLanguage}/g, sourceLanguageName)
            .replace(/\${targetLanguage}/g, targetLanguageName)
        }
      }

      // 使用流式内容生成
      await handleStreamGeneration(modelConfig, prompt, toolboxState, setToolboxState)
    } catch (error) {
      console.error('AI处理失败:', error)
      Toast.error(`AI处理失败: ${error instanceof Error ? error.message : '未知错误'}`)
      setToolboxState((prev) => ({
        ...prev,
        loading: false,
        content: '处理失败，请重试',
        isAiResponse: false
      }))
    }
  }

  // 处理流式内容生成
  const handleStreamGeneration = async (
    modelConfig: {
      id: string
      name: string
      apiKey: string
      apiUrl: string
      modelName: string
    },
    prompt: string,
    toolboxState: FloatingToolboxState,
    setToolboxState: React.Dispatch<React.SetStateAction<FloatingToolboxState>>,
    appendContent = false // 是否追加内容，如内容续写功能
  ): Promise<void> => {
    // 准备初始内容
    const initialContent = appendContent ? toolboxState.content || '' : ''

    // 设置为流式输出模式
    setToolboxState((prev) => ({
      ...prev,
      loading: false, // 立即关闭加载状态
      streamingContent: true,
      isAiResponse: true,
      content: initialContent // 设置初始内容
    }))

    try {
      // 创建流式回调
      const callbacks = {
        onData: (chunk: string): void => {
          // 更新UI中的内容，处理增量数据
          setToolboxState((prev) => {
            // 只附加到当前内容，而不每次都重新构建完整字符串
            const newContent = prev.content + chunk

            return {
              ...prev,
              content: newContent,
              streamingContent: true,
              loading: false
            }
          })
        },
        onDone: (content: string): void => {
          // 流式输出完成
          setToolboxState((prev) => ({
            ...prev,
            loading: false,
            // 如果是追加模式，使用完整内容；否则直接使用累积的内容
            content: appendContent ? initialContent + content : prev.content,
            streamingContent: false
          }))
        },
        onError: (error: string): void => {
          console.error('流式内容生成失败:', error)
          Toast.error(`AI处理失败: ${error}`)
          setToolboxState((prev) => ({
            ...prev,
            loading: false,
            content: '处理失败，请重试',
            isAiResponse: false,
            streamingContent: false
          }))
        }
      }

      // 调用流式API
      await (window.api.openai as OpenAIAPI).streamGenerateContent(
        {
          apiKey: modelConfig.apiKey,
          apiUrl: modelConfig.apiUrl,
          modelName: modelConfig.modelName,
          prompt
        },
        callbacks
      )
    } catch (error) {
      console.error('流式处理失败:', error)
      Toast.error(`AI处理失败: ${error instanceof Error ? error.message : '未知错误'}`)
      setToolboxState((prev) => ({
        ...prev,
        loading: false,
        content: '处理失败，请重试',
        isAiResponse: false,
        streamingContent: false
      }))
    }
  }

  useEffect((): (() => void) => {
    // 加载文件夹列表
    loadFolders()

    // 加载AI模型列表
    loadAIModels()

    if (editorRef.current && !cherryRef.current) {
      cherryRef.current = new Cherry({
        id: 'cherry-markdown',
        value: fileContent,
        toolbars: {
          toolbar: [
            'bold',
            'italic',
            'underline',
            'strikethrough',
            'size',
            'color',
            '|',
            'header',
            'list',
            'checklist',
            'justify',
            'panel',
            '|',
            'quote',
            'hr',
            'code',
            'table',
            'graph',
            '|',
            'link',
            'image',
            '|',
            'togglePreview',
            'switchModel'
          ],
          sidebar: ['undo', 'redo', 'toc', 'export'],
          // 禁用悬浮工具栏
          bubble: false, // 禁用悬浮工具栏
          float: false // 禁用悬浮按钮
        },
        editor: {
          defaultModel: 'edit&preview',
          height: '100%'
        },
        callback: {
          afterChange: (): void => {
            // 编辑器内容变化后的回调
          },
          afterInit: (): void => {
            // 编辑器初始化后修复布局
            fixEditorLayout()
            // 初始化后设置主题
            updateCherryTheme(isDarkMode)
          }
        }
      })

      // 添加窗口大小变化监听，确保编辑器布局自适应
      window.addEventListener('resize', fixEditorLayout)

      // 捕获当前的DOM引用，避免清理函数中引用可能变化的值
      const currentEditorRef = editorRef.current

      // 给编辑器容器添加右键菜单事件，给文档添加点击事件
      currentEditorRef.addEventListener('contextmenu', handleContextMenu)
      document.addEventListener('click', handleDocumentClick)
      // 添加键盘事件监听，用于ESC键关闭浮动窗口，使用捕获阶段
      document.addEventListener('keydown', handleKeyDown, true) // true启用捕获阶段

      return () => {
        // 清理资源
        cherryRef.current = null
        window.removeEventListener('resize', fixEditorLayout)
        if (currentEditorRef) {
          currentEditorRef.removeEventListener('contextmenu', handleContextMenu)
        }
        document.removeEventListener('click', handleDocumentClick)
        document.removeEventListener('keydown', handleKeyDown, true) // 确保使用相同的捕获标志
      }
    }

    return () => {
      // 清理资源
      cherryRef.current = null
      window.removeEventListener('resize', fixEditorLayout)
    }
  }, [])

  // 监听主题变化，更新Cherry Markdown主题
  useEffect(() => {
    updateCherryTheme(isDarkMode)
  }, [isDarkMode])

  // 当选中文件发生变化时，加载文件内容
  useEffect(() => {
    if (currentFolder && currentFile && cherryRef.current) {
      loadFileContent(currentFolder, currentFile)
    }
  }, [currentFolder, currentFile])

  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div className="editor-header">
        <div className="editor-title-container">
          <Typography.Title style={{ margin: 0, fontSize: 20 }}>
            {currentFile ? `${currentFile}` : '新文档'}
          </Typography.Title>
        </div>
        <Space className="editor-actions" align="center" spacing="tight" wrap={false}>
          <Tooltip content="复制全文">
            <Button icon={<IconCopy />} type="tertiary" onClick={handleCopyContent} />
          </Tooltip>

          <Dropdown
            trigger="click"
            position="bottomRight"
            render={
              <Dropdown.Menu>
                <Dropdown.Title>AI助手模型</Dropdown.Title>
                <Dropdown.Item type="secondary" onClick={() => {}}>
                  <Dropdown
                    trigger="hover"
                    position="rightTop"
                    render={
                      <Dropdown.Menu>
                        {models.length > 0 ? (
                          models.map((model) => (
                            <Dropdown.Item
                              key={model.id}
                              onClick={() => setDefaultModel(model.id)}
                              type={selectedModel === model.id ? 'primary' : 'secondary'}
                            >
                              {model.name} {selectedModel === model.id ? '✓' : ''}
                            </Dropdown.Item>
                          ))
                        ) : (
                          <Dropdown.Item type="tertiary">尚未配置模型</Dropdown.Item>
                        )}
                      </Dropdown.Menu>
                    }
                  >
                    <div
                      style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}
                    >
                      <span>选择模型</span>
                      <IconMore style={{ marginLeft: 8 }} />
                    </div>
                  </Dropdown>
                </Dropdown.Item>
              </Dropdown.Menu>
            }
          >
            <Button icon={<IconEdit />} type="secondary">
              AI助手
            </Button>
          </Dropdown>

          <Button
            icon={<IconSave />}
            type="primary"
            onClick={saveDocument}
            loading={saving || loading}
          >
            保存
          </Button>
        </Space>
      </div>

      {/* Cherry Markdown编辑器容器 */}
      <div
        id="cherry-markdown"
        ref={editorRef}
        style={{
          flexGrow: 1,
          overflow: 'hidden',
          borderTop: '1px solid var(--semi-color-border)'
        }}
      />

      {/* 浮动工具箱 */}
      <FloatingToolbox
        visible={toolboxState.visible}
        title={toolboxState.title}
        content={toolboxState.content}
        loading={toolboxState.loading}
        position={toolboxState.position}
        onClose={closeToolbox}
        isAiResponse={toolboxState.isAiResponse}
      >
        {!toolboxState.loading && toolboxState.action === null && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Button
              size="small"
              type="tertiary"
              icon={<IconRefresh />}
              onClick={async () => {
                // 显示风格改写加载状态
                setToolboxState((prev) => ({
                  ...prev,
                  loading: true,
                  title: '风格改写',
                  action: 'rewrite',
                  content: prev.content // 保留原始内容
                }))

                try {
                  // 查找当前选中的模型配置
                  const settings = await window.api.settings.getAll()
                  const apiConfigs = settings.apiConfigs as Array<{
                    id: string
                    name: string
                    apiKey: string
                    apiUrl: string
                    modelName: string
                  }>

                  const modelConfig = apiConfigs.find((config) => config.id === selectedModel)

                  if (!modelConfig) {
                    throw new Error('未找到选中的模型配置')
                  }

                  // 构建请求参数
                  let prompt = `请改写以下文本，保持文本原意但使用更优美的表达：\n\n${toolboxState.content}`

                  // 如果存在自定义提示，则使用自定义提示
                  if (settings.aiPrompts && typeof settings.aiPrompts === 'object') {
                    const aiPrompts = settings.aiPrompts as AIPrompts
                    if (aiPrompts.rewrite && typeof aiPrompts.rewrite === 'string') {
                      prompt = aiPrompts.rewrite.replace(/\${content}/g, toolboxState.content || '')
                    }
                  }

                  // 使用流式内容生成
                  await handleStreamGeneration(modelConfig, prompt, toolboxState, setToolboxState)
                } catch (error) {
                  console.error('AI处理失败:', error)
                  Toast.error(`AI处理失败: ${error instanceof Error ? error.message : '未知错误'}`)
                  setToolboxState((prev) => ({
                    ...prev,
                    loading: false,
                    content: '处理失败，请重试',
                    isAiResponse: false
                  }))
                }
              }}
              className="floating-toolbox-actions-btn"
            >
              风格改写
            </Button>
            <Button
              size="small"
              type="tertiary"
              icon={<IconDoubleChevronRight />}
              onClick={async () => {
                // 显示内容续写加载状态
                setToolboxState((prev) => ({
                  ...prev,
                  loading: true,
                  title: '内容续写',
                  action: 'continue',
                  content: prev.content // 保留原始内容
                }))

                try {
                  // 查找当前选中的模型配置
                  const settings = await window.api.settings.getAll()
                  const apiConfigs = settings.apiConfigs as Array<{
                    id: string
                    name: string
                    apiKey: string
                    apiUrl: string
                    modelName: string
                  }>

                  const modelConfig = apiConfigs.find((config) => config.id === selectedModel)

                  if (!modelConfig) {
                    throw new Error('未找到选中的模型配置')
                  }

                  // 构建请求参数
                  let prompt = `请继续编写以下内容：\n\n${toolboxState.content}\n\n请直接续写，不要重复已有内容。`

                  // 如果存在自定义提示，则使用自定义提示
                  if (settings.aiPrompts && typeof settings.aiPrompts === 'object') {
                    const aiPrompts = settings.aiPrompts as AIPrompts
                    if (aiPrompts.continue && typeof aiPrompts.continue === 'string') {
                      prompt = aiPrompts.continue.replace(
                        /\${content}/g,
                        toolboxState.content || ''
                      )
                    }
                  }

                  // 使用流式内容生成，参数appendContent=true表示追加内容
                  await handleStreamGeneration(
                    modelConfig,
                    prompt,
                    toolboxState,
                    setToolboxState,
                    true
                  )
                } catch (error) {
                  console.error('AI处理失败:', error)
                  Toast.error(`AI处理失败: ${error instanceof Error ? error.message : '未知错误'}`)
                  setToolboxState((prev) => ({
                    ...prev,
                    loading: false,
                    content: '处理失败，请重试',
                    isAiResponse: false
                  }))
                }
              }}
              className="floating-toolbox-actions-btn"
            >
              内容续写
            </Button>

            {/* 整合的翻译下拉菜单按钮 */}
            <Dropdown
              trigger="click"
              position="rightTop"
              render={
                <Dropdown.Menu className="translation-dropdown">
                  <Dropdown.Title>选择翻译语言</Dropdown.Title>
                  {translationOptions.map((option) => (
                    <Dropdown.Item
                      key={`${option.sourceLanguage}-${option.targetLanguage}`}
                      onClick={() => handleTranslate(option)}
                    >
                      {option.label}
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              }
            >
              <Button
                size="small"
                type="tertiary"
                icon={<IconLanguage />}
                className="floating-toolbox-actions-btn"
              >
                翻译功能
              </Button>
            </Dropdown>

            <Button
              size="small"
              type="tertiary"
              icon={<IconSearch />}
              onClick={async () => {
                // 显示内容分析加载状态
                setToolboxState((prev) => ({
                  ...prev,
                  loading: true,
                  title: '内容分析',
                  action: 'analyze',
                  content: prev.content // 保留原始内容
                }))

                try {
                  // 获取当前编辑器内容进行全文分析
                  const editorContent = cherryRef.current?.getMarkdown() || ''

                  // 查找当前选中的模型配置
                  const settings = await window.api.settings.getAll()
                  const apiConfigs = settings.apiConfigs as Array<{
                    id: string
                    name: string
                    apiKey: string
                    apiUrl: string
                    modelName: string
                  }>

                  const modelConfig = apiConfigs.find((config) => config.id === selectedModel)

                  if (!modelConfig) {
                    throw new Error('未找到选中的模型配置')
                  }

                  // 构建请求参数
                  const prompt = `请分析以下文本内容，提供主题概述、关键点、结构分析和改进建议：\n\n${editorContent}`

                  // 使用流式内容生成
                  await handleStreamGeneration(modelConfig, prompt, toolboxState, setToolboxState)
                } catch (error) {
                  console.error('AI处理失败:', error)
                  Toast.error(`AI处理失败: ${error instanceof Error ? error.message : '未知错误'}`)
                  setToolboxState((prev) => ({
                    ...prev,
                    loading: false,
                    content: '处理失败，请重试',
                    isAiResponse: false
                  }))
                }
              }}
              className="floating-toolbox-actions-btn"
            >
              内容分析
            </Button>
          </div>
        )}

        {/* 添加应用按钮区域 */}
        {!toolboxState.loading && toolboxState.action && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <Button
              size="small"
              type="tertiary"
              onClick={() => {
                // 返回主菜单时保留selectedText
                setToolboxState((prev) => ({
                  ...prev,
                  action: null,
                  title: 'AI助手',
                  content: prev.content?.split(':')[1]?.trim() || prev.content || '',
                  isAiResponse: false
                  // 保留selectedText字段，不修改它
                }))
              }}
            >
              返回
            </Button>
            {toolboxState.action !== 'analyze' && (
              <Button
                size="small"
                type="primary"
                onClick={() => {
                  if (toolboxState.content) {
                    applyAIContent(toolboxState.content)
                  }
                }}
              >
                应用
              </Button>
            )}
          </div>
        )}
      </FloatingToolbox>

      {/* 保存文件对话框 */}
      <Modal
        title="保存笔记"
        visible={saveModalVisible}
        onOk={handleSaveConfirm}
        onCancel={() => setSaveModalVisible(false)}
        maskClosable={false}
        okText="保存"
        cancelText="取消"
        okButtonProps={{ loading: saving }}
      >
        <Form>
          <Form.Input
            field="fileName"
            label="文件名"
            placeholder="请输入文件名（如: my-note）"
            onChange={(value) => setFileName(value as string)}
            suffix=".md"
            required
          />
          <Form.Select
            field="folder"
            label="保存位置"
            placeholder="选择文件夹"
            onChange={(value) => setSelectedFolder(value as string)}
            optionList={folders.map((folder) => ({ label: folder, value: folder }))}
            style={{ width: '100%' }}
            emptyContent={
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <Typography.Text type="tertiary">无可用文件夹</Typography.Text>
              </div>
            }
          />
        </Form>
      </Modal>

      {/* 文件覆盖确认对话框 */}
      <Modal
        title="文件已存在"
        visible={confirmOverwriteVisible}
        footer={null}
        onCancel={() => setConfirmOverwriteVisible(false)}
        maskClosable={false}
      >
        <div>
          <Typography.Text>
            文件 <Typography.Text strong>{fileName}.md</Typography.Text> 在{' '}
            <Typography.Text strong>{selectedFolder}</Typography.Text> 中已存在。
          </Typography.Text>
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={handleCancelSave}>取消</Button>
            <Button onClick={handleCreateCopy} type="secondary">
              创建副本
            </Button>
            <Button onClick={handleOverwriteConfirm} type="danger">
              覆盖
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default Editor

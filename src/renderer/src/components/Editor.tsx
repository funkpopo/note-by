import React, { useEffect, useRef, useContext, useState } from 'react'
import Cherry from 'cherry-markdown'
import 'cherry-markdown/dist/cherry-markdown.css'
import { Button, Typography, Space, Tooltip, Toast, Modal, Form, Dropdown } from '@douyinfe/semi-ui'
import { IconSave, IconCopy, IconEdit, IconMore } from '@douyinfe/semi-icons'
import { ThemeContext } from '../context/theme/ThemeContext'
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

// 翻译选项接口
interface TranslationOption {
  id: string
  name: string
  targetLang: string
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
  const [fileContent, setFileContent] = useState<string>(
    '# 欢迎使用 Cherry Markdown 编辑器\n\n开始写作吧！'
  )
  const [loading, setLoading] = useState<boolean>(false)
  const [models, setModels] = useState<AIModel[]>([])
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [confirmOverwriteVisible, setConfirmOverwriteVisible] = useState<boolean>(false)
  const translationOptions = [
    { id: 'en-zh', name: '英译中', targetLang: 'zh' },
    { id: 'zh-en', name: '中译英', targetLang: 'en' },
    { id: 'ja-zh', name: '日译中', targetLang: 'zh' },
    { id: 'zh-ja', name: '中译日', targetLang: 'ja' }
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

  // 内容风格改写
  const rewriteContent = (): void => {
    if (!cherryRef.current || !selectedModel) {
      Toast.warning('请先选择AI模型')
      return
    }

    // 获取当前编辑器内容
    const currentContent = cherryRef.current.getMarkdown()
    if (!currentContent) {
      Toast.warning('请先输入一些内容')
      return
    }

    // 提示用户选择文本
    const selection = window.getSelection()?.toString()
    if (!selection || selection.trim() === '') {
      Toast.warning('请先选择要改写的文本')
      return
    }

    Toast.info('正在改写内容...')
    // 这里实现实际的AI调用逻辑
  }

  // 内容续写
  const continueContent = (): void => {
    if (!cherryRef.current || !selectedModel) {
      Toast.warning('请先选择AI模型')
      return
    }

    // 获取当前编辑器内容和位置用于续写
    const content = cherryRef.current.getMarkdown()
    if (!content) {
      Toast.warning('请先输入一些内容')
      return
    }

    Toast.info('正在续写内容...')
    // 这里实现实际的AI调用逻辑
  }

  // 内容翻译
  const translateContent = (option: TranslationOption): void => {
    if (!cherryRef.current || !selectedModel) {
      Toast.warning('请先选择AI模型')
      return
    }

    // 获取选中的文本
    const selection = window.getSelection()?.toString()
    if (!selection || selection.trim() === '') {
      Toast.warning('请先选择要翻译的文本')
      return
    }

    Toast.info(`正在翻译至${option.name}...`)
    // 这里实现实际的AI调用逻辑
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
          sidebar: ['undo', 'redo', 'toc', 'export']
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
        <Space className="editor-actions">
          <Tooltip content="复制全文">
            <Button icon={<IconCopy />} type="tertiary" onClick={handleCopyContent} />
          </Tooltip>

          <Dropdown
            trigger="click"
            position="bottomRight"
            render={
              <Dropdown.Menu>
                <Dropdown.Title>AI助手功能</Dropdown.Title>
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
                <Dropdown.Divider />
                <Dropdown.Item onClick={rewriteContent}>风格改写</Dropdown.Item>
                <Dropdown.Item onClick={continueContent}>内容续写</Dropdown.Item>
                <Dropdown.Item>
                  <Dropdown
                    trigger="hover"
                    position="rightTop"
                    render={
                      <Dropdown.Menu>
                        {translationOptions.map((option) => (
                          <Dropdown.Item key={option.id} onClick={() => translateContent(option)}>
                            {option.name}
                          </Dropdown.Item>
                        ))}
                      </Dropdown.Menu>
                    }
                  >
                    <div
                      style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}
                    >
                      <span>内容翻译</span>
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
      <div
        id="cherry-markdown"
        ref={editorRef}
        style={{
          flexGrow: 1,
          overflow: 'hidden',
          borderTop: '1px solid var(--semi-color-border)'
        }}
      />

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
          <Typography.Text type="tertiary" style={{ display: 'block', marginTop: 12 }}>
            新文件夹将自动创建
          </Typography.Text>
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
            文件 <Typography.Text strong>{fileName}.md</Typography.Text> 在 <Typography.Text strong>{selectedFolder}</Typography.Text> 中已存在。
          </Typography.Text>
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={handleCancelSave}>
              取消
            </Button>
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

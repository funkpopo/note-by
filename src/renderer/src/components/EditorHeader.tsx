import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Button,
  Space,
  Dropdown,
  List,
  Toast,
  Spin,
  Typography as SemiTypography,
  TagInput,
  Tag
} from '@douyinfe/semi-ui'
import { IconFile, IconSave, IconChevronDown as IconChevronDownSemi } from '@douyinfe/semi-icons'
import CustomDropdown from './CustomDropdown'
import CustomHistoryDropdown from './CustomHistoryDropdown'
import { modelSelectionService, type AiApiConfig } from '../services/modelSelectionService'

const AIModelDropdown: React.FC = () => {
  const [availableModels, setAvailableModels] = useState<AiApiConfig[]>([])
  const [selectedModelId, setSelectedModelId] = useState<string>('')
  const [loading, setLoading] = useState(false)

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

  const handleModelSelect = useCallback(async (modelId: string) => {
    try {
      await modelSelectionService.setSelectedModelId(modelId)
      setSelectedModelId(modelId)
      Toast.success('AI模型已切换')
    } catch {
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
                      style={{ fontSize: 14 }}
                    >
                      {item.name}
                    </SemiTypography.Text>
                    <SemiTypography.Text type="tertiary" size="small" style={{ marginTop: 2 }}>
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

export interface EditorHeaderProps {
  currentFolder?: string
  currentFile?: string
  hasUnsavedChanges: boolean
  isLoading: boolean
  isSaving: boolean
  currentContent?: string
  onSave: () => void
  onContentRestore?: (content: string) => void
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({
  currentFolder,
  currentFile,
  hasUnsavedChanges,
  isSaving,
  currentContent = '',
  onSave,
  onContentRestore
}) => {
  const [isExporting, setIsExporting] = useState(false)
  const [fileTags, setFileTags] = useState<string[]>([])
  const [savingTags, setSavingTags] = useState(false)
  const saveTimer = useRef<number | null>(null)

  const filePath = useMemo(() => {
    if (!currentFolder || !currentFile) return ''
    return `${currentFolder}/${currentFile}`
  }, [currentFolder, currentFile])

  const displayName = useMemo(() => {
    return currentFile ? currentFile.replace(/\.md$/i, '') : ''
  }, [currentFile])

  const loadTags = useCallback(async (): Promise<void> => {
    if (!filePath) return
    try {
      const res = await window.electron.ipcRenderer.invoke('tags:get-file-tags', filePath)
      if (res && res.success && Array.isArray(res.tags)) {
        setFileTags(res.tags)
      } else {
        setFileTags([])
      }
    } catch {
      setFileTags([])
    }
  }, [filePath])

  useEffect(() => {
    void loadTags()
  }, [loadTags])

  const persistTags = useCallback(
    async (tags: string[]): Promise<void> => {
      if (!filePath) return
      try {
        setSavingTags(true)
        await window.electron.ipcRenderer.invoke('tags:set-file-tags', filePath, tags)
        try {
          await window.api.tags.refreshGlobalTags()
        } catch {
          // ignore refresh errors
        }
      } finally {
        setSavingTags(false)
      }
    },
    [filePath]
  )

  const schedulePersist = useCallback(
    (tags: string[]) => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
      saveTimer.current = window.setTimeout(() => {
        void persistTags(tags)
      }, 600)
    },
    [persistTags]
  )

  const handleExport = useCallback(
    async (format: string) => {
      if (!currentFolder || !currentFile || !currentContent) {
        Toast.warning('没有可导出的内容')
        return
      }

      const filePath = `${currentFolder}/${currentFile}`

      setIsExporting(true)
      try {
        let result
        switch (format) {
          case 'pdf':
            result = await window.api.markdown.exportToPdf(filePath, currentContent)
            break
          case 'docx':
            result = await window.api.markdown.exportToDocx(filePath, currentContent)
            break
          case 'html':
            result = await window.api.markdown.exportToHtml(filePath, currentContent)
            break
          case 'notion':
            result = await window.api.markdown.exportToNotion(filePath, currentContent)
            break
          case 'obsidian':
            result = await window.api.markdown.exportToObsidian(filePath, currentContent)
            break
          default:
            Toast.error('不支持的导出格式')
            return
        }

        if (result.success) {
          Toast.success(`导出成功: ${result.path}`)
        } else {
          Toast.error(`导出失败: ${result.error}`)
        }
      } catch (error) {
        Toast.error('导出失败，请重试')
        console.error('导出错误:', error)
      } finally {
        setIsExporting(false)
      }
    },
    [currentFolder, currentFile, currentContent]
  )

  if (!currentFolder || !currentFile) {
    return null
  }

  // Deterministic tag color mapping (consistent per tag value)
  const getTagColor = (
    tag: string
  ): {
    color:
      | 'amber'
      | 'blue'
      | 'cyan'
      | 'green'
      | 'grey'
      | 'indigo'
      | 'light-blue'
      | 'light-green'
      | 'lime'
      | 'orange'
      | 'pink'
      | 'purple'
      | 'red'
      | 'teal'
      | 'violet'
      | 'yellow'
      | 'white'
    type: 'light' | 'solid' | 'ghost'
  } => {
    const palette: Array<
      | 'amber'
      | 'blue'
      | 'cyan'
      | 'green'
      | 'grey'
      | 'indigo'
      | 'light-blue'
      | 'light-green'
      | 'lime'
      | 'orange'
      | 'pink'
      | 'purple'
      | 'red'
      | 'teal'
      | 'violet'
      | 'yellow'
    > = [
      'blue',
      'green',
      'amber',
      'cyan',
      'indigo',
      'light-blue',
      'light-green',
      'lime',
      'orange',
      'pink',
      'purple',
      'red',
      'teal',
      'violet',
      'yellow'
    ]
    let hash = 5381
    const str = (tag || '').toString().trim().toLowerCase()
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) + hash + str.charCodeAt(i)
      hash |= 0
    }
    const idx = Math.abs(hash) % palette.length
    return { color: palette[idx], type: 'light' }
  }

  // use memoized filePath above

  const exportFormats = [
    { key: 'pdf', label: '导出PDF' },
    { key: 'docx', label: '导出DOCX' },
    { key: 'html', label: '导出HTML' },
    { key: 'notion', label: '导出为Notion格式' },
    { key: 'obsidian', label: '导出为Obsidian格式' }
  ]

  return (
    <div className="editor-header">
      <div className="editor-title-bar">
        <div className="editor-header-left">
          <div className="file-info">
            <IconFile size="small" style={{ color: 'var(--semi-color-text-2)' }} />
            <div className="file-title" title={displayName}>
              {displayName}
            </div>
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
              currentContent={currentContent}
              onRestore={onContentRestore}
              disabled={hasUnsavedChanges}
            />
            <CustomDropdown
              trigger="click"
              position="bottomLeft"
              autoAdjustOverflow
              constrainToContainer
              menu={exportFormats.map((format) => ({
                node: 'item' as const,
                name: format.label,
                onClick: () => handleExport(format.key),
                disabled: isExporting
              }))}
              getPopupContainer={() => {
                const container = document.querySelector('.tiptap-editor')
                return (container as HTMLElement) || document.body
              }}
              className="export-dropdown"
            >
              <Button
                icon={<IconFile />}
                type="tertiary"
                size="default"
                loading={isExporting || savingTags}
                disabled={!currentContent || hasUnsavedChanges}
              >
                导出
              </Button>
            </CustomDropdown>
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

      <div className="editor-tag-bar">
        <SemiTypography.Text className="editor-tag-label" type="tertiary" size="small">
          标签
        </SemiTypography.Text>
        <div className="editor-tag-input-container">
          <TagInput
            value={fileTags}
            onChange={(val) => {
              const list = (val || []).map((v) => String(v).trim()).filter(Boolean)
              setFileTags(list)
              schedulePersist(list)
            }}
            placeholder="添加标签"
            addOnBlur
            allowDuplicates={false}
            separator=","
            disabled={!filePath}
            style={{ width: '100%' }}
            renderTagItem={(value, _index, onClose) => {
              const { color, type } = getTagColor(String(value))
              return (
                <Tag
                  color={color}
                  type={type}
                  size="small"
                  closable
                  onClose={onClose}
                  style={{ marginRight: 4 }}
                >
                  {String(value)}
                </Tag>
              )
            }}
          />
        </div>
        {savingTags && (
          <div className="editor-tag-status">
            <Spin size="small" />
            <SemiTypography.Text type="tertiary" size="small">
              保存中...
            </SemiTypography.Text>
          </div>
        )}
      </div>
    </div>
  )
}

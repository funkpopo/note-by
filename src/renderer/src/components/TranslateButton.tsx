import React, { useState, useEffect, useRef } from 'react'
import { Button, Popover, Spin, Typography, Select } from '@douyinfe/semi-ui'
import { IconLanguage } from '@douyinfe/semi-icons'
import { useBlockNoteEditor } from '@blocknote/react'
import { useTheme } from '../context/theme/useTheme'

// 定义Popover的位置类型
type PopoverPosition =
  | 'left'
  | 'right'
  | 'bottomLeft'
  | 'top'
  | 'bottom'
  | 'topLeft'
  | 'topRight'
  | 'leftTop'
  | 'leftBottom'
  | 'rightTop'
  | 'rightBottom'
  | 'bottomRight'
  | 'leftTopOver'
  | 'rightTopOver'
  | 'leftBottomOver'
  | 'rightBottomOver'

// Language options for translation
interface LanguageOption {
  value: string
  label: string
}

const LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'es', label: 'Español' },
  { value: 'ru', label: 'Русский' }
]

const SOURCE_LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: 'auto', label: '自动检测' },
  ...LANGUAGE_OPTIONS
]

// TranslateButton component for BlockNote formatting toolbar
export const TranslateButton: React.FC = () => {
  const editor = useBlockNoteEditor()
  const { isDarkMode } = useTheme()
  const [loading, setLoading] = useState(false)
  const [aiResponse, setAiResponse] = useState('')
  const [streamingResponse, setStreamingResponse] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sourceLanguage, setSourceLanguage] = useState<string>('auto')
  const [targetLanguage, setTargetLanguage] = useState<string>('zh')
  const contentRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLDivElement>(null)
  const [popoverVisible, setPopoverVisible] = useState(false)
  const [popoverPosition, setPopoverPosition] = useState<PopoverPosition>('bottomLeft')

  // Load saved language preference
  useEffect(() => {
    const loadLanguagePreference = async (): Promise<void> => {
      try {
        const settings = await window.api.settings.getAll()
        if (settings.translationSourceLanguage) {
          setSourceLanguage(settings.translationSourceLanguage as string)
        }
        if (settings.translationTargetLanguage) {
          setTargetLanguage(settings.translationTargetLanguage as string)
        }
      } catch (err) {
        console.error('Failed to load language preference:', err)
      }
    }

    loadLanguagePreference()
  }, [])

  // Add resize event listener to handle window size changes
  useEffect(() => {
    const handleResize = (): void => {
      updatePopoverPosition()
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [popoverVisible])

  // Update popover position based on button position and window size
  const updatePopoverPosition = (): void => {
    if (!buttonRef.current || !popoverVisible) return

    const buttonRect = buttonRef.current.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    // Calculate available space in different directions
    const spaceBelow = viewportHeight - buttonRect.bottom
    const spaceAbove = buttonRect.top
    const spaceRight = viewportWidth - buttonRect.left
    const spaceLeft = buttonRect.right

    // Determine best position based on available space
    // Need at least 300px for content width and some height for the popover
    if (spaceBelow >= 350) {
      // If there's enough space below, prefer bottom positions
      if (spaceRight >= 300) {
        setPopoverPosition('bottomLeft')
      } else if (spaceLeft >= 300) {
        setPopoverPosition('bottomRight')
      } else {
        setPopoverPosition('bottom')
      }
    } else if (spaceAbove >= 350) {
      // If there's enough space above, use top positions
      if (spaceRight >= 300) {
        setPopoverPosition('topLeft')
      } else if (spaceLeft >= 300) {
        setPopoverPosition('topRight')
      } else {
        setPopoverPosition('top')
      }
    } else if (spaceRight >= 300) {
      // If there's enough space to the right
      setPopoverPosition('rightTop')
    } else if (spaceLeft >= 300) {
      // If there's enough space to the left
      setPopoverPosition('leftTop')
    } else {
      // Default fallback
      setPopoverPosition('bottom')
    }
  }

  // Handle popover visibility change
  const handlePopoverVisibleChange = (visible: boolean): void => {
    setPopoverVisible(visible)
    if (visible) {
      // Update position when popover becomes visible
      setTimeout(updatePopoverPosition, 0)
    }
  }

  // Save language preferences
  const saveLanguagePreferences = async (source: string, target: string): Promise<void> => {
    try {
      await window.api.settings.set('translationSourceLanguage', source)
      await window.api.settings.set('translationTargetLanguage', target)
    } catch (err) {
      console.error('Failed to save language preferences:', err)
    }
  }

  // Function to get selected text from editor
  const getSelectedText = async (): Promise<string> => {
    // First try to get the DOM selection for most accurate text selection
    try {
      const domSelection = window.getSelection()
      if (domSelection && domSelection.toString().trim()) {
        return domSelection.toString().trim()
      }
    } catch (err) {
      console.error('Error getting DOM selection:', err)
    }

    // Fallback to BlockNote selection if DOM selection is empty
    const selection = editor.getSelection()
    if (!selection) return ''

    // Get selected blocks
    const blocks = selection.blocks || []

    if (blocks.length > 0) {
      // Convert selected blocks to markdown to preserve formatting
      try {
        const markdown = await editor.blocksToMarkdownLossy(blocks)
        return markdown
      } catch (error) {
        console.error('Error converting blocks to markdown:', error)
        return ''
      }
    }

    return ''
  }

  // Function to process selected text with AI
  const processWithAI = async (): Promise<void> => {
    setLoading(true)
    setError(null)
    setAiResponse('')
    setStreamingResponse('')
    setIsStreaming(true)

    try {
      const selectedText = await getSelectedText()
      if (!selectedText) {
        setError('请先选择一些文本')
        setLoading(false)
        setIsStreaming(false)
        return
      }

      // Get API settings from user configuration
      const settings = await window.api.settings.getAll()
      const AiApiConfigs =
        (settings.AiApiConfigs as Array<{
          id: string
          name: string
          apiKey: string
          apiUrl: string
          modelName: string
          temperature?: string
          maxTokens?: string
        }>) || []

      if (AiApiConfigs.length === 0) {
        setError('未配置AI模型，请先在设置中配置AI模型')
        setLoading(false)
        setIsStreaming(false)
        return
      }

      // 获取从localStorage中存储的选中模型ID
      const selectedModelId = window.localStorage.getItem('selectedModelId')

      // 根据选中的模型ID获取API配置，如果未找到则使用第一个
      let AiApiConfig = AiApiConfigs[0]
      if (selectedModelId) {
        const selectedConfig = AiApiConfigs.find((config) => config.id === selectedModelId)
        if (selectedConfig) {
          AiApiConfig = selectedConfig
        }
      }

      // Create a more direct prompt that instructs to only output the translation
      let prompt = ''
      const textToTranslate = selectedText.trim()

      // Get translation prompt from settings or use default
      const aiPrompts = (settings.aiPrompts as Record<string, string>) || {}

      if (
        aiPrompts &&
        typeof aiPrompts === 'object' &&
        'translate' in aiPrompts &&
        aiPrompts.translate.trim() !== ''
      ) {
        // Replace placeholders with actual values
        let customPrompt = aiPrompts.translate
          .replace('${content}', textToTranslate)
          .replace('${targetLanguage}', targetLanguage)

        if (sourceLanguage === 'auto') {
          customPrompt = customPrompt.replace('${sourceLanguage}', '自动检测')
        } else {
          customPrompt = customPrompt.replace('${sourceLanguage}', sourceLanguage)
        }

        prompt = customPrompt
      } else {
        // Use default prompt if no custom prompt is available
        if (sourceLanguage === 'auto') {
          prompt = `Translate the following text to ${targetLanguage}. Output only the translation without explanations, notes, or original text:\n\n${textToTranslate}`
        } else {
          prompt = `Translate the following text from ${sourceLanguage} to ${targetLanguage}. Output only the translation without explanations, notes, or original text:\n\n${textToTranslate}`
        }
      }

      // 使用流式API
      const result = await window.api.openai.streamGenerateContent(
        {
          apiKey: AiApiConfig.apiKey,
          apiUrl: AiApiConfig.apiUrl,
          modelName: AiApiConfig.modelName,
          prompt: prompt,
          maxTokens: parseInt(AiApiConfig.maxTokens || '2000')
        },
        {
          onData: (chunk: string) => {
            // 更新流式响应，添加新的文本块
            setStreamingResponse((prev) => prev + chunk)

            // 自动滚动到底部
            if (contentRef.current) {
              contentRef.current.scrollTop = contentRef.current.scrollHeight
            }
          },
          onDone: (content: string) => {
            // 完成时设置最终响应
            setAiResponse(content)
            setLoading(false)
            setIsStreaming(false)
            // Recalculate position after content is loaded
            updatePopoverPosition()
          },
          onError: (error: string) => {
            setError(error)
            setLoading(false)
            setIsStreaming(false)
          }
        }
      )

      if (!result.success) {
        setError(result.error || '处理失败')
        setLoading(false)
        setIsStreaming(false)
      }
    } catch (err) {
      setError('AI处理出错：' + (err instanceof Error ? err.message : String(err)))
      setLoading(false)
      setIsStreaming(false)
    }
  }

  // Function to apply AI response to editor
  const applyAIResponse = (): void => {
    const responseToApply = aiResponse || streamingResponse
    if (!responseToApply) return

    const selection = editor.getSelection()
    if (!selection) return

    // Check if we're dealing with a text selection within editor
    const domSelection = window.getSelection()
    if (domSelection && !domSelection.isCollapsed) {
      // Simple replacement for text selection
      const cleanResponse = responseToApply.trim()

      try {
        // For partial text selection, insert the rewritten text directly
        document.execCommand('insertText', false, cleanResponse)
        // Close popover
        setAiResponse('')
        setStreamingResponse('')
        setPopoverVisible(false)
        return
      } catch (err) {
        console.error('Error using execCommand:', err)
        // Fallback to BlockNote replacement if execCommand fails
      }
    }

    // Fallback to BlockNote block replacement
    try {
      editor.tryParseMarkdownToBlocks(responseToApply).then((blocks) => {
        if (blocks && blocks.length > 0) {
          editor.replaceBlocks(selection.blocks, blocks)
        } else {
          // Fallback if parsing fails
          editor.replaceBlocks(selection.blocks, [
            {
              type: 'paragraph',
              content: responseToApply
            }
          ])
        }
      })
    } catch (err) {
      console.error('Error replacing blocks:', err)
    }

    // Close popover by clearing response
    setAiResponse('')
    setStreamingResponse('')
    setPopoverVisible(false)
  }

  // Handle source language change
  const handleSourceLanguageChange = (value: string): void => {
    setSourceLanguage(value)
    saveLanguagePreferences(value, targetLanguage)
  }

  // Handle target language change
  const handleTargetLanguageChange = (value: string): void => {
    setTargetLanguage(value)
    saveLanguagePreferences(sourceLanguage, value)
  }

  // Render popover content based on state
  const renderPopoverContent = (): React.ReactNode => {
    if (loading) {
      return (
        <div
          className="ai-popover-content"
          style={{
            padding: '12px',
            minWidth: '300px',
            maxWidth: '300px',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <Spin size="small" />
            <Typography.Text style={{ display: 'block', marginTop: '8px' }}>
              AI正在{isStreaming ? '生成' : '处理'}...
            </Typography.Text>
          </div>

          {isStreaming && streamingResponse && (
            <div
              ref={contentRef}
              style={{
                marginTop: '12px',
                maxHeight: '300px',
                overflowY: 'auto',
                overflowX: 'hidden',
                padding: '8px',
                border: '1px solid var(--semi-color-border)',
                borderRadius: '4px',
                backgroundColor: isDarkMode ? 'var(--semi-color-bg-1)' : 'var(--semi-color-bg-0)'
              }}
            >
              <Typography.Paragraph
                style={{ whiteSpace: 'pre-wrap', margin: 0, wordBreak: 'break-word' }}
              >
                {streamingResponse}
              </Typography.Paragraph>
            </div>
          )}

          {isStreaming && streamingResponse && (
            <div style={{ marginTop: '12px', textAlign: 'right' }}>
              <Button
                size="small"
                type="tertiary"
                onClick={() => {
                  setLoading(false)
                  setIsStreaming(false)
                  setPopoverVisible(false)
                }}
              >
                取消
              </Button>
              <Button
                size="small"
                type="primary"
                style={{ marginLeft: '8px' }}
                onClick={applyAIResponse}
              >
                应用
              </Button>
            </div>
          )}
        </div>
      )
    }

    if (error) {
      return (
        <div className="ai-popover-content" style={{ padding: '12px' }}>
          <Typography.Text type="danger">{error}</Typography.Text>
          <Button
            size="small"
            style={{ marginTop: '8px' }}
            onClick={() => {
              setError(null)
              setPopoverVisible(false)
            }}
          >
            关闭
          </Button>
        </div>
      )
    }

    if (aiResponse) {
      return (
        <div
          className="ai-popover-content"
          style={{
            padding: '12px',
            minWidth: '300px',
            maxWidth: '300px',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          <div
            style={{
              maxHeight: '300px',
              overflowY: 'auto',
              overflowX: 'hidden',
              padding: '8px',
              border: '1px solid var(--semi-color-border)',
              borderRadius: '4px',
              backgroundColor: isDarkMode ? 'var(--semi-color-bg-1)' : 'var(--semi-color-bg-0)'
            }}
          >
            <Typography.Paragraph
              style={{ whiteSpace: 'pre-wrap', margin: 0, wordBreak: 'break-word' }}
            >
              {aiResponse}
            </Typography.Paragraph>
          </div>
          <div style={{ marginTop: '12px', textAlign: 'right' }}>
            <Button
              size="small"
              onClick={() => {
                setAiResponse('')
                setPopoverVisible(false)
              }}
            >
              取消
            </Button>
            <Button
              size="small"
              type="primary"
              style={{ marginLeft: '8px' }}
              onClick={applyAIResponse}
            >
              应用
            </Button>
          </div>
        </div>
      )
    }

    return (
      <div className="ai-popover-content" style={{ padding: '12px', width: '300px' }}>
        <Typography.Text style={{ display: 'block', marginBottom: '8px' }}>
          翻译设置
        </Typography.Text>

        <div style={{ marginBottom: '12px' }}>
          <Typography.Text style={{ display: 'block', marginBottom: '4px' }}>
            源语言
          </Typography.Text>
          <Select
            style={{ width: '100%' }}
            value={sourceLanguage}
            onChange={(
              value: string | number | unknown[] | Record<string, unknown> | undefined
            ) => {
              if (typeof value === 'string') {
                handleSourceLanguageChange(value)
              }
            }}
          >
            {SOURCE_LANGUAGE_OPTIONS.map((option) => (
              <Select.Option key={option.value} value={option.value}>
                {option.label}
              </Select.Option>
            ))}
          </Select>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <Typography.Text style={{ display: 'block', marginBottom: '4px' }}>
            目标语言
          </Typography.Text>
          <Select
            style={{ width: '100%' }}
            value={targetLanguage}
            onChange={(
              value: string | number | unknown[] | Record<string, unknown> | undefined
            ) => {
              if (typeof value === 'string') {
                handleTargetLanguageChange(value)
              }
            }}
          >
            {LANGUAGE_OPTIONS.map((option) => (
              <Select.Option key={option.value} value={option.value}>
                {option.label}
              </Select.Option>
            ))}
          </Select>
        </div>

        <Button size="small" type="primary" onClick={processWithAI} style={{ marginTop: '8px' }}>
          开始翻译
        </Button>
      </div>
    )
  }

  // Use custom styled button since FormattingToolbarButton is not available
  return (
    <Popover
      content={renderPopoverContent()}
      trigger="click"
      position={popoverPosition}
      visible={popoverVisible}
      onVisibleChange={handlePopoverVisibleChange}
      zIndex={1030}
      getPopupContainer={() => document.querySelector('.bn-container') || document.body}
      className="ai-response-popover"
    >
      <div
        ref={buttonRef}
        className="bn-formatting-toolbar-button"
        title="AI翻译"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: '4px 8px'
        }}
        onClick={() => setPopoverVisible(!popoverVisible)}
      >
        <IconLanguage style={{ color: isDarkMode ? '#dedede' : undefined }} />
      </div>
    </Popover>
  )
}

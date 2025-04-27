import React, { useState, useEffect } from 'react'
import { Button, Popover, Space, Spin, Typography, Select } from '@douyinfe/semi-ui'
import { IconLanguage } from '@douyinfe/semi-icons'
import { useBlockNoteEditor } from '@blocknote/react'
import { useTheme } from '../context/theme/useTheme'

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
  const [error, setError] = useState<string | null>(null)
  const [sourceLanguage, setSourceLanguage] = useState<string>('auto')
  const [targetLanguage, setTargetLanguage] = useState<string>('zh')

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

    try {
      const selectedText = await getSelectedText()
      if (!selectedText) {
        setError('请先选择一些文本')
        setLoading(false)
        return
      }

      // Get API settings from user configuration
      const settings = await window.api.settings.getAll()
      const apiConfigs =
        (settings.apiConfigs as Array<{
          id: string
          name: string
          apiKey: string
          apiUrl: string
          modelName: string
          temperature?: string
          maxTokens?: string
        }>) || []

      if (apiConfigs.length === 0) {
        setError('未配置AI模型，请先在设置中配置AI模型')
        setLoading(false)
        return
      }

      // Use the first API config (can be enhanced to let user select)
      const apiConfig = apiConfigs[0]

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

      // Call AI service
      const result = await window.api.openai.generateContent({
        apiKey: apiConfig.apiKey,
        apiUrl: apiConfig.apiUrl,
        modelName: apiConfig.modelName,
        prompt: prompt,
        maxTokens: parseInt(apiConfig.maxTokens || '2000')
      })

      if (result.success && result.content) {
        setAiResponse(result.content)
      } else {
        setError(result.error || '处理失败')
      }
    } catch (err) {
      setError('AI处理出错：' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setLoading(false)
    }
  }

  // Function to apply AI response to editor
  const applyAIResponse = (): void => {
    if (!aiResponse) return

    const selection = editor.getSelection()
    if (!selection) return

    // Check if we're dealing with a text selection within editor
    const domSelection = window.getSelection()
    if (domSelection && !domSelection.isCollapsed) {
      // Simple replacement for text selection
      const cleanResponse = aiResponse.trim()

      try {
        // For partial text selection, insert the translated text directly
        document.execCommand('insertText', false, cleanResponse)
        // Close popover
        setAiResponse('')
        return
      } catch (err) {
        console.error('Error using execCommand:', err)
        // Fallback to BlockNote replacement if execCommand fails
      }
    }

    // Fallback to BlockNote block replacement
    try {
      editor.tryParseMarkdownToBlocks(aiResponse).then((blocks) => {
        if (blocks && blocks.length > 0) {
          editor.replaceBlocks(selection.blocks, blocks)
        } else {
          // Fallback if parsing fails
          editor.replaceBlocks(selection.blocks, [
            {
              type: 'paragraph',
              content: aiResponse
            }
          ])
        }
      })
    } catch (err) {
      console.error('Error replacing blocks:', err)
    }

    // Close popover by clearing response
    setAiResponse('')
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
        <div style={{ padding: '12px', textAlign: 'center' }}>
          <Spin size="small" />
          <Typography.Text style={{ display: 'block', marginTop: '8px' }}>
            AI正在处理...
          </Typography.Text>
        </div>
      )
    }

    if (error) {
      return (
        <div style={{ padding: '12px' }}>
          <Typography.Text type="danger">{error}</Typography.Text>
          <Button size="small" style={{ marginTop: '8px' }} onClick={() => setError(null)}>
            关闭
          </Button>
        </div>
      )
    }

    if (aiResponse) {
      return (
        <div style={{ padding: '12px', maxWidth: '300px' }}>
          <Typography.Text
            style={{ display: 'block', marginBottom: '8px', maxHeight: '150px', overflow: 'auto' }}
          >
            {aiResponse}
          </Typography.Text>
          <Space>
            <Button size="small" type="primary" onClick={applyAIResponse}>
              应用
            </Button>
            <Button size="small" onClick={() => setAiResponse('')}>
              取消
            </Button>
          </Space>
        </div>
      )
    }

    return (
      <div style={{ padding: '12px', width: '300px' }}>
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
    <Popover content={renderPopoverContent()} trigger="click" position="bottomLeft">
      <div
        className="bn-formatting-toolbar-button"
        title="AI翻译"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: '4px 8px'
        }}
      >
        <IconLanguage style={{ color: isDarkMode ? '#dedede' : undefined }} />
      </div>
    </Popover>
  )
}

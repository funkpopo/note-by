import React, { useState } from 'react'
import { Button, Popover, Space, Spin, Typography } from '@douyinfe/semi-ui'
import { IconSearchStroked } from '@douyinfe/semi-icons'
import { useBlockNoteEditor } from '@blocknote/react'
import { useTheme } from '../context/theme/useTheme'

// AnalyzeButton component for BlockNote formatting toolbar
export const AnalyzeButton: React.FC = () => {
  const editor = useBlockNoteEditor()
  const { isDarkMode } = useTheme()
  const [loading, setLoading] = useState(false)
  const [aiResponse, setAiResponse] = useState('')
  const [error, setError] = useState<string | null>(null)

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

      // Use the first API config
      const apiConfig = apiConfigs[0]

      // Get analysis prompt from settings or use default
      let prompt = ''
      const aiPrompts = (settings.aiPrompts as Record<string, string>) || {}

      if (aiPrompts && typeof aiPrompts === 'object' && 'analyze' in aiPrompts) {
        // Replace placeholder with actual content
        prompt = aiPrompts.analyze.replace('${content}', selectedText.trim())
      } else {
        // Default prompt for content analysis
        prompt = `分析以下内容，提供关键点、主题、情感倾向等分析：\n\n${selectedText.trim()}`
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
            style={{
              display: 'block',
              marginBottom: '8px',
              maxHeight: '300px',
              overflow: 'auto',
              whiteSpace: 'pre-wrap'
            }}
          >
            {aiResponse}
          </Typography.Text>
          <Space>
            <Button size="small" onClick={() => setAiResponse('')}>
              关闭
            </Button>
          </Space>
        </div>
      )
    }

    return (
      <div style={{ padding: '12px', width: '250px' }}>
        <Typography.Text style={{ display: 'block', marginBottom: '12px' }}>
          使用AI分析选中的内容，提供关键点、主题和情感倾向等分析
        </Typography.Text>
        <Button size="small" type="primary" onClick={processWithAI}>
          开始分析
        </Button>
      </div>
    )
  }

  // Use custom styled button
  return (
    <Popover content={renderPopoverContent()} trigger="click" position="bottomLeft">
      <div
        className="bn-formatting-toolbar-button"
        title="AI分析"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: '4px 8px'
        }}
      >
        <IconSearchStroked style={{ color: isDarkMode ? '#dedede' : undefined }} />
      </div>
    </Popover>
  )
}

import React, { useState } from 'react'
import { Button, Popover, Space, Spin, Typography } from '@douyinfe/semi-ui'
import { IconBulb } from '@douyinfe/semi-icons'
import { useBlockNoteEditor } from '@blocknote/react'

// AIButton component for BlockNote formatting toolbar
export const AIButton: React.FC = () => {
  const editor = useBlockNoteEditor()
  const [loading, setLoading] = useState(false)
  const [aiResponse, setAiResponse] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Function to get selected text from editor
  const getSelectedText = async (): Promise<string> => {
    // Get selected blocks
    const selection = editor.getSelection()
    if (!selection) return ''

    // Get text content from selected blocks
    const blocks = editor.getSelection()?.blocks || []

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

      // Create prompt
      const prompt = `请分析并优化以下内容，保持原意但使其更清晰简洁：\n\n${selectedText}`

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

    // Replace selected content with AI response
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

    // Close popover by clearing response
    setAiResponse('')
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
      <div style={{ padding: '12px' }}>
        <Typography.Text style={{ display: 'block', marginBottom: '8px' }}>
          使用AI处理选中的文本
        </Typography.Text>
        <Button size="small" type="primary" onClick={processWithAI}>
          开始处理
        </Button>
      </div>
    )
  }

  // Use custom styled button since FormattingToolbarButton is not available
  return (
    <Popover content={renderPopoverContent()} trigger="click" position="bottomLeft">
      <div
        className="bn-formatting-toolbar-button"
        title="AI助手"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: '4px 8px'
        }}
      >
        <IconBulb />
      </div>
    </Popover>
  )
}

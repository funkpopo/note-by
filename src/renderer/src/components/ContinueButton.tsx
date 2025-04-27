import React, { useState } from 'react'
import { Button, Popover, Space, Spin, Typography } from '@douyinfe/semi-ui'
import { IconEditStroked } from '@douyinfe/semi-icons'
import { useBlockNoteEditor } from '@blocknote/react'
import { useTheme } from '../context/theme/useTheme'

// ContinueButton component for BlockNote formatting toolbar
export const ContinueButton: React.FC = () => {
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

      // Get continuation prompt from settings or use default
      let prompt = ''
      const aiPrompts = (settings.aiPrompts as Record<string, string>) || {}

      if (aiPrompts && typeof aiPrompts === 'object' && 'continue' in aiPrompts) {
        // Replace placeholder with actual content
        prompt = aiPrompts.continue.replace('${content}', selectedText.trim())
      } else {
        // Default prompt for content continuation
        prompt = `继续以下内容，保持风格和逻辑连贯：\n\n${selectedText.trim()}`
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
      // For content continuation, we want to append, not replace
      try {
        // Get current selection
        const range = domSelection.getRangeAt(0)
        // Move selection to end
        range.collapse(false)
        // Insert text at cursor position
        document.execCommand('insertText', false, aiResponse.trim())
        // Close popover
        setAiResponse('')
        return
      } catch (err) {
        console.error('Error using execCommand:', err)
        // Fallback to BlockNote replacement if execCommand fails
      }
    }

    // Fallback to BlockNote block addition
    try {
      // Try to parse AI response as markdown
      editor.tryParseMarkdownToBlocks(aiResponse).then((blocks) => {
        if (blocks && blocks.length > 0) {
          // Add the new blocks after the current selection
          const lastSelectedBlockIndex = editor.document.findIndex(
            (block) => block.id === selection.blocks[selection.blocks.length - 1].id
          )

          if (lastSelectedBlockIndex !== -1) {
            // Insert the new blocks after the last selected block
            const newDocument = [
              ...editor.document.slice(0, lastSelectedBlockIndex + 1),
              ...blocks,
              ...editor.document.slice(lastSelectedBlockIndex + 1)
            ]
            editor.replaceBlocks(editor.document, newDocument)
          } else {
            // Fallback: just append to the end
            editor.insertBlocks(blocks, editor.document[editor.document.length - 1], 'after')
          }
        } else {
          // Fallback if parsing fails
          editor.insertBlocks(
            [
              {
                type: 'paragraph',
                content: aiResponse
              }
            ],
            selection.blocks[selection.blocks.length - 1],
            'after'
          )
        }
      })
    } catch (err) {
      console.error('Error appending blocks:', err)
    }

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
            style={{
              display: 'block',
              marginBottom: '8px',
              maxHeight: '200px',
              overflow: 'auto',
              whiteSpace: 'pre-wrap'
            }}
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
      <div style={{ padding: '12px', width: '250px' }}>
        <Typography.Text style={{ display: 'block', marginBottom: '12px' }}>
          使用AI续写选中的内容，保持风格和逻辑连贯
        </Typography.Text>
        <Button size="small" type="primary" onClick={processWithAI}>
          开始续写
        </Button>
      </div>
    )
  }

  // Use custom styled button
  return (
    <Popover content={renderPopoverContent()} trigger="click" position="bottomLeft">
      <div
        className="bn-formatting-toolbar-button"
        title="AI续写"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: '4px 8px'
        }}
      >
        <IconEditStroked style={{ color: isDarkMode ? '#dedede' : undefined }} />
      </div>
    </Popover>
  )
}

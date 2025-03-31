import { OpenAI } from 'openai'
import { ApiConfig } from './settings'
import { EventEmitter } from 'events'

// 内容生成请求接口
export interface ContentGenerationRequest {
  apiKey: string
  apiUrl: string
  modelName: string
  prompt: string
  maxTokens?: number
  stream?: boolean // 添加流式输出选项
}

// 处理API URL，确保格式正确
function normalizeApiUrl(url: string): string {
  if (!url) return ''

  // 移除URL末尾的斜杠
  const normalizedUrl = url.trim().replace(/\/+$/, '')

  // 不再自动移除 /v1 路径，保留用户输入的完整URL
  // 用户需要自行确保URL格式正确

  return normalizedUrl
}

// 测试AI API连接
export async function testOpenAIConnection(
  apiConfig: ApiConfig
): Promise<{ success: boolean; message: string }> {
  try {
    const { apiKey, apiUrl, modelName } = apiConfig

    if (!apiKey) {
      return { success: false, message: 'API Key 未设置' }
    }

    if (!apiUrl) {
      return { success: false, message: 'API URL 未设置' }
    }

    if (!modelName) {
      return { success: false, message: '模型名称未设置' }
    }

    // 处理并规范化API URL
    const normalizedApiUrl = normalizeApiUrl(apiUrl)

    // 创建 AI 客户端
    const openai = new OpenAI({
      apiKey,
      baseURL: normalizedApiUrl
    })

    // 发送一个简单的测试请求
    const response = await openai.chat.completions.create({
      model: modelName,
      messages: [{ role: 'user', content: '你好，这是一个API连接测试。请回复"连接成功"。' }],
      max_tokens: 20
    })

    // 增强检查响应格式
    console.log('API响应数据:', JSON.stringify(response, null, 2)) // 调试用

    // 尝试提取内容
    let content = ''

    try {
      // 标准OpenAI格式
      if (response?.choices?.[0]?.message?.content) {
        content = response.choices[0].message.content
      }
      // 兼容其他可能的返回格式
      else if (response && typeof response === 'object') {
        if ('text' in response && typeof response.text === 'string') {
          content = response.text
        } else if ('content' in response && typeof response.content === 'string') {
          content = response.content
        } else {
          content = '已收到响应 (非标准格式)'
        }
      }
    } catch (err) {
      console.error('解析响应内容时出错:', err)
      content = '解析响应内容时出错'
    }

    return {
      success: true,
      message: content ? `连接成功! 响应: ${content}` : '连接成功!'
    }
  } catch (error: unknown) {
    console.error('AI API连接测试失败:', error)

    // 提取更友好的错误信息
    let errorMessage = '连接失败'

    if (error instanceof Error) {
      errorMessage += `: ${error.message}`
    }

    // 处理AI API的错误，它们可能有特定的结构
    const apiError = error as { response?: { status?: number }; status?: number }
    const statusCode = apiError.status || apiError.response?.status

    if (statusCode) {
      errorMessage += ` (HTTP 状态码: ${statusCode})`

      // 为常见错误提供更具体的说明
      if (statusCode === 404) {
        errorMessage += '。可能是API URL不正确，请检查URL格式。'
      } else if (statusCode === 401) {
        errorMessage += '。API密钥可能无效或已过期。'
      } else if (statusCode === 429) {
        errorMessage += '。请求频率过高或达到API限制。'
      }
    }

    return { success: false, message: errorMessage }
  }
}

// 生成内容
export async function generateContent(
  request: ContentGenerationRequest
): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    const { apiKey, apiUrl, modelName, prompt, maxTokens = 2000, stream = false } = request

    // 如果请求包含stream=true，则返回错误，提示使用streamGenerateContent
    if (stream) {
      return {
        success: false,
        error: '流式输出请使用streamGenerateContent函数'
      }
    }

    if (!apiKey) {
      return { success: false, error: 'API Key 未设置' }
    }

    if (!apiUrl) {
      return { success: false, error: 'API URL 未设置' }
    }

    if (!modelName) {
      return { success: false, error: '模型名称未设置' }
    }

    if (!prompt || prompt.trim() === '') {
      return { success: false, error: '提示词不能为空' }
    }

    // 处理并规范化API URL
    const normalizedApiUrl = normalizeApiUrl(apiUrl)

    // 创建 AI 客户端
    const openai = new OpenAI({
      apiKey,
      baseURL: normalizedApiUrl
    })

    // 发送内容生成请求
    const response = await openai.chat.completions.create({
      model: modelName,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens
    })

    // 记录响应信息，用于调试
    console.log('生成内容API响应:', JSON.stringify(response, null, 2))

    // 尝试提取内容
    let content = ''

    try {
      // 标准OpenAI格式
      if (response?.choices?.[0]?.message?.content) {
        content = response.choices[0].message.content
      }
      // 兼容其他可能的返回格式
      else if (response && typeof response === 'object') {
        if ('text' in response && typeof response.text === 'string') {
          content = response.text
        } else if ('content' in response && typeof response.content === 'string') {
          content = response.content
        } else {
          const jsonContent = JSON.stringify(response)
          if (jsonContent && jsonContent.length > 2) {
            content = '返回数据格式异常，无法提取文本内容'
          }
        }
      }
    } catch (err) {
      console.error('解析响应内容时出错:', err)
      return { success: false, error: '解析响应内容时出错' }
    }

    if (content) {
      return { success: true, content }
    } else {
      return { success: false, error: '生成内容为空' }
    }
  } catch (error: unknown) {
    console.error('内容生成失败:', error)

    // 提取更友好的错误信息
    let errorMessage = '生成失败'

    if (error instanceof Error) {
      errorMessage += `: ${error.message}`
    }

    // 处理AI API的错误，它们可能有特定的结构
    const apiError = error as { response?: { status?: number }; status?: number }
    const statusCode = apiError.status || apiError.response?.status

    if (statusCode) {
      errorMessage += ` (HTTP 状态码: ${statusCode})`

      // 为常见错误提供更具体的说明
      if (statusCode === 404) {
        errorMessage += '。可能是API URL不正确，请检查URL格式。'
      } else if (statusCode === 401) {
        errorMessage += '。API密钥可能无效或已过期。'
      } else if (statusCode === 429) {
        errorMessage += '。请求频率过高或达到API限制。'
      }
    }

    return { success: false, error: errorMessage }
  }
}

// SSE流式生成内容
export async function streamGenerateContent(
  request: ContentGenerationRequest
): Promise<EventEmitter> {
  const eventEmitter = new EventEmitter()

  // 异步处理流式请求
  ;(async (): Promise<void> => {
    try {
      const { apiKey, apiUrl, modelName, prompt, maxTokens = 2000 } = request

      if (!apiKey) {
        eventEmitter.emit('error', 'API Key 未设置')
        return
      }

      if (!apiUrl) {
        eventEmitter.emit('error', 'API URL 未设置')
        return
      }

      if (!modelName) {
        eventEmitter.emit('error', '模型名称未设置')
        return
      }

      if (!prompt || prompt.trim() === '') {
        eventEmitter.emit('error', '提示词不能为空')
        return
      }

      // 处理并规范化API URL
      const normalizedApiUrl = normalizeApiUrl(apiUrl)

      // 创建 AI 客户端
      const openai = new OpenAI({
        apiKey,
        baseURL: normalizedApiUrl
      })

      let accumulatedContent = ''

      // 使用流式响应
      const stream = await openai.chat.completions.create({
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        stream: true
      })

      // 处理每个流式响应块
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || ''
        if (content) {
          // 发送新的内容块
          eventEmitter.emit('data', content)
          accumulatedContent += content
        }
      }

      // 流式输出完成，发送完成事件
      eventEmitter.emit('done', accumulatedContent)
    } catch (error: unknown) {
      console.error('流式内容生成失败:', error)

      // 提取更友好的错误信息
      let errorMessage = '生成失败'

      if (error instanceof Error) {
        errorMessage += `: ${error.message}`
      }

      // 处理AI API的错误，它们可能有特定的结构
      const apiError = error as { response?: { status?: number }; status?: number }
      const statusCode = apiError.status || apiError.response?.status

      if (statusCode) {
        errorMessage += ` (HTTP 状态码: ${statusCode})`

        // 为常见错误提供更具体的说明
        if (statusCode === 404) {
          errorMessage += '。可能是API URL不正确，请检查URL格式。'
        } else if (statusCode === 401) {
          errorMessage += '。API密钥可能无效或已过期。'
        } else if (statusCode === 429) {
          errorMessage += '。请求频率过高或达到API限制。'
        }
      }

      eventEmitter.emit('error', errorMessage)
    }
  })()

  return eventEmitter
}

import { OpenAI } from 'openai'
import { AiApiConfig } from './settings'
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
  const normalizedUrl = url.trim().replace(/\/+$/, '')
  return normalizedUrl
}

// 测试AI API连接
export async function testOpenAIConnection(
  AiApiConfig: AiApiConfig
): Promise<{ success: boolean; message: string }> {
  try {
    const { apiKey, apiUrl, modelName } = AiApiConfig

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
      messages: [{ role: 'user', content: 'ping. Just reply "pong"' }],
      max_tokens: 20
    })

    // 增强检查响应格式

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
      content = '解析响应内容时出错'
    }

    return {
      success: true,
      message: content ? `` : '连接成功!'
    }
  } catch (error: unknown) {
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

// AI生成请求参数接口
interface AIGenerateRequest {
  config: AiApiConfig
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
  maxTokens?: number
  temperature?: number
}

// AI生成功能（支持对话格式）
export async function generateWithMessages(
  request: AIGenerateRequest
): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    const { config, messages, maxTokens = 2000, temperature = 0.7 } = request

    if (!config.apiKey) {
      return { success: false, error: 'API Key 未设置' }
    }

    if (!config.apiUrl) {
      return { success: false, error: 'API URL 未设置' }
    }

    if (!config.modelName) {
      return { success: false, error: '模型名称未设置' }
    }

    // 处理并规范化API URL
    const normalizedApiUrl = normalizeApiUrl(config.apiUrl)

    // 创建 AI 客户端
    const openai = new OpenAI({
      apiKey: config.apiKey,
      baseURL: normalizedApiUrl
    })

    // 发送内容生成请求
    const response = await openai.chat.completions.create({
      model: config.modelName,
      messages,
      max_tokens: maxTokens,
      temperature
    })

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
      return { success: false, error: '解析响应内容时出错' }
    }

    if (content) {
      return { success: true, content }
    } else {
      return { success: false, error: '生成内容为空' }
    }
  } catch (error: unknown) {
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
      return { success: false, error: '解析响应内容时出错' }
    }

    if (content) {
      return { success: true, content }
    } else {
      return { success: false, error: '生成内容为空' }
    }
  } catch (error: unknown) {
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

// 流式生成内容
export async function streamGenerateContent(
  request: ContentGenerationRequest
): Promise<EventEmitter> {
  const eventEmitter = new EventEmitter()

  // 创建AbortController用于中断请求
  const abortController = new AbortController()

  // 添加停止方法到EventEmitter
  ;(eventEmitter as any).stop = () => {
    abortController.abort()
  }

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

      // 处理并规范化API URL
      const normalizedApiUrl = normalizeApiUrl(apiUrl)

      try {
        // 创建 AI 客户端
        const openai = new OpenAI({
          apiKey,
          baseURL: normalizedApiUrl,
          timeout: 60000, // 设置60秒超时
          maxRetries: 2 // 启用自动重试
        })

        // 使用流式响应选项，添加AbortController支持
        const stream = await openai.chat.completions.create(
          {
            model: modelName,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: maxTokens,
            stream: true
          },
          {
            signal: abortController.signal
          }
        )

        // 用于累积完整响应
        let fullContent = ''
        let chunkCount = 0

        // 处理流式响应
        for await (const chunk of stream) {
          // 检查是否被中断
          if (abortController.signal.aborted) {
            eventEmitter.emit('error', '请求已被用户停止')
            return
          }

          try {
            // 提取delta内容
            const content = chunk.choices[0]?.delta?.content || ''

            if (content) {
              // 发送增量内容
              eventEmitter.emit('data', content)

              // 累积完整内容
              fullContent += content
              chunkCount++

              // 每10个块记录一次进度
              if (chunkCount % 10 === 0) {
                // 进度记录（可选）
              }
            }
          } catch (streamError) {
            // 继续处理下一个块，不中断整个流
          }
        }

        // 流结束，发送完成事件
        eventEmitter.emit('done', fullContent)
      } catch (apiError) {
        // 检查是否是用户主动中断
        if (abortController.signal.aborted) {
          eventEmitter.emit('error', '请求已被用户停止')
          return
        }

        // 提取更友好的错误信息
        let errorMessage = '流式生成失败'

        if (apiError instanceof Error) {
          errorMessage += `: ${apiError.message}`
        }

        // 处理API错误的状态码
        const statusError = apiError as { response?: { status?: number }; status?: number }
        const statusCode = statusError.status || statusError.response?.status

        if (statusCode) {
          errorMessage += ` (HTTP 状态码: ${statusCode})`

          if (statusCode === 404) {
            errorMessage += '。可能是API URL不正确，请检查URL格式。'
          } else if (statusCode === 401) {
            errorMessage += '。API密钥可能无效或已过期。'
          } else if (statusCode === 429) {
            errorMessage += '。请求频率过高或达到API限制，建议稍后再试。'
          } else if (statusCode >= 500) {
            errorMessage += '。服务器端错误，可能是API服务暂时不可用，请稍后再试。'
          }
        }

        eventEmitter.emit('error', errorMessage)
      }
    } catch (error) {
      // 提供更具体的错误信息
      const errorMessage = error instanceof Error ? `发生错误: ${error.message}` : '发生未知错误'

      eventEmitter.emit('error', errorMessage)
    }
  })()

  return eventEmitter
}

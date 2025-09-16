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
  
  // 移除尾部斜杠
  let normalizedUrl = url.trim().replace(/\/+$/, '')
  
  // 确保URL以http://或https://开头
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = 'https://' + normalizedUrl
  }
  
  // 对于OpenAI兼容API，确保路径正确
  // 如果URL不包含/v1，且看起来像是基础域名，自动添加/v1
  if (!normalizedUrl.includes('/v1') && !normalizedUrl.includes('/api')) {
    // 检查是否是标准OpenAI域名
    if (normalizedUrl.includes('api.openai.com')) {
      normalizedUrl = normalizedUrl + '/v1'
    } else if (!normalizedUrl.endsWith('/chat/completions')) {
      // 对于其他API，如果没有明确的路径，添加/v1
      normalizedUrl = normalizedUrl + '/v1'
    }
  }
  
  return normalizedUrl
}

// 创建一个兼容性更好的请求函数
async function makeCompatibleRequest(
  apiUrl: string,
  apiKey: string,
  modelName: string,
  prompt: string,
  maxTokens: number = 2000,
  stream: boolean = false
): Promise<any> {
  const url = `${apiUrl}/chat/completions`
  
  const requestBody = {
    model: modelName,
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: maxTokens,
    temperature: 0.7,
    stream: stream
  }


  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'User-Agent': 'NoteBy/1.0'
    },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[OpenAI] API Error Response:', {
      status: response.status,
      statusText: response.statusText,
      errorBody: errorText
    })
    
    let errorMessage = `API请求失败 (HTTP ${response.status})`
    
    // 尝试解析错误消息
    try {
      const errorJson = JSON.parse(errorText)
      if (errorJson.error?.message) {
        errorMessage = errorJson.error.message
      } else if (errorJson.message) {
        errorMessage = errorJson.message
      }
    } catch {}
    
    // 根据状态码提供更具体的错误信息
    if (response.status === 400) {
      // 检查是否是max_tokens错误
      if (errorMessage.includes('max_tokens')) {
        // 提取限制值
        const match = errorMessage.match(/\d+/g)
        const limit = match ? match[match.length - 1] : ''
        errorMessage = `该模型的max_tokens限制为${limit}，请在设置中调整Max Tokens参数为${limit}或更小的值`
      } else if (errorMessage.includes('model')) {
        errorMessage = `模型名称错误: ${errorMessage}`
      } else {
        errorMessage = `请求格式错误: ${errorMessage}`
      }
    } else if (response.status === 401) {
      errorMessage = 'API密钥无效或已过期，请检查API Key'
    } else if (response.status === 404) {
      errorMessage = 'API端点不存在，请检查API地址是否正确'
    } else if (response.status === 429) {
      errorMessage = 'API请求频率过高，请稍后再试'
    } else if (response.status >= 500) {
      errorMessage = 'API服务器错误，请稍后再试'
    }
    
    throw new Error(errorMessage)
  }

  return response
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

    try {
      // 使用兼容性请求
      const response = await makeCompatibleRequest(
        normalizedApiUrl,
        apiKey,
        modelName,
        'ping. Just reply "pong"',
        20,
        false
      )

      const data = await response.json()
      
      // 尝试提取内容
      let content = ''
      if (data?.choices?.[0]?.message?.content) {
        content = data.choices[0].message.content
      } else if (data?.content) {
        content = data.content
      } else if (data?.text) {
        content = data.text
      }

      return {
        success: true,
        message: content || '连接成功!'
      }
    } catch (error) {
      console.error('[OpenAI] Connection test failed:', error)
      throw error
    }
  } catch (error: unknown) {
    // 提取更友好的错误信息
    let errorMessage = '连接失败'

    if (error instanceof Error) {
      errorMessage += `: ${error.message}`
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
      baseURL: normalizedApiUrl,
      dangerouslyAllowBrowser: true, // 允许在浏览器环境运行
      defaultHeaders: {
        'User-Agent': 'NoteBy/1.0',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30秒超时
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
            return { success: false, error: '返回数据格式异常，无法提取文本内容' }
          }
        }
      }
    } catch {
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
      } else if (statusCode >= 500) {
        errorMessage += '。服务器端错误，可能是API服务暂时不可用。'
      }
    }

    return { success: false, error: errorMessage }
  }
}

// 生成内容 - 使用更兼容的实现
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

    try {
      // 先尝试使用兼容性请求
      const response = await makeCompatibleRequest(
        normalizedApiUrl,
        apiKey,
        modelName,
        prompt,
        maxTokens,
        false
      )

      const data = await response.json()

      // 尝试提取内容
      let content = ''
      if (data?.choices?.[0]?.message?.content) {
        content = data.choices[0].message.content
      } else if (data?.content) {
        content = data.content
      } else if (data?.text) {
        content = data.text
      } else if (data?.choices?.[0]?.text) {
        content = data.choices[0].text
      }

      if (content) {
        return { success: true, content }
      } else {
        console.error('[OpenAI] No content found in response:', data)
        return { success: false, error: '生成内容为空' }
      }
    } catch (error) {
      console.error('[OpenAI] Compatible request failed, trying OpenAI SDK...', error)
      
      // 如果兼容性请求失败，尝试使用OpenAI SDK
      try {
        const openai = new OpenAI({
          apiKey,
          baseURL: normalizedApiUrl,
          dangerouslyAllowBrowser: true,
          defaultHeaders: {
            'User-Agent': 'NoteBy/1.0',
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          timeout: 30000,
          maxRetries: 0
        })

        const response = await openai.chat.completions.create({
          model: modelName,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: maxTokens,
          temperature: 0.7
        })

        const content = response?.choices?.[0]?.message?.content
        if (content) {
          return { success: true, content }
        } else {
          return { success: false, error: '生成内容为空' }
        }
      } catch (sdkError) {
        console.error('[OpenAI] OpenAI SDK also failed:', sdkError)
        throw error // 抛出原始错误
      }
    }
  } catch (error: unknown) {
    console.error('[OpenAI] Generate content error:', error)
    
    let errorMessage = '内容生成失败'
    if (error instanceof Error) {
      errorMessage = error.message
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
  ;(eventEmitter as EventEmitter & { stop: () => void }).stop = () => {
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
        // 先尝试使用原生fetch进行流式请求
        
        const url = `${normalizedApiUrl}/chat/completions`
        const requestBody = {
          model: modelName,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: maxTokens,
          temperature: 0.7,
          stream: true
        }

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'text/event-stream',
            'User-Agent': 'NoteBy/1.0'
          },
          body: JSON.stringify(requestBody),
          signal: abortController.signal
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('[OpenAI Stream] Error response:', {
            status: response.status,
            errorText
          })
          
          let errorMessage = `流式生成失败 (HTTP ${response.status})`
          try {
            const errorJson = JSON.parse(errorText)
            if (errorJson.error?.message) {
              errorMessage = errorJson.error.message
            }
          } catch {}
          
          if (response.status === 400) {
            errorMessage = `请求格式错误: ${errorMessage}`
          } else if (response.status === 401) {
            errorMessage = 'API密钥无效'
          } else if (response.status === 404) {
            errorMessage = 'API端点不存在'
          }
          
          eventEmitter.emit('error', errorMessage)
          return
        }

        
        const reader = response.body?.getReader()
        if (!reader) {
          eventEmitter.emit('error', '无法创建流读取器')
          return
        }

        const decoder = new TextDecoder()
        let fullContent = ''
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.trim() === '') continue
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') {
                eventEmitter.emit('done', fullContent)
                return
              }

              try {
                const json = JSON.parse(data)
                const content = json.choices?.[0]?.delta?.content || ''
                if (content) {
                  fullContent += content
                  eventEmitter.emit('data', content)
                }
              } catch (e) {
                console.error('[OpenAI Stream] Error parsing chunk:', e, data)
              }
            }
          }
        }

        eventEmitter.emit('done', fullContent)
      } catch (error) {
        console.error('[OpenAI Stream] Streaming error:', error)
        
        // 如果原生fetch失败，尝试使用OpenAI SDK
        try {
          
          const openai = new OpenAI({
            apiKey,
            baseURL: normalizedApiUrl,
            dangerouslyAllowBrowser: true,
            timeout: 60000,
            maxRetries: 0
          })

          const stream = await openai.chat.completions.create(
            {
              model: modelName,
              messages: [{ role: 'user', content: prompt }],
              max_tokens: maxTokens,
              stream: true,
              temperature: 0.7
            },
            {
              signal: abortController.signal
            }
          )

          let fullContent = ''
          for await (const chunk of stream) {
            if (abortController.signal.aborted) {
              eventEmitter.emit('error', '请求已被用户停止')
              return
            }

            const content = chunk.choices[0]?.delta?.content || ''
            if (content) {
              eventEmitter.emit('data', content)
              fullContent += content
            }
          }

          eventEmitter.emit('done', fullContent)
        } catch (sdkError) {
          console.error('[OpenAI Stream] SDK fallback also failed:', sdkError)
          
          let errorMessage = '流式生成失败'
          if (error instanceof Error) {
            errorMessage = error.message
          }
          eventEmitter.emit('error', errorMessage)
        }
      }
    } catch (error) {
      console.error('[OpenAI Stream] Unexpected error:', error)
      const errorMessage = error instanceof Error ? error.message : '发生未知错误'
      eventEmitter.emit('error', errorMessage)
    }
  })()

  return eventEmitter
}
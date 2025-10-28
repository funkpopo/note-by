import { OpenAI } from 'openai'
import { AiApiConfig, ApiErrorType, ApiErrorDiagnosis, readSettings } from './settings'
import { EventEmitter } from 'events'
import { SECRET_PLACEHOLDER, buildApiAccount, getSecret } from './secret-store'
import { version } from '../../package.json'

// User-Agent 字符串
const USER_AGENT = `Note-by/${version}`

// 错误映射配置
const ERROR_MAPPING: Record<
  number | string,
  { type: ApiErrorType; patterns?: RegExp[]; suggestions?: string[] }
> = {
  // HTTP Status Code Mappings
  400: {
    type: ApiErrorType.INVALID_REQUEST,
    patterns: [/max_tokens/i, /invalid.*model/i, /malformed.*json/i, /content.*too.*large/i],
    suggestions: ['检查请求参数格式', '调整max_tokens参数', '检查模型名称']
  },
  401: {
    type: ApiErrorType.INVALID_API_KEY,
    patterns: [/invalid.*key/i, /unauthorized/i, /authentication.*failed/i],
    suggestions: ['检查API密钥是否正确', '确认密钥是否已过期', '重新生成API密钥']
  },
  403: {
    type: ApiErrorType.FORBIDDEN,
    patterns: [/forbidden/i, /access.*denied/i, /permission.*denied/i],
    suggestions: ['检查账户权限', '确认API密钥权限', '联系服务提供商']
  },
  404: {
    type: ApiErrorType.MODEL_NOT_FOUND,
    patterns: [/model.*not.*found/i, /endpoint.*not.*found/i, /not.*found/i],
    suggestions: ['检查模型名称是否正确', '确认API端点URL', '查看支持的模型列表']
  },
  408: {
    type: ApiErrorType.CONNECTION_TIMEOUT,
    suggestions: ['检查网络连接', '增加超时时间', '稍后重试']
  },
  429: {
    type: ApiErrorType.RATE_LIMIT_EXCEEDED,
    patterns: [/rate.*limit/i, /too.*many.*requests/i, /quota.*exceeded/i],
    suggestions: ['减少请求频率', '等待一段时间后重试', '升级账户配额']
  },
  500: {
    type: ApiErrorType.SERVER_ERROR,
    suggestions: ['稍后重试', '检查服务状态', '联系技术支持']
  },
  502: {
    type: ApiErrorType.GATEWAY_TIMEOUT,
    suggestions: ['检查网络连接', '稍后重试', '联系服务提供商']
  },
  503: {
    type: ApiErrorType.SERVICE_UNAVAILABLE,
    patterns: [/service.*unavailable/i, /maintenance/i],
    suggestions: ['稍后重试', '检查服务状态页面']
  },
  504: {
    type: ApiErrorType.GATEWAY_TIMEOUT,
    suggestions: ['检查网络连接', '增加超时时间', '稍后重试']
  },

  // Error Message Pattern Mappings (for cases where status code might be generic)
  insufficient_quota: {
    type: ApiErrorType.INSUFFICIENT_BALANCE,
    suggestions: ['检查账户余额', '充值账户', '查看账单详情']
  },
  billing_hard_limit_reached: {
    type: ApiErrorType.QUOTA_EXCEEDED,
    suggestions: ['升级账户计划', '联系销售支持']
  },
  model_not_found: {
    type: ApiErrorType.MODEL_NOT_FOUND,
    suggestions: ['检查模型名称', '选择其他可用模型']
  },
  model_not_available: {
    type: ApiErrorType.MODEL_NOT_AVAILABLE,
    suggestions: ['选择其他可用模型', '检查服务状态']
  }
}

/**
 * 统一API错误映射和诊断函数
 * @param error - 原始错误对象
 * @param context - 错误上下文信息
 * @returns 诊断后的错误信息
 */
export function mapApiError(
  error: unknown,
  context?: {
    url?: string
    model?: string
    statusCode?: number
    responseText?: string
  }
): ApiErrorDiagnosis {
  const diagnosticInfo: ApiErrorDiagnosis['diagnosticInfo'] = {
    timestamp: Date.now(),
    url: context?.url,
    model: context?.model
  }

  let errorType = ApiErrorType.UNKNOWN_ERROR
  let errorMessage = '发生未知错误'
  let suggestions: string[] = ['请重试或联系技术支持']

  // 处理网络错误
  if (error instanceof TypeError) {
    if (error.message.includes('fetch')) {
      errorType = ApiErrorType.NETWORK_ERROR
      errorMessage = '网络连接错误'
      suggestions = ['检查网络连接', '确认URL是否正确', '检查防火墙设置']
    } else if (error.message.includes('certificate')) {
      errorType = ApiErrorType.SSL_CERTIFICATE_ERROR
      errorMessage = 'SSL证书验证失败'
      suggestions = ['检查网络安全设置', '确认证书有效性']
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('DNS')) {
      errorType = ApiErrorType.DNS_RESOLUTION_FAILED
      errorMessage = '域名解析失败'
      suggestions = ['检查域名拼写', '确认DNS设置', '检查网络连接']
    } else if (error.message.includes('ECONNREFUSED')) {
      errorType = ApiErrorType.CONNECTION_REFUSED
      errorMessage = '连接被拒绝'
      suggestions = ['检查服务器状态', '确认端口设置', '检查防火墙']
    }
  }

  // 处理HTTP响应错误
  const statusCode = context?.statusCode
  if (statusCode) {
    diagnosticInfo.statusCode = statusCode

    const mapping = ERROR_MAPPING[statusCode]
    if (mapping) {
      errorType = mapping.type

      // 检查错误消息模式匹配
      const responseText = context?.responseText || ''
      if (mapping.patterns) {
        for (const pattern of mapping.patterns) {
          if (pattern.test(responseText)) {
            suggestions = mapping.suggestions || suggestions
            break
          }
        }
      } else {
        suggestions = mapping.suggestions || suggestions
      }

      // 解析具体错误消息
      try {
        const errorJson = JSON.parse(responseText)
        const apiError = errorJson.error || errorJson
        if (apiError.message) {
          errorMessage = apiError.message
          diagnosticInfo.originalError = apiError.message
        }

        // 检查特定错误类型
        if (apiError.type) {
          const messageMapping = ERROR_MAPPING[apiError.type]
          if (messageMapping) {
            errorType = messageMapping.type
            suggestions = messageMapping.suggestions || suggestions
          }
        }
      } catch {
        // 如果无法解析JSON，使用默认错误消息
        errorMessage = responseText || `HTTP ${statusCode} 错误`
      }
    }
  }

  // 处理OpenAI SDK错误
  if (error && typeof error === 'object') {
    const sdkError = error as Record<string, unknown>

    // OpenAI SDK specific error handling
    if (sdkError.status && typeof sdkError.status === 'number') {
      diagnosticInfo.statusCode = sdkError.status
      const mapping = ERROR_MAPPING[sdkError.status]
      if (mapping) {
        errorType = mapping.type
        suggestions = mapping.suggestions || suggestions
      }
    }

    if (sdkError.message && typeof sdkError.message === 'string') {
      errorMessage = sdkError.message
      diagnosticInfo.originalError = sdkError.message
    }

    // 检查错误代码
    if (sdkError.code && (typeof sdkError.code === 'string' || typeof sdkError.code === 'number')) {
      const codeMapping = ERROR_MAPPING[sdkError.code]
      if (codeMapping) {
        errorType = codeMapping.type
        suggestions = codeMapping.suggestions || suggestions
      }
    }
  }

  // 处理通用Error对象
  if (error instanceof Error) {
    if (!diagnosticInfo.originalError) {
      diagnosticInfo.originalError = error.message
    }

    // 检查是否是超时错误
    if (error.message.includes('timeout') || error.message.includes('TimeoutError')) {
      errorType = ApiErrorType.CONNECTION_TIMEOUT
      errorMessage = '连接超时'
      suggestions = ['增加超时时间', '检查网络连接', '稍后重试']
    }
  }

  diagnosticInfo.suggestions = suggestions

  return {
    type: errorType,
    message: errorMessage,
    diagnosticInfo
  }
}

/**
 * 获取本地化的错误消息
 * 注意：此函数需要在渲染进程中调用，因为需要访问i18n
 * @param diagnosis - 错误诊断结果
 * @param locale - 本地化字典
 * @returns 本地化的错误信息
 */
export function getLocalizedErrorMessage(
  diagnosis: ApiErrorDiagnosis,
  locale: { api?: { errors?: Record<string, string> } }
): {
  message: string
  suggestions: string[]
  diagnosticInfo: ApiErrorDiagnosis['diagnosticInfo']
} {
  const apiErrors = locale.api?.errors
  let localizedMessage = diagnosis.message

  // 如果有对应的本地化消息，使用本地化版本
  if (apiErrors && apiErrors[diagnosis.type]) {
    localizedMessage = apiErrors[diagnosis.type]
  }

  return {
    message: localizedMessage,
    suggestions: diagnosis.diagnosticInfo.suggestions || [],
    diagnosticInfo: diagnosis.diagnosticInfo
  }
}

// 内容生成请求接口
export interface ContentGenerationRequest {
  apiKey: string
  apiUrl: string
  modelName: string
  prompt: string
  maxTokens?: number
  stream?: boolean // 添加流式输出选项
}

// 处理API URL，确保格式正确，只返回基础URL（不含路径）
function normalizeApiUrl(url: string): string {
  if (!url) return ''

  // 移除尾部斜杠
  let normalizedUrl = url.trim().replace(/\/+$/, '')

  // 确保URL以http://或https://开头
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = 'https://' + normalizedUrl
  }

  // 提取基础URL，移除路径部分
  // 支持多种输入格式：https://xxx, https://xxx/v1, https://xxx/v1/, https://xxx/v1/chat/completions
  try {
    const urlObj = new URL(normalizedUrl)
    // 重构基础URL，只保留协议、域名和端口
    normalizedUrl = `${urlObj.protocol}//${urlObj.host}`
  } catch {
    // 如果URL解析失败，保持原样（可能是不完整的域名）
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
): Promise<Response> {
  const url = `${apiUrl}/v1/chat/completions`

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
      Authorization: `Bearer ${apiKey}`,
      'User-Agent': USER_AGENT
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

    // 使用统一错误映射函数
    const diagnosis = mapApiError(null, {
      url: apiUrl,
      model: modelName,
      statusCode: response.status,
      responseText: errorText
    })

    console.error('[OpenAI] Error Diagnosis:', diagnosis)

    throw new Error(diagnosis.message)
  }

  return response
}

// 测试AI API连接
export async function testOpenAIConnection(
  AiApiConfig: AiApiConfig
): Promise<{ success: boolean; message: string }> {
  const { apiUrl, modelName } = AiApiConfig

  try {
    let effectiveKey = AiApiConfig.apiKey
    if (!effectiveKey || effectiveKey === SECRET_PLACEHOLDER) {
      const account = buildApiAccount(AiApiConfig.id)
      effectiveKey = (await getSecret(account)) || ''
    }

    if (!effectiveKey) {
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
        effectiveKey,
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
    // 使用统一错误映射函数
    const diagnosis = mapApiError(error, {
      url: normalizeApiUrl(apiUrl),
      model: modelName
    })

    console.error('[OpenAI] Connection Test Error Diagnosis:', diagnosis)

    return { success: false, message: diagnosis.message }
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
  const { config, messages, maxTokens = 2000, temperature = 0.7 } = request

  try {
    let effectiveKey = config.apiKey
    if (!effectiveKey || effectiveKey === SECRET_PLACEHOLDER) {
      const account = buildApiAccount(config.id)
      effectiveKey = (await getSecret(account)) || ''
    }

    if (!effectiveKey) {
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
      apiKey: effectiveKey,
      baseURL: `${normalizedApiUrl}/v1`,
      dangerouslyAllowBrowser: true, // 允许在浏览器环境运行
      defaultHeaders: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
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
    // 使用统一错误映射函数
    const diagnosis = mapApiError(error, {
      url: config.apiUrl,
      model: config.modelName
    })

    console.error('[OpenAI] Generation Error Diagnosis:', diagnosis)

    return { success: false, error: diagnosis.message }
  }
}

// 生成内容 - 使用更兼容的实现
export async function generateContent(
  request: ContentGenerationRequest
): Promise<{ success: boolean; content?: string; error?: string }> {
  const { apiKey, apiUrl, modelName, prompt, maxTokens = 2000, stream = false } = request

  try {
    // Resolve API key if placeholder or empty
    let effectiveKey = apiKey
    if (!effectiveKey || effectiveKey === SECRET_PLACEHOLDER) {
      try {
        const settings = readSettings()
        const match = (settings.AiApiConfigs as AiApiConfig[] | undefined)?.find(
          (c) => c && typeof c === 'object' && c.apiUrl === apiUrl && c.modelName === modelName
        )
        if (match && match.id) {
          const account = buildApiAccount(match.id)
          effectiveKey = (await getSecret(account)) || ''
        }
      } catch {
        // Ignore errors when reading settings
      }
    }

    // 如果请求包含stream=true，则返回错误，提示使用streamGenerateContent
    if (stream) {
      return {
        success: false,
        error: '流式输出请使用streamGenerateContent函数'
      }
    }

    if (!effectiveKey) {
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
        effectiveKey,
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
          apiKey: effectiveKey,
          baseURL: `${normalizedApiUrl}/v1`,
          dangerouslyAllowBrowser: true,
          defaultHeaders: {
            'User-Agent': USER_AGENT,
            Accept: 'application/json',
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

    // 使用统一错误映射函数
    const diagnosis = mapApiError(error, {
      url: apiUrl,
      model: modelName
    })

    console.error('[OpenAI] Content Generation Error Diagnosis:', diagnosis)

    return { success: false, error: diagnosis.message }
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
  const { apiKey, apiUrl, modelName, prompt, maxTokens = 2000 } = request

  ;(async (): Promise<void> => {
    try {
      // Resolve API key if placeholder or empty
      let effectiveKey = apiKey
      if (!effectiveKey || effectiveKey === SECRET_PLACEHOLDER) {
        try {
          const settings = readSettings()
          const match = (settings.AiApiConfigs as AiApiConfig[] | undefined)?.find(
            (c) => c && typeof c === 'object' && c.apiUrl === apiUrl && c.modelName === modelName
          )
          if (match && match.id) {
            const account = buildApiAccount(match.id)
            effectiveKey = (await getSecret(account)) || ''
          }
        } catch {
          // Ignore errors when reading settings
        }
      }

      if (!effectiveKey) {
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

        const url = `${normalizedApiUrl}/v1/chat/completions`
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
            Authorization: `Bearer ${effectiveKey}`,
            Accept: 'text/event-stream',
            'User-Agent': USER_AGENT
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

          // 使用统一错误映射函数
          const diagnosis = mapApiError(null, {
            url: normalizedApiUrl,
            model: modelName,
            statusCode: response.status,
            responseText: errorText
          })

          console.error('[OpenAI Stream] Error Diagnosis:', diagnosis)

          eventEmitter.emit('error', diagnosis.message)
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

        try {
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
                  reader.releaseLock() // 释放ReadableStream
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
          reader.releaseLock() // 释放ReadableStream
        } catch (streamError) {
          console.error('[OpenAI Stream] Stream reading error:', streamError)
          try {
            reader.cancel() // 取消并释放流
          } catch {
            // 忽略取消时的错误
          }
          throw streamError
        }
      } catch (error) {
        console.error('[OpenAI Stream] Streaming error:', error)

        // 如果原生fetch失败，尝试使用OpenAI SDK
        try {
          const openai = new OpenAI({
            apiKey: effectiveKey,
            baseURL: `${normalizedApiUrl}/v1`,
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

          // 使用统一错误映射函数
          const diagnosis = mapApiError(sdkError, {
            url: normalizedApiUrl,
            model: modelName
          })

          console.error('[OpenAI Stream] SDK Error Diagnosis:', diagnosis)

          eventEmitter.emit('error', diagnosis.message)
        }
      }
    } catch (error) {
      console.error('[OpenAI Stream] Unexpected error:', error)

      // 使用统一错误映射函数
      const diagnosis = mapApiError(error, {
        url: normalizeApiUrl(apiUrl),
        model: modelName
      })

      console.error('[OpenAI Stream] Unexpected Error Diagnosis:', diagnosis)

      eventEmitter.emit('error', diagnosis.message)
    }
  })()

  return eventEmitter
}

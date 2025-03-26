import { OpenAI } from 'openai'
import { ApiConfig } from './settings'

// 处理API URL，确保格式正确
function normalizeApiUrl(url: string): string {
  if (!url) return ''

  // 移除URL末尾的斜杠
  let normalizedUrl = url.trim().replace(/\/+$/, '')

  // 移除末尾的 /v1 路径，因为 OpenAI SDK 会自动添加
  if (normalizedUrl.endsWith('/v1')) {
    normalizedUrl = normalizedUrl.substring(0, normalizedUrl.length - 3)
  }

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
    console.log('使用API URL:', normalizedApiUrl) // 调试用

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

    // 检查是否有响应内容
    if (response && response.choices && response.choices.length > 0) {
      const content = response.choices[0].message.content
      return {
        success: true,
        message: `连接成功! 响应: ${content}`
      }
    } else {
      return { success: false, message: '连接成功但返回数据格式异常' }
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

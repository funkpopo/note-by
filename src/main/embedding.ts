import { OpenAI } from 'openai'
import crypto from 'crypto'
import { readSettings, getEmbeddingConfig, type AiApiConfig } from './settings'
import {
  upsertRAGDocument,
  getRAGDocument,
  getAllRAGDocuments,
  deleteRAGDocument,
  addDocumentChunk,
  getDocumentChunks,
  deleteDocumentChunks,
  addDocumentEmbedding,
  getDocumentEmbedding,
  getAllDocumentEmbeddings,
  type RAGDocument,
  type DocumentChunk,
  type DocumentEmbedding
} from './database'

// Embedding API配置接口
export interface EmbeddingApiConfig {
  id: string
  name: string
  apiKey: string
  apiUrl: string
  modelName: string
}

// 文档分块接口
interface DocumentChunkData {
  content: string
  startPosition: number
  endPosition: number
  tokenCount: number
}

// 向量化结果接口
export interface EmbeddingResult {
  success: boolean
  message: string
  documentId?: number
  chunksCount?: number
  embeddingsCount?: number
}

// 搜索结果接口
export interface SearchResult {
  filePath: string
  content: string
  similarity: number
  documentId: number
  chunkId: number
}

// 计算文本的MD5哈希
function calculateContentHash(content: string): string {
  return crypto.createHash('md5').update(content, 'utf8').digest('hex')
}

// 估算token数量（简单估算，1个token约等于4个字符）
function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4)
}

// 文档分块函数
function chunkDocument(
  content: string,
  chunkSize: number = 1000,
  overlap: number = 200
): DocumentChunkData[] {
  const chunks: DocumentChunkData[] = []

  if (!content || content.trim().length === 0) {
    return chunks
  }

  // 按段落分割文档
  const paragraphs = content.split(/\n\s*\n/).filter((p) => p.trim().length > 0)

  let currentChunk = ''
  let startPosition = 0
  let chunkIndex = 0

  for (const paragraph of paragraphs) {
    const paragraphWithNewline = paragraph + '\n\n'

    // 如果当前段落加上现有chunk超过了chunk大小
    if (currentChunk.length + paragraphWithNewline.length > chunkSize && currentChunk.length > 0) {
      // 保存当前chunk
      const endPosition = startPosition + currentChunk.length
      chunks.push({
        content: currentChunk.trim(),
        startPosition,
        endPosition,
        tokenCount: estimateTokenCount(currentChunk)
      })

      // 开始新的chunk，包含重叠部分
      if (overlap > 0 && currentChunk.length > overlap) {
        const overlapText = currentChunk.slice(-overlap)
        currentChunk = overlapText + paragraphWithNewline
        startPosition = endPosition - overlap
      } else {
        currentChunk = paragraphWithNewline
        startPosition = endPosition
      }

      chunkIndex++
    } else {
      currentChunk += paragraphWithNewline
    }
  }

  // 添加最后一个chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({
      content: currentChunk.trim(),
      startPosition,
      endPosition: startPosition + currentChunk.length,
      tokenCount: estimateTokenCount(currentChunk)
    })
  }

  return chunks
}

// 获取Embedding客户端
function getEmbeddingClient(embeddingConfigId?: string): OpenAI | null {
  try {
    const settings = readSettings()
    const embeddingConfigs = settings.embeddingApiConfigs as EmbeddingApiConfig[]

    if (!embeddingConfigs || embeddingConfigs.length === 0) {
      return null
    }

    let targetConfig: EmbeddingApiConfig | undefined

    if (embeddingConfigId) {
      // 使用指定的Embedding配置
      targetConfig = embeddingConfigs.find((config) => config.id === embeddingConfigId)
    } else {
      // 使用第一个可用的配置
      targetConfig = embeddingConfigs[0]
    }

    if (!targetConfig) {
      return null
    }

    return new OpenAI({
      apiKey: targetConfig.apiKey,
      baseURL: targetConfig.apiUrl
    })
  } catch (error) {
    return null
  }
}

// 生成文本向量
async function generateEmbedding(
  text: string,
  embeddingConfigId?: string
): Promise<number[] | null> {
  try {
    const client = getEmbeddingClient(embeddingConfigId)
    if (!client) {
      return null
    }

    // 获取模型名称
    const settings = readSettings()
    const embeddingConfigs = settings.embeddingApiConfigs as EmbeddingApiConfig[]
    const targetConfig = embeddingConfigId
      ? embeddingConfigs.find((config) => config.id === embeddingConfigId)
      : embeddingConfigs[0]

    if (!targetConfig) {
      return null
    }

    const response = await client.embeddings.create({
      model: targetConfig.modelName,
      input: text
    })

    return response.data[0]?.embedding || null
  } catch (error) {
    console.error('生成向量失败:', error)
    return null
  }
}

// 计算余弦相似度
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    return 0
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  if (normA === 0 || normB === 0) {
    return 0
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

// 向量化单个文档
export async function embedDocument(
  filePath: string,
  content: string,
  title?: string,
  embeddingConfigId?: string
): Promise<EmbeddingResult> {
  try {
    const embeddingConfig = getEmbeddingConfig()

    if (!embeddingConfig.enabled) {
      return {
        success: false,
        message: 'RAG功能未启用'
      }
    }

    // 检查是否有可用的embedding配置
    const settings = readSettings()
    const embeddingConfigs = settings.embeddingApiConfigs as EmbeddingApiConfig[]
    if (!embeddingConfigs || embeddingConfigs.length === 0) {
      return {
        success: false,
        message: '请先配置Embedding API'
      }
    }

    // 计算内容哈希
    const contentHash = calculateContentHash(content)

    // 检查文档是否已存在且内容未变化
    const existingDoc = await getRAGDocument(filePath)
    if (
      existingDoc &&
      existingDoc.contentHash === contentHash &&
      existingDoc.embeddingStatus === 'completed'
    ) {
      return {
        success: true,
        message: '文档已是最新版本，无需重新向量化',
        documentId: existingDoc.id
      }
    }

    // 获取使用的embedding配置
    const targetEmbeddingConfig = embeddingConfigId
      ? embeddingConfigs.find((config) => config.id === embeddingConfigId)
      : embeddingConfigs[0]

    if (!targetEmbeddingConfig) {
      return {
        success: false,
        message: '找不到指定的Embedding配置'
      }
    }

    // 创建或更新文档记录
    const documentId = await upsertRAGDocument({
      filePath,
      title: title || filePath.split('/').pop() || filePath,
      content,
      contentHash,
      fileSize: Buffer.byteLength(content, 'utf8'),
      lastModified: Date.now(),
      embeddingStatus: 'processing',
      embeddingModel: targetEmbeddingConfig.modelName
    })

    if (!documentId) {
      return {
        success: false,
        message: '保存文档记录失败'
      }
    }

    // 删除旧的分块和向量
    await deleteDocumentChunks(documentId)

    // 分块文档
    const chunks = chunkDocument(content, embeddingConfig.chunkSize, embeddingConfig.chunkOverlap)

    if (chunks.length === 0) {
      // 更新文档状态为失败
      await upsertRAGDocument({
        filePath,
        title: title || filePath.split('/').pop() || filePath,
        content,
        contentHash,
        fileSize: Buffer.byteLength(content, 'utf8'),
        lastModified: Date.now(),
        embeddingStatus: 'failed',
        embeddingModel: targetEmbeddingConfig.modelName
      })

      return {
        success: false,
        message: '文档内容为空或无法分块'
      }
    }

    let successCount = 0

    // 处理每个分块
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]

      // 保存分块
      const chunkId = await addDocumentChunk({
        documentId,
        chunkIndex: i,
        content: chunk.content,
        startPosition: chunk.startPosition,
        endPosition: chunk.endPosition,
        tokenCount: chunk.tokenCount
      })

      if (!chunkId) {
        continue
      }

      // 生成向量
      const embedding = await generateEmbedding(
        chunk.content,
        embeddingConfigId || targetEmbeddingConfig.id
      )

      if (embedding) {
        // 保存向量
        const embeddingId = await addDocumentEmbedding({
          chunkId,
          embedding: JSON.stringify(embedding),
          embeddingModel: targetEmbeddingConfig.modelName
        })

        if (embeddingId) {
          successCount++
        }
      }
    }

    // 更新文档状态
    const finalStatus =
      successCount === chunks.length ? 'completed' : successCount > 0 ? 'completed' : 'failed'
    await upsertRAGDocument({
      filePath,
      title: title || filePath.split('/').pop() || filePath,
      content,
      contentHash,
      fileSize: Buffer.byteLength(content, 'utf8'),
      lastModified: Date.now(),
      embeddingStatus: finalStatus,
      embeddingModel: targetEmbeddingConfig.modelName
    })

    return {
      success: successCount > 0,
      message: `成功向量化 ${successCount}/${chunks.length} 个分块`,
      documentId,
      chunksCount: chunks.length,
      embeddingsCount: successCount
    }
  } catch (error) {
    return {
      success: false,
      message: `向量化失败: ${error instanceof Error ? error.message : String(error)}`
    }
  }
}

// 语义搜索
export async function searchDocuments(
  query: string,
  maxResults: number = 10,
  similarityThreshold: number = 0.7,
  embeddingConfigId?: string
): Promise<SearchResult[]> {
  try {
    const embeddingConfig = getEmbeddingConfig()

    if (!embeddingConfig.enabled) {
      return []
    }

    // 检查embedding配置
    const settings = readSettings()
    const embeddingConfigs = settings.embeddingApiConfigs as EmbeddingApiConfig[]
    if (!embeddingConfigs || embeddingConfigs.length === 0) {
      return []
    }

    const targetEmbeddingConfig = embeddingConfigId
      ? embeddingConfigs.find((config) => config.id === embeddingConfigId)
      : embeddingConfigs[0]

    if (!targetEmbeddingConfig) {
      return []
    }

    // 生成查询向量
    const queryEmbedding = await generateEmbedding(
      query,
      embeddingConfigId || targetEmbeddingConfig.id
    )
    if (!queryEmbedding) {
      return []
    }

    // 获取所有向量
    const allEmbeddings = await getAllDocumentEmbeddings(targetEmbeddingConfig.modelName)

    // 计算相似度并排序
    const results: SearchResult[] = []

    for (const item of allEmbeddings) {
      try {
        const embedding = JSON.parse(item.embedding) as number[]
        const similarity = cosineSimilarity(queryEmbedding, embedding)

        if (similarity >= similarityThreshold) {
          results.push({
            filePath: item.filePath,
            content: item.content,
            similarity,
            documentId: item.documentId,
            chunkId: item.chunkId
          })
        }
      } catch (error) {
        // 跳过解析失败的向量
        continue
      }
    }

    // 按相似度降序排序并限制结果数量
    return results.sort((a, b) => b.similarity - a.similarity).slice(0, maxResults)
  } catch (error) {
    console.error('搜索失败:', error)
    return []
  }
}

// 批量向量化所有文档
export async function embedAllDocuments(
  onProgress?: (current: number, total: number, filePath: string) => void
): Promise<{
  success: number
  failed: number
  skipped: number
  total: number
}> {
  try {
    const embeddingConfig = getEmbeddingConfig()

    if (!embeddingConfig.enabled) {
      return { success: 0, failed: 0, skipped: 0, total: 0 }
    }

    // 获取所有文档
    const allDocs = await getAllRAGDocuments()
    const total = allDocs.length

    let success = 0
    let failed = 0
    let skipped = 0

    for (let i = 0; i < allDocs.length; i++) {
      const doc = allDocs[i]

      if (onProgress) {
        onProgress(i + 1, total, doc.filePath)
      }

      // 检查是否需要重新向量化
      if (doc.embeddingStatus === 'completed' && doc.embeddingModel === embeddingConfig.model) {
        skipped++
        continue
      }

      const result = await embedDocument(doc.filePath, doc.content, doc.title)

      if (result.success) {
        success++
      } else {
        failed++
      }
    }

    return { success, failed, skipped, total }
  } catch (error) {
    console.error('批量向量化失败:', error)
    return { success: 0, failed: 0, skipped: 0, total: 0 }
  }
}

// 删除文档的向量数据
export async function removeDocumentEmbedding(filePath: string): Promise<boolean> {
  try {
    return await deleteRAGDocument(filePath)
  } catch (error) {
    console.error('删除文档向量失败:', error)
    return false
  }
}

// 获取RAG统计信息
export async function getRAGStats(): Promise<{
  totalDocuments: number
  embeddedDocuments: number
  pendingDocuments: number
  failedDocuments: number
  totalChunks: number
  totalEmbeddings: number
}> {
  try {
    const allDocs = await getAllRAGDocuments()
    const allEmbeddings = await getAllDocumentEmbeddings()

    const totalDocuments = allDocs.length
    const embeddedDocuments = allDocs.filter((doc) => doc.embeddingStatus === 'completed').length
    const pendingDocuments = allDocs.filter(
      (doc) => doc.embeddingStatus === 'pending' || doc.embeddingStatus === 'processing'
    ).length
    const failedDocuments = allDocs.filter((doc) => doc.embeddingStatus === 'failed').length

    // 计算总分块数
    let totalChunks = 0
    for (const doc of allDocs) {
      const chunks = await getDocumentChunks(doc.id)
      totalChunks += chunks.length
    }

    return {
      totalDocuments,
      embeddedDocuments,
      pendingDocuments,
      failedDocuments,
      totalChunks,
      totalEmbeddings: allEmbeddings.length
    }
  } catch (error) {
    console.error('获取RAG统计失败:', error)
    return {
      totalDocuments: 0,
      embeddedDocuments: 0,
      pendingDocuments: 0,
      failedDocuments: 0,
      totalChunks: 0,
      totalEmbeddings: 0
    }
  }
}

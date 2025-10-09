import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipcChannels'
import {
  addNoteHistory,
  getNoteHistory,
  getNoteHistoryById,
  getNoteHistoryStats,
  getUserActivityData,
  getAnalysisCache,
  saveAnalysisCache,
  resetAnalysisCache,
  checkDatabaseStatus,
  getMergedTagsData,
  getTagsByFile,
  setTagsForFile,
  createChatSession,
  saveChatMessage,
  getChatSessions,
  getChatMessages,
  updateChatSessionTitle,
  deleteChatSession,
  deleteChatMessage,
  getChatSessionStats,
  cleanupOldChatSessions,
  type AnalysisCacheItem
} from '../database'

export class DatabaseService {
  private getNotesPath: () => string

  constructor(getNotesPath: () => string) {
    this.getNotesPath = getNotesPath
  }

  public registerIpcHandlers(): void {
    // Note history
    ipcMain.handle(IPC_CHANNELS.GET_NOTE_HISTORY, async (_e, filePath: string) => {
      try {
        const history = await getNoteHistory(filePath)
        return { success: true, history }
      } catch (error) {
        return { success: false, error: String(error), history: [] }
      }
    })

    ipcMain.handle(IPC_CHANNELS.GET_NOTE_HISTORY_BY_ID, async (_e, id: number) => {
      try {
        const history = await getNoteHistoryById(id)
        if (!history) return { success: false, error: '未找到历史记录', history: null }
        return { success: true, history }
      } catch (error) {
        return { success: false, error: String(error), history: null }
      }
    })

    // Analytics
    ipcMain.handle(IPC_CHANNELS.GET_NOTE_HISTORY_STATS, async () => {
      try {
        const stats = await getNoteHistoryStats()
        return { success: true, stats }
      } catch (error) {
        return { success: false, error: String(error), stats: null }
      }
    })

    ipcMain.handle(IPC_CHANNELS.GET_USER_ACTIVITY_DATA, async (_e, days = 30) => {
      try {
        const activityData = await getUserActivityData(days)
        return { success: true, activityData }
      } catch (error) {
        return { success: false, error: String(error), activityData: null }
      }
    })

    ipcMain.handle(IPC_CHANNELS.GET_ANALYSIS_CACHE, async () => {
      try {
        const cache = await getAnalysisCache()
        return { success: true, cache }
      } catch (error) {
        return { success: false, error: String(error), cache: null }
      }
    })

    ipcMain.handle(IPC_CHANNELS.SAVE_ANALYSIS_CACHE, async (_e, cacheData: AnalysisCacheItem) => {
      try {
        const success = await saveAnalysisCache(cacheData)
        return { success }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    })

    ipcMain.handle(IPC_CHANNELS.RESET_ANALYSIS_CACHE, async () => {
      try {
        const success = await resetAnalysisCache()
        return { success }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    })

    ipcMain.handle(IPC_CHANNELS.CHECK_DATABASE_STATUS, async () => {
      try {
        const status = await checkDatabaseStatus()
        return { success: true, status }
      } catch (error) {
        return { success: false, error: String(error), status: null }
      }
    })

    // Tags
    ipcMain.handle(IPC_CHANNELS.GET_GLOBAL_TAGS, async () => {
      try {
        const markdownPath = this.getNotesPath()
        const tagsData = await getMergedTagsData(markdownPath)
        return { success: true, tagsData }
      } catch (error) {
        return { success: false, error: String(error), tagsData: null }
      }
    })

    ipcMain.handle(IPC_CHANNELS.REFRESH_GLOBAL_TAGS, async () => {
      try {
        const markdownPath = this.getNotesPath()
        const tagsData = await getMergedTagsData(markdownPath)
        return { success: true, tagsData }
      } catch (error) {
        return { success: false, error: String(error), tagsData: null }
      }
    })

    ipcMain.handle(IPC_CHANNELS.GET_FILE_TAGS, async (_e, filePath: string) => {
      try {
        const tags = await getTagsByFile(filePath)
        return { success: true, tags }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    })

    ipcMain.handle(IPC_CHANNELS.SET_FILE_TAGS, async (_e, filePath: string, tags: string[] = []) => {
      try {
        const success = await setTagsForFile(filePath, Array.isArray(tags) ? tags : [])
        return { success }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    })

    // Chat
    ipcMain.handle(IPC_CHANNELS.CHAT_CREATE_SESSION, async (_e, title?: string) => {
      try {
        const sessionId = await createChatSession(title)
        return sessionId
      } catch (error) {
        return null
      }
    })

    ipcMain.handle(
      IPC_CHANNELS.CHAT_SAVE_MESSAGE,
      async (
        _e,
        message: {
          id: string
          sessionId: string
          role: 'user' | 'assistant' | 'system'
          content: string
          status?: 'loading' | 'streaming' | 'incomplete' | 'complete' | 'error'
          parentId?: string
          createdAt?: number
          modelId?: string
        }
      ) => {
        try {
          const msgToSave = { ...message, createdAt: message.createdAt ?? Date.now() }
          const success = await saveChatMessage(msgToSave)
          return success
        } catch (error) {
          return false
        }
      }
    )

    ipcMain.handle(IPC_CHANNELS.CHAT_GET_SESSIONS, async () => {
      try {
        return await getChatSessions()
      } catch (error) {
        return []
      }
    })

    ipcMain.handle(IPC_CHANNELS.CHAT_GET_SESSION_MESSAGES, async (_e, sessionId: string) => {
      try {
        return await getChatMessages(sessionId)
      } catch (error) {
        return []
      }
    })

    ipcMain.handle(IPC_CHANNELS.CHAT_UPDATE_SESSION_TITLE, async (_e, sessionId: string, title: string) => {
      try {
        return await updateChatSessionTitle(sessionId, title)
      } catch (error) {
        return false
      }
    })

    ipcMain.handle(IPC_CHANNELS.CHAT_DELETE_SESSION, async (_e, sessionId: string) => {
      try {
        return await deleteChatSession(sessionId)
      } catch (error) {
        return false
      }
    })

    ipcMain.handle(IPC_CHANNELS.CHAT_DELETE_MESSAGE, async (_e, messageId: string) => {
      try {
        return await deleteChatMessage(messageId)
      } catch (error) {
        return false
      }
    })

    ipcMain.handle(IPC_CHANNELS.CHAT_GET_SESSION_STATS, async () => {
      try {
        return await getChatSessionStats()
      } catch (error) {
        return { totalSessions: 0, totalMessages: 0, activeSessions: 0 }
      }
    })

    ipcMain.handle(IPC_CHANNELS.CHAT_CLEANUP_OLD_SESSIONS, async (_e, keepCount?: number) => {
      try {
        return await cleanupOldChatSessions(keepCount)
      } catch (error) {
        return 0
      }
    })
  }
}


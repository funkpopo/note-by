import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipcChannels'
import {
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

    ipcMain.handle(
      IPC_CHANNELS.SET_FILE_TAGS,
      async (_e, filePath: string, tags: string[] = []) => {
        try {
          const success = await setTagsForFile(filePath, Array.isArray(tags) ? tags : [])
          return { success }
        } catch (error) {
          return { success: false, error: String(error) }
        }
      }
    )
  }
}

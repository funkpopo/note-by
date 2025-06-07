import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import { is } from '@electron-toolkit/utils'
import { getSetting } from './settings'
import fsPromises from 'fs/promises'
import { resolve } from 'path'

// 导入类型定义，即使初始化失败也能使用类型
import type Database from 'better-sqlite3'

// WebDAV同步记录类型定义
export interface WebDAVSyncRecord {
  filePath: string
  remotePath: string
  lastSyncTime: number
  lastModifiedLocal: number
  lastModifiedRemote: number
  contentHash: string
  fileSize: number
}

// 单例数据库连接
let db: Database.Database | null = null

function getDatabasePath(): string {
  let markdownPath
  if (is.dev) {
    // 开发环境，使用项目根目录下的markdown文件夹
    markdownPath = resolve(app.getAppPath(), 'markdown')
  } else {
    // 生产环境，使用应用程序所在目录的上级目录下的markdown文件夹
    markdownPath = resolve(app.getPath('exe'), '..', 'markdown')
  }

  // 返回数据库文件的完整路径
  return path.join(markdownPath, '.assets', 'note_history.db')
}

// 初始化数据库
export async function initDatabase(): Promise<Database.Database | null> {
  // 如果已经初始化过并成功，直接返回
  if (db) {
    return db
  }

  const dbPath = getDatabasePath()


  // 确保数据库目录存在
  const dbDir = path.dirname(dbPath)


  try {
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }
  } catch (dirError) {
    return null
  }

  try {
    // 动态导入better-sqlite3
    let SqliteDatabase
    try {
      // 导入better-sqlite3模块
      const SqliteModule = await import('better-sqlite3')
      SqliteDatabase = SqliteModule.default
    } catch (importError) {
      return null
    }

    db = new SqliteDatabase(dbPath)

    if (db) {

      // 创建文档历史记录表
      db.exec(`
        CREATE TABLE IF NOT EXISTS note_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          file_path TEXT NOT NULL,
          content TEXT NOT NULL,
          timestamp INTEGER NOT NULL
        );
        
        CREATE INDEX IF NOT EXISTS idx_note_history_file_path ON note_history(file_path);
        CREATE INDEX IF NOT EXISTS idx_note_history_timestamp ON note_history(timestamp);
      `)

      // 验证表是否创建成功
      const tableCheckStmt = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='note_history'"
      )
      const tableExists = tableCheckStmt.get()

      if (!tableExists) {
        return null
      }


    } else {
      return null
    }

    return db
  } catch (error) {
    
    return null
  }
}

// WebDAV同步缓存相关结构和函数

// 初始化WebDAV同步缓存表
export async function initWebDAVSyncCacheTable(): Promise<void> {
  try {
    const database = await initDatabase()

    if (!database) {

      return
    }

    // 创建WebDAV同步缓存表
    database.exec(`
      CREATE TABLE IF NOT EXISTS webdav_sync_cache (
        file_path TEXT PRIMARY KEY,
        remote_path TEXT NOT NULL,
        last_sync_time INTEGER NOT NULL,
        last_modified_local INTEGER NOT NULL,
        last_modified_remote INTEGER,
        content_hash TEXT NOT NULL,
        file_size INTEGER NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_webdav_sync_remote_path ON webdav_sync_cache(remote_path);
    `)


  } catch (error) {
    // 创建表失败，继续执行
  }
}

// 保存或更新WebDAV同步记录
export async function saveWebDAVSyncRecord(record: WebDAVSyncRecord): Promise<boolean> {
  try {
    const database = await initDatabase()

    if (!database) {

      return false
    }

    // 检查记录是否已存在
    const checkStmt = database.prepare(
      'SELECT file_path FROM webdav_sync_cache WHERE file_path = ?'
    )
    const existingRecord = checkStmt.get(record.filePath)

    if (existingRecord) {
      // 更新现有记录
      const updateStmt = database.prepare(`
        UPDATE webdav_sync_cache 
        SET remote_path = ?, 
            last_sync_time = ?, 
            last_modified_local = ?, 
            last_modified_remote = ?,
            content_hash = ?,
            file_size = ?
        WHERE file_path = ?
      `)

      updateStmt.run(
        record.remotePath,
        record.lastSyncTime,
        record.lastModifiedLocal,
        record.lastModifiedRemote || null,
        record.contentHash,
        record.fileSize,
        record.filePath
      )
    } else {
      // 插入新记录
      const insertStmt = database.prepare(`
        INSERT INTO webdav_sync_cache 
        (file_path, remote_path, last_sync_time, last_modified_local, last_modified_remote, content_hash, file_size)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)

      insertStmt.run(
        record.filePath,
        record.remotePath,
        record.lastSyncTime,
        record.lastModifiedLocal,
        record.lastModifiedRemote || null,
        record.contentHash,
        record.fileSize
      )
    }

    return true
  } catch (error) {
    return false
  }
}

// 获取特定文件的WebDAV同步记录
export async function getWebDAVSyncRecord(filePath: string): Promise<WebDAVSyncRecord | null> {
  try {
    const database = await initDatabase()

    if (!database) {
      
      return null
    }

    // 查询记录
    const stmt = database.prepare(`
      SELECT 
        file_path as filePath, 
        remote_path as remotePath, 
        last_sync_time as lastSyncTime, 
        last_modified_local as lastModifiedLocal, 
        last_modified_remote as lastModifiedRemote, 
        content_hash as contentHash, 
        file_size as fileSize
      FROM webdav_sync_cache 
      WHERE file_path = ?
    `)

    const record = stmt.get(filePath) as WebDAVSyncRecord | undefined

    return record || null
  } catch (error) {
    return null
  }
}

// 清除所有WebDAV同步缓存
export async function clearWebDAVSyncCache(): Promise<boolean> {
  try {
    const database = await initDatabase()

    if (!database) {

      return false
    }

    // 删除所有记录
    const stmt = database.prepare('DELETE FROM webdav_sync_cache')
    stmt.run()


    return true
  } catch (error) {
    return false
  }
}

// 关闭数据库连接
export function closeDatabase(): void {
  if (db) {
    try {
      db.close()
    } catch (error) {
      // 关闭失败，继续执行
    } finally {
      db = null
    }
  }
}

// 检查数据库是否可用
export function isDatabaseReady(): boolean {
  // 只依赖于db实例是否存在，不使用可能不准确的isDatabaseAvailable标志
  return db !== null
}

// 添加历史记录
interface AddHistoryParams {
  filePath: string
  content: string
}

export async function addNoteHistory(params: AddHistoryParams): Promise<void> {
  try {
    const database = await initDatabase()

    // 如果数据库不可用，静默返回
    if (!database) {
      return
    }

    const timestamp = Date.now()

    // 准备插入语句
    const stmt = database.prepare(
      'INSERT INTO note_history (file_path, content, timestamp) VALUES (?, ?, ?)'
    )

    // 执行插入
    stmt.run(params.filePath, params.content, timestamp)

    // 获取历史记录管理设置
    interface HistoryManagementSettings {
      type: 'count' | 'time'
      maxCount: number
      maxDays: number
    }

    const defaultSettings: HistoryManagementSettings = {
      type: 'count',
      maxCount: 20,
      maxDays: 7
    }

    // 同步调用getSetting，移除await
    const historyManagement = getSetting(
      'historyManagement',
      defaultSettings
    ) as HistoryManagementSettings

    // 根据设置清理历史记录
    if (historyManagement.type === 'count') {
      // 基于数量的清理策略
      const cleanStmt = database.prepare(`
        DELETE FROM note_history 
        WHERE file_path = ? AND id NOT IN (
          SELECT id FROM note_history 
          WHERE file_path = ? 
          ORDER BY timestamp DESC 
          LIMIT ?
        )
      `)

      const result = cleanStmt.run(params.filePath, params.filePath, historyManagement.maxCount)
      if (result.changes > 0) {

      }
    } else if (historyManagement.type === 'time') {
      // 基于时间的清理策略
      // 计算时间阈值（当前时间减去maxDays天）
      const timeThreshold = Date.now() - historyManagement.maxDays * 24 * 60 * 60 * 1000

      const cleanStmt = database.prepare(`
        DELETE FROM note_history 
        WHERE file_path = ? AND timestamp < ?
      `)

      const result = cleanStmt.run(params.filePath, timeThreshold)
      if (result.changes > 0) {

      }
    }
  } catch (error) {
    
    
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      filePath: params.filePath,
      contentLength: params.content.length
    })
  }
}

// 获取文档的历史记录
interface NoteHistoryItem {
  id: number
  filePath: string
  content: string
  timestamp: number
}

export async function getNoteHistory(filePath: string): Promise<NoteHistoryItem[]> {
  try {
    const database = await initDatabase()

    // 如果数据库不可用，返回空数组
    if (!database) {
      return []
    }

    // 查询历史记录
    const stmt = database.prepare(
      'SELECT id, file_path as filePath, content, timestamp FROM note_history WHERE file_path = ? ORDER BY timestamp DESC'
    )

    // 执行查询并返回结果
    return stmt.all(filePath) as NoteHistoryItem[]
  } catch (error) {
    return []
  }
}

// 获取特定ID的历史记录
export async function getNoteHistoryById(id: number): Promise<NoteHistoryItem | null> {
  try {
    const database = await initDatabase()

    // 如果数据库不可用，返回null
    if (!database) {
      return null
    }

    // 查询特定ID的历史记录
    const stmt = database.prepare(
      'SELECT id, file_path as filePath, content, timestamp FROM note_history WHERE id = ?'
    )

    // 执行查询并返回结果
    return stmt.get(id) as NoteHistoryItem | null
  } catch (error) {
    return null
  }
}

// 笔记历史记录统计和分析接口
export interface NoteHistoryStats {
  totalNotes: number // 笔记总数
  totalEdits: number // 编辑次数总计
  averageEditLength: number // 平均编辑长度（字符数）
  mostEditedNotes: Array<{
    // 编辑最频繁的笔记
    filePath: string
    count: number
    lastEditTime: number
  }>
  notesByDate: Array<{
    // 每日笔记数量
    date: string
    count: number
  }>
  editsByDate: Array<{
    // 每日编辑次数
    date: string
    count: number
  }>
  editTimeDistribution: Array<{
    // 编辑时间分布（24小时制）
    hour: number
    count: number
  }>
  topFolders: Array<{
    // 最常用的文件夹
    folder: string
    count: number
  }>
  topTags?: Array<{
    // 最常用的标签
    tag: string
    count: number
  }>
  tagRelations?: Array<{
    // 标签关联关系
    source: string
    target: string
    strength: number // 关联强度，代表两个标签共同出现的频率
  }>
  documentTags?: Array<{
    // 文档-标签关系
    filePath: string
    tags: string[]
  }>
}

// 获取笔记历史记录统计数据
export async function getNoteHistoryStats(): Promise<NoteHistoryStats | null> {
  try {
    const database = await initDatabase()

    // 如果数据库不可用，返回null
    if (!database) {

      return null
    }

    // 1. 获取笔记总数（去重的文件路径数）
    const totalNotesStmt = database.prepare(
      'SELECT COUNT(DISTINCT file_path) as count FROM note_history'
    )
    const totalNotesResult = totalNotesStmt.get() as { count: number } | undefined
    const totalNotes = totalNotesResult?.count || 0

    // 2. 获取编辑次数总计
    const totalEditsStmt = database.prepare('SELECT COUNT(*) as count FROM note_history')
    const totalEditsResult = totalEditsStmt.get() as { count: number } | undefined
    const totalEdits = totalEditsResult?.count || 0

    // 如果没有任何历史记录，返回默认的空统计对象
    if (totalEdits === 0) {
      return {
        totalNotes: 0,
        totalEdits: 0,
        averageEditLength: 0,
        mostEditedNotes: [],
        notesByDate: [],
        editsByDate: [],
        editTimeDistribution: [],
        topFolders: [],
        topTags: [],
        tagRelations: [],
        documentTags: []
      }
    }

    // 3. 计算平均编辑长度
    const avgLengthStmt = database.prepare('SELECT AVG(LENGTH(content)) as avg FROM note_history')
    const avgLengthResult = avgLengthStmt.get() as { avg: number } | undefined
    const avgLength = avgLengthResult?.avg || 0

    // 4. 获取编辑最频繁的笔记（前5个）
    const mostEditedStmt = database.prepare(`
      SELECT 
        file_path as filePath, 
        COUNT(*) as count,
        MAX(timestamp) as lastEditTime
      FROM note_history 
      GROUP BY file_path 
      ORDER BY count DESC 
      LIMIT 5
    `)
    const mostEditedNotes = mostEditedStmt.all() as Array<{
      filePath: string
      count: number
      lastEditTime: number
    }>

    // 5. 获取每日笔记数量（最近30天）
    const notesByDateStmt = database.prepare(`
      SELECT 
        date(timestamp/1000, 'unixepoch', 'localtime') as date,
        COUNT(DISTINCT file_path) as count
      FROM note_history
      WHERE timestamp >= ?
      GROUP BY date
      ORDER BY date ASC
    `)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    const notesByDate = notesByDateStmt.all(thirtyDaysAgo) as Array<{
      date: string
      count: number
    }>

    // 6. 获取每日编辑次数（最近30天）
    const editsByDateStmt = database.prepare(`
      SELECT 
        date(timestamp/1000, 'unixepoch', 'localtime') as date,
        COUNT(*) as count
      FROM note_history
      WHERE timestamp >= ?
      GROUP BY date
      ORDER BY date ASC
    `)
    const editsByDate = editsByDateStmt.all(thirtyDaysAgo) as Array<{
      date: string
      count: number
    }>

    // 7. 获取编辑时间分布（24小时制）
    const timeDistStmt = database.prepare(`
      SELECT 
        cast(strftime('%H', datetime(timestamp/1000, 'unixepoch', 'localtime')) as integer) as hour,
        COUNT(*) as count
      FROM note_history
      GROUP BY hour
      ORDER BY hour ASC
    `)
    const editTimeDistribution = timeDistStmt.all() as Array<{
      hour: number
      count: number
    }>

    // 8. 获取最常用的文件夹
    const topFoldersStmt = database.prepare(`
      SELECT 
        substr(file_path, 1, instr(file_path, '/') - 1) as folder,
        COUNT(*) as count
      FROM note_history
      WHERE instr(file_path, '/') > 0
      GROUP BY folder
      ORDER BY count DESC
      LIMIT 5
    `)
    const topFolders = topFoldersStmt.all() as Array<{
      folder: string
      count: number
    }>

    // 9. 获取标签分析数据
    let tagData: {
      topTags: Array<{ tag: string; count: number }>
      tagRelations: Array<{ source: string; target: string; strength: number }>
      documentTags: Array<{ filePath: string; tags: string[] }>
    } | null = null
    try {
      // 获取markdown文件夹路径
      let markdownPath = ''
      if (is.dev) {
        markdownPath = path.resolve(process.cwd(), 'markdown')
      } else {
        // 在生产环境中，使用与应用程序可执行文件相同目录下的markdown文件夹
        markdownPath = path.resolve(process.execPath, '..', 'markdown')
      }

      // 分析标签数据
      tagData = await getDocumentTagsData(markdownPath)
    } catch (error) {
      // 继续执行，即使标签分析失败
    }

    // 返回完整的统计数据，确保所有字段都有默认值
    return {
      totalNotes,
      totalEdits,
      averageEditLength: Math.round(avgLength),
      mostEditedNotes: mostEditedNotes || [],
      notesByDate: notesByDate || [],
      editsByDate: editsByDate || [],
      editTimeDistribution: editTimeDistribution || [],
      topFolders: topFolders || [],
      // 添加标签分析数据，提供默认空数组
      topTags: tagData?.topTags || [],
      tagRelations: tagData?.tagRelations || [],
      documentTags: tagData?.documentTags || []
    }
  } catch (error) {
    // 统计失败，返回默认值
    // 发生错误时，返回默认的空统计对象而不是null
    return {
      totalNotes: 0,
      totalEdits: 0,
      averageEditLength: 0,
      mostEditedNotes: [],
      notesByDate: [],
      editsByDate: [],
      editTimeDistribution: [],
      topFolders: [],
      topTags: [],
      tagRelations: [],
      documentTags: []
    }
  }
}

// 用户活动数据
export interface UserActivityData {
  // 日期格式：YYYY-MM-DD
  dailyActivity: Record<
    string,
    {
      createdNotes: number
      editedNotes: number
      totalEdits: number
      charactersAdded: number
      activeHours: number[]
    }
  >

  // 笔记详情数据
  noteDetails: Array<{
    filePath: string
    firstEdit: number
    lastEdit: number
    editCount: number
    averageEditSize: number
  }>
}

// 获取用户活动数据
export async function getUserActivityData(days: number = 30): Promise<UserActivityData | null> {
  try {
    const database = await initDatabase()

    // 如果数据库不可用，返回null
    if (!database) {

      return null
    }

    // 计算起始时间（过去days天）
    const startTime = Date.now() - days * 24 * 60 * 60 * 1000

    // 获取日期范围内的所有编辑记录
    const editsStmt = database.prepare(`
      SELECT 
        id,
        file_path as filePath,
        content,
        timestamp,
        date(timestamp/1000, 'unixepoch', 'localtime') as date,
        strftime('%H', datetime(timestamp/1000, 'unixepoch', 'localtime')) as hour
      FROM note_history
      WHERE timestamp >= ?
      ORDER BY timestamp ASC
    `)

    const edits = editsStmt.all(startTime) as Array<{
      id: number
      filePath: string
      content: string
      timestamp: number
      date: string
      hour: string
    }>

    // 初始化结果对象
    const result: UserActivityData = {
      dailyActivity: {},
      noteDetails: []
    }

    // 处理笔记详情数据
    const notesMap: Record<
      string,
      {
        firstEdit: number
        lastEdit: number
        editCount: number
        totalEditSize: number
        contents: string[] // 存储每个版本的内容，用于计算平均编辑大小
      }
    > = {}

    // 处理日常活动数据
    const dailyFilesCreated: Record<string, Set<string>> = {}
    const dailyFilesEdited: Record<string, Set<string>> = {}
    const dailyEdits: Record<string, number> = {}
    const dailyChars: Record<string, number> = {}
    const dailyHours: Record<string, Set<number>> = {}

    // 分析每个编辑记录
    for (const edit of edits) {
      // 更新笔记详情
      if (!notesMap[edit.filePath]) {
        notesMap[edit.filePath] = {
          firstEdit: edit.timestamp,
          lastEdit: edit.timestamp,
          editCount: 0,
          totalEditSize: 0,
          contents: []
        }
      }

      const noteInfo = notesMap[edit.filePath]
      noteInfo.lastEdit = Math.max(noteInfo.lastEdit, edit.timestamp)
      noteInfo.editCount += 1
      noteInfo.contents.push(edit.content)

      // 如果有多个版本，计算此次编辑的大小（与上一版本的差异）
      if (noteInfo.contents.length > 1) {
        const prevContent = noteInfo.contents[noteInfo.contents.length - 2]
        const currContent = edit.content
        // 简单使用长度差异作为编辑大小的估计
        const editSize = Math.abs(currContent.length - prevContent.length)
        noteInfo.totalEditSize += editSize
      } else {
        // 第一个版本，使用整个内容长度
        noteInfo.totalEditSize += edit.content.length
      }

      // 更新日常活动数据
      const date = edit.date
      const hour = parseInt(edit.hour)

      // 初始化日期数据（如果不存在）
      if (!dailyFilesCreated[date]) dailyFilesCreated[date] = new Set()
      if (!dailyFilesEdited[date]) dailyFilesEdited[date] = new Set()
      if (!dailyEdits[date]) dailyEdits[date] = 0
      if (!dailyChars[date]) dailyChars[date] = 0
      if (!dailyHours[date]) dailyHours[date] = new Set()

      // 更新每日数据
      dailyFilesEdited[date].add(edit.filePath)
      dailyEdits[date] += 1
      dailyHours[date].add(hour)

      // 检查是否是新创建的笔记（第一次编辑）
      if (noteInfo.editCount === 1) {
        dailyFilesCreated[date].add(edit.filePath)
      }

      // 计算字符增加量（简单估计）
      // 如果有多个版本，计算与上一版本的差异
      if (noteInfo.contents.length > 1) {
        const prevContent = noteInfo.contents[noteInfo.contents.length - 2]
        const currContent = edit.content
        // 如果当前版本更长，认为是增加了字符
        if (currContent.length > prevContent.length) {
          dailyChars[date] += currContent.length - prevContent.length
        }
      } else {
        // 第一个版本，计入全部字符
        dailyChars[date] += edit.content.length
      }
    }

    // 整理日常活动数据
    for (const date of Object.keys(dailyFilesEdited)) {
      result.dailyActivity[date] = {
        createdNotes: dailyFilesCreated[date]?.size || 0,
        editedNotes: dailyFilesEdited[date]?.size || 0,
        totalEdits: dailyEdits[date] || 0,
        charactersAdded: dailyChars[date] || 0,
        activeHours: Array.from(dailyHours[date] || [])
      }
    }

    // 整理笔记详情数据
    for (const [filePath, info] of Object.entries(notesMap)) {
      result.noteDetails.push({
        filePath,
        firstEdit: info.firstEdit,
        lastEdit: info.lastEdit,
        editCount: info.editCount,
        averageEditSize: info.editCount > 0 ? Math.round(info.totalEditSize / info.editCount) : 0
      })
    }

    // 按编辑次数排序笔记详情（降序）
    result.noteDetails.sort((a, b) => b.editCount - a.editCount)

    return result
  } catch (error) {
    return null
  }
}

// 分析缓存项接口
export interface AnalysisCacheItem {
  date: string // 分析日期，格式：YYYY-MM-DD
  stats: NoteHistoryStats
  activityData: UserActivityData
  result: {
    summary: string
    writingHabits: {
      title: string
      content: string
    }
    writingRhythm: {
      title: string
      content: string
    }
    topics: {
      title: string
      content: string
    }
    writingBehavior: {
      title: string
      content: string
    }
    recommendations: {
      title: string
      items: string[]
    }
    efficiencyTips: {
      title: string
      items: string[]
    }
    suggestedGoals: {
      title: string
      items: string[]
    }
  }
  modelId: string
}

// 初始化数据库时创建分析缓存表
export async function initAnalysisCacheTable(): Promise<void> {
  try {
    const database = await initDatabase()

    if (!database) {

      return
    }

    // 只在表不存在时创建表，不再删除现有表
    database.exec(`
      CREATE TABLE IF NOT EXISTS analysis_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL UNIQUE,
        stats TEXT NOT NULL,
        activity_data TEXT NOT NULL,
        result TEXT NOT NULL,
        model_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_analysis_cache_date ON analysis_cache(date);
    `)
  } catch (error) {
  }
}

// 保存分析缓存
export async function saveAnalysisCache(data: AnalysisCacheItem): Promise<boolean> {
  try {
    const database = await initDatabase()

    if (!database) {

      return false
    }

    // 先检查是否已有当天的数据
    const checkStmt = database.prepare('SELECT id FROM analysis_cache WHERE date = ?')
    const existingRecord = checkStmt.get(data.date) as { id: number } | undefined

    if (existingRecord) {
      // 更新现有记录
      const updateStmt = database.prepare(`
        UPDATE analysis_cache 
        SET stats = ?, activity_data = ?, result = ?, model_id = ?, timestamp = ?
        WHERE date = ?
      `)

      try {
        updateStmt.run(
          JSON.stringify(data.stats),
          JSON.stringify(data.activityData),
          JSON.stringify(data.result),
          data.modelId,
          Date.now(),
          data.date
        )
      } catch (error) {
        return false
      }
    } else {
      // 插入新记录
      const insertStmt = database.prepare(`
        INSERT INTO analysis_cache 
        (date, stats, activity_data, result, model_id, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
      `)

      try {
        insertStmt.run(
          data.date,
          JSON.stringify(data.stats),
          JSON.stringify(data.activityData),
          JSON.stringify(data.result),
          data.modelId,
          Date.now()
        )
      } catch (error) {
        return false
      }
    }

    // 清理旧缓存，仅保留最近7天的数据
    const cleanupStmt = database.prepare(`
      DELETE FROM analysis_cache 
      WHERE date NOT IN (
        SELECT date FROM analysis_cache 
        ORDER BY date DESC 
        LIMIT 7
      )
    `)

    cleanupStmt.run()

    return true
  } catch (error) {
    return false
  }
}

// 获取分析缓存
export async function getAnalysisCache(): Promise<AnalysisCacheItem | null> {
  try {
    const database = await initDatabase()

    if (!database) {
      
      return null
    }

    // 获取最新的缓存记录
    const stmt = database.prepare(`
      SELECT date, stats, activity_data, result, model_id
      FROM analysis_cache
      ORDER BY date DESC
      LIMIT 1
    `)

    const record = stmt.get() as
      | {
          date: string
          stats: string
          activity_data: string
          result: string
          model_id: string
        }
      | undefined

    if (!record) {
      return null
    }

    // 解析JSON字段并返回
    return {
      date: record.date,
      stats: JSON.parse(record.stats),
      activityData: JSON.parse(record.activity_data),
      result: JSON.parse(record.result),
      modelId: record.model_id
    }
  } catch (error) {
    return null
  }
}

// 重置分析缓存表
export async function resetAnalysisCache(): Promise<boolean> {
  try {
    const database = await initDatabase()

    if (!database) {
      return false
    }

    // 删除并重新创建表
    database.exec(`DROP TABLE IF EXISTS analysis_cache`)

    // 重新创建表
    await initAnalysisCacheTable()

    return true
  } catch (error) {
    return false
  }
}

// 用于获取文档中的标签数据
export async function getDocumentTagsData(markdownPath: string): Promise<{
  topTags: Array<{ tag: string; count: number }>
  tagRelations: Array<{ source: string; target: string; strength: number }>
  documentTags: Array<{ filePath: string; tags: string[] }>
} | null> {
  try {
    // 用于存储所有标签数据
    const tagCounts: Record<string, number> = {} // 标签计数
    const tagCooccurrence: Record<string, Record<string, number>> = {} // 标签共现计数
    const documentTagsMap: Record<string, string[]> = {} // 文档-标签映射

    // 读取markdown目录下的所有文件
    const files = await getAllMarkdownFiles(markdownPath)

    // 遍历所有文件，提取标签数据
    for (const filePath of files) {
      try {
        // 读取文件内容
        const content = await fsPromises.readFile(filePath, 'utf-8')

        // 1. 检查HTML注释中的标签 (<!-- tags: tag1,tag2,tag3 -->)
        const tagsMatch = content.match(/<!-- tags: ([^>]*) -->/)
        let fileTags: string[] = []

        if (tagsMatch && tagsMatch[1]) {
          // 从注释中提取标签
          fileTags = tagsMatch[1]
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
        }

        // 2. 检查内容中的@标签
        // 修改正则表达式，排除电子邮件地址格式
        // 1. 使用(?<![a-zA-Z0-9_\u4e00-\u9fa5])@表示@前不能是字母、数字等（必须是空格、标点或行首）
        // 2. 使用(?![a-zA-Z0-9_\u4e00-\u9fa5]+\.[a-zA-Z0-9_\u4e00-\u9fa5]+)排除域名格式
        const atTagsMatches = content.matchAll(
          /(?<![a-zA-Z0-9_\u4e00-\u9fa5])@([a-zA-Z0-9_\u4e00-\u9fa5]+)(?!\.[a-zA-Z0-9_\u4e00-\u9fa5]+)/g
        )
        for (const match of atTagsMatches) {
          if (match[1] && !fileTags.includes(match[1])) {
            fileTags.push(match[1])
          }
        }

        // 如果文件中有标签，更新各种统计信息
        if (fileTags.length > 0) {
          // 更新文档-标签映射
          const relativePath = path.relative(markdownPath, filePath).replace(/\\/g, '/')
          documentTagsMap[relativePath] = fileTags

          // 更新标签计数
          fileTags.forEach((tag) => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1

            // 初始化共现矩阵条目
            if (!tagCooccurrence[tag]) {
              tagCooccurrence[tag] = {}
            }

            // 更新标签共现计数（在同一文档中出现的标签被视为共现）
            fileTags.forEach((otherTag) => {
              if (tag !== otherTag) {
                tagCooccurrence[tag][otherTag] = (tagCooccurrence[tag][otherTag] || 0) + 1
              }
            })
          })
        }
      } catch (error) {
        // 继续处理其他文件
        continue
      }
    }

    // 转换数据格式

    // 1. 生成topTags（按计数排序）
    const topTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)

    // 2. 生成tagRelations（标签关联关系）
    const tagRelations: Array<{ source: string; target: string; strength: number }> = []

    // 避免重复添加关系对（A-B和B-A算一个）
    const addedRelations = new Set<string>()

    Object.entries(tagCooccurrence).forEach(([source, targets]) => {
      Object.entries(targets).forEach(([target, strength]) => {
        // 确保每对关系只添加一次（按字母顺序排序键）
        const relationKey = [source, target].sort().join('-')
        if (!addedRelations.has(relationKey)) {
          addedRelations.add(relationKey)
          tagRelations.push({ source, target, strength })
        }
      })
    })

    // 按关联强度排序
    tagRelations.sort((a, b) => b.strength - a.strength)

    // 3. 生成documentTags（文档-标签列表）
    const documentTags = Object.entries(documentTagsMap)
      .map(([filePath, tags]) => ({ filePath, tags }))
      .sort((a, b) => a.filePath.localeCompare(b.filePath))

    return {
      topTags: topTags.slice(0, 20), // 只返回前20个最常用的标签
      tagRelations: tagRelations.slice(0, 50), // 只返回前50个最强的关联关系
      documentTags
    }
  } catch (error) {
    return null
  }
}

// 辅助函数：递归获取目录下所有的Markdown文件
async function getAllMarkdownFiles(dir: string): Promise<string[]> {
  const files: string[] = []

  async function traverse(currentDir: string): Promise<void> {
    const entries = await fsPromises.readdir(currentDir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)

      if (entry.isDirectory()) {
        // 跳过.assets目录和以点开头的隐藏目录
        if (entry.name !== '.assets' && !entry.name.startsWith('.')) {
          await traverse(fullPath)
        }
      } else if (
        entry.isFile() &&
        (entry.name.endsWith('.md') || entry.name.endsWith('.markdown'))
      ) {
        files.push(fullPath)
      }
    }
  }

  await traverse(dir)
  return files
}

// 数据库状态检查函数
export async function checkDatabaseStatus(): Promise<{
  isInitialized: boolean
  tablesExist: boolean
  recordCount: number
  lastError: string | null
  details: {
    dbPath: string
    dbDirExists: boolean
    dbFileExists: boolean
    hasWritePermission: boolean
    markdownPath: string
    pathConsistency: boolean
    tables: string[]
    tableInfo: Record<string, any>
    recommendations: string[]
  }
}> {
  const dbPath = getDatabasePath()
  const dbDir = path.dirname(dbPath)

  // 获取markdown根目录路径用于一致性检查
  let markdownPath
  if (is.dev) {
    markdownPath = resolve(app.getAppPath(), 'markdown')
  } else {
    markdownPath = resolve(app.getPath('exe'), '..', 'markdown')
  }

  const result = {
    isInitialized: false,
    tablesExist: false,
    recordCount: 0,
    lastError: null as string | null,
    details: {
      dbPath: dbPath,
      dbDirExists: false,
      dbFileExists: false,
      hasWritePermission: false,
      markdownPath: markdownPath,
      pathConsistency: false,
      tables: [] as string[],
      tableInfo: {} as Record<string, any>,
      recommendations: [] as string[]
    }
  }

  try {

    // 检查目录是否存在
    result.details.dbDirExists = fs.existsSync(dbDir)
    result.details.dbFileExists = fs.existsSync(dbPath)

    // 检查路径一致性（数据库应该位于markdown/.assets目录下）
    const expectedDbPath = path.join(markdownPath, '.assets', 'note_history.db')
    result.details.pathConsistency = dbPath === expectedDbPath

    if (!result.details.pathConsistency) {
      result.details.recommendations.push(`路径不一致：期望 ${expectedDbPath}，实际 ${dbPath}`)
    }

    // 检查写入权限
    try {
      if (result.details.dbDirExists) {
        // 如果目录存在，测试写入权限
        const testFile = path.join(dbDir, 'test_write_permission.tmp')
        await fsPromises.writeFile(testFile, 'test')
        await fsPromises.unlink(testFile)
        result.details.hasWritePermission = true
      } else {
        // 如果目录不存在，测试是否可以创建
        await fsPromises.mkdir(dbDir, { recursive: true })
        result.details.dbDirExists = true
        result.details.hasWritePermission = true
        result.details.recommendations.push('已自动创建数据库目录')
      }
    } catch (permError) {
      result.details.hasWritePermission = false
      result.details.recommendations.push(`权限问题：无法写入目录 ${dbDir}`)
      result.details.recommendations.push('请检查应用程序是否有足够的文件系统权限')
    }

    // 如果基础条件不满足，提供建议
    if (!result.details.dbDirExists) {
      result.details.recommendations.push('数据库目录不存在，请确保应用有权限创建目录')
    }

    if (!result.details.hasWritePermission) {
      result.details.recommendations.push('没有写入权限，历史记录功能将无法工作')
      result.lastError = '数据库目录权限不足'
      return result
    }

    // 检查数据库是否已初始化
    const database = await initDatabase()
    if (!database) {
      result.lastError = '数据库初始化失败'
      result.details.recommendations.push('数据库初始化失败，请检查SQLite模块是否正确安装')
      result.details.recommendations.push('尝试重启应用程序以重新初始化数据库')
      return result
    }

    result.isInitialized = true

    // 检查表是否存在
    const tablesStmt = database.prepare("SELECT name FROM sqlite_master WHERE type='table'")
    const tables = tablesStmt.all() as Array<{ name: string }>
    result.details.tables = tables.map((t) => t.name)

    const hasNoteHistoryTable = result.details.tables.includes('note_history')
    result.tablesExist = hasNoteHistoryTable

    if (hasNoteHistoryTable) {
      // 获取note_history表的记录数量
      const countStmt = database.prepare('SELECT COUNT(*) as count FROM note_history')
      const countResult = countStmt.get() as { count: number }
      result.recordCount = countResult.count

      // 获取表结构信息
      const tableInfoStmt = database.prepare("PRAGMA table_info('note_history')")
      const tableInfo = tableInfoStmt.all()
      result.details.tableInfo.note_history = tableInfo

      if (result.recordCount === 0) {
        result.details.recommendations.push(
          '历史记录表存在但为空，这可能是正常的（如果是首次使用）'
        )
      } else {
        result.details.recommendations.push(`历史记录表包含 ${result.recordCount} 条记录，功能正常`)
      }
    } else {
      result.details.recommendations.push('note_history表不存在，可能需要重新初始化数据库')
    }

    // 检查其他表
    if (result.details.tables.includes('webdav_sync_cache')) {
      const webdavCountStmt = database.prepare('SELECT COUNT(*) as count FROM webdav_sync_cache')
      const webdavCount = webdavCountStmt.get() as { count: number }
      result.details.tableInfo.webdav_sync_cache = { recordCount: webdavCount.count }
    }

    // 如果一切正常，提供积极反馈
    if (
      result.isInitialized &&
      result.tablesExist &&
      result.details.hasWritePermission &&
      result.details.pathConsistency
    ) {
      result.details.recommendations.push('数据库状态良好，历史记录功能应该正常工作')
    }

    return result
  } catch (error) {
    
    result.lastError = error instanceof Error ? error.message : String(error)
    result.details.recommendations.push('数据库状态检查过程中发生错误')
    result.details.recommendations.push('请查看控制台日志获取详细错误信息')
    return result
  }
}

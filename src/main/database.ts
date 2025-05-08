import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import { is } from '@electron-toolkit/utils'
import { getSetting } from './settings'

// 导入类型定义，即使初始化失败也能使用类型
import type Database from 'better-sqlite3'

// 单例数据库连接
let db: Database.Database | null = null

// 获取数据库文件路径，与settings.json在同一目录
function getDatabasePath(): string {
  // 使用与settings.ts相同的逻辑确定数据库文件位置
  if (is.dev) {
    // 开发环境，使用项目根目录
    return path.join(process.cwd(), 'note_history.db')
  } else {
    // 生产环境，使用应用程序所在目录
    return path.join(path.dirname(app.getPath('exe')), 'note_history.db')
  }
}

// 初始化数据库
export async function initDatabase(): Promise<Database.Database | null> {
  // 如果已经初始化过并成功，直接返回
  if (db) {
    return db
  }

  // 即使之前失败过，也总是尝试初始化
  // 移除对isDatabaseAvailable的检查，每次都尝试初始化

  const dbPath = getDatabasePath()
  console.log('数据库路径:', dbPath)

  // 确保数据库目录存在
  const dbDir = path.dirname(dbPath)
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }

  try {
    // 动态导入better-sqlite3
    let SqliteDatabase
    try {
      // 导入better-sqlite3模块
      const SqliteModule = await import('better-sqlite3')
      SqliteDatabase = SqliteModule.default
    } catch (importError) {
      console.error('动态导入better-sqlite3失败:', importError)
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
    }

    console.log('数据库初始化成功')
    return db
  } catch (error) {
    console.error('初始化数据库失败:', error)
    return null
  }
}

// 关闭数据库连接
export function closeDatabase(): void {
  if (db) {
    try {
      db.close()
    } catch (error) {
      console.error('关闭数据库连接失败:', error)
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

    // 如果数据库不可用，直接返回
    if (!database) {
      console.log('无法添加历史记录：数据库不可用')
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

    const historyManagement = (await getSetting(
      'historyManagement',
      defaultSettings
    )) as HistoryManagementSettings

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

      cleanStmt.run(params.filePath, params.filePath, historyManagement.maxCount)
    } else if (historyManagement.type === 'time') {
      // 基于时间的清理策略
      // 计算时间阈值（当前时间减去maxDays天）
      const timeThreshold = Date.now() - historyManagement.maxDays * 24 * 60 * 60 * 1000

      const cleanStmt = database.prepare(`
        DELETE FROM note_history 
        WHERE file_path = ? AND timestamp < ?
      `)

      cleanStmt.run(params.filePath, timeThreshold)
    }
  } catch (error) {
    console.error('添加历史记录失败:', error)
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
      console.log('无法获取历史记录：数据库不可用')
      return []
    }

    // 查询历史记录
    const stmt = database.prepare(
      'SELECT id, file_path as filePath, content, timestamp FROM note_history WHERE file_path = ? ORDER BY timestamp DESC'
    )

    // 执行查询并返回结果
    return stmt.all(filePath) as NoteHistoryItem[]
  } catch (error) {
    console.error('获取历史记录失败:', error)
    return []
  }
}

// 获取特定ID的历史记录
export async function getNoteHistoryById(id: number): Promise<NoteHistoryItem | null> {
  try {
    const database = await initDatabase()

    // 如果数据库不可用，返回null
    if (!database) {
      console.log('无法获取历史记录：数据库不可用')
      return null
    }

    // 查询特定ID的历史记录
    const stmt = database.prepare(
      'SELECT id, file_path as filePath, content, timestamp FROM note_history WHERE id = ?'
    )

    // 执行查询并返回结果
    return stmt.get(id) as NoteHistoryItem | null
  } catch (error) {
    console.error('获取历史记录失败:', error)
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
}

// 获取笔记历史记录统计数据
export async function getNoteHistoryStats(): Promise<NoteHistoryStats | null> {
  try {
    const database = await initDatabase()

    // 如果数据库不可用，返回null
    if (!database) {
      console.log('无法获取历史记录统计：数据库不可用')
      return null
    }

    // 1. 获取笔记总数（去重的文件路径数）
    const totalNotesStmt = database.prepare(
      'SELECT COUNT(DISTINCT file_path) as count FROM note_history'
    )
    const totalNotes = (totalNotesStmt.get() as { count: number }).count

    // 2. 获取编辑次数总计
    const totalEditsStmt = database.prepare('SELECT COUNT(*) as count FROM note_history')
    const totalEdits = (totalEditsStmt.get() as { count: number }).count

    // 3. 计算平均编辑长度
    const avgLengthStmt = database.prepare('SELECT AVG(LENGTH(content)) as avg FROM note_history')
    const avgLength = (avgLengthStmt.get() as { avg: number }).avg || 0

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

    // 返回完整的统计数据
    return {
      totalNotes,
      totalEdits,
      averageEditLength: Math.round(avgLength),
      mostEditedNotes,
      notesByDate,
      editsByDate,
      editTimeDistribution,
      topFolders
    }
  } catch (error) {
    console.error('获取历史记录统计失败:', error)
    return null
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
      console.log('无法获取用户活动数据：数据库不可用')
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
    console.error('获取用户活动数据失败:', error)
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
      console.log('无法创建分析缓存表：数据库不可用')
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
    console.error('创建分析缓存表失败:', error)
  }
}

// 保存分析缓存
export async function saveAnalysisCache(data: AnalysisCacheItem): Promise<boolean> {
  try {
    const database = await initDatabase()

    if (!database) {
      console.log('无法保存分析缓存：数据库不可用')
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
        console.error('执行更新语句失败:', error, {
          stats: typeof data.stats,
          activityData: typeof data.activityData,
          result: typeof data.result
        })
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
        console.error('执行插入语句失败:', error, {
          stats: typeof data.stats,
          activityData: typeof data.activityData,
          result: typeof data.result
        })
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
    console.error('保存分析缓存失败:', error)
    return false
  }
}

// 获取分析缓存
export async function getAnalysisCache(): Promise<AnalysisCacheItem | null> {
  try {
    const database = await initDatabase()

    if (!database) {
      console.log('无法获取分析缓存：数据库不可用')
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
    console.error('获取分析缓存失败:', error)
    return null
  }
}

// 重置分析缓存表
export async function resetAnalysisCache(): Promise<boolean> {
  try {
    const database = await initDatabase()

    if (!database) {
      console.log('无法重置分析缓存：数据库不可用')
      return false
    }

    // 删除并重新创建表
    database.exec(`DROP TABLE IF EXISTS analysis_cache`)

    // 重新创建表
    await initAnalysisCacheTable()

    console.log('分析缓存表已重置')
    return true
  } catch (error) {
    console.error('重置分析缓存表失败:', error)
    return false
  }
}

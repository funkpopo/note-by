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

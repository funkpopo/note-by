import { BrowserWindow } from 'electron'
import { FileService } from './services/FileService'
import { ExportService } from './services/ExportService'
import { AIService } from './services/AIService'
import { SyncService } from './services/SyncService'
import { DatabaseService } from './services/DatabaseService'

export class ServiceContainer {
  readonly file: FileService
  readonly exporter: ExportService
  readonly ai: AIService
  readonly sync: SyncService
  readonly db: DatabaseService

  constructor(mainWindow: BrowserWindow | null) {
    this.file = new FileService(mainWindow)
    this.exporter = new ExportService(mainWindow)
    this.ai = new AIService(mainWindow)
    this.sync = new SyncService(() => this.file.getMarkdownFolderPath())
    this.db = new DatabaseService(() => this.file.getMarkdownFolderPath())
  }

  registerAll(): void {
    this.file.registerIpcHandlers([
      'SAVE_MARKDOWN',
      'CHECK_FILE_EXISTS',
      'GET_MARKDOWN_FOLDERS',
      'GET_MARKDOWN_FILES',
      'READ_MARKDOWN_FILE'
    ])
    this.exporter.registerIpcHandlers()
    this.ai.registerIpcHandlers()
    this.sync.registerIpcHandlers()
    // 数据库相关 IPC 仍保留在主进程中，后续再迁移
  }
}

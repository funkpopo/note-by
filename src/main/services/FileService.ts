import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import path, { resolve, join } from 'path'
import fsSync from 'fs'
import { promises as fsPromises } from 'fs'
import { is } from '@electron-toolkit/utils'
import { IPC_CHANNELS } from '../../shared/ipcChannels'
import { fileStreamManager } from '../utils/FileStreamManager'
import {
  addNoteHistory,
  renameFileTags,
  renameFolderTags,
  deleteFileTags
} from '../database'
import showdown from 'showdown'
import { mainErrorHandler, ErrorCategory } from './ErrorService'

export class FileService {
  private mainWindow: BrowserWindow | null
  private markdownConverter: showdown.Converter

  constructor(mainWindow: BrowserWindow | null) {
    this.mainWindow = mainWindow
    this.markdownConverter = new showdown.Converter({
      tables: true,
      strikethrough: true,
      tasklists: true,
      ghCodeBlocks: true,
      encodeEmails: false,
      simplifiedAutoLink: true,
      openLinksInNewWindow: false,
      backslashEscapesHTMLTags: false,
      ghMentions: false,
      headerLevelStart: 1
    })
  }

  public getMarkdownFolderPath(): string {
    let markdownPath
    if (is.dev) {
      markdownPath = resolve(app.getAppPath(), 'markdown')
    } else {
      markdownPath = resolve(app.getPath('exe'), '..', 'markdown')
    }

    try {
      if (!fsSync.existsSync(markdownPath)) {
        fsSync.mkdirSync(markdownPath, { recursive: true })
      }
      const defaultAssetsFolderPath = path.join(markdownPath, '.assets')
      if (!fsSync.existsSync(defaultAssetsFolderPath)) {
        fsSync.mkdirSync(defaultAssetsFolderPath, { recursive: true })
      }
    } catch (error) {
      mainErrorHandler.error(
        'Failed to create markdown directory structure',
        error,
        ErrorCategory.FILE_IO,
        'getMarkdownFolderPath'
      )
    }
    return markdownPath
  }

  private async ensureMarkdownFolders(folderPath: string): Promise<void> {
    await fsPromises.mkdir(folderPath, { recursive: true })
  }

  private isMarkdownContent(content: string): boolean {
    if (!content.trim()) return false
    const complexHtmlPattern = /<(?!br\s*\/?>|p>|\/p>)[^>]+>/gi
    const hasComplexHtmlTags = complexHtmlPattern.test(content)
    if (hasComplexHtmlTags) return false
    const markdownPatterns = [
      /^#{1,6}\s+.+$/m,
      /^\s*[-*+]\s+.+$/m,
      /^\s*\d+\.\s+.+$/m,
      /```[\s\S]*?```/,
      /`[^`\r\n]+`/,
      /\*\*[^*\r\n]+\*\*/,
      /\*[^*\r\n]+\*/,
      /\[[^\]\r\n]+\]\([^)\r\n]+\)/,
      /^\s*>\s+.+$/m,
      /^\s*[-=]{3,}\s*$/m,
      /!\[[^\]]*\]\([^)]+\)/
    ]
    const markdownMatches = markdownPatterns.filter((pattern) => pattern.test(content)).length
    return markdownMatches >= 1 || (!hasComplexHtmlTags && !/<[^>]+>/g.test(content))
  }

  private convertMarkdownToHtml(content: string): string {
    return this.markdownConverter.makeHtml(content)
  }

  public registerIpcHandlers(only?: Array<keyof typeof IPC_CHANNELS>): void {
    const should = (ch: keyof typeof IPC_CHANNELS): boolean => !only || only.includes(ch)
    // Notes path
    if (should('GET_NOTES_PATH')) {
      ipcMain.handle(IPC_CHANNELS.GET_NOTES_PATH, async () => {
        return this.getMarkdownFolderPath()
      })
    }

    // Check exists
    if (should('CHECK_FILE_EXISTS'))
      ipcMain.handle(IPC_CHANNELS.CHECK_FILE_EXISTS, async (_e, filePath: string) => {
        try {
        const markdownRoot = this.getMarkdownFolderPath()
        const fullPath = resolve(markdownRoot, filePath)
        try {
          const stat = await fsPromises.stat(fullPath)
          return { success: true, exists: stat.isFile() }
        } catch {
          return { success: true, exists: false }
        }
      } catch (error) {
        return { success: false, error: String(error), exists: false }
      }
    })

    // List folders
    if (should('GET_MARKDOWN_FOLDERS'))
      ipcMain.handle(IPC_CHANNELS.GET_MARKDOWN_FOLDERS, async () => {
        try {
        const markdownRoot = this.getMarkdownFolderPath()
        await this.ensureMarkdownFolders(markdownRoot)

        const getAllFolders = async (dir: string, basePath = ''): Promise<string[]> => {
          const folders: string[] = []
          try {
            const entries = await fsPromises.readdir(dir, { withFileTypes: true })
            for (const entry of entries) {
              if (entry.isDirectory()) {
                const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name
                folders.push(relativePath)
                const subFolders = await getAllFolders(resolve(dir, entry.name), relativePath)
                folders.push(...subFolders)
              }
            }
          } catch (error) {
            mainErrorHandler.warn(
              'Failed to read directory entry during folder scan',
              ErrorCategory.FILE_IO,
              'getAllFolders',
              error
            )
          }
          return folders
        }

        const folders = await getAllFolders(markdownRoot)
        return { success: true, folders }
      } catch (error) {
        return { success: false, error: String(error), folders: [] }
      }
    })

    // List files under folder
    if (should('GET_MARKDOWN_FILES'))
      ipcMain.handle(IPC_CHANNELS.GET_MARKDOWN_FILES, async (_e, folderName: string) => {
        try {
        const markdownRoot = this.getMarkdownFolderPath()
        const folderPath = resolve(markdownRoot, folderName)
        await this.ensureMarkdownFolders(folderPath)
        try {
          await fsPromises.access(folderPath)
        } catch (error) {
          return { success: false, error: String(error), files: [] }
        }
        const entries = await fsPromises.readdir(folderPath, { withFileTypes: true })
        const files = entries
          .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
          .map((entry) => entry.name)
        return { success: true, files }
      } catch (error) {
        return { success: false, error: String(error), files: [] }
      }
    })

    // Read markdown file (and convert if needed)
    if (should('READ_MARKDOWN_FILE'))
      ipcMain.handle(IPC_CHANNELS.READ_MARKDOWN_FILE, async (_e, filePath: string) => {
        try {
        const markdownRoot = this.getMarkdownFolderPath()
        const fullPath = resolve(markdownRoot, filePath)
        try {
          await fsPromises.access(fullPath)
        } catch {
          return { success: false, error: '文件不存在', content: '' }
        }
        const result = await fileStreamManager.readFileStream(fullPath, { encoding: 'utf-8' })
        if (result.success && result.content !== undefined) {
          let content = result.content
          if (this.isMarkdownContent(content)) {
            content = this.convertMarkdownToHtml(content)
          }
          return { success: true, content }
        }
        return { success: false, error: result.error || '读取文件失败', content: '' }
      } catch (error) {
        return { success: false, error: String(error), content: '' }
      }
    })

    // Create folder
    if (should('CREATE_MARKDOWN_FOLDER'))
      ipcMain.handle(IPC_CHANNELS.CREATE_MARKDOWN_FOLDER, async (_e, folderName: string) => {
        try {
        if (!folderName || folderName.trim() === '') {
          return { success: false, error: '文件夹名称不能为空' }
        }
        const markdownRoot = this.getMarkdownFolderPath()
        const pathParts = folderName.split('/')
        const sanitizedParts = pathParts.map((part) => part.replace(/[\\:*?"<>|]/g, '_'))
        const sanitizedFolderName = sanitizedParts.join('/')
        const fullPath = resolve(markdownRoot, sanitizedFolderName)
        if (!fsSync.existsSync(markdownRoot)) {
          await fsPromises.mkdir(markdownRoot, { recursive: true })
        }
        try {
          const stat = await fsPromises.stat(fullPath)
          if (stat.isDirectory()) return { success: false, error: '文件夹已存在' }
          return { success: false, error: '该名称已被文件占用' }
        } catch {
          // not exists
        }
        await fsPromises.mkdir(fullPath, { recursive: true })
        return { success: true, path: fullPath }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    })

    // Delete folder
    if (should('DELETE_MARKDOWN_FOLDER'))
      ipcMain.handle(IPC_CHANNELS.DELETE_MARKDOWN_FOLDER, async (_e, folderName: string) => {
        try {
        const markdownRoot = this.getMarkdownFolderPath()
        const fullPath = resolve(markdownRoot, folderName)
        try {
          await fsPromises.access(fullPath)
        } catch {
          return { success: false, error: '文件夹不存在' }
        }
        await fsPromises.rm(fullPath, { recursive: true, force: true })
        return { success: true }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    })

    // Rename folder
    if (should('RENAME_MARKDOWN_FOLDER'))
      ipcMain.handle(
        IPC_CHANNELS.RENAME_MARKDOWN_FOLDER,
        async (_e, oldFolderName: string, newFolderName: string) => {
          try {
          const markdownRoot = this.getMarkdownFolderPath()
          const oldPath = resolve(markdownRoot, oldFolderName)
          const newPath = resolve(markdownRoot, newFolderName)
          try {
            await fsPromises.access(oldPath)
          } catch {
            return { success: false, error: '源文件夹不存在' }
          }
          try {
            await fsPromises.access(newPath)
            return { success: false, error: '目标文件夹已存在' }
          } catch {
            // ok
          }
          await fsPromises.rename(oldPath, newPath)
          try {
            await renameFolderTags(oldFolderName, newFolderName)
          } catch {
            // ignore
          }
          return { success: true }
        } catch (error) {
          return { success: false, error: String(error) }
        }
      }
    )

    // Create note
    if (should('CREATE_MARKDOWN_NOTE'))
      ipcMain.handle(
        IPC_CHANNELS.CREATE_MARKDOWN_NOTE,
        async (_e, folderName: string, fileName: string, content: string) => {
          try {
          const markdownRoot = this.getMarkdownFolderPath()
          const folderPath = resolve(markdownRoot, folderName)
          await this.ensureMarkdownFolders(folderPath)
          const filePath = resolve(folderPath, fileName)
          try {
            await fsPromises.access(filePath)
            return { success: false, error: '文件已存在' }
          } catch {
            // ok
          }
          await fileStreamManager.writeFileStream(filePath, content || '', { encoding: 'utf-8' })
          return { success: true, path: filePath }
        } catch (error) {
          return { success: false, error: String(error) }
        }
      }
    )

    // Delete note
    if (should('DELETE_MARKDOWN_FILE'))
      ipcMain.handle(IPC_CHANNELS.DELETE_MARKDOWN_FILE, async (_e, filePath: string) => {
        try {
        const markdownRoot = this.getMarkdownFolderPath()
        const fullPath = resolve(markdownRoot, filePath)
        try {
          await fsPromises.access(fullPath)
        } catch {
          return { success: false, error: '文件不存在' }
        }
        await fsPromises.unlink(fullPath)
        try {
          await deleteFileTags(filePath)
        } catch {
          // ignore tag db errors
        }
        return { success: true }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    })

    // Rename note
    if (should('RENAME_MARKDOWN_FILE'))
      ipcMain.handle(
        IPC_CHANNELS.RENAME_MARKDOWN_FILE,
        async (_e, oldFilePath: string, newFilePath: string) => {
          try {
          const markdownRoot = this.getMarkdownFolderPath()
          const oldPath = resolve(markdownRoot, oldFilePath)
          const newPath = resolve(markdownRoot, newFilePath)
          try {
            await fsPromises.access(oldPath)
          } catch {
            return { success: false, error: '源文件不存在' }
          }
          try {
            await fsPromises.access(newPath)
            return { success: false, error: '目标文件已存在' }
          } catch {
            // ok
          }
          const newFolderPath = newPath.substring(0, newPath.lastIndexOf('\\'))
          await this.ensureMarkdownFolders(newFolderPath)
          await fsPromises.rename(oldPath, newPath)
          try {
            await renameFileTags(oldFilePath, newFilePath)
          } catch {
            // ignore tag db errors
          }
          return { success: true }
        } catch (error) {
          return { success: false, error: String(error) }
        }
      }
    )

    // Save markdown (HTML content)
    if (should('SAVE_MARKDOWN'))
      ipcMain.handle(
        IPC_CHANNELS.SAVE_MARKDOWN,
        async (_e, filePath: string, content: string) => {
          try {
          const markdownRoot = this.getMarkdownFolderPath()
          const fullPath = resolve(markdownRoot, filePath)
          const folderPath = fullPath.substring(0, fullPath.lastIndexOf('\\'))
          await this.ensureMarkdownFolders(folderPath)

          const formattedContent = content
            .replace(/(<\/p>|<\/div>|<\/h[1-6]>|<\/blockquote>|<\/pre>|<\/table>|<\/li>|<\/ul>|<\/ol>)/g, '$1\n')
            .replace(/(<p>|<div>|<h[1-6]>|<blockquote>|<pre>|<table>|<li>|<ul>|<ol>)/g, '\n$1')
            .replace(/(<\/tr>)/g, '$1\n')
            .replace(/(<tr>)/g, '\n$1')
            .replace(/\n\s*\n\s*\n/g, '\n\n')
            .trim()

          await fileStreamManager.writeFileStream(fullPath, formattedContent, { encoding: 'utf-8' })
          await addNoteHistory({ filePath, content: formattedContent })
          return { success: true, path: fullPath }
        } catch (error) {
          return { success: false, error: String(error) }
        }
      }
    )

    // Upload asset file for markdown (into .assets)
    if (should('UPLOAD_FILE'))
      ipcMain.handle(
        IPC_CHANNELS.UPLOAD_FILE,
        async (_e, filePath: string, fileData: string, fileName: string) => {
          try {
          const markdownRoot = this.getMarkdownFolderPath()
          const fullPath = resolve(markdownRoot, filePath)
          const folderPath = path.dirname(fullPath)
          const assetsFolderPath = join(folderPath, '.assets')
          await this.ensureMarkdownFolders(assetsFolderPath)

          const targetPath = join(assetsFolderPath, fileName)

          // 如果是 base64 数据，去掉前缀并写入
          const base64Match = fileData.match(/^data:(.*);base64,(.*)$/)
          if (base64Match) {
            const buffer = Buffer.from(base64Match[2], 'base64')
            await fsPromises.writeFile(targetPath, buffer)
          } else {
            await fsPromises.writeFile(targetPath, fileData)
          }

          // 返回相对路径，供渲染层构造引用
          const relativeAssetPath = `.assets/${fileName}`
          return { success: true, path: targetPath, url: relativeAssetPath }
        } catch (error) {
          return { success: false, error: String(error) }
        }
      }
    )

    // Dialog helpers
    if (should('DIALOG_SHOW_SAVE'))
      ipcMain.handle(
        IPC_CHANNELS.DIALOG_SHOW_SAVE,
        async (_e, options: Electron.SaveDialogOptions) => {
          const result = await dialog.showSaveDialog(this.mainWindow ?? undefined, options)
          return result.canceled ? undefined : result.filePath
        }
      )

    if (should('DIALOG_SHOW_OPEN'))
      ipcMain.handle(
        IPC_CHANNELS.DIALOG_SHOW_OPEN,
        async (_e, options: Electron.OpenDialogOptions) => {
          const result = await dialog.showOpenDialog(this.mainWindow ?? undefined, options)
          if (result.canceled || result.filePaths.length === 0) return undefined
          return result.filePaths[0]
        }
      )

    // Batch operations
    if (should('BATCH_READ_FILES'))
      ipcMain.handle(IPC_CHANNELS.BATCH_READ_FILES, async (_e, filePaths: string[]) => {
        try {
        const markdownRoot = this.getMarkdownFolderPath()
        const fullPaths = filePaths.map((p) => resolve(markdownRoot, p))
        const results = await fileStreamManager.batchReadFiles(fullPaths, {
          maxConcurrency: 5,
          encoding: 'utf-8'
        })
        return {
          success: true,
          results: results.map((r, i) => ({
            filePath: filePaths[i],
            success: r.success,
            content: r.content,
            error: r.error
          }))
        }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    })

    if (should('BATCH_WRITE_FILES'))
      ipcMain.handle(
        IPC_CHANNELS.BATCH_WRITE_FILES,
        async (
          _e,
          operations: Array<{ filePath: string; content: string }>
        ): Promise<{
          success: boolean
          results?: Array<{ filePath: string; success: boolean; error?: string }>
          error?: string
        }> => {
          try {
          const markdownRoot = this.getMarkdownFolderPath()
          const writeOps = operations.map((op) => ({
            filePath: resolve(markdownRoot, op.filePath),
            content: op.content
          }))
          const results = await fileStreamManager.batchWriteFiles(writeOps, {
            maxConcurrency: 5,
            encoding: 'utf-8'
          })
          const historyPromises = operations
            .filter((_, index) => results[index].success)
            .map((op) => addNoteHistory({ filePath: op.filePath, content: op.content }))
          await Promise.allSettled(historyPromises)
          return {
            success: true,
            results: results.map((r, i) => ({
              filePath: operations[i].filePath,
              success: r.success,
              error: r.error
            }))
          }
        } catch (error) {
          return { success: false, error: String(error) }
        }
      }
    )
  }
}

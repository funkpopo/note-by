import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { promises as fsPromises } from 'fs'
import { join } from 'path'
import showdown from 'showdown'
import { mdToPdf } from 'md-to-pdf'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'
import { IPC_CHANNELS } from '../../shared/ipcChannels'
import { convertToNotionFormat, convertToObsidianFormat, extractMetadata } from '../exporters'
import { fileStreamManager } from '../utils/FileStreamManager'

export class ExportService {
  private mainWindow: BrowserWindow | null

  constructor(mainWindow: BrowserWindow | null) {
    this.mainWindow = mainWindow
  }

  private async markdownToDocx(markdownContent: string): Promise<Buffer> {
    const converter = new showdown.Converter({ tables: true, tasklists: true, strikethrough: true })
    const html = converter.makeHtml(markdownContent)
    const plainText = html.replace(/<[^>]*>/g, '')
    const lines = plainText.split('\n').filter((line) => line.trim() !== '')
    const paragraphs = lines.map(
      (line) =>
        new Paragraph({
          children: [
            new TextRun({
              text: line.trim()
            })
          ]
        })
    )
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({ heading: HeadingLevel.HEADING_1 }),
            ...paragraphs
          ]
        }
      ]
    })
    return Packer.toBuffer(doc)
  }

  public registerIpcHandlers(): void {
    // Export PDF
    ipcMain.handle(IPC_CHANNELS.EXPORT_PDF, async (_e, filePath: string, content: string) => {
      try {
        const fileName = filePath.split('/').pop()?.replace('.md', '') || 'exported'
        const { canceled, filePath: savePath } = await dialog.showSaveDialog(this.mainWindow ?? undefined, {
          title: '导出PDF',
          defaultPath: join(app.getPath('documents'), `${fileName}.pdf`),
          filters: [{ name: 'PDF文件', extensions: ['pdf'] }]
        })
        if (canceled || !savePath) return { success: false, error: '用户取消了操作' }
        await mdToPdf({ content }, { dest: savePath })
        shell.openPath(savePath)
        return { success: true, path: savePath }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    })

    // Export DOCX
    ipcMain.handle(IPC_CHANNELS.EXPORT_DOCX, async (_e, filePath: string, content: string) => {
      try {
        const fileName = filePath.split('/').pop()?.replace('.md', '') || 'exported'
        const { canceled, filePath: savePath } = await dialog.showSaveDialog(this.mainWindow ?? undefined, {
          title: '导出DOCX',
          defaultPath: join(app.getPath('documents'), `${fileName}.docx`),
          filters: [{ name: 'DOCX文件', extensions: ['docx'] }]
        })
        if (canceled || !savePath) return { success: false, error: '用户取消了操作' }
        const buffer = await this.markdownToDocx(content)
        await fsPromises.writeFile(savePath, buffer)
        shell.openPath(savePath)
        return { success: true, path: savePath }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    })

    // Export HTML
    ipcMain.handle(IPC_CHANNELS.EXPORT_HTML, async (_e, filePath: string, content: string) => {
      try {
        const fileName = filePath.split('/').pop()?.replace('.md', '') || 'exported'
        const { canceled, filePath: savePath } = await dialog.showSaveDialog(this.mainWindow ?? undefined, {
          title: '导出HTML',
          defaultPath: join(app.getPath('documents'), `${fileName}.html`),
          filters: [{ name: 'HTML文件', extensions: ['html'] }]
        })
        if (canceled || !savePath) return { success: false, error: '用户取消了操作' }
        const converter = new showdown.Converter({ tables: true, tasklists: true, strikethrough: true, emoji: true })
        const htmlContent = converter.makeHtml(content)
        const htmlDocument = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${fileName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; color: #333; max-width: 900px; margin: 0 auto; padding: 20px; }
    a { color: #0366d6; text-decoration: none; } a:hover { text-decoration: underline; }
    h1, h2, h3, h4, h5, h6 { margin-top: 24px; margin-bottom: 16px; font-weight: 600; line-height: 1.25; }
    h1 { font-size: 2em; border-bottom: 1px solid #eaecef; padding-bottom: .3em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: .3em; }
    code { font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace; background-color: rgba(27, 31, 35, .05); border-radius: 3px; font-size: 85%; margin: 0; padding: .2em .4em; }
    pre { background-color: #f6f8fa; border-radius: 3px; font-size: 85%; line-height: 1.45; overflow: auto; padding: 16px; }
    pre code { background-color: transparent; border: 0; display: inline; line-height: inherit; margin: 0; max-width: auto; overflow: visible; padding: 0; word-wrap: normal; }
    blockquote { border-left: 4px solid #dfe2e5; color: #6a737d; margin: 0; padding: 0 1em; }
    table { border-collapse: collapse; width: 100%; }
    table th, table td { border: 1px solid #dfe2e5; padding: 6px 13px; }
    table tr { background-color: #fff; border-top: 1px solid #c6cbd1; }
    table tr:nth-child(2n) { background-color: #f6f8fa; }
    img { max-width: 100%; height: auto; }
    input[type="checkbox"] { margin-right: 0.5em; }
    hr { border: 0; border-bottom: 1px solid #eee; height: 0; margin: 15px 0; overflow: hidden; }
    @media (prefers-color-scheme: dark) {
      body { background-color: #0d1117; color: #c9d1d9; }
      a { color: #58a6ff; }
      code { background-color: rgba(240, 246, 252, 0.15); }
      pre { background-color: #161b22; }
      blockquote { color: #8b949e; border-left-color: #30363d; }
      table tr { background-color: #0d1117; border-top-color: #30363d; }
      table tr:nth-child(2n) { background-color: #161b22; }
      table th, table td { border-color: #30363d; }
      hr { border-bottom-color: #21262d; }
    }
  </style>
</head>
<body>
${htmlContent}
</body>
</html>`
        await fsPromises.writeFile(savePath, htmlDocument, 'utf-8')
        shell.openPath(savePath)
        return { success: true, path: savePath }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    })

    // Export Notion Markdown
    ipcMain.handle(IPC_CHANNELS.EXPORT_NOTION, async (_e, filePath: string, content: string) => {
      try {
        const fileName = filePath.split('/').pop()?.replace('.md', '') || 'exported'
        const metadata = extractMetadata(content, filePath)
        const { canceled, filePath: savePath } = await dialog.showSaveDialog(this.mainWindow ?? undefined, {
          title: '导出为Notion格式',
          defaultPath: join(app.getPath('documents'), `${fileName}-notion.md`),
          filters: [{ name: 'Markdown文件', extensions: ['md'] }]
        })
        if (canceled || !savePath) return { success: false, error: '用户取消了操作' }
        const notionContent = convertToNotionFormat(content)
        await fileStreamManager.writeFileStream(savePath, notionContent, { encoding: 'utf-8' })
        shell.showItemInFolder(savePath)
        return {
          success: true,
          path: savePath,
          metadata: { title: metadata.title, wordCount: metadata.wordCount, format: 'Notion Markdown' }
        }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    })

    // Export Obsidian Markdown
    ipcMain.handle(IPC_CHANNELS.EXPORT_OBSIDIAN, async (_e, filePath: string, content: string) => {
      try {
        const fileName = filePath.split('/').pop()?.replace('.md', '') || 'exported'
        const metadata = extractMetadata(content, filePath)
        const { canceled, filePath: savePath } = await dialog.showSaveDialog(this.mainWindow ?? undefined, {
          title: '导出为Obsidian格式',
          defaultPath: join(app.getPath('documents'), `${fileName}-obsidian.md`),
          filters: [{ name: 'Markdown文件', extensions: ['md'] }]
        })
        if (canceled || !savePath) return { success: false, error: '用户取消了操作' }
        const obsidianContent = convertToObsidianFormat(content)
        await fileStreamManager.writeFileStream(savePath, obsidianContent, { encoding: 'utf-8' })
        shell.showItemInFolder(savePath)
        return {
          success: true,
          path: savePath,
          metadata: { title: metadata.title, wordCount: metadata.wordCount, format: 'Obsidian Markdown' }
        }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    })
  }
}


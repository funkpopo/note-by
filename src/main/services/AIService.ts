import { BrowserWindow, ipcMain } from 'electron'
import { EventEmitter } from 'events'
import { IPC_CHANNELS } from '../../shared/ipcChannels'
import {
  testOpenAIConnection,
  generateContent,
  generateWithMessages,
  streamGenerateContent
} from '../openai'
import { readSettings, writeSettings, AiApiConfig } from '../settings'

export class AIService {
  private mainWindow: BrowserWindow | null
  private activeStreams: Map<
    string,
    { emitter: EventEmitter & { stop?: () => void }; cleanup: () => void }
  >

  constructor(mainWindow: BrowserWindow | null) {
    this.mainWindow = mainWindow
    this.activeStreams = new Map()
  }

  /**
   * 清理所有活跃的流式请求
   */
  private cleanupAllActiveStreams(): void {
    for (const [streamId, streamInfo] of this.activeStreams) {
      try {
        // 停止流式请求
        if (streamInfo.emitter && typeof streamInfo.emitter.stop === 'function') {
          streamInfo.emitter.stop()
        }
        // 执行清理函数
        streamInfo.cleanup()
      } catch (error) {
        console.error(`清理流式请求 ${streamId} 失败:`, error)
      }
    }
    this.activeStreams.clear()
  }

  public registerIpcHandlers(): void {
    // 页面卸载时自动清理所有活跃的流式请求
    if (this.mainWindow) {
      this.mainWindow.on('close', () => {
        this.cleanupAllActiveStreams()
      })
    }

    // Connection test
    ipcMain.handle(IPC_CHANNELS.TEST_OPENAI_CONNECTION, async (_e, cfg) => {
      return testOpenAIConnection(cfg)
    })

    // Generate
    ipcMain.handle(IPC_CHANNELS.GENERATE_CONTENT, async (_e, request) => {
      return generateContent(request)
    })

    // Generate with messages
    ipcMain.handle(IPC_CHANNELS.GENERATE_WITH_MESSAGES, async (_e, request) => {
      return generateWithMessages(request)
    })

    // Stream generate
    ipcMain.handle(IPC_CHANNELS.STREAM_GENERATE_CONTENT, async (event, request) => {
      try {
        const emitter = await streamGenerateContent(request)
        const sender = event.sender
        const streamId = Date.now().toString()
        const listeners = {
          data: null as ((chunk: string) => void) | null,
          done: null as ((full: string) => void) | null,
          error: null as ((err: string) => void) | null
        }
        const cleanupListeners = (): void => {
          if (listeners.data)
            try {
              emitter.removeListener('data', listeners.data)
            } catch {}
          if (listeners.done)
            try {
              emitter.removeListener('done', listeners.done)
            } catch {}
          if (listeners.error)
            try {
              emitter.removeListener('error', listeners.error)
            } catch {}
          this.activeStreams.delete(streamId)
        }
        const timeoutMs = 60000
        const timeoutId = setTimeout(() => {
          if (!sender.isDestroyed()) {
            sender.send(`stream-error-${streamId}`, {
              error: `生成超时 (${timeoutMs / 1000}秒). 请检查网络连接或API服务状态。`
            })
          }
          cleanupListeners()
        }, timeoutMs)

        listeners.data = (chunk) => {
          if (sender.isDestroyed()) {
            cleanupListeners()
            clearTimeout(timeoutId)
            return
          }
          sender.send(`stream-data-${streamId}`, { chunk })
        }
        emitter.on('data', listeners.data)

        listeners.done = (fullContent) => {
          clearTimeout(timeoutId)
          if (sender.isDestroyed()) {
            cleanupListeners()
            return
          }
          sender.send(`stream-done-${streamId}`, { content: fullContent })
          cleanupListeners()
        }
        emitter.on('done', listeners.done)

        listeners.error = (error) => {
          clearTimeout(timeoutId)
          if (sender.isDestroyed()) {
            cleanupListeners()
            return
          }
          sender.send(`stream-error-${streamId}`, { error })
          cleanupListeners()
        }
        emitter.on('error', listeners.error)

        this.activeStreams.set(streamId, { emitter, cleanup: cleanupListeners })
        return { success: true, streamId }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : '启动流式生成失败'
        }
      }
    })

    // Stop stream
    ipcMain.handle(IPC_CHANNELS.STOP_STREAM_GENERATE, async (_e, streamId: string) => {
      try {
        const streamInfo = this.activeStreams.get(streamId)
        if (streamInfo) {
          if (streamInfo.emitter && typeof streamInfo.emitter.stop === 'function') {
            streamInfo.emitter.stop()
          }
          streamInfo.cleanup()
          return { success: true }
        }
        return { success: false, error: '流式请求不存在或已完成' }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : '停止流式生成失败'
        }
      }
    })

    // Save API config
    ipcMain.handle(IPC_CHANNELS.SAVE_API_CONFIG, (_e, cfg: AiApiConfig) => {
      try {
        const settings = readSettings()
        const configs = (settings.AiApiConfigs as AiApiConfig[]) || []
        const index = configs.findIndex((c) => c.id === cfg.id)
        if (index >= 0) configs[index] = cfg
        else configs.push(cfg)
        settings.AiApiConfigs = configs
        writeSettings(settings)
        return { success: true }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    })

    // Delete API config
    ipcMain.handle(IPC_CHANNELS.DELETE_API_CONFIG, (_e, configId: string) => {
      try {
        const settings = readSettings()
        const configs = (settings.AiApiConfigs as AiApiConfig[]) || []
        settings.AiApiConfigs = configs.filter((c) => c.id !== configId)
        writeSettings(settings)
        return { success: true }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    })
  }
}

// Augment API with Mindmap support
import type { Result } from '../shared/types/result'

type R<T = Record<string, unknown>> = Result<T>

interface MindmapAPI {
  save: (content: string) => Promise<R<{ path?: string }>>
  load: () => Promise<R<{ data?: string; cancelled?: boolean }>>
  exportHtml: (imageDataUrl: string) => Promise<R<{ path?: string }>>
  showSaveDialog: (options: Electron.SaveDialogOptions) => Promise<string | undefined>
  showOpenDialog: (options: Electron.OpenDialogOptions) => Promise<string | undefined>
}

interface API {
  mindmap: MindmapAPI
}

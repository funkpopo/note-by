// Augment API with Mindmap support
interface MindmapAPI {
  save: (content: string) => Promise<{ success: boolean; path?: string; error?: string }>
  load: () => Promise<{
    success: boolean
    data?: string
    cancelled?: boolean
    error?: string
  }>
  exportHtml: (imageDataUrl: string) => Promise<{ success: boolean; path?: string; error?: string }>
  showSaveDialog: (options: Electron.SaveDialogOptions) => Promise<string | undefined>
  showOpenDialog: (options: Electron.OpenDialogOptions) => Promise<string | undefined>
}

interface API {
  mindmap: MindmapAPI
}


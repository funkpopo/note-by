interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  testIPC: () => Promise<{ success: boolean; message: string }>;
  onMenuNewNote: (callback: () => void) => () => void;
  onLoadNotes: (callback: () => void) => () => void;
  
  // 文件系统操作
  saveMarkdown: (id: string, title: string, content: string) => Promise<{ 
    success: boolean; 
    filePath?: string; 
    error?: string; 
    details?: { 
      id: string;
      path: string;
      errorName: string;
      errorStack?: string;
    }
  }>;
  loadAllMarkdown: () => Promise<{ 
    success: boolean; 
    notes?: Array<{ id: string; title: string; content: string; date: string }>; 
    error?: string;
    details?: {
      path: string;
      errorName: string;
      errorStack?: string;
    }
  }>;
  deleteMarkdown: (id: string) => Promise<{ 
    success: boolean; 
    error?: string; 
    details?: {
      id: string;
      path: string;
      errorName: string;
      errorStack?: string;
    }
  }>;
  getMarkdownDir: () => Promise<{ success: boolean; path?: string; error?: string }>;
  openMarkdownDir: () => Promise<{ success: boolean; error?: string }>;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
} 
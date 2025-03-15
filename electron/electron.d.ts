interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  testIPC: () => Promise<{ success: boolean; message: string }>;
  onMenuNewNote: (callback: () => void) => () => void;
  onLoadNotes: (callback: () => void) => () => void;
  onFileSystemChange: (callback: (event: { 
    type: string; 
    path: string; 
    fullPath: string 
  }) => void) => () => void;
  
  // 文件系统操作
  saveMarkdown: (id: string, title: string, content: string, folder?: string) => Promise<{ 
    success: boolean; 
    filePath?: string; 
    relativePath?: string;
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
    notes?: Array<{ 
      id: string; 
      title: string; 
      content: string; 
      date: string;
      folder?: string;
      path?: string;
    }>; 
    folders?: string[];
    error?: string;
    details?: {
      path: string;
      errorName: string;
      errorStack?: string;
    }
  }>;
  deleteMarkdown: (id: string, filePath?: string) => Promise<{ 
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
  createFolder: (folderPath: string) => Promise<{ 
    success: boolean; 
    path?: string; 
    error?: string;
    details?: {
      path: string;
      errorName: string;
      errorStack?: string;
    }
  }>;
  moveItem: (sourcePath: string, targetFolder: string, isFolder: boolean) => Promise<{
    success: boolean;
    sourcePath?: string;
    targetPath?: string;
    isFolder?: boolean;
    error?: string;
    details?: {
      path: string;
      errorName: string;
      errorStack?: string;
    }
  }>;
  deleteFolder: (folderPath: string) => Promise<{
    success: boolean;
    path?: string;
    error?: string;
    details?: {
      path: string;
      errorName: string;
      errorStack?: string;
    }
  }>;
  // 添加其他需要的方法类型
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
} 
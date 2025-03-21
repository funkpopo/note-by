interface Electron {
  getNotes: () => Promise<{
    notes: Note[];
    emptyGroups: string[];
  }>;
  getNoteContent: (notePath: string) => Promise<string>;
  saveNote: (notePath: string, content: string) => Promise<boolean>;
  createNote: (name: string, content?: string, group?: string) => Promise<{
    success: boolean;
    path?: string;
    group?: string;
    error?: string;
  }>;
  deleteNote: (notePath: string) => Promise<boolean>;
  createGroup: (groupName: string) => Promise<{
    success: boolean;
    path?: string;
    error?: string;
  }>;
  deleteGroup: (groupName: string) => Promise<{
    success: boolean;
    error?: string;
  }>;
  moveNote: (notePath: string, targetGroup: string) => Promise<{
    success: boolean;
    newPath?: string;
    error?: string;
  }>;
  moveGroup: (sourceGroup: string, targetGroup: string) => Promise<{
    success: boolean;
    newGroupPath?: string;
    error?: string;
  }>;
  renameNote: (oldPath: string, newName: string) => Promise<{
    success: boolean;
    newPath?: string;
    error?: string;
  }>;
  onNotesChanged: (callback: () => void) => (() => void);
  
  // AI config related functions
  getAIConfigs: () => Promise<AIConfig[]>;
  saveAIConfig: (config: AIConfig) => Promise<{
    success: boolean;
    error?: string;
  }>;
  updateAIConfig: (id: string, config: Partial<AIConfig>) => Promise<{
    success: boolean;
    error?: string;
  }>;
  deleteAIConfig: (id: string) => Promise<{
    success: boolean;
    error?: string;
  }>;
  testAIConfig: (config: AIConfig) => Promise<{
    success: boolean;
    message: string;
    models?: string[];
  }>;
  
  // AI Assistant function
  callAIAssistant: (params: {
    config: AIConfig;
    messages: Array<{
      role: string;
      content: string;
    }>;
  }) => Promise<{
    success: boolean;
    content?: string;
    error?: string;
  }>;
  
  // Streaming AI Assistant function
  streamAIAssistant: (params: {
    config: AIConfig;
    messages: Array<{
      role: string;
      content: string;
    }>;
    onChunk: (chunk: string) => void;
    onComplete: () => void;
    onError: (error: string) => void;
  }) => (() => void);
  
  // Appearance settings functions
  getAppearanceSettings: () => Promise<AppearanceSettings>;
  saveAppearanceSettings: (settings: AppearanceSettings) => Promise<{
    success: boolean;
    error?: string;
  }>;
  
  // Theme change notification
  onThemeChanged: (callback: (theme: string) => void) => (() => void);
  
  // Appearance settings change notification
  onAppearanceSettingsChanged: (callback: (settings: AppearanceSettings) => void) => (() => void);

  // WebDAV sync functions
  getSyncConfig: () => Promise<WebDAVConfig>;
  saveSyncConfig: (config: WebDAVConfig) => Promise<{
    success: boolean;
    error?: string;
  }>;
  testWebDAVConnection: (config: WebDAVConnectionConfig) => Promise<{
    success: boolean;
    error?: string;
  }>;
  syncNotes: () => Promise<{
    success: boolean;
    error?: string;
  }>;
  onSyncStatusChanged: (callback: (status: SyncStatus) => void) => (() => void);
}

interface Note {
  name: string;
  path: string;
  lastModified: Date;
  group: string;
}

// AI configuration interface
interface AIConfig {
  id: string;
  name: string;
  apiKey: string;
  apiUrl: string;
  organizationId?: string;
  isDefault?: boolean;
  lastTested?: Date;
}

// Appearance settings interface
interface AppearanceSettings {
  fontFamily: string;
  fontSize: string;
  sidebarWidth: number;
  theme?: string;
  // Add other appearance settings as needed
}

// WebDAV configuration interface
interface WebDAVConfig {
  enabled: boolean;
  serverUrl: string;
  username?: string;
  password?: string;
  syncInterval: number;
  autoSync: boolean;
  lastSync?: Date;
}

// WebDAV connection test config
interface WebDAVConnectionConfig {
  serverUrl: string;
  username?: string;
  password?: string;
}

// Sync status interface
interface SyncStatus {
  syncing: boolean;
  lastSync?: Date;
  lastError?: string;
  message?: string;
}

declare global {
  interface Window {
    electron: Electron;
    cherry: {
      // 获取选中的文本
      getSelectedText: () => string;

      // 替换选中的文本
      replaceSelectedText: (text: string) => void;
    };
  }
}

export {}; 
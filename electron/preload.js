const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的API到渲染进程
contextBridge.exposeInMainWorld('electron', {
  // 获取所有笔记
  getNotes: async () => {
    try {
      const response = await ipcRenderer.invoke('get-notes');
      return {
        notes: response.notes || [],
        emptyGroups: response.emptyGroups || []
      };
    } catch (error) {
      console.error('Error getting notes:', error);
      return {
        notes: [],
        emptyGroups: []
      };
    }
  },
  
  // 获取笔记内容
  getNoteContent: (notePath) => ipcRenderer.invoke('get-note-content', notePath),
  
  // 保存笔记
  saveNote: (notePath, content) => ipcRenderer.invoke('save-note', { notePath, content }),
  
  // 创建新笔记
  createNote: (name, content, group) => ipcRenderer.invoke('create-note', { name, content, group }),
  
  // 删除笔记
  deleteNote: (notePath) => ipcRenderer.invoke('delete-note', notePath),
  
  // 创建新分组
  createGroup: (groupName) => ipcRenderer.invoke('create-group', { groupName }),
  
  // 删除分组
  deleteGroup: (groupName) => ipcRenderer.invoke('delete-group', groupName),
  
  // 移动笔记到其他分组
  moveNote: (notePath, targetGroup) => ipcRenderer.invoke('move-note', { notePath, targetGroup }),
  
  // 移动分组到其他分组
  moveGroup: (sourceGroup, targetGroup) => ipcRenderer.invoke('move-group', { sourceGroup, targetGroup }),
  
  // 重命名笔记
  renameNote: (oldPath, newName) => ipcRenderer.invoke('rename-note', { oldPath, newName }),
  
  // 监听文件系统变化
  onNotesChanged: (callback) => {
    const newCallback = () => callback();
    ipcRenderer.on('notes-changed', newCallback);
    return () => {
      ipcRenderer.removeListener('notes-changed', newCallback);
    };
  },
  
  // 获取所有AI配置
  getAIConfigs: () => ipcRenderer.invoke('get-ai-configs'),
  
  // 保存新的AI配置
  saveAIConfig: (config) => ipcRenderer.invoke('save-ai-config', config),
  
  // 更新现有AI配置
  updateAIConfig: (id, config) => ipcRenderer.invoke('update-ai-config', { id, config }),
  
  // 删除AI配置
  deleteAIConfig: (id) => ipcRenderer.invoke('delete-ai-config', id),
  
  // 测试AI配置
  testAIConfig: (config) => ipcRenderer.invoke('test-ai-config', config),
  
  // 调用AI助手
  callAIAssistant: (params) => ipcRenderer.invoke('call-ai-assistant', params),
  
  // 流式调用AI助手
  streamAIAssistant: ({ config, messages, onChunk, onComplete, onError }) => {
    // Setup event listeners for streaming
    const chunkListener = (_, chunk) => onChunk(chunk);
    const completeListener = () => onComplete();
    const errorListener = (_, error) => onError(error);
    
    ipcRenderer.on('ai-stream-chunk', chunkListener);
    ipcRenderer.on('ai-stream-complete', completeListener);
    ipcRenderer.on('ai-stream-error', errorListener);
    
    // Send the request to the main process
    ipcRenderer.send('stream-ai-assistant', { config, messages });
    
    // Return a function to cancel the stream
    return () => {
      // Clean up event listeners
      ipcRenderer.removeListener('ai-stream-chunk', chunkListener);
      ipcRenderer.removeListener('ai-stream-complete', completeListener);
      ipcRenderer.removeListener('ai-stream-error', errorListener);
      
      // Send cancel signal to main process
      ipcRenderer.send('cancel-ai-stream');
    };
  },
  
  // 获取外观设置
  getAppearanceSettings: () => ipcRenderer.invoke('get-appearance-settings'),
  
  // 保存外观设置
  saveAppearanceSettings: (settings) => ipcRenderer.invoke('save-appearance-settings', settings),
  
  // 监听主题变更通知
  onThemeChanged: (callback) => {
    const themeChangedHandler = (_, theme) => callback(theme);
    ipcRenderer.on('theme-changed', themeChangedHandler);
    
    // 返回清理函数
    return () => {
      ipcRenderer.removeListener('theme-changed', themeChangedHandler);
    };
  },
  
  // 监听外观设置变更通知
  onAppearanceSettingsChanged: (callback) => {
    const settingsChangedHandler = (_, settings) => callback(settings);
    ipcRenderer.on('appearance-settings-changed', settingsChangedHandler);
    
    // 返回清理函数
    return () => {
      ipcRenderer.removeListener('appearance-settings-changed', settingsChangedHandler);
    };
  },

  // WebDAV同步相关功能
  // 获取同步配置
  getSyncConfig: () => ipcRenderer.invoke('get-sync-config'),
  
  // 保存同步配置
  saveSyncConfig: (config) => ipcRenderer.invoke('save-sync-config', config),
  
  // 测试WebDAV连接
  testWebDAVConnection: (config) => ipcRenderer.invoke('test-webdav-connection', config),
  
  // 手动触发同步
  syncNotes: () => ipcRenderer.invoke('sync-notes'),
  
  // 监听同步状态变化
  onSyncStatusChanged: (callback) => {
    const statusChangedHandler = (_, status) => callback(status);
    ipcRenderer.on('sync-status-changed', statusChangedHandler);
    
    // 返回清理函数
    return () => {
      ipcRenderer.removeListener('sync-status-changed', statusChangedHandler);
    };
  },
}); 
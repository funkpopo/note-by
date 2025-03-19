const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的API到渲染进程
contextBridge.exposeInMainWorld('electron', {
  // 获取所有笔记
  getNotes: async () => {
    const response = await ipcRenderer.invoke('get-notes');
    return {
      notes: response.notes || [],
      emptyGroups: response.emptyGroups || []
    };
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
  testAIConfig: (config) => ipcRenderer.invoke('test-ai-config', config)
}); 
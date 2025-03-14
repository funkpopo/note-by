import { contextBridge, ipcRenderer } from 'electron';

// 定义要暴露的API
const electronAPI = {
  // 获取应用版本
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // 测试IPC
  testIPC: () => ipcRenderer.invoke('test-ipc'),
  
  // 监听菜单事件
  onMenuNewNote: (callback: () => void) => {
    ipcRenderer.on('menu-new-note', () => callback());
    return () => {
      ipcRenderer.removeAllListeners('menu-new-note');
    };
  },

  // 添加load-notes事件监听
  onLoadNotes: (callback: () => void) => {
    ipcRenderer.on('load-notes', () => callback());
    return () => {
      ipcRenderer.removeAllListeners('load-notes');
    };
  },

  // 文件系统操作
  saveMarkdown: (id: string, title: string, content: string) => 
    ipcRenderer.invoke('save-markdown', id, title, content),
  
  loadAllMarkdown: () => 
    ipcRenderer.invoke('load-all-markdown'),
  
  deleteMarkdown: (id: string) => 
    ipcRenderer.invoke('delete-markdown', id),
    
  // 添加获取和打开markdown文件夹的方法
  getMarkdownDir: () => 
    ipcRenderer.invoke('get-markdown-dir'),
    
  openMarkdownDir: () => 
    ipcRenderer.invoke('open-markdown-dir'),
};

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electron', electronAPI);

// 添加调试信息
console.log('Preload script executed');
console.log('Exposed API:', Object.keys(electronAPI));

// 可以添加其他需要在预加载阶段执行的代码 
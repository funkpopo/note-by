import { contextBridge, ipcRenderer } from 'electron';

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electron', {
  // 获取应用版本
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // 监听菜单事件
  onMenuNewNote: (callback: () => void) => {
    ipcRenderer.on('menu-new-note', () => callback());
    return () => {
      ipcRenderer.removeAllListeners('menu-new-note');
    };
  },
});

// 可以添加其他需要在预加载阶段执行的代码 
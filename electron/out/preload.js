"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// 定义要暴露的API
const electronAPI = {
    // 获取应用版本
    getAppVersion: () => electron_1.ipcRenderer.invoke('get-app-version'),
    // 测试IPC
    testIPC: () => electron_1.ipcRenderer.invoke('test-ipc'),
    // 监听菜单事件
    onMenuNewNote: (callback) => {
        electron_1.ipcRenderer.on('menu-new-note', () => callback());
        return () => {
            electron_1.ipcRenderer.removeAllListeners('menu-new-note');
        };
    },
    // 添加load-notes事件监听
    onLoadNotes: (callback) => {
        electron_1.ipcRenderer.on('load-notes', () => callback());
        return () => {
            electron_1.ipcRenderer.removeAllListeners('load-notes');
        };
    },
    // 文件系统操作
    saveMarkdown: (id, title, content, folder = '') => electron_1.ipcRenderer.invoke('save-markdown', id, title, content, folder),
    loadAllMarkdown: () => electron_1.ipcRenderer.invoke('load-all-markdown'),
    deleteMarkdown: (id, filePath = '') => electron_1.ipcRenderer.invoke('delete-markdown', id, filePath),
    // 添加获取和打开markdown文件夹的方法
    getMarkdownDir: () => electron_1.ipcRenderer.invoke('get-markdown-dir'),
    openMarkdownDir: () => electron_1.ipcRenderer.invoke('open-markdown-dir'),
    // 创建文件夹
    createFolder: (folderPath) => electron_1.ipcRenderer.invoke('create-folder', folderPath),
    // 移动文件或文件夹
    moveItem: (sourcePath, targetFolder, isFolder) => electron_1.ipcRenderer.invoke('move-item', sourcePath, targetFolder, isFolder),
};
// 暴露安全的API给渲染进程
electron_1.contextBridge.exposeInMainWorld('electron', electronAPI);
// 添加调试信息
console.log('Preload script executed');
console.log('Exposed API:', Object.keys(electronAPI));
// 可以添加其他需要在预加载阶段执行的代码 

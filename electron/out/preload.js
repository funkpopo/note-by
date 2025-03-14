"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// 暴露安全的API给渲染进程
electron_1.contextBridge.exposeInMainWorld('electron', {
    // 获取应用版本
    getAppVersion: () => electron_1.ipcRenderer.invoke('get-app-version'),
    // 监听菜单事件
    onMenuNewNote: (callback) => {
        electron_1.ipcRenderer.on('menu-new-note', () => callback());
        return () => {
            electron_1.ipcRenderer.removeAllListeners('menu-new-note');
        };
    },
});
// 可以添加其他需要在预加载阶段执行的代码 

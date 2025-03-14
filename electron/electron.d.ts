interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  onMenuNewNote: (callback: () => void) => () => void;
  // 添加其他需要的方法类型
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
} 
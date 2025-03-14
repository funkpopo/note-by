interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  onMenuNewNote: (callback: () => void) => () => void;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
} 
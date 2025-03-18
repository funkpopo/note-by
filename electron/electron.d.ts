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
  onNotesChanged: (callback: () => void) => (() => void);
}

interface Note {
  name: string;
  path: string;
  lastModified: Date;
  group: string;
}

declare global {
  interface Window {
    electron: Electron;
  }
}

export {}; 
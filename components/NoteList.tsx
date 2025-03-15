'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import DraggableNoteCard from './DraggableNoteCard';
import NoteEditor from './NoteEditor';
import NoteViewer from './NoteViewer';
import Sidebar from './Sidebar';
import RecentNotesView from './RecentNotesView';
import FolderTree from './FolderTree';
import { Button } from '@/components/ui/button';
import { Plus, Menu, Clock, Grid, List, FileText, Edit3, Trash } from 'lucide-react';

// 定义Electron API类型
interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  onMenuNewNote: (callback: () => void) => () => void;
  onLoadNotes: (callback: () => void) => () => void;
  saveMarkdown: (id: string, title: string, content: string, folder?: string) => Promise<{ 
    success: boolean; 
    filePath?: string; 
    relativePath?: string;
    error?: string; 
    details?: { 
      id: string;
      path: string;
      errorName: string;
      errorStack?: string;
    }
  }>;
  loadAllMarkdown: () => Promise<{ 
    success: boolean; 
    notes?: Array<{ id: string; title: string; content: string; date: string; folder?: string; path?: string }>; 
    folders?: string[];
    error?: string;
    details?: {
      path: string;
      errorName: string;
      errorStack?: string;
    }
  }>;
  deleteMarkdown: (id: string, path?: string) => Promise<{ 
    success: boolean; 
    error?: string; 
    details?: {
      id: string;
      path: string;
      errorName: string;
      errorStack?: string;
    }
  }>;
  testIPC: () => Promise<{ success: boolean; error?: string }>;
  getMarkdownDir: () => Promise<{ success: boolean; path?: string; error?: string }>;
  openMarkdownDir: () => Promise<{ success: boolean; error?: string }>;
  createFolder: (folderPath: string) => Promise<{ 
    success: boolean; 
    path?: string; 
    error?: string;
    details?: {
      path: string;
      errorName: string;
      errorStack?: string;
    }
  }>;
  moveItem: (sourcePath: string, targetFolder: string, isFolder: boolean) => Promise<{ 
    success: boolean; 
    error?: string; 
    details?: {
      id: string;
      path: string;
      errorName: string;
      errorStack?: string;
    }
  }>;
  onFileSystemChange: (callback: (event: { type: string; path: string; fullPath: string }) => void) => () => void;
  deleteFolder: (folderPath: string) => Promise<{ 
    success: boolean; 
    error?: string; 
    details?: {
      id: string;
      path: string;
      errorName: string;
      errorStack?: string;
    }
  }>;
}

// 定义笔记类型
interface Note {
  id: string;
  title: string;
  content: string;
  date: string;
  folder?: string; // 文件夹路径
  path?: string;   // 相对路径
}

// 定义视图状态类型
type ViewState = 'list' | 'view' | 'edit' | 'create';

// 定义侧边栏视图类型
type SidebarView = 'all' | 'recent' | 'favorites' | 'tags';

// 在组件外部定义防抖变量
let fileSystemChangeDebounceTimeout: NodeJS.Timeout | null = null;

export default function NoteList() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [viewState, setViewState] = useState<ViewState>('list');
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentSidebarView, setCurrentSidebarView] = useState<SidebarView>('all');
  const [displayMode, setDisplayMode] = useState<'grid' | 'list'>('grid');
  const [folders, setFolders] = useState<string[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string>('');
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newSubfolderParent, setNewSubfolderParent] = useState('');
  const [isElectron, setIsElectron] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 加载笔记列表
  const loadNotes = useCallback(async () => {
    // 检查是否在Electron环境中运行
    if (typeof window !== 'undefined' && 'electron' in window) {
      try {
        setIsLoading(true);
        console.log('Attempting to load notes...');
        
        // 使用更安全的方式访问electron对象
        const electronObj = (window as Window & typeof globalThis & { electron: ElectronAPI }).electron;
        console.log('Electron object:', electronObj);
        
        // 检查loadAllMarkdown方法是否存在
        if (typeof electronObj.loadAllMarkdown !== 'function') {
          console.error('loadAllMarkdown is not a function!');
          return;
        }
        
        console.log('Calling loadAllMarkdown...');
        const result = await electronObj.loadAllMarkdown();
        console.log('loadAllMarkdown result:', result);
        
        if (result.success && result.notes) {
          setNotes(result.notes);
          
          // 使用服务器返回的文件夹列表
          if (result.folders && Array.isArray(result.folders)) {
            setFolders(result.folders.sort());
          } else {
            // 如果服务器没有返回文件夹列表，则从笔记中提取
            const uniqueFolders = Array.from(
              new Set(
                result.notes
                  .filter(note => note.folder)
                  .map(note => note.folder as string)
              )
            ).sort();
            
            setFolders(uniqueFolders);
          }
        } else {
          console.error('加载笔记失败:', result.error);
        }
      } catch (error) {
        console.error('加载笔记时出错:', error);
      } finally {
        setIsLoading(false);
      }
    }
  }, []);

  // 使用useCallback记忆handleAddNote函数
  const handleAddNote = useCallback(() => {
    const newNote = {
      id: Date.now().toString(),
      title: '新笔记',
      content: '# 新笔记\n\n开始编写您的笔记...',
      date: new Date().toISOString().split('T')[0],
    };
    
    setCurrentNote(newNote);
    setViewState('create');
  }, []);

  // 处理侧边栏导航
  const handleSidebarNavigate = useCallback((view: SidebarView) => {
    setCurrentSidebarView(view);
    if (viewState !== 'list') {
      setViewState('list');
    }
  }, [viewState]);

  // 获取最近编辑的笔记
  const recentNotes = useMemo(() => {
    // 复制笔记数组并按日期排序（最新的在前）
    return [...notes]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5); // 只取前5个
  }, [notes]);

  // 根据当前侧边栏视图获取要显示的笔记
  const displayedNotes = useMemo(() => {
    if (currentSidebarView === 'recent') {
      return recentNotes;
    }
    // 其他视图类型的处理可以在这里添加
    return notes;
  }, [notes, recentNotes, currentSidebarView]);

  // 初始化
  useEffect(() => {
    // 检查是否在Electron环境中运行
    const isRunningInElectron = typeof window !== 'undefined' && 'electron' in window;
    setIsElectron(isRunningInElectron);
    
    // 加载笔记
    loadNotes();
    
    // 监听菜单"新建笔记"事件
    let removeMenuListener: (() => void) | null = null;
    let removeLoadListener: (() => void) | null = null;
    let removeFileSystemChangeListener: (() => void) | null = null;
    
    if (isRunningInElectron) {
      const electron = (window as Window & typeof globalThis & { electron: ElectronAPI }).electron;
      
      // 监听菜单"新建笔记"事件
      removeMenuListener = electron.onMenuNewNote(() => {
        handleAddNote();
      });
      
      // 监听加载笔记事件
      removeLoadListener = electron.onLoadNotes(() => {
        loadNotes();
      });
      
      // 监听文件系统变化事件
      removeFileSystemChangeListener = electron.onFileSystemChange((event: { type: string; path: string; fullPath: string }) => {
        console.log('文件系统变化:', event);
        
        // 当文件系统发生变化时，重新加载笔记列表
        // 为了避免频繁刷新，可以使用防抖
        if (fileSystemChangeDebounceTimeout) {
          clearTimeout(fileSystemChangeDebounceTimeout);
        }
        
        fileSystemChangeDebounceTimeout = setTimeout(() => {
          loadNotes();
        }, 300);
      });
    }
    
    // 清理函数
    return () => {
      if (removeMenuListener) removeMenuListener();
      if (removeLoadListener) removeLoadListener();
      if (removeFileSystemChangeListener) removeFileSystemChangeListener();
      
      if (fileSystemChangeDebounceTimeout) {
        clearTimeout(fileSystemChangeDebounceTimeout);
      }
    };
  }, [handleAddNote, loadNotes]);

  const handleView = (id: string) => {
    const note = notes.find(note => note.id === id);
    if (note) {
      setCurrentNote(note);
      setViewState('view');
    }
  };

  const handleEdit = (id: string) => {
    const note = notes.find(note => note.id === id);
    if (note) {
      setCurrentNote(note);
      setViewState('edit');
    }
  };

  const handleDelete = async (id: string) => {
    if (isElectron) {
      try {
        const electron = (window as Window & typeof globalThis & { electron: ElectronAPI }).electron;
        
        // 找到要删除的笔记
        const noteToDelete = notes.find(note => note.id === id);
        if (!noteToDelete) {
          console.error('找不到要删除的笔记');
          return;
        }
        
        // 使用笔记的路径进行删除
        const result = await electron.deleteMarkdown(id, noteToDelete.path);
        
        if (result.success) {
          // 更新笔记列表，移除已删除的笔记
          setNotes(prevNotes => prevNotes.filter(note => note.id !== id));
          
          // 检查是否需要更新文件夹列表
          // 获取所有笔记的文件夹（排除刚刚删除的笔记）
          const remainingNotes = notes.filter(note => note.id !== id);
          const noteFolders = remainingNotes
            .filter(note => note.folder)
            .map(note => note.folder as string);
          
          // 获取唯一的文件夹列表
          const uniqueFolders = Array.from(new Set(noteFolders)).sort();
          
          // 更新文件夹列表
          setFolders(uniqueFolders);
          
          // 如果当前没有笔记，重新加载以确保状态同步
          if (remainingNotes.length === 0) {
            await loadNotes();
          }
        } else {
          console.error('删除笔记失败:', result.error);
        }
      } catch (error) {
        console.error('删除笔记时出错:', error);
      }
    } else {
      // 非Electron环境，仅更新状态
      setNotes(notes.filter(note => note.id !== id));
    }
  };

  const handleSave = async (id: string, title: string, content: string) => {
    if (isElectron) {
      try {
        const electron = (window as Window & typeof globalThis & { electron: ElectronAPI }).electron;
        
        // 使用当前文件夹保存笔记
        const result = await electron.saveMarkdown(id, title, content, currentFolder);
        
        if (result.success) {
          if (viewState === 'create') {
            // 添加新笔记
            if (currentNote) {
              const newNote = {
                ...currentNote,
                title,
                content,
                date: new Date().toISOString(),
                folder: currentFolder,
                path: result.relativePath
              };
              setNotes(prev => [newNote, ...prev]);
              
              // 如果是新文件夹，更新文件夹列表
              if (currentFolder && !folders.includes(currentFolder)) {
                setFolders(prev => [...prev, currentFolder].sort());
              }
            }
          } else {
            // 更新现有笔记
            setNotes(notes.map(note => 
              note.id === id ? { ...note, title, content, date: new Date().toISOString().split('T')[0] } : note
            ));
          }
          setViewState('list');
        } else {
          console.error('保存笔记失败:', result.error);
        }
      } catch (error) {
        console.error('保存笔记时出错:', error);
      }
    } else {
      // 非Electron环境，仅更新状态
      if (viewState === 'create') {
        // 添加新笔记
        if (currentNote) {
          const newNote = {
            ...currentNote,
            title,
            content,
            date: new Date().toISOString().split('T')[0], // 更新日期为当前日期
          };
          setNotes(prev => [newNote, ...prev]);
        }
      } else {
        // 更新现有笔记
        setNotes(notes.map(note => 
          note.id === id ? { ...note, title, content, date: new Date().toISOString().split('T')[0] } : note
        ));
      }
      setViewState('list');
    }
  };

  const handleCancel = () => {
    setViewState('list');
  };

  // 处理文件夹选择
  const handleFolderSelect = (folder: string) => {
    setCurrentFolder(folder);
  };

  // 处理创建新文件夹
  const handleCreateFolder = async (folderPath: string) => {
    if (!folderPath.trim() || !isElectron) return false;

    try {
      const electron = (window as Window & typeof globalThis & { electron: ElectronAPI }).electron;
      const result = await electron.createFolder(folderPath.trim());
      
      if (result.success) {
        // 添加到文件夹列表
        if (!folders.includes(folderPath.trim())) {
          setFolders(prev => [...prev, folderPath.trim()].sort());
        }
        
        // 选择新创建的文件夹
        setCurrentFolder(folderPath.trim());
        
        // 重置状态
        setNewFolderName('');
        setShowFolderDialog(false);
        
        return true;
      } else {
        console.error('创建文件夹失败:', result.error);
        return false;
      }
    } catch (error) {
      console.error('创建文件夹时出错:', error);
      return false;
    }
  };

  // 处理移动文件或文件夹
  const handleMoveItem = async (sourcePath: string, targetFolder: string, isFolder: boolean) => {
    if (!isElectron) return false;

    try {
      const electron = (window as Window & typeof globalThis & { electron: ElectronAPI }).electron;
      const result = await electron.moveItem(sourcePath, targetFolder, isFolder);
      
      if (result.success) {
        // 重新加载笔记列表
        await loadNotes();
        return true;
      } else {
        console.error('移动项目失败:', result.error);
        return false;
      }
    } catch (error) {
      console.error('移动项目时出错:', error);
      return false;
    }
  };

  // 处理拖拽开始
  const handleDragStart = () => {
    // 只需要传递给FolderTree组件，不需要在NoteList中保存状态
  };

  // 处理拖拽结束
  const handleDragEnd = () => {
    // 只需要传递给FolderTree组件，不需要在NoteList中保存状态
  };

  // 根据当前视图状态渲染不同的组件
  if (viewState === 'view' && currentNote) {
    return (
      <>
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
          onNavigate={handleSidebarNavigate}
          currentView={currentSidebarView}
        />
        <NoteViewer
          id={currentNote.id}
          title={currentNote.title}
          content={currentNote.content}
          date={currentNote.date}
          folder={currentNote.folder}
          onBack={handleCancel}
          onEdit={handleEdit}
          onMenuClick={() => setSidebarOpen(true)}
        />
      </>
    );
  }

  if ((viewState === 'edit' || viewState === 'create') && currentNote) {
    return (
      <>
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
          onNavigate={handleSidebarNavigate}
          currentView={currentSidebarView}
        />
        <NoteEditor
          id={currentNote.id}
          initialTitle={currentNote.title}
          initialContent={currentNote.content}
          onSave={handleSave}
          onCancel={handleCancel}
          onMenuClick={() => setSidebarOpen(true)}
          folders={folders}
          currentFolder={currentFolder}
          onFolderChange={setCurrentFolder}
          onCreateFolder={handleCreateFolder}
        />
      </>
    );
  }

  // 在渲染部分添加文件夹选择UI
  // 在列表视图中添加文件夹选择器
  const renderFolderSelector = () => {
    return (
      <FolderTree 
        folders={folders}
        notes={notes}
        currentFolder={currentFolder}
        onFolderSelect={handleFolderSelect}
        onCreateFolder={handleCreateFolder}
        onMoveItem={handleMoveItem}
        onNoteSelect={handleView}
        onEditNote={handleEdit}
        onDeleteNote={handleDelete}
        onDeleteFolder={async (path) => {
          if (path) {
            try {
              // 确认是否要删除文件夹
              const notesInFolder = notes.filter(note => 
                note.folder === path || note.folder?.startsWith(`${path}/`)
              ).length;
              
              // 如果文件夹中有笔记，需要删除所有笔记
              if (notesInFolder > 0) {
                const notesToDelete = notes.filter(note => 
                  note.folder === path || note.folder?.startsWith(`${path}/`)
                );
                
                // 删除文件夹中的所有笔记
                for (const note of notesToDelete) {
                  if (note.path) {
                    await (window as Window & typeof globalThis & { electron: ElectronAPI }).electron.deleteMarkdown(note.id, note.path);
                  }
                }
                
                // 更新笔记列表，移除已删除的笔记
                setNotes(prevNotes => prevNotes.filter(note => 
                  !(note.folder === path || note.folder?.startsWith(`${path}/`))
                ));
              }
              
              // 使用新的deleteFolder API删除文件夹
              const electron = (window as Window & typeof globalThis & { electron: ElectronAPI }).electron;
              const result = await electron.deleteFolder(path);
              
              if (result.success) {
                // 更新文件夹列表，移除已删除的文件夹及其子文件夹
                setFolders(prevFolders => prevFolders.filter(folder => 
                  !(folder === path || folder.startsWith(`${path}/`))
                ));
                
                // 如果当前选中的是被删除的文件夹，则切换到根文件夹
                if (currentFolder === path || currentFolder.startsWith(`${path}/`)) {
                  setCurrentFolder('');
                }
                
                // 重新加载笔记列表以确保状态同步
                await loadNotes();
                return true;
              } else {
                console.error('删除文件夹失败:', result.error);
                return false;
              }
            } catch (error) {
              console.error('删除文件夹时出错:', error);
              return false;
            }
          }
          return false;
        }}
      />
    );
  };

  // 在渲染部分添加加载状态显示
  if (isLoading && notes.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载笔记中...</p>
        </div>
      </div>
    );
  }

  // 默认显示笔记列表
  return (
    <>
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        onNavigate={handleSidebarNavigate}
        currentView={currentSidebarView}
      />
      <div className="w-full h-full flex flex-col">
        <header className="border-b p-4 flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="mr-3" 
            onClick={() => setSidebarOpen(true)}
            aria-label="打开菜单"
          >
            <Menu size={20} />
          </Button>
          <h1 className="text-2xl font-bold flex-1 text-center">Note-By</h1>
        </header>
        
        <div className="flex-1 overflow-auto p-4 scrollbar-thin scrollbar-thumb-rounded-md scrollbar-track-transparent scrollbar-thumb-muted hover:scrollbar-thumb-primary/50 transition-colors">
          <div className="w-full max-w-5xl mx-auto h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold flex items-center">
                {currentSidebarView === 'recent' ? (
                  <>
                    <Clock size={24} className="mr-2" />
                    最近编辑
                  </>
                ) : (
                  '我的笔记'
                )}
              </h2>
              <div className="flex items-center gap-2">
                {currentSidebarView !== 'recent' && (
                  <div className="flex border rounded-md overflow-hidden mr-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`rounded-none px-3 ${displayMode === 'grid' ? 'bg-muted' : ''}`}
                      onClick={() => setDisplayMode('grid')}
                      aria-label="网格视图"
                    >
                      <Grid size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`rounded-none px-3 ${displayMode === 'list' ? 'bg-muted' : ''}`}
                      onClick={() => setDisplayMode('list')}
                      aria-label="列表视图"
                    >
                      <List size={16} />
                    </Button>
                  </div>
                )}
                <Button onClick={handleAddNote} className="gap-2">
                  <Plus size={16} />
                  添加笔记
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[calc(100%-4rem)] flex-1">
              {/* 左侧文件夹树 */}
              <div className="md:col-span-1 overflow-hidden">
                {renderFolderSelector()}
              </div>
              
              {/* 右侧笔记列表 */}
              <div className="md:col-span-3 overflow-auto scrollbar-thin scrollbar-thumb-rounded-md scrollbar-track-transparent scrollbar-thumb-muted hover:scrollbar-thumb-primary/50 transition-colors">
                {currentSidebarView === 'recent' ? (
                  // 使用新的 RecentNotesView 组件显示最近编辑的笔记
                  <RecentNotesView 
                    notes={notes.filter(note => currentFolder === '' || note.folder === currentFolder)}
                    onViewNote={handleView}
                    onEditNote={handleEdit}
                  />
                ) : (
                  // 原有的笔记列表显示
                  displayedNotes.filter(note => currentFolder === '' || note.folder === currentFolder).length === 0 ? (
                    <div className="text-center py-12 bg-card rounded-lg border p-6">
                      <FileText size={48} className="mx-auto text-muted-foreground opacity-20 mb-4" />
                      <p className="text-muted-foreground">
                        没有笔记，点击&quot;添加笔记&quot;创建一个新笔记。
                      </p>
                    </div>
                  ) : displayMode === 'grid' ? (
                    // 网格视图
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                      {displayedNotes
                        .filter(note => currentFolder === '' || note.folder === currentFolder)
                        .map(note => (
                          <DraggableNoteCard
                            key={note.id}
                            id={note.id}
                            title={note.title}
                            content={note.content}
                            date={note.date}
                            folder={note.folder}
                            path={note.path}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onClick={() => handleView(note.id)}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                          />
                        ))}
                    </div>
                  ) : (
                    // 列表视图
                    <div className="space-y-3">
                      {displayedNotes
                        .filter(note => currentFolder === '' || note.folder === currentFolder)
                        .map(note => (
                          <div 
                            key={note.id}
                            className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors cursor-pointer"
                            onClick={() => handleView(note.id)}
                            draggable={!!note.path}
                            onDragStart={(e) => {
                              if (!note.path) return;
                              e.dataTransfer.setData('text/plain', note.path);
                              e.dataTransfer.effectAllowed = 'move';
                              handleDragStart();
                            }}
                            onDragEnd={handleDragEnd}
                          >
                            <div className="w-12 h-12 flex-shrink-0 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                              <FileText size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium line-clamp-1">{note.title}</h4>
                              <div className="flex items-center text-sm text-muted-foreground">
                                <span className="line-clamp-1 mr-2">
                                  {note.content.replace(/^#+ .*$/gm, '').replace(/[*_~`#>-]/g, '').replace(/\s+/g, ' ').trim().substring(0, 60)}
                                </span>
                                {note.folder && (
                                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full whitespace-nowrap">
                                    {note.folder.split('/').pop()}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex-shrink-0 flex items-center gap-3">
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {new Date(note.date).toLocaleString()}
                              </span>
                              <div className="flex">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEdit(note.id);
                                  }}
                                >
                                  <Edit3 size={16} />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-destructive hover:text-destructive/90"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(note.id);
                                  }}
                                >
                                  <Trash size={16} />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* 文件夹创建对话框 */}
      {showFolderDialog && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card border rounded-lg shadow-lg p-4 w-80">
            <h3 className="text-lg font-medium mb-4">新建文件夹</h3>
            
            {/* 添加父文件夹选择 */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">位置</label>
              <select 
                className="w-full px-3 py-2 border rounded"
                value={newSubfolderParent}
                onChange={(e) => setNewSubfolderParent(e.target.value)}
              >
                <option value="">根目录</option>
                {folders.map(folder => (
                  <option key={folder} value={folder}>
                    {folder}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">文件夹名称</label>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="输入文件夹名称"
                className="w-full px-3 py-2 border rounded"
                autoFocus
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShowFolderDialog(false);
                setNewFolderName('');
                setNewSubfolderParent('');
              }}>
                取消
              </Button>
              <Button onClick={() => {
                const folderPath = newSubfolderParent 
                  ? `${newSubfolderParent}/${newFolderName.trim()}`
                  : newFolderName.trim();
                handleCreateFolder(folderPath);
              }}>
                创建
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 
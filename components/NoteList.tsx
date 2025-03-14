'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import NoteCard from './NoteCard';
import NoteEditor from './NoteEditor';
import NoteViewer from './NoteViewer';
import Sidebar from './Sidebar';
import RecentNotesView from './RecentNotesView';
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

export default function NoteList() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [viewState, setViewState] = useState<ViewState>('list');
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isElectron, setIsElectron] = useState(false);
  const [currentSidebarView, setCurrentSidebarView] = useState<SidebarView>('all');
  const [displayMode, setDisplayMode] = useState<'grid' | 'list'>('grid');
  const [folders, setFolders] = useState<string[]>([]); // 存储所有文件夹
  const [currentFolder, setCurrentFolder] = useState<string>(''); // 当前选中的文件夹
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newSubfolderParent, setNewSubfolderParent] = useState('');

  // 加载所有笔记
  const loadNotes = useCallback(async () => {
    // 检查是否在Electron环境中运行
    if (typeof window !== 'undefined' && 'electron' in window) {
      try {
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
          
          // 提取并设置文件夹列表
          const uniqueFolders = Array.from(
            new Set(
              result.notes
                .filter(note => note.folder)
                .map(note => note.folder as string)
            )
          ).sort();
          
          setFolders(uniqueFolders);
        } else {
          console.error('加载笔记失败:', result.error);
        }
      } catch (error) {
        console.error('加载笔记时出错:', error);
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

  useEffect(() => {
    // 检查是否在Electron环境中运行
    const isRunningInElectron = typeof window !== 'undefined' && 'electron' in window;
    setIsElectron(isRunningInElectron);

    // 添加调试信息
    if (isRunningInElectron) {
      try {
        const electron = (window as Window & typeof globalThis & { electron: ElectronAPI }).electron;
        console.log('Electron API available:', electron);
        console.log('Available methods:', Object.keys(electron));
        
        // 测试IPC通信
        if (electron && typeof electron.testIPC === 'function') {
          console.log('Testing IPC communication...');
          electron.testIPC()
            .then(result => {
              console.log('IPC test result:', result);
              
              // 如果IPC测试成功，尝试加载笔记
              if (result.success) {
                loadNotes();
              }
            })
            .catch(error => {
              console.error('IPC test failed:', error);
            });
        } else {
          console.error('testIPC method does not exist');
        }
        
        // 检查是否有loadAllMarkdown方法
        if (electron && typeof electron.loadAllMarkdown === 'function') {
          console.log('loadAllMarkdown method exists');
        } else {
          console.error('loadAllMarkdown method does not exist');
          // 尝试重新加载页面
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }
        
        // 监听load-notes事件
        if (electron && typeof electron.onLoadNotes === 'function') {
          console.log('Setting up load-notes event listener');
          const unsubscribeLoadNotes = electron.onLoadNotes(() => {
            console.log('Received load-notes event from main process');
            loadNotes();
          });
          
          // 清理函数中添加移除监听器
          return () => {
            if (typeof unsubscribeLoadNotes === 'function') {
              unsubscribeLoadNotes();
            }
          };
        }
      } catch (error) {
        console.error('Error accessing Electron API:', error);
      }
    } else {
      console.log('Not running in Electron environment');
    }

    // 不在这里直接调用loadNotes，而是在IPC测试成功后调用
    
    // 如果在Electron环境中，监听菜单事件
    if (isRunningInElectron) {
      // 使用类型断言，避免使用any
      const electron = (window as Window & typeof globalThis & { electron: ElectronAPI }).electron;
      const unsubscribe = electron.onMenuNewNote(() => {
        handleAddNote();
      });

      // 清理函数
      return () => {
        unsubscribe();
      };
    }
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
          setNotes(notes.filter(note => note.id !== id));
          
          // 如果删除的是当前文件夹中的最后一个笔记，可能需要更新文件夹列表
          const remainingNotes = notes.filter(note => note.id !== id);
          const uniqueFolders = Array.from(
            new Set(
              remainingNotes
                .filter(note => note.folder)
                .map(note => note.folder as string)
            )
          ).sort();
          
          setFolders(uniqueFolders);
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
    // 构建文件夹树结构
    const buildFolderTree = () => {
      const tree: Record<string, string[]> = { '': [] };
      
      folders.forEach(folder => {
        const parts = folder.split('/');
        let currentPath = '';
        
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          const parentPath = currentPath;
          currentPath = currentPath ? `${currentPath}/${part}` : part;
          
          if (!tree[parentPath]) {
            tree[parentPath] = [];
          }
          
          if (!tree[currentPath]) {
            tree[currentPath] = [];
          }
          
          if (!tree[parentPath].includes(currentPath)) {
            tree[parentPath].push(currentPath);
          }
        }
      });
      
      return tree;
    };
    
    // 递归渲染文件夹树
    const renderFolderTree = (parentPath: string = '', level: number = 0) => {
      const tree = buildFolderTree();
      const children = tree[parentPath] || [];
      
      return (
        <div className={level > 0 ? "ml-3 border-l pl-2" : ""}>
          {children.map(folder => {
            const folderName = folder.split('/').pop() || folder;
            return (
              <div key={folder}>
                <button
                  onClick={() => handleFolderSelect(folder)}
                  className={`w-full text-left px-2 py-1 rounded text-sm flex items-center ${
                    currentFolder === folder ? 'bg-primary/10 font-medium' : 'hover:bg-accent/50'
                  }`}
                >
                  <span className="truncate">{folderName}</span>
                  <span className="text-xs text-muted-foreground ml-1">
                    ({notes.filter(note => note.folder === folder).length})
                  </span>
                </button>
                {renderFolderTree(folder, level + 1)}
              </div>
            );
          })}
        </div>
      );
    };
    
    return (
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium">文件夹</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowFolderDialog(true)}
            className="h-7 text-xs"
          >
            新建文件夹
          </Button>
        </div>
        
        <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
          <button
            onClick={() => handleFolderSelect('')}
            className={`w-full text-left px-2 py-1 rounded text-sm flex items-center ${
              currentFolder === '' ? 'bg-primary/10 font-medium' : 'hover:bg-accent/50'
            }`}
          >
            <span>所有笔记</span>
            <span className="text-xs text-muted-foreground ml-1">
              ({notes.length})
            </span>
          </button>
          
          {renderFolderTree()}
        </div>
        
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
      </div>
    );
  };

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
        
        <div className="flex-1 overflow-auto p-4">
          <div className="w-full max-w-4xl mx-auto">
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
            
            {/* 添加文件夹选择器 */}
            {renderFolderSelector()}
            
            {currentSidebarView === 'recent' ? (
              // 使用新的 RecentNotesView 组件显示最近编辑的笔记
              <RecentNotesView 
                notes={notes.filter(note => currentFolder === '' || note.folder === currentFolder)}
                onViewNote={handleView}
                onEditNote={handleEdit}
              />
            ) : (
              // 原有的笔记列表显示
              displayedNotes.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    没有笔记，点击&quot;添加笔记&quot;创建一个新笔记。
                  </p>
                </div>
              ) : displayMode === 'grid' ? (
                // 网格视图
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {displayedNotes.map(note => (
                    <NoteCard
                      key={note.id}
                      id={note.id}
                      title={note.title}
                      content={note.content}
                      date={note.date}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onClick={() => handleView(note.id)}
                    />
                  ))}
                </div>
              ) : (
                // 列表视图
                <div className="space-y-3">
                  {displayedNotes.map(note => (
                    <div 
                      key={note.id}
                      className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors cursor-pointer"
                      onClick={() => handleView(note.id)}
                    >
                      <div className="w-12 h-12 flex-shrink-0 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                        <FileText size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium line-clamp-1">{note.title}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {note.content.replace(/^#+ .*$/gm, '').replace(/[*_~`#>-]/g, '').replace(/\s+/g, ' ').trim().substring(0, 100)}
                        </p>
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">
                          {note.date}
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
    </>
  );
} 
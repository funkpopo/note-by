'use client';

import { useState, useRef, useEffect } from 'react';
import { Folder, ChevronRight, ChevronDown, FolderPlus, FileText, Edit, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FolderTreeProps {
  folders: string[];
  notes: Array<{ id: string; title: string; content: string; date: string; folder?: string; path?: string }>;
  currentFolder: string;
  onFolderSelect: (folder: string) => void;
  onCreateFolder: (folderPath: string) => Promise<boolean>;
  onMoveItem?: (sourcePath: string, targetFolder: string, isFolder: boolean) => Promise<boolean>;
  onNoteSelect?: (id: string) => void;
  onEditNote?: (id: string) => void;
  onDeleteNote?: (id: string) => void;
  onDeleteFolder?: (path: string) => Promise<boolean>;
}

// 右键菜单项接口
interface ContextMenuItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}

export default function FolderTree({
  folders,
  notes,
  currentFolder,
  onFolderSelect,
  onCreateFolder,
  onMoveItem,
  onNoteSelect,
  onEditNote,
  onDeleteNote,
  onDeleteFolder
}: FolderTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [showNewFolderInput, setShowNewFolderInput] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [draggedItem, setDraggedItem] = useState<{ path: string; isFolder: boolean } | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [folderTree, setFolderTree] = useState<Record<string, string[]>>(() => {
    // 初始化文件夹树
    const tree: Record<string, string[]> = { '': [] };
    
    folders.forEach(folder => {
      // 确保正确分割路径，使用 \ 和 / 都能正确处理
      const parts = folder.split(/[/\\]/).filter(Boolean); // 同时处理 / 和 \ 分隔符
      let currentPath = '';
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const parentPath = currentPath;
        // 使用统一的分隔符 / 来构建路径
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        
        if (!tree[parentPath]) tree[parentPath] = [];
        if (!tree[currentPath]) tree[currentPath] = [];
        
        if (!tree[parentPath].includes(currentPath)) {
          tree[parentPath].push(currentPath);
        }
      }
    });
    
    Object.keys(tree).forEach(key => {
      tree[key].sort((a, b) => {
        const aName = a.split(/[/\\]/).pop() || '';
        const bName = b.split(/[/\\]/).pop() || '';
        return aName.localeCompare(bName);
      });
    });
    
    return tree;
  });
  const newFolderInputRef = useRef<HTMLInputElement>(null);
  
  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    items: ContextMenuItem[];
    visible: boolean;
  }>({
    x: 0,
    y: 0,
    items: [],
    visible: false,
  });

  // 当文件夹列表或笔记列表变化时，重新构建文件夹树
  useEffect(() => {
    setFolderTree(buildFolderTree());
  }, [folders, notes]);

  // 确保输入框在显示时获得焦点
  useEffect(() => {
    if (showNewFolderInput !== null && newFolderInputRef.current) {
      // 短暂延迟以确保DOM已更新
      const timer = setTimeout(() => {
        if (newFolderInputRef.current) {
          newFolderInputRef.current.focus();
          // 选中所有文本（如果有的话）
          newFolderInputRef.current.select();
        }
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [showNewFolderInput]);

  // 点击外部关闭右键菜单和输入框
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // 检查点击是否在菜单外部
      if (contextMenu.visible) {
        const menuElement = document.getElementById('context-menu');
        if (menuElement && !menuElement.contains(e.target as Node)) {
          setContextMenu(prev => ({ ...prev, visible: false }));
        }
      }
      
      // 检查点击是否在输入框外部
      if (showNewFolderInput !== null) {
        const inputElement = newFolderInputRef.current;
        // 如果点击的不是输入框或其父元素
        if (inputElement && !inputElement.contains(e.target as Node) && 
            !(e.target as HTMLElement).closest('.folder-input-container')) {
          setShowNewFolderInput(null);
        }
      }
    };

    // 使用mousedown而不是click，以便更早捕获点击事件
    document.addEventListener('mousedown', handleClickOutside);
    
    // 添加右键菜单事件监听器，防止默认浏览器右键菜单
    const handleContextMenu = (e: MouseEvent) => {
      if (contextMenu.visible) {
        e.preventDefault();
      }
    };
    document.addEventListener('contextmenu', handleContextMenu);
    
    // 当窗口滚动或调整大小时关闭上下文菜单
    const handleWindowEvents = () => {
      if (contextMenu.visible) {
        setContextMenu(prev => ({ ...prev, visible: false }));
      }
    };
    
    window.addEventListener('scroll', handleWindowEvents);
    window.addEventListener('resize', handleWindowEvents);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('scroll', handleWindowEvents);
      window.removeEventListener('resize', handleWindowEvents);
    };
  }, [contextMenu.visible, showNewFolderInput]);

  // 构建文件夹树结构
  const buildFolderTree = () => {
    const tree: Record<string, string[]> = { '': [] };
    
    // 确保所有路径部分都被正确处理
    folders.forEach(folder => {
      // 确保正确分割路径，使用 \ 和 / 都能正确处理
      const parts = folder.split(/[/\\]/).filter(Boolean); // 同时处理 / 和 \ 分隔符
      let currentPath = '';
      
      // 处理每一级路径
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const parentPath = currentPath;
        // 使用统一的分隔符 / 来构建路径
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        
        // 确保父路径存在
        if (!tree[parentPath]) {
          tree[parentPath] = [];
        }
        
        // 确保当前路径存在
        if (!tree[currentPath]) {
          tree[currentPath] = [];
        }
        
        // 将当前路径添加到父路径的子项中
        if (!tree[parentPath].includes(currentPath)) {
          tree[parentPath].push(currentPath);
        }
      }
    });
    
    // 对每个文件夹的子文件夹进行排序
    Object.keys(tree).forEach(key => {
      tree[key].sort((a, b) => {
        const aName = a.split(/[/\\]/).pop() || '';
        const bName = b.split(/[/\\]/).pop() || '';
        return aName.localeCompare(bName);
      });
    });
    
    return tree;
  };

  // 切换文件夹展开/折叠状态
  const toggleFolder = (folder: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolders(prev => ({
      ...prev,
      [folder]: !prev[folder]
    }));
  };

  // 处理创建新文件夹
  const handleCreateFolder = async (parentFolder: string) => {
    // 如果没有输入名称，则取消创建
    if (!newFolderName.trim()) {
      setShowNewFolderInput(null);
      return;
    }
    
    const folderPath = parentFolder 
      ? `${parentFolder}/${newFolderName.trim()}`
      : newFolderName.trim();
    
    const success = await onCreateFolder(folderPath);
    
    if (success) {
      setNewFolderName('');
      setShowNewFolderInput(null);
      
      // 展开父文件夹
      if (parentFolder) {
        setExpandedFolders(prev => ({
          ...prev,
          [parentFolder]: true
        }));
      }
      
      // 更新文件夹树
      setFolderTree(buildFolderTree());
    }
  };

  // 处理拖拽开始
  const handleDragStart = (e: React.DragEvent, path: string, isFolder: boolean) => {
    setDraggedItem({ path, isFolder });
    e.dataTransfer.setData('text/plain', path);
    e.dataTransfer.effectAllowed = 'move';
  };

  // 处理拖拽结束
  const handleDragEnd = () => {
    setDraggedItem(null);
    setDropTarget(null);
  };

  // 处理拖拽进入
  const handleDragOver = (e: React.DragEvent, folder: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 不允许拖拽到自己或自己的子文件夹
    if (draggedItem && draggedItem.isFolder) {
      // 标准化路径，确保使用正斜杠
      const normalizedDraggedPath = draggedItem.path.replace(/\\/g, '/');
      const normalizedFolder = folder.replace(/\\/g, '/');
      
      if (normalizedFolder === normalizedDraggedPath || normalizedFolder.startsWith(`${normalizedDraggedPath}/`)) {
        return;
      }
    }
    
    // 如果是拖拽笔记，并且目标文件夹与笔记当前所在文件夹相同，则不显示拖放目标
    if (draggedItem && !draggedItem.isFolder) {
      const note = notes.find(n => n.path === draggedItem.path);
      if (note && note.folder === folder) {
        return;
      }
    }
    
    setDropTarget(folder);
    e.dataTransfer.dropEffect = 'move';
  };

  // 处理拖拽离开
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTarget(null);
  };

  // 处理放置
  const handleDrop = async (e: React.DragEvent, targetFolder: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedItem) return;
    
    // 不允许拖拽到自己或自己的子文件夹
    if (draggedItem.isFolder) {
      // 标准化路径，确保使用正斜杠
      const normalizedDraggedPath = draggedItem.path.replace(/\\/g, '/');
      const normalizedTargetFolder = targetFolder.replace(/\\/g, '/');
      
      if (normalizedTargetFolder === normalizedDraggedPath || normalizedTargetFolder.startsWith(`${normalizedDraggedPath}/`)) {
        setDropTarget(null);
        return;
      }
    }
    
    // 如果是拖拽笔记，并且目标文件夹与笔记当前所在文件夹相同，则不执行移动
    if (!draggedItem.isFolder) {
      const note = notes.find(n => n.path === draggedItem.path);
      if (note && note.folder === targetFolder) {
        setDropTarget(null);
        return;
      }
    }
    
    // 如果有移动项目的回调函数，调用它
    if (onMoveItem) {
      const success = await onMoveItem(draggedItem.path, targetFolder, draggedItem.isFolder);
      if (success) {
        // 展开目标文件夹
        setExpandedFolders(prev => ({
          ...prev,
          [targetFolder]: true
        }));
        
        // 更新文件夹树
        setFolderTree(buildFolderTree());
      }
    }
    
    setDropTarget(null);
    setDraggedItem(null);
  };

  // 处理文件夹右键菜单
  const handleFolderContextMenu = (e: React.MouseEvent, folder: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const menuItems: ContextMenuItem[] = [
      {
        label: '新建子文件夹',
        icon: <FolderPlus size={14} />,
        onClick: () => {
          // 先关闭右键菜单
          setContextMenu(prev => ({ ...prev, visible: false }));
          
          // 设置状态并在下一帧聚焦
          setTimeout(() => {
            setShowNewFolderInput(folder);
            setNewFolderName('');
            
            requestAnimationFrame(() => {
              if (newFolderInputRef.current) {
                newFolderInputRef.current.focus();
              }
            });
          }, 50);
        }
      }
    ];
    
    // 只有非根文件夹才能删除
    if (folder !== '' && onDeleteFolder) {
      menuItems.push({
        label: '删除文件夹',
        icon: <Trash size={14} />,
        onClick: async () => {
          // 关闭右键菜单
          setContextMenu(prev => ({ ...prev, visible: false }));
          
          // 确认删除
          if (window.confirm(`确定要删除文件夹 "${folder.split('/').pop()}" 及其所有内容吗？`)) {
            try {
              // 显示加载状态
              const folderElement = document.querySelector(`[data-folder="${folder}"]`);
              if (folderElement) {
                folderElement.classList.add('opacity-50');
              }
              
              const success = await onDeleteFolder(folder);
              
              if (success) {
                // 更新文件夹树
                setFolderTree(buildFolderTree());
                
                // 如果当前选中的是被删除的文件夹，则切换到根文件夹
                if (currentFolder === folder || currentFolder.startsWith(`${folder}/`)) {
                  onFolderSelect('');
                }
              } else {
                // 删除失败，恢复UI状态
                if (folderElement) {
                  folderElement.classList.remove('opacity-50');
                }
                alert('删除文件夹失败，请重试');
              }
            } catch (error) {
              console.error('删除文件夹时出错:', error);
              alert('删除文件夹时出错，请重试');
            }
          }
        },
        danger: true
      });
    }
    
    // 计算菜单位置，确保在视口内
    const menuWidth = 180; // 估计的菜单宽度
    const menuHeight = menuItems.length * 36 + 10; // 估计的菜单高度
    
    // 确保菜单不会超出视口
    let x = e.clientX;
    let y = e.clientY;
    
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10;
    }
    
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10;
    }
    
    setContextMenu({
      x,
      y,
      items: menuItems,
      visible: true
    });
  };

  // 处理笔记右键菜单
  const handleNoteContextMenu = (e: React.MouseEvent, note: { id: string; title: string }) => {
    e.preventDefault();
    e.stopPropagation();
    
    const menuItems: ContextMenuItem[] = [];
    
    if (onEditNote) {
      menuItems.push({
        label: '编辑笔记',
        icon: <Edit size={14} />,
        onClick: () => onEditNote(note.id)
      });
    }
    
    if (onDeleteNote) {
      menuItems.push({
        label: '删除笔记',
        icon: <Trash size={14} />,
        onClick: () => {
          if (window.confirm(`确定要删除笔记 "${note.title}" 吗？`)) {
            onDeleteNote(note.id);
            // 删除笔记后更新文件夹树
            setTimeout(() => {
              setFolderTree(buildFolderTree());
            }, 100);
          }
        },
        danger: true
      });
    }
    
    // 计算菜单位置，确保在视口内
    const menuWidth = 180; // 估计的菜单宽度
    const menuHeight = menuItems.length * 36 + 10; // 估计的菜单高度
    
    // 确保菜单不会超出视口
    let x = e.clientX;
    let y = e.clientY;
    
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10;
    }
    
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10;
    }
    
    setContextMenu({
      x,
      y,
      items: menuItems,
      visible: true
    });
  };

  // 递归渲染文件夹树
  const renderFolderTree = (parentPath: string = '', level: number = 0) => {
    const children = folderTree[parentPath] || [];
    
    return (
      <div className={level > 0 ? "ml-4" : ""}>
        {children.map(folder => {
          // 获取当前文件夹名称（不包含路径）
          const folderName = folder.split(/[/\\]/).pop() || folder;
          const isExpanded = !!expandedFolders[folder];
          // 检查是否有子文件夹或子笔记
          const hasSubfolders = folderTree[folder] && folderTree[folder].length > 0;
          // 标准化路径比较，确保使用正斜杠
          const normalizedFolder = folder.replace(/\\/g, '/');
          const hasNotes = notes.some(note => {
            const normalizedNoteFolder = (note.folder || '').replace(/\\/g, '/');
            return normalizedNoteFolder === normalizedFolder;
          });
          const hasChildren = hasSubfolders || hasNotes;
          const isDropTarget = dropTarget === folder;
          const notesInFolder = notes.filter(note => {
            const normalizedNoteFolder = (note.folder || '').replace(/\\/g, '/');
            return normalizedNoteFolder === normalizedFolder;
          }).length;
          
          return (
            <div key={folder} className="relative">
              <div 
                className={cn(
                  "flex items-center py-1 px-1 rounded-md my-1 group",
                  currentFolder === folder ? "bg-primary/10 text-primary" : "hover:bg-accent/50",
                  isDropTarget && "bg-primary/20 border border-dashed border-primary"
                )}
                data-folder={folder}
                onClick={(e) => {
                  e.stopPropagation();
                  onFolderSelect(folder);
                }}
                onContextMenu={(e: React.MouseEvent) => handleFolderContextMenu(e, folder)}
                draggable
                onDragStart={(e) => handleDragStart(e, folder, true)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, folder)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, folder)}
              >
                {/* 展开/折叠按钮，只有当有子项时才显示 */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-5 w-5 p-0 mr-1"
                  onClick={(e) => toggleFolder(folder, e)}
                  style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
                >
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </Button>
                
                <Folder size={16} className="mr-2 text-primary" />
                
                <span className="text-sm truncate flex-1">{folderName}</span>
                
                <span className="text-xs text-muted-foreground ml-1">
                  ({notesInFolder})
                </span>
                
                <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-5 w-5 p-0"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowNewFolderInput(folder);
                      setNewFolderName('');
                      
                      // 在下一帧聚焦
                      requestAnimationFrame(() => {
                        if (newFolderInputRef.current) {
                          newFolderInputRef.current.focus();
                        }
                      });
                    }}
                    onContextMenu={(e: React.MouseEvent) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    title="创建子文件夹"
                  >
                    <FolderPlus size={14} />
                  </Button>
                </div>
              </div>
              
              {showNewFolderInput === folder && (
                <div 
                  className="ml-8 my-1 flex items-center folder-input-container"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    ref={newFolderInputRef}
                    type="text"
                    value={newFolderName}
                    onChange={(e) => {
                      e.stopPropagation();
                      setNewFolderName(e.target.value);
                    }}
                    placeholder="文件夹名称"
                    className="flex-1 px-2 py-1 text-sm border rounded"
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter' && newFolderName.trim()) {
                        handleCreateFolder(folder);
                      } else if (e.key === 'Escape') {
                        setShowNewFolderInput(null);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onFocus={(e) => e.stopPropagation()}
                    autoFocus
                  />
                  <Button 
                    size="sm" 
                    className="h-7 text-xs ml-1"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (newFolderName.trim()) {
                        handleCreateFolder(folder);
                      }
                    }}
                    disabled={!newFolderName.trim()}
                  >
                    创建
                  </Button>
                  <Button 
                    variant="ghost"
                    size="sm" 
                    className="h-7 text-xs ml-1"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowNewFolderInput(null);
                    }}
                  >
                    取消
                  </Button>
                </div>
              )}
              
              {isExpanded && (
                <>
                  {/* 渲染子文件夹 */}
                  {renderFolderTree(folder, level + 1)}
                  
                  {/* 渲染该文件夹下的笔记 */}
                  {notes
                    .filter(note => {
                      const normalizedNoteFolder = (note.folder || '').replace(/\\/g, '/');
                      const normalizedFolder = folder.replace(/\\/g, '/');
                      return normalizedNoteFolder === normalizedFolder;
                    })
                    .map(note => (
                      <div 
                        key={note.id} 
                        className={cn(
                          "flex items-center py-1 px-1 ml-4 rounded-md my-1 group",
                          "hover:bg-accent/50 cursor-pointer"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onNoteSelect) {
                            onNoteSelect(note.id);
                          }
                        }}
                        onContextMenu={(e: React.MouseEvent) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleNoteContextMenu(e, note);
                        }}
                        draggable={!!note.path}
                        onDragStart={(e) => note.path && handleDragStart(e, note.path, false)}
                        onDragEnd={handleDragEnd}
                      >
                        <div className="w-5 mr-1"></div>
                        <FileText size={16} className="mr-2 text-muted-foreground" />
                        <span className="text-sm truncate flex-1">{note.title}</span>
                      </div>
                    ))
                  }
                </>
              )}
            </div>
          );
        })}
        
        {/* 渲染当前文件夹下的笔记（如果是根级别） */}
        {parentPath === '' && notes
          .filter(note => {
            const normalizedNoteFolder = (note.folder || '').replace(/\\/g, '/');
            return normalizedNoteFolder === '';
          })
          .map(note => (
            <div 
              key={note.id} 
              className={cn(
                "flex items-center py-1 px-1 rounded-md my-1 group",
                "hover:bg-accent/50 cursor-pointer"
              )}
              onClick={(e) => {
                e.stopPropagation();
                if (onNoteSelect) {
                  onNoteSelect(note.id);
                }
              }}
              onContextMenu={(e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                handleNoteContextMenu(e, note);
              }}
              draggable={!!note.path}
              onDragStart={(e) => note.path && handleDragStart(e, note.path, false)}
              onDragEnd={handleDragEnd}
            >
              <div className="w-5 mr-1"></div>
              <FileText size={16} className="mr-2 text-muted-foreground" />
              <span className="text-sm truncate flex-1">{note.title}</span>
            </div>
          ))
        }
      </div>
    );
  };

  return (
    <div className="mb-4 h-full flex flex-col relative">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">文件夹</h3>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={(e) => {
            e.stopPropagation();
            setShowNewFolderInput('');
            setNewFolderName('');
            // 增加延迟以确保DOM已更新
            setTimeout(() => {
              if (newFolderInputRef.current) {
                newFolderInputRef.current.focus();
              }
            }, 50);
          }}
          className="h-7 text-xs"
        >
          新建文件夹
        </Button>
      </div>
      
      <div className="space-y-1 flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-rounded-md scrollbar-track-transparent scrollbar-thumb-muted hover:scrollbar-thumb-primary/50 transition-colors">
        <div 
          className={cn(
            "flex items-center py-1 px-2 rounded-md",
            currentFolder === '' ? "bg-primary/10 text-primary" : "hover:bg-accent/50",
            dropTarget === '' && "bg-primary/20 border border-dashed border-primary"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onFolderSelect('');
          }}
          onContextMenu={(e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            handleFolderContextMenu(e, '');
          }}
          onDragOver={(e) => handleDragOver(e, '')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, '')}
        >
          <Folder size={16} className="mr-2 text-primary" />
          <span className="text-sm flex-1">所有笔记</span>
          <span className="text-xs text-muted-foreground ml-1">
            ({notes.length})
          </span>
        </div>
        
        {showNewFolderInput === '' && (
          <div 
            className="ml-6 my-1 flex items-center folder-input-container"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              ref={newFolderInputRef}
              type="text"
              value={newFolderName}
              onChange={(e) => {
                e.stopPropagation();
                setNewFolderName(e.target.value);
              }}
              placeholder="文件夹名称"
              className="flex-1 px-2 py-1 text-sm border rounded"
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter' && newFolderName.trim()) {
                  handleCreateFolder('');
                } else if (e.key === 'Escape') {
                  setShowNewFolderInput(null);
                }
              }}
              onClick={(e) => e.stopPropagation()}
              onFocus={(e) => e.stopPropagation()}
              autoFocus
            />
            <Button 
              size="sm" 
              className="h-7 text-xs ml-1"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (newFolderName.trim()) {
                  handleCreateFolder('');
                }
              }}
              disabled={!newFolderName.trim()}
            >
              创建
            </Button>
            <Button 
              variant="ghost"
              size="sm" 
              className="h-7 text-xs ml-1"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowNewFolderInput(null);
              }}
            >
              取消
            </Button>
          </div>
        )}
        
        {renderFolderTree()}
      </div>
      
      {/* 右键菜单 */}
      {contextMenu.visible && (
        <div 
          id="context-menu"
          className="fixed bg-card border rounded-md shadow-md py-1 z-50 min-w-40"
          style={{ 
            left: `${contextMenu.x}px`, 
            top: `${contextMenu.y}px`
          }}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          {contextMenu.items.length > 0 ? (
            contextMenu.items.map((item, index) => (
              <button
                key={index}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-accent/50",
                  item.danger && "text-destructive hover:bg-destructive/10"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  item.onClick();
                  setContextMenu(prev => ({ ...prev, visible: false }));
                }}
              >
                {item.icon}
                {item.label}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">无可用操作</div>
          )}
        </div>
      )}
    </div>
  );
} 
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

  // 点击外部关闭右键菜单
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.visible) {
        setContextMenu(prev => ({ ...prev, visible: false }));
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [contextMenu.visible]);

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
      if (folder === draggedItem.path || folder.startsWith(`${draggedItem.path}/`)) {
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
      if (targetFolder === draggedItem.path || targetFolder.startsWith(`${draggedItem.path}/`)) {
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
          setShowNewFolderInput(folder);
          setNewFolderName('');
          setTimeout(() => {
            newFolderInputRef.current?.focus();
          }, 0);
        }
      }
    ];
    
    // 只有非根文件夹才能删除
    if (folder !== '' && onDeleteFolder) {
      menuItems.push({
        label: '删除文件夹',
        icon: <Trash size={14} />,
        onClick: async () => {
          if (window.confirm(`确定要删除文件夹 "${folder.split('/').pop()}" 及其所有内容吗？`)) {
            await onDeleteFolder(folder);
          }
        },
        danger: true
      });
    }
    
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
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
          }
        },
        danger: true
      });
    }
    
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: menuItems,
      visible: true
    });
  };

  // 递归渲染文件夹树
  const renderFolderTree = (parentPath: string = '', level: number = 0) => {
    const tree = buildFolderTree();
    const children = tree[parentPath] || [];
    
    return (
      <div className={level > 0 ? "ml-4" : ""}>
        {children.map(folder => {
          const folderName = folder.split('/').pop() || folder;
          const isExpanded = !!expandedFolders[folder];
          const hasChildren = true; // 总是显示展开按钮，即使文件夹为空
          const isDropTarget = dropTarget === folder;
          const notesInFolder = notes.filter(note => note.folder === folder).length;
          
          return (
            <div key={folder} className="relative">
              <div 
                className={cn(
                  "flex items-center py-1 px-1 rounded-md my-1 group",
                  currentFolder === folder ? "bg-primary/10 text-primary" : "hover:bg-accent/50",
                  isDropTarget && "bg-primary/20 border border-dashed border-primary"
                )}
                onClick={() => onFolderSelect(folder)}
                onContextMenu={(e) => handleFolderContextMenu(e, folder)}
                draggable
                onDragStart={(e) => handleDragStart(e, folder, true)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, folder)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, folder)}
              >
                {hasChildren ? (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-5 w-5 p-0 mr-1"
                    onClick={(e) => toggleFolder(folder, e)}
                  >
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </Button>
                ) : (
                  <div className="w-5 mr-1"></div>
                )}
                
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
                      e.stopPropagation();
                      setShowNewFolderInput(folder);
                      setNewFolderName('');
                      setTimeout(() => {
                        newFolderInputRef.current?.focus();
                      }, 0);
                    }}
                    title="创建子文件夹"
                  >
                    <FolderPlus size={14} />
                  </Button>
                </div>
              </div>
              
              {showNewFolderInput === folder && (
                <div className="ml-8 my-1 flex items-center">
                  <input
                    ref={newFolderInputRef}
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="文件夹名称"
                    className="flex-1 px-2 py-1 text-sm border rounded"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateFolder(folder);
                      } else if (e.key === 'Escape') {
                        setShowNewFolderInput(null);
                      }
                    }}
                    autoFocus
                  />
                  <Button 
                    size="sm" 
                    className="h-7 text-xs ml-1"
                    onClick={() => handleCreateFolder(folder)}
                  >
                    创建
                  </Button>
                </div>
              )}
              
              {isExpanded && (
                <>
                  {/* 渲染子文件夹 */}
                  {renderFolderTree(folder, level + 1)}
                  
                  {/* 渲染该文件夹下的笔记 */}
                  {notes
                    .filter(note => note.folder === folder)
                    .map(note => (
                      <div 
                        key={note.id} 
                        className={cn(
                          "flex items-center py-1 px-1 ml-4 rounded-md my-1 group",
                          "hover:bg-accent/50 cursor-pointer"
                        )}
                        onClick={() => onNoteSelect && onNoteSelect(note.id)}
                        onContextMenu={(e) => handleNoteContextMenu(e, note)}
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
          .filter(note => note.folder === parentPath)
          .map(note => (
            <div 
              key={note.id} 
              className={cn(
                "flex items-center py-1 px-1 rounded-md my-1 group",
                "hover:bg-accent/50 cursor-pointer"
              )}
              onClick={() => onNoteSelect && onNoteSelect(note.id)}
              onContextMenu={(e) => handleNoteContextMenu(e, note)}
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
          onClick={() => {
            setShowNewFolderInput('');
            setNewFolderName('');
            setTimeout(() => {
              newFolderInputRef.current?.focus();
            }, 0);
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
          onClick={() => onFolderSelect('')}
          onContextMenu={(e) => handleFolderContextMenu(e, '')}
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
          <div className="ml-6 my-1 flex items-center">
            <input
              ref={newFolderInputRef}
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="文件夹名称"
              className="flex-1 px-2 py-1 text-sm border rounded"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateFolder('');
                } else if (e.key === 'Escape') {
                  setShowNewFolderInput(null);
                }
              }}
              autoFocus
            />
            <Button 
              size="sm" 
              className="h-7 text-xs ml-1"
              onClick={() => handleCreateFolder('')}
            >
              创建
            </Button>
          </div>
        )}
        
        {renderFolderTree()}
      </div>
      
      {/* 右键菜单 */}
      {contextMenu.visible && (
        <div 
          className="fixed bg-card border rounded-md shadow-md py-1 z-50 min-w-40"
          style={{ 
            left: `${contextMenu.x}px`, 
            top: `${contextMenu.y}px`,
            transform: 'translate(0, 0)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.items.map((item, index) => (
            <button
              key={index}
              className={cn(
                "w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-accent/50",
                item.danger && "text-destructive hover:bg-destructive/10"
              )}
              onClick={() => {
                item.onClick();
                setContextMenu(prev => ({ ...prev, visible: false }));
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
} 
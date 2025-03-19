"use client";

import * as React from "react";
import { useState } from "react";
import { Note, NoteGroup } from "@/types/note";
import { ChevronDown, ChevronRight, FolderPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface NoteListProps {
  notes: Note[];
  currentNote: Note | null;
  onSelectNote: (note: Note) => void;
  onDeleteNote: (note: Note) => void;
  onCreateGroup: (groupName: string) => Promise<boolean>;
  onDeleteGroup: (groupName: string) => Promise<boolean>;
  onMoveNote: (note: Note, targetGroup: string) => Promise<boolean>;
  onMoveGroup: (sourceGroup: string, targetGroup: string) => Promise<boolean>;
  isLoading: boolean;
  emptyGroups?: string[];
}

export function NoteList({
  notes,
  currentNote,
  onSelectNote,
  onDeleteNote,
  onCreateGroup,
  onDeleteGroup,
  onMoveNote,
  onMoveGroup,
  isLoading,
  emptyGroups = [],
}: NoteListProps) {
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    default: true
  });
  const [parentGroup, setParentGroup] = useState<string | null>(null);
  const [draggedNote, setDraggedNote] = useState<Note | null>(null);
  const [draggedGroup, setDraggedGroup] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  // 格式化日期
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  // 切换分组展开/折叠状态
  const toggleGroupExpanded = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  // 打开创建子分组对话框
  const openCreateSubgroupDialog = (parent: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setParentGroup(parent);
    setNewGroupName("");
    setIsGroupDialogOpen(true);
  };

  // 创建新分组或子分组
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    
    const groupPath = parentGroup 
      ? `${parentGroup}/${newGroupName.trim()}`
      : newGroupName.trim();
    
    const success = await onCreateGroup(groupPath);
    if (success) {
      setNewGroupName("");
      setIsGroupDialogOpen(false);
      setParentGroup(null);
    }
  };

  // 获取所有分组及其笔记
  const getNoteGroups = (): NoteGroup[] => {
    console.log("getNoteGroups - emptyGroups:", emptyGroups);
    
    const groupMap: Record<string, NoteGroup> = {
      default: { name: "未分组", notes: [], isExpanded: expandedGroups.default, children: [] }
    };
    
    // 处理层级分组
    const processNestedGroups = (groupName: string) => {
      if (!groupMap[groupName]) {
        const displayName = groupName.includes('/') 
          ? groupName.split('/').pop() || groupName 
          : groupName;
          
        groupMap[groupName] = {
          name: displayName,
          fullName: groupName,
          notes: [],
          isExpanded: expandedGroups[groupName] || false,
          parent: groupName.includes('/') 
            ? groupName.substring(0, groupName.lastIndexOf('/')) 
            : null,
          children: []
        };
        
        // 如果有父分组，将此分组添加到父分组的children中
        if (groupMap[groupName].parent) {
          const parentGroup = groupMap[groupMap[groupName].parent];
          if (parentGroup) {
            parentGroup.children = parentGroup.children || [];
            parentGroup.children.push(groupMap[groupName]);
          }
        }
      }
      return groupMap[groupName];
    };
    
    // 将笔记按组归类
    notes.forEach(note => {
      const groupName = note.group || "default";
      
      // 确保分组存在
      const group = processNestedGroups(groupName);
      
      // 为多级分组创建父分组
      if (groupName.includes('/')) {
        const parts = groupName.split('/');
        let currentPath = '';
        
        for (let i = 0; i < parts.length - 1; i++) {
          if (currentPath) {
            currentPath += '/' + parts[i];
          } else {
            currentPath = parts[i];
          }
          
          processNestedGroups(currentPath);
        }
      }
      
      // 添加笔记到分组
      group.notes.push(note);
    });
    
    // 处理空分组（确保从后端返回的所有空分组都被创建）
    emptyGroups.forEach(groupName => {
      // 跳过默认分组
      if (groupName === 'default') return;
      
      // 确保空分组存在
      processNestedGroups(groupName);
      
      // 为多级分组创建父分组
      if (groupName.includes('/')) {
        const parts = groupName.split('/');
        let currentPath = '';
        
        for (let i = 0; i < parts.length - 1; i++) {
          if (currentPath) {
            currentPath += '/' + parts[i];
          } else {
            currentPath = parts[i];
          }
          
          processNestedGroups(currentPath);
        }
      }
    });
    
    // 对每个组内的笔记按修改时间排序
    Object.values(groupMap).forEach(group => {
      if (group.notes.length > 0) {
        group.notes.sort((a, b) => 
          new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
        );
      }
      
      // 对子分组按名称排序
      if (group.children && group.children.length > 0) {
        group.children.sort((a, b) => a.name.localeCompare(b.name));
      }
    });
    
    // 整理分组为树形结构
    const rootGroups: NoteGroup[] = [];
    const defaultGroup = groupMap.default;
    delete groupMap.default;
    
    // 先添加默认分组
    rootGroups.push(defaultGroup);
    
    // 找出所有顶级分组（没有父分组的）
    Object.values(groupMap).forEach(group => {
      if (!group.parent) {
        rootGroups.push(group);
      }
    });
    
    // 根据名称排序
    rootGroups.sort((a, b) => {
      if (a.name === "未分组") return -1;
      if (b.name === "未分组") return 1;
      return a.name.localeCompare(b.name);
    });
    
    return rootGroups;
  };

  // 处理拖拽开始 - 笔记
  const handleDragStart = (e: React.DragEvent, note: Note) => {
    e.stopPropagation();
    setDraggedNote(note);
    // 设置拖拽数据
    e.dataTransfer.setData('application/json', JSON.stringify({ 
      type: 'note',
      noteId: note.path,
      sourceGroup: note.group
    }));
    e.dataTransfer.effectAllowed = 'move';
  };

  // 处理拖拽开始 - 分组
  const handleGroupDragStart = (e: React.DragEvent, groupName: string) => {
    e.stopPropagation();
    setDraggedGroup(groupName);
    // 设置拖拽数据
    e.dataTransfer.setData('application/json', JSON.stringify({ 
      type: 'group',
      sourceGroup: groupName
    }));
    e.dataTransfer.effectAllowed = 'move';
  };

  // 处理拖拽结束
  const handleDragEnd = () => {
    setDraggedNote(null);
    setDraggedGroup(null);
    setDropTarget(null);
  };

  // 处理拖拽悬停在分组上
  const handleDragOver = (e: React.DragEvent, groupName: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      // 尝试解析拖拽数据
      const dataStr = e.dataTransfer.getData('application/json');
      if (dataStr) {
        const data = JSON.parse(dataStr);
        
        if (data.type === 'note' && draggedNote) {
          // 处理笔记拖拽
          if (draggedNote.group !== groupName) {
            setDropTarget(groupName);
            e.dataTransfer.dropEffect = 'move';
          }
        } else if (data.type === 'group' && draggedGroup) {
          // 处理分组拖拽 - 不能拖拽到自己或子分组中
          // 允许拖拽到default（根级别）但不允许拖拽到"未分组"
          if ((draggedGroup !== groupName && 
              !groupName.startsWith(draggedGroup + '/')) && 
              (groupName === 'default' || groupName !== '未分组')) {
            setDropTarget(groupName);
            e.dataTransfer.dropEffect = 'move';
          }
        }
      } else if (draggedNote && draggedNote.group !== groupName) {
        // 向后兼容：处理无数据的拖拽 - 假设是笔记
        setDropTarget(groupName);
        e.dataTransfer.dropEffect = 'move';
      } else if (draggedGroup && 
                ((draggedGroup !== groupName && 
                !groupName.startsWith(draggedGroup + '/')) && 
                (groupName === 'default' || groupName !== '未分组'))) {
        // 向后兼容：处理无数据的拖拽 - 假设是分组
        setDropTarget(groupName);
        e.dataTransfer.dropEffect = 'move';
      }
    } catch (error) {
      console.error("解析拖拽数据出错:", error);
      
      // 出错时使用状态判断
      if (draggedNote && draggedNote.group !== groupName) {
        setDropTarget(groupName);
        e.dataTransfer.dropEffect = 'move';
      } else if (draggedGroup && 
                ((draggedGroup !== groupName && 
                !groupName.startsWith(draggedGroup + '/')) && 
                (groupName === 'default' || groupName !== '未分组'))) {
        setDropTarget(groupName);
        e.dataTransfer.dropEffect = 'move';
      }
    }
  };

  // 处理离开拖拽区域
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTarget(null);
  };

  // 处理放置到分组
  const handleDrop = async (e: React.DragEvent, targetGroup: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      // 尝试解析拖拽数据
      const dataStr = e.dataTransfer.getData('application/json');
      if (dataStr) {
        const data = JSON.parse(dataStr);
        
        if (data.type === 'note' && draggedNote) {
          // 处理笔记拖拽
          if (draggedNote.group !== targetGroup) {
            await onMoveNote(draggedNote, targetGroup);
          }
        } else if (data.type === 'group' && draggedGroup) {
          // 处理分组拖拽
          if ((draggedGroup !== targetGroup && 
              !targetGroup.startsWith(draggedGroup + '/')) && 
              (targetGroup === 'default' || targetGroup !== '未分组')) {
            await onMoveGroup(draggedGroup, targetGroup);
          }
        }
      } else if (draggedNote && draggedNote.group !== targetGroup) {
        // 向后兼容：处理无数据的拖拽 - 假设是笔记
        await onMoveNote(draggedNote, targetGroup);
      } else if (draggedGroup && 
                ((draggedGroup !== targetGroup && 
                !targetGroup.startsWith(draggedGroup + '/')) && 
                (targetGroup === 'default' || targetGroup !== '未分组'))) {
        // 向后兼容：处理无数据的拖拽 - 假设是分组
        await onMoveGroup(draggedGroup, targetGroup);
      }
    } catch (error) {
      console.error("处理拖放出错:", error);
    } finally {
      setDropTarget(null);
    }
  };

  // 递归渲染分组及其子分组
  const renderGroup = (group: NoteGroup) => {
    const isDropTarget = dropTarget === (group.fullName || group.name);
    const isNestedGroup = group.parent !== null;
    
    return (
      <div 
        key={group.fullName || group.name} 
        className={cn(
          "mb-3 border border-border rounded-md overflow-hidden note-group card-enhanced",
          isDropTarget && "ring-2 ring-primary group-drag-over",
          isNestedGroup && "nested-group"
        )}
        onDragOver={(e) => {
          // 允许将笔记拖入任何分组，但分组只能拖入非"未分组"卡片
          if (draggedNote || (draggedGroup && group.name !== "未分组")) {
            handleDragOver(e, group.fullName || group.name);
          }
        }}
        onDragLeave={handleDragLeave}
        onDrop={(e) => {
          // 允许将笔记拖入任何分组，但分组只能拖入非"未分组"卡片
          if (draggedNote || (draggedGroup && group.name !== "未分组")) {
            handleDrop(e, group.fullName || group.name);
          }
        }}
      >
        <div 
          className={cn(
            "flex items-center justify-between py-2 px-3 cursor-pointer",
            group.isExpanded ? "group-header-expanded" : "bg-card/60 hover:bg-secondary/50",
            isDropTarget && "bg-primary/20",
            group.name !== "未分组" && "draggable-group"
          )}
          onClick={() => toggleGroupExpanded(group.fullName || group.name)}
          draggable={group.name !== "未分组"}
          onDragStart={(e) => group.name !== "未分组" && handleGroupDragStart(e, group.fullName || group.name)}
          onDragEnd={handleDragEnd}
        >
          <div className="flex items-center">
            {(group.children?.length > 0 || group.notes.length > 0) && (
              group.isExpanded ? (
                <ChevronDown className="h-4 w-4 mr-1.5 text-primary" />
              ) : (
                <ChevronRight className="h-4 w-4 mr-1.5 text-primary" />
              )
            )}
            <span className="text-sm font-semibold">{group.name}</span>
            <span className="text-xs text-muted-foreground ml-1.5 font-medium">
              ({group.notes.length})
            </span>
            {dropTarget === group.fullName && (
              <span className="ml-2 text-xs text-primary animate-pulse">
                放置到此分组
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="icon"
              title="创建子分组"
              onClick={(e) => openCreateSubgroupDialog(group.fullName || group.name, e)}
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <FolderPlus className="h-3 w-3" />
              <span className="sr-only">创建子分组</span>
            </Button>
            
            {group.name !== "未分组" && (
              <Button
                variant={group.notes.length > 0 ? "destructive" : "ghost"}
                size="icon"
                title={`删除${group.notes.length > 0 ? '非空' : '空'}分组`}
                onClick={(e) => {
                  e.stopPropagation();
                  
                  const message = group.notes.length > 0
                    ? `确定要删除 ${group.name} 分组吗? 分组内的 ${group.notes.length} 个笔记也将被删除。`
                    : `确定要删除空分组 ${group.name} 吗?`;
                    
                  if (confirm(message)) {
                    onDeleteGroup(group.fullName || group.name);
                  }
                }}
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-3 w-3" />
                <span className="sr-only">删除分组</span>
              </Button>
            )}
          </div>
        </div>
        
        {group.isExpanded && (
          <div className="space-y-1 py-1 bg-background">
            {/* 渲染子分组 */}
            {group.children && group.children.length > 0 && (
              <div className="pl-2 pr-1 space-y-1 pt-1 pb-2">
                {group.children.map(childGroup => renderGroup(childGroup))}
              </div>
            )}
            
            {/* 渲染组内笔记 */}
            <div className={cn(
              "space-y-1 py-1 px-1", 
              group.notes.length === 0 && "py-2"
            )}>
              {group.notes.map((note) => (
                <div
                  key={note.path}
                  className={cn(
                    "flex items-center justify-between py-2 px-3 rounded-sm group border border-transparent note-item",
                    currentNote?.path === note.path
                      ? "active"
                      : "hover:bg-muted hover:border-border cursor-grab active:cursor-grabbing",
                    draggedNote?.path === note.path && "opacity-50 border-dashed"
                  )}
                  draggable
                  onDragStart={(e) => handleDragStart(e, note)}
                  onDragEnd={handleDragEnd}
                >
                  <div
                    className="flex-1 overflow-hidden mr-2"
                    onClick={() => onSelectNote(note)}
                  >
                    <div className="font-medium truncate">
                      {note.name.replace(/\.md$/, "")}
                    </div>
                    <div className="text-xs text-muted-foreground dark:text-primary-foreground/70 mt-0.5 flex items-center note-metadata">
                      <span className="inline-block w-2 h-2 bg-primary/40 rounded-full mr-1.5"></span>
                      {formatDate(note.lastModified)}
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("确定要删除这个笔记吗?")) {
                          onDeleteNote(note);
                        }
                      }}
                      className={cn(
                        "h-7 w-7 opacity-0 group-hover:opacity-100",
                        currentNote?.path === note.path ? "opacity-100" : ""
                      )}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </div>
              ))}
              
              {group.notes.length === 0 && (
                <div className="text-xs text-muted-foreground py-2 px-3 text-center border border-dashed border-border/50 rounded-md mx-2">
                  暂无笔记
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // 渲染笔记列表
  const renderNoteList = () => {
    const rootGroups = getNoteGroups();
    
    return (
      <div className="space-y-1">
        {rootGroups.map(group => renderGroup(group))}
      </div>
    );
  };

  if (isLoading) {
    return <div className="py-4 text-center text-muted-foreground">加载中...</div>;
  }

  // 即使没有笔记也应该显示分组列表，特别是空分组
  return (
    <div 
      className="space-y-4"
      onDragOver={(e) => {
        // 只允许将分组拖动到根级别，不允许拖动到"未分组"
        if (draggedGroup) {
          handleDragOver(e, 'default');
        }
      }}
      onDragLeave={handleDragLeave}
      onDrop={(e) => {
        // 只允许将分组拖动到根级别，不允许拖动到"未分组"
        if (draggedGroup) {
          handleDrop(e, 'default');
        }
      }}
    >
      <div className={cn(
        "flex justify-between items-center mb-4 sticky top-0 bg-muted/30 backdrop-blur-sm py-1 z-10 px-1",
        dropTarget === 'default' && "ring-2 ring-primary rounded-md bg-primary/10"
      )}>
        <h2 className="text-sm font-bold text-foreground">
          笔记分组
          {dropTarget === 'default' && (
            <span className="ml-2 text-xs text-primary animate-pulse">放置到顶层</span>
          )}
        </h2>
        <Dialog open={isGroupDialogOpen} onOpenChange={(open) => {
            setIsGroupDialogOpen(open);
            if (!open) setParentGroup(null);
          }}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 px-2 gap-1 text-xs">
              <FolderPlus className="h-3.5 w-3.5" />
              <span>新建分组</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] card-enhanced">
            <DialogHeader>
              <DialogTitle>
                {parentGroup ? `在 ${parentGroup} 中创建子分组` : '创建新分组'}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="group-name" className="mb-2 block">
                分组名称
              </Label>
              <Input
                id="group-name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="输入分组名称..."
              />
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsGroupDialogOpen(false)}
              >
                取消
              </Button>
              <Button onClick={handleCreateGroup}>创建</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 渲染分组列表 */}
      {renderNoteList()}
      
      {/* 如果没有笔记，显示提示信息 */}
      {notes.length === 0 && emptyGroups.length === 0 && (
        <div className="py-4 text-center text-muted-foreground">
          没有笔记。点击&quot;New Note&quot;创建一个新笔记。
        </div>
      )}
    </div>
  );
}
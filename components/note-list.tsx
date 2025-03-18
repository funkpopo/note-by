"use client";

import * as React from "react";
import { useState } from "react";
import { Note, NoteGroup } from "@/types/note";
import { ChevronDown, ChevronRight, FolderPlus, Pencil, Trash2 } from "lucide-react";
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
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface NoteListProps {
  notes: Note[];
  currentNote: Note | null;
  onSelectNote: (note: Note) => void;
  onDeleteNote: (note: Note) => void;
  onCreateGroup: (groupName: string) => Promise<boolean>;
  onDeleteGroup: (groupName: string) => Promise<boolean>;
  onMoveNote: (note: Note, targetGroup: string) => Promise<boolean>;
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
    console.log("getNoteGroups - emptyGroups:", emptyGroups); // 添加日志
    
    const groupMap: Record<string, NoteGroup> = {
      default: { name: "未分组", notes: [], isExpanded: expandedGroups.default }
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
            : null
        };
      }
    };
    
    // 将笔记按组归类
    notes.forEach(note => {
      const groupName = note.group || "default";
      
      // 确保分组存在
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
      
      // 添加笔记到分组
      groupMap[groupName].notes.push(note);
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
    
    console.log("getNoteGroups - rootGroups:", rootGroups); // 添加日志
    return rootGroups;
  };

  // 处理拖拽开始
  const handleDragStart = (e: React.DragEvent, note: Note) => {
    e.stopPropagation();
    setDraggedNote(note);
    // 设置拖拽数据
    e.dataTransfer.setData('application/json', JSON.stringify({ 
      noteId: note.path,
      sourceGroup: note.group
    }));
    e.dataTransfer.effectAllowed = 'move';
  };

  // 处理拖拽结束
  const handleDragEnd = () => {
    setDraggedNote(null);
    setDropTarget(null);
  };

  // 处理拖拽悬停在分组上
  const handleDragOver = (e: React.DragEvent, groupName: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedNote && draggedNote.group !== groupName) {
      setDropTarget(groupName);
      e.dataTransfer.dropEffect = 'move';
    }
  };

  // 处理离开拖拽区域
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTarget(null);
  };

  // 处理放置笔记到分组
  const handleDrop = async (e: React.DragEvent, targetGroup: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedNote) return;
    
    // 确保不是拖放到同一个分组
    if (draggedNote.group === targetGroup) {
      setDropTarget(null);
      return;
    }
    
    try {
      // 移动笔记到目标分组
      await onMoveNote(draggedNote, targetGroup);
      setDropTarget(null);
    } catch (error) {
      console.error("拖放笔记失败:", error);
    }
  };

  // 递归渲染分组及其子分组
  const renderGroup = (group: NoteGroup) => {
    // 查找所有直接子分组
    const childGroups = Object.values(getNoteGroups())
      .filter(g => g.parent === (group.fullName || group.name))
      .sort((a, b) => a.name.localeCompare(b.name));
    
    const isDropTarget = dropTarget === (group.fullName || group.name);
    
    return (
      <div 
        key={group.fullName || group.name} 
        className={cn(
          "mb-3 border border-border rounded-md overflow-hidden note-group card-enhanced",
          isDropTarget && "ring-2 ring-primary"
        )}
        onDragOver={(e) => handleDragOver(e, group.fullName || group.name)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, group.fullName || group.name)}
      >
        <div 
          className={cn(
            "flex items-center justify-between py-2 px-3 cursor-pointer",
            group.isExpanded ? "bg-primary/10" : "bg-card/60 hover:bg-secondary/50",
            isDropTarget && "bg-primary/20"
          )}
          onClick={() => toggleGroupExpanded(group.fullName || group.name)}
        >
          <div className="flex items-center">
            {group.isExpanded ? (
              <ChevronDown className="h-4 w-4 mr-1.5 text-primary icon-button" />
            ) : (
              <ChevronRight className="h-4 w-4 mr-1.5 text-primary icon-button" />
            )}
            <span className="text-sm font-semibold">{group.name}</span>
            <span className="text-xs text-muted-foreground ml-1.5 font-medium">
              ({group.notes.length})
            </span>
            {isDropTarget && (
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
              className="h-6 w-6 icon-button group-hover:opacity-100 transition-opacity"
            >
              <FolderPlus className="h-3 w-3" />
              <span className="sr-only">创建子分组</span>
            </Button>
            
            {group.name !== "未分组" && (
              <Button
                variant="ghost"
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
                className={cn(
                  "h-6 w-6 icon-button action-button group-hover:opacity-100 transition-opacity",
                  group.notes.length > 0 && "text-yellow-600 hover:text-destructive"
                )}
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
            {childGroups.length > 0 && (
              <div className="pl-2 pr-1 space-y-1 pt-1 pb-2">
                {childGroups.map(childGroup => renderGroup(childGroup))}
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
                      ? "bg-primary text-primary-foreground border-primary/20 active"
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
                    <div className="text-xs text-muted-foreground dark:text-primary-foreground/70 mt-0.5 flex items-center">
                      <span className="inline-block w-2 h-2 bg-primary/40 rounded-full mr-1.5"></span>
                      {formatDate(note.lastModified)}
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-7 w-7 icon-button action-button group-hover:opacity-100",
                            currentNote?.path === note.path ? "opacity-100" : ""
                          )}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {Object.values(getNoteGroups())
                          .filter(g => (g.fullName || g.name) !== note.group)
                          .map(g => (
                            <DropdownMenuItem
                              key={g.fullName || g.name}
                              onClick={() => onMoveNote(
                                note, 
                                g.fullName || g.name
                              )}
                              className="cursor-pointer"
                            >
                              移动到 {g.name}
                            </DropdownMenuItem>
                          ))
                        }
                      </DropdownMenuContent>
                    </DropdownMenu>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("确定要删除这个笔记吗?")) {
                          onDeleteNote(note);
                        }
                      }}
                      className={cn(
                        "h-7 w-7 icon-button action-button group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive",
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
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4 sticky top-0 bg-muted/30 backdrop-blur-sm py-1 z-10 px-1">
        <h2 className="text-sm font-bold text-foreground">笔记分组</h2>
        <Dialog open={isGroupDialogOpen} onOpenChange={(open) => {
            setIsGroupDialogOpen(open);
            if (!open) setParentGroup(null);
          }}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 px-2 gap-1 text-xs">
              <FolderPlus className="h-3.5 w-3.5 icon-button" />
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
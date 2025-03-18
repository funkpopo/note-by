"use client";

import { useEffect, useState } from "react";
import { NoteList } from "@/components/note-list";
import dynamic from "next/dynamic";
import { Note } from "@/types/note";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { ChevronDown, FolderPlus, PlusIcon } from "lucide-react";
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

// Dynamically import NoteEditor to prevent server-side rendering issues with Cherry Markdown
const NoteEditor = dynamic(() => import("@/components/note-editor").then(mod => mod.NoteEditor), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full">Loading editor...</div>
});

export default function Home() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [content, setContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("default");
  const [groupNames, setGroupNames] = useState<string[]>(["default"]);
  const [emptyGroups, setEmptyGroups] = useState<string[]>([]);

  // 获取所有笔记
  const fetchNotes = async () => {
    try {
      if (typeof window.electron !== 'undefined') {
        const response = await window.electron.getNotes();
        const notesList = response.notes;
        setNotes(notesList);
        
        // 保存空组
        setEmptyGroups(response.emptyGroups || []);
        
        // 提取所有不同的组名（包括有笔记的组和空组）
        const groupsWithNotes = Array.from(new Set(notesList.map(note => note.group || "default")));
        const allGroups = Array.from(new Set([...groupsWithNotes, ...response.emptyGroups]));
        setGroupNames(allGroups);
        
        // 检查当前选中的笔记是否仍然存在
        if (currentNote) {
          const noteStillExists = notesList.some(note => note.path === currentNote.path);
          if (!noteStillExists) {
            // 如果笔记不再存在，清除当前选中的笔记
            setCurrentNote(null);
            setContent("");
          }
        }
        
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error fetching notes:", error);
      setIsLoading(false);
    }
  };

  // 加载笔记内容
  const loadNoteContent = async (note: Note) => {
    try {
      if (typeof window.electron !== 'undefined') {
        const content = await window.electron.getNoteContent(note.path);
        setContent(content);
        setCurrentNote(note);
      }
    } catch (error) {
      console.error("Error loading note content:", error);
    }
  };

  // 保存笔记内容
  const saveNoteContent = async () => {
    if (!currentNote) return;
    
    try {
      if (typeof window.electron !== 'undefined') {
        await window.electron.saveNote(currentNote.path, content);
        await fetchNotes(); // 刷新笔记列表
      }
    } catch (error) {
      console.error("Error saving note:", error);
    }
  };

  // 创建新笔记
  const createNewNote = async (group: string = selectedGroup) => {
    try {
      if (typeof window.electron !== 'undefined') {
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const result = await window.electron.createNote(
          `untitled-${timestamp}.md`, 
          "# Untitled Note\n\nStart writing here...",
          group
        );
        
        if (result.success && result.path) {
          await fetchNotes();
          
          // 找到新创建的笔记并加载它
          const newNote = notes.find(note => note.path === result.path);
          if (newNote) {
            loadNoteContent(newNote);
          }
        }
      }
    } catch (error) {
      console.error("Error creating new note:", error);
    }
  };

  // 创建新分组
  const createNewGroup = async (groupName: string): Promise<boolean> => {
    try {
      if (typeof window.electron !== 'undefined') {
        const result = await window.electron.createGroup(groupName);
        
        if (result.success) {
          // 立即将新组添加到emptyGroups列表，不等待fetchNotes
          setEmptyGroups(prev => {
            // 检查是否已经存在
            if (prev.includes(groupName)) return prev;
            return [...prev, groupName];
          });
          
          // 立即将新组添加到组名列表，不等待fetchNotes
          setGroupNames(prev => {
            // 检查是否已经存在
            if (prev.includes(groupName)) return prev;
            return [...prev, groupName];
          });
          
          // 仍然刷新笔记列表以确保一致性
          await fetchNotes();
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error("Error creating group:", error);
      return false;
    }
  };

  // 删除分组
  const deleteGroup = async (groupName: string): Promise<boolean> => {
    try {
      if (typeof window.electron !== 'undefined') {
        // 显示确认对话框
        const result = await window.electron.deleteGroup(groupName);
        
        if (result.success) {
          // 立即从emptyGroups和groupNames中移除被删除的组
          setEmptyGroups(prev => prev.filter(g => g !== groupName && !g.startsWith(`${groupName}/`)));
          setGroupNames(prev => prev.filter(g => g !== groupName && !g.startsWith(`${groupName}/`)));
          
          // 同时移除此分组的所有笔记
          setNotes(prev => prev.filter(n => n.group !== groupName && !n.group.startsWith(`${groupName}/`)));
          
          // 如果当前编辑的笔记在被删除的分组中，清除它
          if (currentNote && (currentNote.group === groupName || currentNote.group.startsWith(`${groupName}/`))) {
            setCurrentNote(null);
            setContent("");
          }
          
          // 刷新笔记列表以确保一致性
          await fetchNotes();
          return true;
        } else if (result.error) {
          alert(`删除分组失败: ${result.error}`);
        }
      }
      return false;
    } catch (error) {
      console.error("Error deleting group:", error);
      alert(`删除分组时发生错误: ${error}`);
      return false;
    }
  };

  // 移动笔记到其他分组
  const moveNote = async (note: Note, targetGroup: string): Promise<boolean> => {
    try {
      if (typeof window.electron !== 'undefined') {
        const result = await window.electron.moveNote(note.path, targetGroup);
        
        if (result.success) {
          // 如果当前正在编辑移动的笔记，更新当前笔记的路径
          if (currentNote && currentNote.path === note.path && result.newPath) {
            setCurrentNote({
              ...currentNote,
              path: result.newPath,
              group: targetGroup
            });
          }
          
          await fetchNotes();
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error("Error moving note:", error);
      return false;
    }
  };

  // 删除笔记
  const deleteNote = async (note: Note) => {
    try {
      if (typeof window.electron !== 'undefined') {
        const deleted = await window.electron.deleteNote(note.path);
        
        if (deleted) {
          // 清除当前选中的笔记（如果是被删除的）
          if (currentNote?.path === note.path) {
            setCurrentNote(null);
            setContent("");
          }
          
          // 从当前状态中移除被删除的笔记
          setNotes(prev => prev.filter(n => n.path !== note.path));
          
          // 检查是否是分组中的最后一个笔记
          const groupName = note.group;
          const isLastInGroup = notes.filter(n => n.group === groupName).length <= 1;
          
          // 如果是最后一个笔记，将该分组添加到空分组列表
          if (isLastInGroup && groupName !== "default") {
            setEmptyGroups(prev => {
              if (prev.includes(groupName)) return prev;
              return [...prev, groupName];
            });
          }
          
          // 仍然刷新笔记列表以保证完整性
          await fetchNotes();
        }
      }
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  };

  // 初始加载
  useEffect(() => {
    fetchNotes();
    
    // 监听文件系统变化
    let removeListener: (() => void) | null = null;
    
    if (typeof window.electron !== 'undefined' && window.electron.onNotesChanged) {
      removeListener = window.electron.onNotesChanged(() => {
        console.log("检测到文件变化，刷新笔记列表");
        fetchNotes();
      });
    }
    
    // 组件卸载时移除监听器
    return () => {
      if (removeListener) {
        removeListener();
      }
    };
  }, []);

  // 自动保存
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (currentNote && content) {
        saveNoteContent();
      }
    }, 10000); // 每10秒自动保存一次

    return () => clearInterval(autoSaveInterval);
  }, [currentNote, content]);

  // 处理创建新分组
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    
    const success = await createNewGroup(newGroupName.trim());
    if (success) {
      setNewGroupName("");
      setIsCreateGroupOpen(false);
    }
  };

  // Select group from the dropdown
  const handleSelectGroup = (group: string) => {
    setSelectedGroup(group);
    createNewNote(group);
  };

  return (
    <div className="flex flex-col h-screen">
      <header className="flex justify-between items-center px-4 py-2 border-b shadow-sm bg-card">
        <h1 className="text-xl font-semibold">Note-By</h1>
        <div className="flex items-center gap-2">
          <Dialog open={isCreateGroupOpen} onOpenChange={setIsCreateGroupOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
              >
                <FolderPlus className="h-4 w-4 icon-button" />
                新建分组
              </Button>
            </DialogTrigger>
            <DialogContent className="card-enhanced">
              <DialogHeader>
                <DialogTitle>创建新分组</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="new-group-name" className="block mb-2">
                  分组名称
                </Label>
                <Input
                  id="new-group-name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="输入分组名称..."
                />
              </div>
              <DialogFooter>
                <Button onClick={() => setIsCreateGroupOpen(false)} variant="outline">取消</Button>
                <Button onClick={handleCreateGroup}>创建</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
              >
                <PlusIcon className="h-4 w-4 icon-button" />
                新建笔记
                <ChevronDown className="h-4 w-4 icon-button" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="card-enhanced">
              <DropdownMenuItem onClick={() => handleSelectGroup("default")}>
                未分组
              </DropdownMenuItem>
              {groupNames
                .filter(name => name !== 'default')
                .map(group => (
                  <DropdownMenuItem 
                    key={group} 
                    onClick={() => handleSelectGroup(group)}
                  >
                    {group}
                  </DropdownMenuItem>
                ))
              }
            </DropdownMenuContent>
          </DropdownMenu>
          
          <ThemeToggle />
        </div>
      </header>
      
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-72 border-r border-r-border bg-muted/30 overflow-y-auto p-3">
          <NoteList
            notes={notes}
            currentNote={currentNote}
            onSelectNote={loadNoteContent}
            onDeleteNote={deleteNote}
            onCreateGroup={createNewGroup}
            onDeleteGroup={deleteGroup}
            onMoveNote={moveNote}
            isLoading={isLoading}
            emptyGroups={emptyGroups}
          />
        </aside>
        
        <main className="flex-1 overflow-hidden">
          {currentNote ? (
            <NoteEditor
              content={content}
              onChange={setContent}
              onSave={saveNoteContent}
              note={currentNote}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-8 card-enhanced rounded-lg max-w-md">
                <h2 className="text-xl font-medium mb-3">未选择笔记</h2>
                <p className="text-muted-foreground mb-5">
                  从侧边栏选择一个笔记或创建一个新笔记。
                </p>
                <Button onClick={() => createNewNote()} className="px-5 py-6">
                  <PlusIcon className="h-5 w-5 mr-2 icon-button" />
                  创建新笔记
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

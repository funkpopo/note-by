'use client';

import { useState, useEffect, useCallback } from 'react';
import NoteCard from './NoteCard';
import NoteEditor from './NoteEditor';
import NoteViewer from './NoteViewer';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

// 定义Electron API类型
interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  onMenuNewNote: (callback: () => void) => () => void;
}

// 定义笔记类型
interface Note {
  id: string;
  title: string;
  content: string;
  date: string;
}

// 定义视图状态类型
type ViewState = 'list' | 'view' | 'edit' | 'create';

export default function NoteList() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [viewState, setViewState] = useState<ViewState>('list');
  const [currentNote, setCurrentNote] = useState<Note | null>(null);

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

  useEffect(() => {
    // 检查是否在Electron环境中运行
    const isRunningInElectron = typeof window !== 'undefined' && 'electron' in window;

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
  }, [handleAddNote]);

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

  const handleDelete = (id: string) => {
    setNotes(notes.filter(note => note.id !== id));
  };

  const handleSave = (id: string, title: string, content: string) => {
    if (viewState === 'create') {
      // 添加新笔记
      if (currentNote) {
        const newNote = {
          ...currentNote,
          title,
          content,
        };
        setNotes(prev => [newNote, ...prev]);
      }
    } else {
      // 更新现有笔记
      setNotes(notes.map(note => 
        note.id === id ? { ...note, title, content } : note
      ));
    }
    setViewState('list');
  };

  const handleCancel = () => {
    setViewState('list');
  };

  // 根据当前视图状态渲染不同的组件
  if (viewState === 'view' && currentNote) {
    return (
      <NoteViewer
        id={currentNote.id}
        title={currentNote.title}
        content={currentNote.content}
        date={currentNote.date}
        onBack={handleCancel}
        onEdit={handleEdit}
      />
    );
  }

  if ((viewState === 'edit' || viewState === 'create') && currentNote) {
    return (
      <NoteEditor
        id={currentNote.id}
        initialTitle={currentNote.title}
        initialContent={currentNote.content}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    );
  }

  // 默认显示笔记列表
  return (
    <div className="w-full h-full flex flex-col">
      <header className="border-b p-4">
        <h1 className="text-2xl font-bold text-center">NoteBY</h1>
      </header>
      
      <div className="flex-1 overflow-auto p-4">
        <div className="w-full max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">我的笔记</h2>
            <Button onClick={handleAddNote} className="gap-2">
              <Plus size={16} />
              添加笔记
            </Button>
          </div>
          
          {notes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">没有笔记，点击&quot;添加笔记&quot;创建一个新笔记。</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {notes.map(note => (
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
          )}
        </div>
      </div>
    </div>
  );
} 
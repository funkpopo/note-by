'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Trash } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DraggableNoteCardProps {
  id: string;
  title: string;
  content: string;
  date: string;
  path?: string;
  folder?: string;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onClick?: () => void;
  onDragStart?: (path: string, isFolder: boolean) => void;
  onDragEnd?: () => void;
}

export default function DraggableNoteCard({
  id,
  title,
  content,
  date,
  path,
  folder,
  onEdit,
  onDelete,
  onClick,
  onDragStart,
  onDragEnd
}: DraggableNoteCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    if (!path) return;
    
    setIsDragging(true);
    e.dataTransfer.setData('text/plain', path);
    e.dataTransfer.effectAllowed = 'move';
    
    if (onDragStart) {
      onDragStart(path, false);
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    
    if (onDragEnd) {
      onDragEnd();
    }
  };

  return (
    <div
      className={cn(
        "bg-card text-card-foreground rounded-lg border shadow-sm p-4 transition-all hover:shadow-md cursor-pointer",
        isDragging && "opacity-50"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      draggable={!!path}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex justify-between items-start">
        <h3 className="font-semibold text-lg">{title}</h3>
        {isHovered && (
          <div className="flex gap-2">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation(); // 防止触发卡片的点击事件
                  onEdit(id);
                }}
                className="h-8 w-8"
                aria-label="Edit note"
              >
                <Edit size={16} />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation(); // 防止触发卡片的点击事件
                  onDelete(id);
                }}
                className="h-8 w-8 text-destructive hover:text-destructive/90"
                aria-label="Delete note"
              >
                <Trash size={16} />
              </Button>
            )}
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground mt-1 flex items-center">
        <span>{new Date(date).toLocaleString()}</span>
        {folder && (
          <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            {folder.split('/').pop()}
          </span>
        )}
      </p>
      <p className="mt-2 text-sm line-clamp-3">{content}</p>
    </div>
  );
} 
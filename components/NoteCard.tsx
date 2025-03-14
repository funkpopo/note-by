'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Trash } from 'lucide-react';

interface NoteCardProps {
  id: string;
  title: string;
  content: string;
  date: string;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onClick?: () => void;
}

export default function NoteCard({
  id,
  title,
  content,
  date,
  onEdit,
  onDelete,
  onClick,
}: NoteCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="bg-card text-card-foreground rounded-lg border shadow-sm p-4 transition-all hover:shadow-md cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
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
      <p className="text-sm text-muted-foreground mt-1">{date}</p>
      <p className="mt-2 text-sm line-clamp-3">{content}</p>
    </div>
  );
} 
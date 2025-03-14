'use client';

import { useState } from 'react';
import { Clock, Calendar, Edit3, ArrowUpRight, FileText, BarChart2, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Note {
  id: string;
  title: string;
  content: string;
  date: string;
}

interface RecentNotesViewProps {
  notes: Note[];
  onViewNote: (id: string) => void;
  onEditNote: (id: string) => void;
}

// 统计卡片组件
function StatCard({ icon: Icon, title, value, className }: { 
  icon: React.ElementType; 
  title: string; 
  value: string | number;
  className?: string;
}) {
  return (
    <div className={cn(
      "flex items-center gap-3 p-4 rounded-xl border bg-card shadow-sm",
      className
    )}>
      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
        <Icon size={20} />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-xl font-semibold">{value}</p>
      </div>
    </div>
  );
}

export default function RecentNotesView({ notes, onViewNote, onEditNote }: RecentNotesViewProps) {
  const [hoveredNote, setHoveredNote] = useState<string | null>(null);

  // 格式化日期显示
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return '今天';
    } else if (diffDays === 1) {
      return '昨天';
    } else if (diffDays < 7) {
      return `${diffDays}天前`;
    } else {
      return date.toLocaleDateString('zh-CN', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  // 提取笔记内容的摘要（去除Markdown标记）
  const getContentSummary = (content: string) => {
    // 移除Markdown标题
    let summary = content.replace(/^#+ .*$/gm, '');
    // 移除Markdown链接
    summary = summary.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    // 移除其他Markdown标记
    summary = summary.replace(/[*_~`#>-]/g, '');
    // 移除多余空白
    summary = summary.replace(/\s+/g, ' ').trim();
    
    return summary.length > 120 ? summary.substring(0, 120) + '...' : summary;
  };

  // 计算统计数据
  const todayNotesCount = notes.filter(note => formatDate(note.date) === '今天').length;
  const totalNotesCount = notes.length;
  const averageContentLength = Math.round(
    notes.reduce((sum, note) => sum + note.content.length, 0) / (notes.length || 1)
  );

  // 如果没有笔记
  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Clock className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
        <h3 className="text-xl font-medium mb-2">没有最近编辑的笔记</h3>
        <p className="text-muted-foreground">创建或编辑笔记后，它们将显示在这里</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
          icon={Clock} 
          title="今日编辑" 
          value={todayNotesCount} 
          className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/40 dark:to-blue-900/20 border-blue-200 dark:border-blue-800/50"
        />
        <StatCard 
          icon={FileText} 
          title="最近笔记总数" 
          value={totalNotesCount}
          className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/40 dark:to-purple-900/20 border-purple-200 dark:border-purple-800/50"
        />
        <StatCard 
          icon={BarChart2} 
          title="平均内容长度" 
          value={`${averageContentLength} 字符`}
          className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/40 dark:to-amber-900/20 border-amber-200 dark:border-amber-800/50"
        />
      </div>

      {/* 活动时间线 */}
      <div className="p-4 rounded-xl border bg-card shadow-sm">
        <h3 className="text-lg font-medium flex items-center gap-2 mb-4">
          <Activity size={18} />
          笔记活动
        </h3>
        <div className="relative pl-6 border-l border-border/50 space-y-6">
          {notes.slice(0, 3).map((note) => (
            <div key={note.id} className="relative">
              {/* 时间线圆点 */}
              <div className="absolute w-3 h-3 rounded-full bg-primary -left-[1.625rem] top-1.5"></div>
              <div className="mb-1 flex items-center gap-2">
                <span className="text-sm font-medium">{formatDate(note.date)}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(note.date).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div 
                className="p-3 rounded-lg border bg-background hover:bg-accent/5 transition-colors cursor-pointer"
                onClick={() => onViewNote(note.id)}
              >
                <h4 className="font-medium">{note.title}</h4>
                <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                  {getContentSummary(note.content)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 今日编辑 - 如果有今天编辑的笔记，显示在顶部 */}
      {notes.some(note => formatDate(note.date) === '今天') && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium flex items-center gap-2 text-primary">
            <Clock size={18} />
            今日编辑
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {notes
              .filter(note => formatDate(note.date) === '今天')
              .map(note => (
                <div 
                  key={note.id}
                  className="relative overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:shadow-md"
                  onMouseEnter={() => setHoveredNote(note.id)}
                  onMouseLeave={() => setHoveredNote(null)}
                >
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-semibold text-lg line-clamp-1">{note.title}</h4>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full flex items-center gap-1">
                        <Clock size={12} />
                        今天
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {getContentSummary(note.content)}
                    </p>
                    
                    <div className={cn(
                      "absolute inset-0 bg-gradient-to-t from-card/90 via-card/50 to-transparent flex items-end justify-center p-4 opacity-0 transition-opacity",
                      hoveredNote === note.id && "opacity-100"
                    )}>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditNote(note.id);
                          }}
                        >
                          <Edit3 size={14} className="mr-1" />
                          编辑
                        </Button>
                        <Button 
                          onClick={() => onViewNote(note.id)}
                          size="sm"
                        >
                          <ArrowUpRight size={14} className="mr-1" />
                          查看
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 最近编辑 */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Calendar size={18} />
          更早编辑
        </h3>
        <div className="space-y-3">
          {notes
            .filter(note => formatDate(note.date) !== '今天')
            .map(note => (
              <div 
                key={note.id}
                className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors cursor-pointer"
                onClick={() => onViewNote(note.id)}
              >
                <div className="w-12 h-12 flex-shrink-0 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                  <Calendar size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium line-clamp-1">{note.title}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {getContentSummary(note.content)}
                  </p>
                </div>
                <div className="flex-shrink-0 flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {formatDate(note.date)}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditNote(note.id);
                    }}
                  >
                    <Edit3 size={16} />
                  </Button>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
} 
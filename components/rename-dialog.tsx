import * as React from "react";
import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RenameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRename: (newName: string) => void;
  currentName: string;
}

export function RenameDialog({ isOpen, onClose, onRename, currentName }: RenameDialogProps) {
  // 去掉.md后缀
  const cleanName = currentName.replace(/\.md$/, "");
  const [newName, setNewName] = useState(cleanName);
  const [error, setError] = useState("");

  // 确保表单字段在对话框打开时重置
  React.useEffect(() => {
    if (isOpen) {
      setNewName(cleanName);
      setError("");
    }
  }, [isOpen, cleanName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newName.trim()) {
      setError("文件名不能为空");
      return;
    }
    
    // 重命名
    onRename(newName);
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>重命名文档</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">文档名称</Label>
            <Input
              id="name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="输入新的文档名称"
              className={error ? "border-red-500" : ""}
              autoFocus
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <p className="text-sm text-muted-foreground">
              无需添加 .md 后缀，系统将自动添加
            </p>
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" variant="outline">
              确认
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 
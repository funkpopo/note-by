export interface Note {
  name: string;
  path: string;
  lastModified: Date;
  group: string;
}

export interface NoteGroup {
  name: string;
  notes: Note[];
  isExpanded?: boolean;
  fullName?: string;
  parent?: string | null;
  children: NoteGroup[];
} 
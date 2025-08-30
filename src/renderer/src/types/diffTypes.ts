export interface DiffResult {
  added?: boolean
  removed?: boolean
  value: string
  count?: number
  diffs?: DiffItem[]
}

export interface DiffFeature {
  id: string
  type: string
  description?: string
  label?: string
  [key: string]: unknown
}

export interface DiffItem {
  type: 'insert' | 'delete' | 'replace' | 'equal'
  originalText: string
  newText: string
  index: number
}

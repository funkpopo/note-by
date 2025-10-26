// Shared DTOs used across main, preload, and renderer

export interface AnalysisCacheItem {
  date: string
  stats: {
    totalNotes: number
    totalEdits: number
    averageEditLength: number
    mostEditedNotes: Array<{
      filePath: string
      editCount?: number
      count?: number
    }>
    notesByDate: Array<{
      date: string
      count: number
    }>
    editsByDate: Array<{
      date: string
      count: number
    }>
    editTimeDistribution: Array<{
      hour: number
      count: number
    }>
    topFolders?: Array<{
      folder: string
      count: number
    }>
  }
  activityData: {
    dailyActivity: Record<
      string,
      {
        createdNotes: number
        editedNotes: number
        totalEdits: number
        charactersAdded: number
        activeHours: number[]
      }
    >
    noteDetails: Array<{
      filePath: string
      firstEdit: number
      lastEdit: number
      editCount: number
      averageEditSize: number
    }>
  }
  result: {
    summary: string
    writingHabits: {
      title: string
      content: string
    }
    writingRhythm: {
      title: string
      content: string
    }
    topics: {
      title: string
      content: string
    }
    writingBehavior: {
      title: string
      content: string
    }
    recommendations: {
      title: string
      items: string[]
    }
    efficiencyTips: {
      title: string
      items: string[]
    }
    suggestedGoals: {
      title: string
      items: string[]
    }
  }
  modelId: string
  dataFingerprint?: {
    totalNotes: number
    totalEdits: number
    lastEditTimestamp: number
    contentHash: string
    notesCountHash: string
  }
}

export interface ChatSession {
  id: string
  title?: string
  createdAt: number
  updatedAt: number
  messageCount: number
  isArchived: boolean
}

export interface ChatMessage {
  id: string
  sessionId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  status?: 'loading' | 'streaming' | 'incomplete' | 'complete' | 'error'
  parentId?: string
  createdAt: number
  modelId?: string
}

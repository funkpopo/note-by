// English localization configuration
// Temporarily removing BlockNote-related dictionary configuration, waiting for Tiptap implementation

export interface ExtendedDictionary {
  dataAnalysis?: {
    title: string
    analysisButton: string
    reAnalysisButton: string
    selectModel: string
    analyzing: string
    loadingData: string
    noResults: string
    cachedResults: string
    retryButton: string
    resetCache: string
    errors: {
      networkError: string
      dataError: string
      apiError: string
      cacheError: string
      unknownError: string
      noModel: string
      noData: string
      parseError: string
      maxRetries: string
    }
    tabs: {
      habits: string
      content: string
      suggestions: string
      visualization: string
    }
    charts: {
      hourlyDistribution: string
      topNotes: string
      editTrend: string
      noteTrend: string
      activeHours: string
      topFolders: string
      topTags: string
      tagRelations: string
      tagGraph: string
    }
    status: {
      success: string
      failed: string
      retrying: string
    }
  }
  chat?: {
    title: string
    inputPlaceholder: string
    modelSelector: {
      placeholder: string
      noModels: string
      thinkingBadge: string
    }
    messages: {
      thinking: string
      statusIndicator: {
        loading: string
        streaming: string
        incomplete: string
        error: string
      }
    }
    actions: {
      send: string
      stop: string
      clear: string
      copy: string
      retry: string
      delete: string
      history: string
      newSession: string
    }
    suggestions: string[]
    notifications: {
      copied: string
      stopped: string
      cleared: string
      deleted: string
      retrying: string
      sendFailed: string
      selectModel: string
      noMessage: string
      retryFailed: string
      deleteFailed: string
      noUserMessage: string
    }
    history: {
      title: string
      empty: string
      newChat: string
      loadFailed: string
      saveFailed: string
      deleteFailed: string
      deleteConfirm: string
      searchPlaceholder: string
      createdAt: string
      lastMessage: string
      loading: string
      notFound: string
      titleUpdated: string
      titleUpdateFailed: string
    }
  }
}

export const enUS: ExtendedDictionary = {
  // Data Analysis Module Internationalization
  dataAnalysis: {
    title: 'Note Data Analysis',
    analysisButton: 'Execute Analysis',
    reAnalysisButton: 'Re-analyze',
    selectModel: 'Select AI Model',
    analyzing: 'Analyzing your note data...',
    loadingData: 'Loading data...',
    noResults: 'No analysis results',
    cachedResults: 'Showing cached analysis results',
    retryButton: 'Retry Analysis',
    resetCache: 'Reset Cache',
    errors: {
      networkError: 'Network connection error, please check your network and retry',
      dataError: 'Data retrieval failed, please try again later',
      apiError: 'AI service call failed, please check model configuration',
      cacheError: 'Cache operation failed',
      unknownError: 'Unknown error, please retry',
      noModel: 'Please select an AI model first',
      noData: 'No note data available, please create and edit some notes first',
      parseError: 'Data parsing failed, please contact technical support',
      maxRetries: 'Maximum retries reached, please check configuration and retry manually'
    },
    tabs: {
      habits: 'Writing Habits',
      content: 'Content Analysis',
      suggestions: 'Improvement Suggestions',
      visualization: 'Data Visualization'
    },
    charts: {
      hourlyDistribution: 'Hourly Edit Distribution',
      topNotes: 'Most Edited Notes',
      editTrend: 'Daily Edit Count Trend',
      noteTrend: 'Daily Active Notes Trend',
      activeHours: 'Daily Active Hours Distribution',
      topFolders: 'Most Used Folders',
      topTags: 'Most Used Tags',
      tagRelations: 'Tag Relationship Analysis',
      tagGraph: 'Tag Relationship Knowledge Graph'
    },
    status: {
      success: 'Analysis Complete',
      failed: 'Analysis Failed',
      retrying: 'Retrying...'
    }
  },
  // Chat Interface Internationalization
  chat: {
    title: 'Chat Assistant',
    inputPlaceholder: 'Type your question... (Shift+Enter for new line, Enter to send)',
    modelSelector: {
      placeholder: 'Select AI Model',
      noModels: 'No AI configurations available',
      thinkingBadge: 'Thinking'
    },
    messages: {
      thinking: '💭 Thinking Process',
      statusIndicator: {
        loading: 'Thinking...',
        streaming: 'AI is thinking...',
        incomplete: '⚠️ Generation interrupted',
        error: '❌ Generation error'
      }
    },
    actions: {
      send: 'Send',
      stop: 'Stop',
      clear: 'Clear Chat',
      copy: 'Copy',
      retry: 'Regenerate',
      delete: 'Delete',
      history: 'Chat History',
      newSession: 'New Session'
    },
    suggestions: [
      '📝 Help me write an article about: ',
      '🧮 Solve this math problem: ',
      '💡 Give me advice about',
      '🔍 Explain this concept: '
    ],
    notifications: {
      copied: 'Copied to clipboard',
      stopped: 'Generation stopped',
      cleared: 'Chat cleared',
      deleted: 'Message deleted',
      retrying: 'Regenerating response...',
      sendFailed: 'Failed to send message',
      selectModel: 'Please select an AI model first',
      noMessage: 'Cannot find corresponding user message, unable to regenerate',
      retryFailed: 'Regeneration failed, please try again later',
      deleteFailed: 'Failed to delete message, please try again later',
      noUserMessage: '💡 Please select an AI model in the top right corner to start chatting'
    },
    history: {
      title: 'Chat History',
      empty: 'No chat history',
      newChat: 'New Chat',
      loadFailed: 'Failed to load chat history',
      saveFailed: 'Failed to save chat history',
      deleteFailed: 'Failed to delete chat history',
      deleteConfirm: 'Are you sure you want to delete this conversation?',
      searchPlaceholder: 'Search conversations...',
      createdAt: 'Created at',
      lastMessage: 'Last message',
      loading: 'Loading chat history...',
      notFound: 'No chat history found',
      titleUpdated: 'Chat title updated',
      titleUpdateFailed: 'Failed to update chat title'
    }
  }
}

export default enUS
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
    inputPlaceholder: string
    modelSelector: {
      placeholder: string
      noModels: string
      thinkingBadge: string
    }
    messages: {
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
      saveFailed: string
      loadFailed: string
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
  editor?: {
    actions: {
      save: string
      export: string
      exportPdf: string
      exportDocx: string
      exportHtml: string
      createFile: string
      createFolder: string
    }
    status: {
      saving: string
      autoSaving: string
      saved: string
      editing: string
      loaded: string
    }
    placeholder: {
      content: string
      title: string
    }
    notifications: {
      saveSuccess: string
      saveFailed: string
      exportSuccess: string
      exportFailed: string
      loadFailed: string
      noFileSelected: string
      createSuccess: string
      createFailed: string
      restoreSuccess: string
      restoreFailed: string
      conflictDetected: string
      memoryWarning: string
      memoryCritical: string
    }
    shortcuts: {
      save: string
      title: string
    }
    prompts: {
      noFile: string
      welcomeMessage: string
      imageUrl: string
      linkUrl: string
    }
    menu: {
      aiCommands: {
        improve: string
        simplify: string
        expand: string
        fixGrammar: string
        translateToEn: string
        translateToCn: string
        summarize: string
        continue: string
        processing: string
      }
      slashCommands: {
        heading1: string
        heading2: string
        heading3: string
        bold: string
        italic: string
        underline: string
        bulletList: string
        orderedList: string
        quote: string
        codeBlock: string
        image: string
        link: string
        noCommands: string
        placeholder: string
      }
      bubbleMenu: {
        unorderedList: string
        orderedList: string
        quote: string
        divider: string
        insertImage: string
        ai: string
      }
    }
    codeBlock: {
      copied: string
      copy: string
    }
    model: {
      loading: string
      select: string
      noModels: string
      manage: string
      thinking: string
    }
    errors: {
      apiNotConfigured: string
      modelNotFound: string
      incompleteConfig: string
      processingFailed: string
      noTextSelected: string
    }
  }
}

export const enUS: ExtendedDictionary = {
  // Common text
  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    confirm: 'Confirm',
    create: 'Create',
    rename: 'Rename',
    copy: 'Copy',
    refresh: 'Refresh',
    export: 'Export',
    import: 'Import',
    search: 'Search',
    loading: 'Loading...',
    success: 'Success',
    failed: 'Failed',
    error: 'Error',
    warning: 'Warning',
    info: 'Info',
    test: 'Test',
    add: 'Add',
    remove: 'Remove',
    update: 'Update',
    upload: 'Upload',
    download: 'Download',
    sync: 'Sync',
    settings: 'Settings',
    close: 'Close',
    yes: 'Yes',
    no: 'No'
  },
  // Navigation
  navigation: {
    notes: 'Notes',
    dataAnalysis: 'Data Analysis',
    mindMap: 'Mind Map',
    chat: 'Chat',
    settings: 'Settings',
    themeToggle: 'Theme Toggle',
    sync: 'Sync',
    newNote: 'New Note',
    newFolder: 'New Folder',
    newSubFolder: 'New Subfolder',
    renameFolder: 'Rename Folder',
    deleteFolder: 'Delete Folder',
    renameNote: 'Rename Note',
    deleteNote: 'Delete Note',
    copyDocName: 'Copy Document Name',
    searchPlaceholder: 'Search notes and folders...',
    emptyNotes: 'No notes yet',
    folderName: 'Enter folder name',
    noteName: 'Enter note name',
    confirmDeleteFolder:
      'Are you sure you want to delete folder "{name}"? All notes in the folder will be deleted.',
    confirmDeleteNote: 'Are you sure you want to delete note "{name}"?'
  },
  // Settings page
  settings: {
    title: 'Settings',
    tabs: {
      basic: 'Basic Settings',
      history: 'History Management',
      webdav: 'WebDAV Sync',
      performance: 'Performance Monitor'
    },
    language: {
      title: 'Interface Language',
      description: 'Select the display language for the application'
    },
    autoUpdate: {
      title: 'Auto Check Updates',
      description: 'Automatically check for new versions on startup',
      manual: 'Manual Check',
      manualDescription: 'Check for new releases on GitHub',
      checkNow: 'Check Now',
      newVersion: 'New version found:',
      currentLatest: 'You have the latest version',
      downloadNow: 'Download Now'
    },
    apiConfig: {
      title: 'AI API Configuration',
      name: 'Config Name',
      apiUrl: 'API URL',
      apiKey: 'API Key',
      model: 'Model',
      temperature: 'Temperature',
      maxTokens: 'Max Tokens',
      thinkingModel: 'Thinking Model',
      testConnection: 'Test Connection',
      namePlaceholder: 'Enter config name, e.g. OpenAI, Claude',
      urlPlaceholder: 'Enter API URL, e.g. https://api.openai.com',
      keyPlaceholder: 'Enter API Key',
      modelPlaceholder: 'Enter model name, e.g. gpt-3.5-turbo'
    },
    history: {
      title: 'History Management',
      retentionMode: 'History Retention Mode',
      retentionByCount: 'Retention by Count',
      retentionByDays: 'Retention by Days',
      retentionCount: 'Keep Recent Records',
      retentionDays: 'Retention Days'
    },
    encryption: {
      title: 'Encryption Settings',
      useCustom: 'Use Custom Encryption',
      setPassword: 'Set Master Password',
      changePassword: 'Change Master Password',
      closeEncryption: 'Disable Custom Encryption',
      enterPassword: 'Enter Master Password',
      confirmPassword: 'Confirm Password',
      currentPassword: 'Current Password',
      newPassword: 'New Password',
      passwordMismatch: 'Passwords do not match',
      passwordTooShort: 'Password must be at least 8 characters',
      incorrectPassword: 'Current password is incorrect'
    },
    performance: {
      title: 'Performance Statistics',
      memory: 'Memory Usage',
      memoryUsed: 'Used',
      memoryTotal: 'Total',
      memoryUsage: 'Usage',
      editorPerf: 'Editor Performance',
      loadTime: 'Load Time',
      saveTime: 'Save Time',
      renderTime: 'Render Time',
      operations: 'Operation Statistics',
      editCount: 'Edit Count',
      saveCount: 'Save Count',
      loadCount: 'Load Count',
      searchCount: 'Search Count',
      network: 'Network Performance',
      uploadSpeed: 'Upload Speed',
      downloadSpeed: 'Download Speed',
      latency: 'Latency',
      report: 'Performance Report',
      exportData: 'Export Data',
      resetStats: 'Reset Statistics'
    }
  },
  // WebDAV sync
  webdav: {
    title: 'WebDAV Sync Settings',
    serverSettings: 'WebDAV Server Settings',
    serverUrl: 'WebDAV Server URL',
    username: 'Username',
    password: 'Password',
    enable: 'Enable WebDAV Sync',
    autoSync: 'Auto Sync on Startup',
    syncDirection: 'Sync Direction',
    uploadOnly: 'Local → Remote (Upload)',
    downloadOnly: 'Remote → Local (Download)',
    bidirectional: 'Bidirectional Sync',
    syncOptions: 'Sync Options',
    encryptionSettings: 'Encryption Settings',
    syncOperations: 'Sync Operations',
    clearCache: 'Clear Sync Cache',
    uploadToCloud: 'Upload to Cloud',
    downloadFromCloud: 'Download from Cloud',
    testConnection: 'Test Connection',
    masterPassword: 'Master Password',
    inputMasterPassword: 'Enter Master Password',
    setMasterPassword: 'Set Master Password',
    changeMasterPassword: 'Change Master Password',
    closeCustomEncryption: 'Disable Custom Encryption',
    syncProgress: {
      uploading: 'Uploading files...',
      downloading: 'Downloading files...',
      comparing: 'Comparing file contents...'
    }
  },
  // Mind map
  mindmap: {
    title: 'Mind Map',
    helpText:
      'Double-click node to edit | Drag to connect nodes | Supports multi-select and shortcuts',
    centerTopic: 'Center Topic',
    newNode: 'New Node',
    addNode: 'Add Node',
    undo: 'Undo',
    redo: 'Redo',
    save: 'Save',
    load: 'Load',
    exportHtml: 'Export HTML',
    editNode: 'Edit Node',
    deleteNode: 'Delete Node',
    nodeContent: 'Node Content',
    nodeStyle: 'Node Style',
    fontSize: 'Font Size',
    addArrow: 'Add Arrow',
    deleteEdge: 'Delete Edge',
    openArrow: 'Add Open Arrow',
    closedArrow: 'Add Closed Arrow',
    defaultStyle: 'Default',
    primaryStyle: 'Primary',
    successStyle: 'Success',
    warningStyle: 'Warning',
    dangerStyle: 'Danger',
    contentPlaceholder: 'Enter node content'
  },
  // Messages
  messages: {
    success: {
      saved: 'Saved successfully',
      deleted: 'Deleted successfully',
      created: 'Created successfully',
      updated: 'Updated successfully',
      copied: 'Copied to clipboard',
      synced: 'Synced successfully',
      connected: 'Connected successfully',
      exported: 'Exported successfully',
      imported: 'Imported successfully',
      loaded: 'Loaded successfully',
      cleared: 'Cleared successfully',
      renamed: 'Renamed successfully',
      passwordSet: 'Password set successfully',
      passwordChanged: 'Password changed successfully',
      encryptionEnabled: 'Encryption enabled',
      encryptionDisabled: 'Encryption disabled'
    },
    error: {
      saveFailed: 'Save failed',
      deleteFailed: 'Delete failed',
      createFailed: 'Create failed',
      updateFailed: 'Update failed',
      copyFailed: 'Copy failed',
      syncFailed: 'Sync failed',
      connectionFailed: 'Connection failed',
      exportFailed: 'Export failed',
      importFailed: 'Import failed',
      loadFailed: 'Load failed',
      renameFailed: 'Rename failed',
      notConfigured: 'Please configure settings first',
      alreadySyncing: 'Already syncing...',
      invalidFormat: 'Invalid file format',
      parseError: 'Parse error',
      networkError: 'Network error',
      permissionDenied: 'Permission denied',
      fileNotFound: 'File not found',
      operationFailed: 'Operation failed'
    },
    info: {
      syncing: 'Syncing...',
      cancelling: 'Cancelling...',
      loading: 'Loading...',
      processing: 'Processing...',
      empty: 'No data',
      noSelection: 'Please select an item first'
    }
  },
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
    inputPlaceholder: 'Type your question... (Shift+Enter for new line, Enter to send)',
    modelSelector: {
      placeholder: 'Select AI Model',
      noModels: 'No AI configurations available',
      thinkingBadge: 'Thinking'
    },
    messages: {
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
      noUserMessage: '💡 Please select an AI model in the top right corner to start chatting',
      saveFailed: 'Failed to save chat history',
      loadFailed: 'Failed to load chat history'
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
  },
  // Editor Interface Internationalization
  editor: {
    actions: {
      save: 'Save',
      export: 'Export',
      exportPdf: 'Export PDF',
      exportDocx: 'Export DOCX',
      exportHtml: 'Export HTML',
      createFile: 'Create File',
      createFolder: 'Create Folder'
    },
    status: {
      saving: 'Saving...',
      autoSaving: 'Auto saving...',
      saved: 'Saved',
      editing: 'Editing',
      loaded: 'Loaded'
    },
    placeholder: {
      content: 'Start typing content...',
      title: 'File title'
    },
    notifications: {
      saveSuccess: 'File saved successfully',
      saveFailed: 'Save failed',
      exportSuccess: 'Export successful',
      exportFailed: 'Export failed',
      loadFailed: 'Failed to load file content',
      noFileSelected: 'No file selected',
      createSuccess: 'File created successfully',
      createFailed: 'Failed to create file',
      restoreSuccess: 'History version restored',
      restoreFailed: 'Failed to restore history version',
      conflictDetected: 'File conflict detected',
      memoryWarning: 'Memory usage warning',
      memoryCritical: 'Critical memory usage! Cleaning up...'
    },
    shortcuts: {
      save: 'Use Ctrl+S to save file',
      title: 'Tips & Shortcuts:'
    },
    prompts: {
      noFile:
        'Please select a file from the left sidebar to start editing, or create a new Markdown file',
      welcomeMessage: 'Supports code block highlighting and Markdown formatting',
      imageUrl: 'Enter image URL:',
      linkUrl: 'Enter link URL:'
    },
    menu: {
      aiCommands: {
        improve: 'Improve Writing',
        simplify: 'Simplify Content',
        expand: 'Expand Content',
        fixGrammar: 'Fix Grammar',
        translateToEn: 'Translate to English',
        translateToCn: 'Translate to Chinese',
        summarize: 'Summarize',
        continue: 'Continue Writing',
        processing: 'Processing'
      },
      slashCommands: {
        heading1: 'Large Heading',
        heading2: 'Medium Heading',
        heading3: 'Small Heading',
        bold: 'Bold',
        italic: 'Italic',
        underline: 'Underline',
        bulletList: 'Bullet List',
        orderedList: 'Ordered List',
        quote: 'Quote',
        codeBlock: 'Code Block',
        image: 'Insert Image',
        link: 'Insert Link',
        noCommands: 'No matching commands found',
        placeholder: 'Type command...'
      },
      bubbleMenu: {
        unorderedList: 'Bullet List',
        orderedList: 'Ordered List',
        quote: 'Quote',
        divider: 'Divider',
        insertImage: 'Insert Image',
        ai: 'AI'
      }
    },
    codeBlock: {
      copied: 'Copied',
      copy: 'Copy'
    },
    model: {
      loading: 'Loading...',
      select: 'Select Model',
      noModels: 'No models available',
      manage: 'Manage Models...',
      thinking: 'Thinking Model'
    },
    errors: {
      apiNotConfigured: 'Please configure AI API in settings first',
      modelNotFound: 'Specified AI model configuration not found',
      incompleteConfig: 'AI API configuration incomplete, please check settings',
      processingFailed: 'AI processing failed',
      noTextSelected: 'Please select text to process first'
    }
  }
}

export default enUS

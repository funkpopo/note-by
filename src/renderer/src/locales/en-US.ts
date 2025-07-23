import { Dictionary } from '@blocknote/core'

// 扩展字典接口以包含自定义模块
export interface ExtendedDictionary extends Dictionary {
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
  slash_menu: {
    heading: {
      title: 'Heading 1',
      subtext: 'Used for a top-level heading',
      aliases: ['h', 'heading1', 'h1'],
      group: 'Headings'
    },
    heading_2: {
      title: 'Heading 2',
      subtext: 'Used for key sections',
      aliases: ['h2', 'heading2', 'subheading'],
      group: 'Headings'
    },
    heading_3: {
      title: 'Heading 3',
      subtext: 'Used for subsections and group headings',
      aliases: ['h3', 'heading3', 'subheading'],
      group: 'Headings'
    },
    heading_4: {
      title: 'Heading 4',
      subtext: 'Used for subsection headings',
      aliases: ['h4', 'heading4'],
      group: 'Headings'
    },
    heading_5: {
      title: 'Heading 5',
      subtext: 'Used for sub-subsection headings',
      aliases: ['h5', 'heading5'],
      group: 'Headings'
    },
    heading_6: {
      title: 'Heading 6',
      subtext: 'Used for the smallest headings',
      aliases: ['h6', 'heading6'],
      group: 'Headings'
    },
    toggle_heading: {
      title: 'Toggle Heading 1',
      subtext: 'Collapsible heading',
      aliases: ['toggle', 'toggleheading', 'collapsible'],
      group: 'Headings'
    },
    toggle_heading_2: {
      title: 'Toggle Heading 2',
      subtext: 'Collapsible heading',
      aliases: ['toggleh2', 'toggleheading2', 'collapsible2'],
      group: 'Headings'
    },
    toggle_heading_3: {
      title: 'Toggle Heading 3',
      subtext: 'Collapsible heading',
      aliases: ['toggleh3', 'toggleheading3', 'collapsible3'],
      group: 'Headings'
    },
    quote: {
      title: 'Quote',
      subtext: 'Capture a quote',
      aliases: ['quotation', 'blockquote', 'bq'],
      group: 'Basic blocks'
    },
    toggle_list: {
      title: 'Toggle List',
      subtext: 'A collapsible list',
      aliases: ['togglelist', 'collapsiblelist', 'foldlist'],
      group: 'Basic blocks'
    },
    numbered_list: {
      title: 'Numbered List',
      subtext: 'A list with numbers',
      aliases: ['ol', 'li', 'list', 'numberedlist', 'numbered list'],
      group: 'Basic blocks'
    },
    bullet_list: {
      title: 'Bullet List',
      subtext: 'A simple bulleted list',
      aliases: ['ul', 'li', 'list', 'bulletlist', 'bullet list'],
      group: 'Basic blocks'
    },
    check_list: {
      title: 'Check List',
      subtext: 'A list with checkboxes',
      aliases: ['ul', 'li', 'list', 'checklist', 'check list', 'checked list', 'checkbox'],
      group: 'Basic blocks'
    },
    paragraph: {
      title: 'Paragraph',
      subtext: 'The body of your document',
      aliases: ['p', 'paragraph'],
      group: 'Basic blocks'
    },
    code_block: {
      title: 'Code Block',
      subtext: 'Capture a code snippet with syntax highlighting',
      aliases: ['code', 'pre'],
      group: 'Basic blocks'
    },
    page_break: {
      title: 'Page Break',
      subtext: 'Page separator',
      aliases: ['page', 'break', 'separator'],
      group: 'Basic blocks'
    },
    table: {
      title: 'Table',
      subtext: 'A table with editable cells',
      aliases: ['table'],
      group: 'Advanced'
    },
    image: {
      title: 'Image',
      subtext: 'Resizable image with caption',
      aliases: ['image', 'imageUpload', 'upload', 'img', 'picture', 'media', 'url'],
      group: 'Media'
    },
    video: {
      title: 'Video',
      subtext: 'Resizable video with caption',
      aliases: ['video', 'videoUpload', 'upload', 'mp4', 'film', 'media', 'url'],
      group: 'Media'
    },
    audio: {
      title: 'Audio',
      subtext: 'Embed audio with caption',
      aliases: ['audio', 'audioUpload', 'upload', 'mp3', 'sound', 'media', 'url'],
      group: 'Media'
    },
    file: {
      title: 'File',
      subtext: 'Embed file',
      aliases: ['file', 'upload', 'embed', 'media', 'url'],
      group: 'Media'
    },
    emoji: {
      title: 'Emoji',
      subtext: 'Search and insert an emoji',
      aliases: ['emoji', 'emote', 'emotion', 'face'],
      group: 'Other'
    }
  },
  placeholders: {
    default: '',
    heading: 'Heading',
    bulletListItem: 'List',
    numberedListItem: 'List',
    checkListItem: 'List',
    new_comment: 'Write a comment...',
    edit_comment: 'Edit comment...',
    comment_reply: 'Add comment...'
  },
  file_blocks: {
    image: {
      add_button_text: 'Add image'
    },
    video: {
      add_button_text: 'Add video'
    },
    audio: {
      add_button_text: 'Add audio'
    },
    file: {
      add_button_text: 'Add file'
    }
  },
  side_menu: {
    add_block_label: 'Add block',
    drag_handle_label: 'Open block menu'
  },
  drag_handle: {
    delete_menuitem: 'Delete',
    colors_menuitem: 'Colors',
    header_row_menuitem: 'Header row',
    header_column_menuitem: 'Header column'
  },
  table_handle: {
    delete_column_menuitem: 'Delete column',
    delete_row_menuitem: 'Delete row',
    add_left_menuitem: 'Add column left',
    add_right_menuitem: 'Add column right',
    add_above_menuitem: 'Add row above',
    add_below_menuitem: 'Add row below',
    split_cell_menuitem: 'Split cell',
    merge_cells_menuitem: 'Merge cells',
    background_color_menuitem: 'Background color'
  },
  suggestion_menu: {
    no_items_title: 'No items found'
  },
  color_picker: {
    text_title: 'Text',
    background_title: 'Background',
    colors: {
      default: 'Default',
      gray: 'Gray',
      brown: 'Brown',
      red: 'Red',
      orange: 'Orange',
      yellow: 'Yellow',
      green: 'Green',
      blue: 'Blue',
      purple: 'Purple',
      pink: 'Pink'
    }
  },
  formatting_toolbar: {
    bold: {
      tooltip: 'Bold',
      secondary_tooltip: 'Mod+B'
    },
    italic: {
      tooltip: 'Italic',
      secondary_tooltip: 'Mod+I'
    },
    underline: {
      tooltip: 'Underline',
      secondary_tooltip: 'Mod+U'
    },
    strike: {
      tooltip: 'Strike',
      secondary_tooltip: 'Mod+Shift+S'
    },
    code: {
      tooltip: 'Code',
      secondary_tooltip: ''
    },
    colors: {
      tooltip: 'Colors'
    },
    link: {
      tooltip: 'Create link',
      secondary_tooltip: 'Mod+K'
    },
    file_caption: {
      tooltip: 'Edit caption',
      input_placeholder: 'Edit caption'
    },
    file_replace: {
      tooltip: {
        image: 'Replace image',
        video: 'Replace video',
        audio: 'Replace audio',
        file: 'Replace file'
      }
    },
    file_rename: {
      tooltip: {
        image: 'Rename image',
        video: 'Rename video',
        audio: 'Rename audio',
        file: 'Rename file'
      },
      input_placeholder: {
        image: 'Rename image',
        video: 'Rename video',
        audio: 'Rename audio',
        file: 'Rename file'
      }
    },
    file_download: {
      tooltip: {
        image: 'Download image',
        video: 'Download video',
        audio: 'Download audio',
        file: 'Download file'
      }
    },
    file_delete: {
      tooltip: {
        image: 'Delete image',
        video: 'Delete video',
        audio: 'Delete audio',
        file: 'Delete file'
      }
    },
    file_preview_toggle: {
      tooltip: 'Toggle preview'
    },
    nest: {
      tooltip: 'Nest block',
      secondary_tooltip: 'Tab'
    },
    unnest: {
      tooltip: 'Unnest block',
      secondary_tooltip: 'Shift+Tab'
    },
    align_left: {
      tooltip: 'Align left'
    },
    align_center: {
      tooltip: 'Align center'
    },
    align_right: {
      tooltip: 'Align right'
    },
    align_justify: {
      tooltip: 'Justify'
    },
    table_cell_merge: {
      tooltip: 'Merge cells'
    },
    comment: {
      tooltip: 'Add comment'
    }
  },
  file_panel: {
    upload: {
      title: 'Upload',
      file_placeholder: {
        image: 'Upload image',
        video: 'Upload video',
        audio: 'Upload audio',
        file: 'Upload file'
      },
      upload_error: 'Error: Upload failed'
    },
    embed: {
      title: 'Embed',
      embed_button: {
        image: 'Embed image',
        video: 'Embed video',
        audio: 'Embed audio',
        file: 'Embed file'
      },
      url_placeholder: 'Enter URL'
    }
  },
  link_toolbar: {
    delete: {
      tooltip: 'Remove link'
    },
    edit: {
      text: 'Edit link',
      tooltip: 'Edit'
    },
    open: {
      tooltip: 'Open in new tab'
    },
    form: {
      title_placeholder: 'Edit title',
      url_placeholder: 'Edit URL'
    }
  },
  comments: {
    edited: 'Edited',
    save_button_text: 'Save',
    cancel_button_text: 'Cancel',
    actions: {
      add_reaction: 'Add reaction',
      resolve: 'Resolve',
      edit_comment: 'Edit comment',
      delete_comment: 'Delete comment',
      more_actions: 'More actions'
    },
    reactions: {
      reacted_by: 'Reacted by {users}'
    },
    sidebar: {
      marked_as_resolved: 'Marked as resolved',
      more_replies: (count: number) => `${count} more replies`
    }
  },
  generic: {
    ctrl_shortcut: 'Ctrl+'
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
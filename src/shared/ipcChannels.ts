// 统一的 IPC 通道定义，供主进程与预加载共享
// 保持与现有项目中使用的通道名称完全一致，避免破坏既有功能

export const IPC_CHANNELS = {
  // Settings
  GET_SETTINGS: 'setting:get-all',
  SET_SETTINGS: 'setting:set-all',
  GET_SETTING: 'setting:get',
  SET_SETTING: 'setting:set',
  GET_ALL_SETTINGS: 'settings:getAll',
  UPDATE_SETTING: 'settings:update',

  // AI / OpenAI
  TEST_OPENAI_CONNECTION: 'openai:test-connection',
  GENERATE_CONTENT: 'openai:generate-content',
  GENERATE_WITH_MESSAGES: 'openai:generate-with-messages',
  STREAM_GENERATE_CONTENT: 'openai:stream-generate-content',
  STOP_STREAM_GENERATE: 'openai:stop-stream-generate',

  // API Configs
  SAVE_API_CONFIG: 'api:save-config',
  DELETE_API_CONFIG: 'api:delete-config',

  // Markdown / Files
  SAVE_MARKDOWN: 'markdown:save',
  EXPORT_PDF: 'markdown:export-pdf',
  EXPORT_DOCX: 'markdown:export-docx',
  EXPORT_HTML: 'markdown:export-html',
  EXPORT_NOTION: 'markdown:export-notion',
  EXPORT_OBSIDIAN: 'markdown:export-obsidian',
  CHECK_FILE_EXISTS: 'markdown:checkFileExists',
  GET_MARKDOWN_FOLDERS: 'markdown:get-folders',
  GET_MARKDOWN_FILES: 'markdown:get-files',
  READ_MARKDOWN_FILE: 'markdown:read-file',
  CREATE_MARKDOWN_FOLDER: 'markdown:create-folder',
  DELETE_MARKDOWN_FOLDER: 'markdown:delete-folder',
  RENAME_MARKDOWN_FOLDER: 'markdown:rename-folder',
  CREATE_MARKDOWN_NOTE: 'markdown:create-note',
  DELETE_MARKDOWN_FILE: 'markdown:delete-file',
  RENAME_MARKDOWN_FILE: 'markdown:rename-file',
  UPLOAD_FILE: 'markdown:upload-file',

  // WebDAV Sync
  TEST_WEBDAV_CONNECTION: 'webdav:test-connection',
  SYNC_LOCAL_TO_REMOTE: 'webdav:sync-local-to-remote',
  SYNC_REMOTE_TO_LOCAL: 'webdav:sync-remote-to-local',
  SYNC_BIDIRECTIONAL: 'webdav:sync-bidirectional',
  CANCEL_SYNC: 'webdav:cancel-sync',
  CLEAR_WEBDAV_SYNC_CACHE: 'webdav:clear-sync-cache',
  WEBDAV_CONFIG_CHANGED: 'webdav:config-changed',
  VERIFY_MASTER_PASSWORD: 'webdav:verify-master-password',
  SET_MASTER_PASSWORD: 'webdav:set-master-password',

  // Cloud Storage
  CLOUD_TEST_CONNECTION: 'cloud:test-connection',
  CLOUD_AUTHENTICATE: 'cloud:authenticate',
  CLOUD_SYNC_LOCAL_TO_REMOTE: 'cloud:sync-local-to-remote',
  CLOUD_SYNC_REMOTE_TO_LOCAL: 'cloud:sync-remote-to-local',
  CLOUD_SYNC_BIDIRECTIONAL: 'cloud:sync-bidirectional',
  CLOUD_CANCEL_SYNC: 'cloud:cancel-sync',
  CLOUD_GET_PROVIDERS: 'cloud:get-providers',
  CLOUD_CONFIG_CHANGED: 'cloud:config-changed',

  // App / Window / Dialog
  GET_NOTES_PATH: 'app:get-notes-path',
  CHECK_FOR_UPDATES: 'app:check-for-updates',
  DIALOG_SHOW_SAVE: 'dialog:showSaveDialog',
  DIALOG_SHOW_OPEN: 'dialog:showOpenDialog',
  SET_WINDOW_BACKGROUND: 'window:set-background',
  NAVIGATE_TO_VIEW: 'app:navigate-to-view',

  // Analytics / Database
  GET_NOTE_HISTORY: 'markdown:get-history',
  GET_NOTE_HISTORY_BY_ID: 'markdown:get-history-by-id',
  GET_NOTE_HISTORY_STATS: 'analytics:get-note-history-stats',
  GET_USER_ACTIVITY_DATA: 'analytics:get-user-activity-data',
  GET_ANALYSIS_CACHE: 'analytics:get-analysis-cache',
  SAVE_ANALYSIS_CACHE: 'analytics:save-analysis-cache',
  RESET_ANALYSIS_CACHE: 'analytics:reset-analysis-cache',
  CHECK_DATABASE_STATUS: 'analytics:check-database-status',

  // Tags
  GET_GLOBAL_TAGS: 'tags:get-global-tags',
  REFRESH_GLOBAL_TAGS: 'tags:refresh-global-tags',
  GET_FILE_TAGS: 'tags:get-file-tags',
  SET_FILE_TAGS: 'tags:set-file-tags',

  // Mindmap
  MINDMAP_SAVE_FILE: 'mindmap:save-file',
  MINDMAP_LOAD_FILE: 'mindmap:load-file',
  MINDMAP_EXPORT_HTML: 'mindmap:export-html',

  // Batch Files
  BATCH_READ_FILES: 'files:batch-read',
  BATCH_WRITE_FILES: 'files:batch-write',

  // Memory
  MEMORY_GET_STATS: 'memory:get-stats',
  MEMORY_GET_REPORT: 'memory:get-report',
  MEMORY_CLEANUP: 'memory:cleanup',
  MEMORY_FORCE_GC: 'memory:force-gc',

  // Chat History
  CHAT_CREATE_SESSION: 'chat:create-session',
  CHAT_SAVE_MESSAGE: 'chat:save-message',
  CHAT_GET_SESSIONS: 'chat:get-sessions',
  CHAT_GET_SESSION_MESSAGES: 'chat:get-session-messages',
  CHAT_UPDATE_SESSION_TITLE: 'chat:update-session-title',
  CHAT_DELETE_SESSION: 'chat:delete-session',
  CHAT_DELETE_MESSAGE: 'chat:delete-message',
  CHAT_GET_SESSION_STATS: 'chat:get-session-stats',
  CHAT_CLEANUP_OLD_SESSIONS: 'chat:cleanup-old-sessions'
} as const

export type IPCChannelKey = keyof typeof IPC_CHANNELS

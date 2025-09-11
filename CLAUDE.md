# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Note-By is a high-performance, cross-platform note-taking application built with Electron and React. It features a powerful Tiptap-based editor, WebDAV synchronization, AI integration, and comprehensive data analysis capabilities.

## Technology Stack

- **Frontend**: React 18, TypeScript, Semi Design UI components
- **Editor**: Tiptap v3 (rich text editing with markdown support)
- **Desktop Framework**: Electron 36 with electron-vite
- **Database**: SQLite3 (via better-sqlite3) for local storage
- **State Management**: Zustand
- **Build Tool**: Vite 6, electron-builder
- **Styling**: Sass
- **AI Integration**: OpenAI API, Vercel AI SDK
- **Cloud Sync**: WebDAV, Dropbox, Google Drive APIs

## Essential Development Commands

```bash
# Install dependencies (includes native module rebuild for better-sqlite3)
npm install

# Development mode with hot reload
npm run dev

# Type checking (runs both node and web checks)
npm run typecheck

# Linting
npm run lint

# Format code
npm run format

# Build for production
npm run build

# Platform-specific builds
npm run build:win    # Windows
npm run build:mac    # macOS  
npm run build:linux  # Linux
```

## Project Architecture

### Directory Structure
- `src/main/` - Electron main process code
  - `index.ts` - Main entry point, IPC handlers, window management
  - `database.ts` - SQLite database operations and caching
  - `settings.ts` - Configuration management with atomic operations
  - `webdav.ts` - WebDAV synchronization logic
  - `openai.ts` - AI integration for content generation
  - `exporters.ts` - Document export functionality
  - `utils/` - Memory monitoring, error handling, file streaming
  
- `src/renderer/` - React application
  - `components/` - UI components
    - `Editor.tsx` - Tiptap-based rich text editor
    - `Navigation.tsx` - File/note navigation sidebar
    - `DataAnalysis.tsx` - Analytics and visualization
    - `ChatInterface.tsx` - AI chat functionality
    - `Settings/` - Configuration UI components
  - `context/theme/` - Theme management and dark mode
  - `locales/` - Internationalization support
  - `store/` - Zustand state management
  - `utils/` - Frontend utilities

- `src/preload/` - Preload scripts for IPC communication
- `src/shared/` - Shared types and utilities

### Key Architectural Patterns

1. **IPC Communication**: Main-renderer communication via contextBridge API
   - Settings operations: `window.api.settings.*`
   - File operations: `window.api.fs.*`
   - Database operations: `window.api.database.*`

2. **Database Layer**: 
   - Multi-level caching with LRU eviction
   - Connection pooling for performance
   - Atomic transactions for data integrity

3. **Editor Performance**:
   - Virtual scrolling for large documents
   - Debounced auto-save
   - Image optimization on upload

4. **Configuration Management**:
   - Settings stored in `settings.json`
   - WebDAV credentials encrypted with master password
   - Automatic backup and versioning

## Important Implementation Details

### Electron Configuration
- Uses electron-vite for build optimization
- Preload scripts use `externalizeDepsPlugin()` for proper module handling
- Development server runs on port 5173 with HMR on port 5174

### Database Operations
- SQLite database initialized on app start
- Tables: notes_history, webdav_sync_cache, analysis_cache, chat_sessions, chat_messages
- Automatic cleanup of old data to maintain performance

### WebDAV Synchronization
- Bidirectional, manual, and automatic sync modes
- Conflict resolution based on timestamps
- Cache system to track sync state

### AI Integration  
- Supports multiple providers (OpenAI, Claude, custom endpoints)
- Streaming responses for chat interface
- Message history management with SQLite

### Performance Optimizations
- Memory monitoring with automatic cleanup triggers
- Smart connection pooling for database
- Virtual list rendering for large datasets
- Chunk-based file streaming for exports

## Development Notes

- The application uses Semi Design components - check their documentation for UI patterns
- Tiptap editor is highly customized - review existing extensions before adding new ones
- All file paths in IPC calls should be absolute
- WebDAV sync state is cached locally to minimize network requests
- Settings changes trigger immediate persistence to disk
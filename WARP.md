# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Parch is a cross-platform desktop application built with Tauri that provides a floating window for creating and viewing Mermaid diagrams. It features a split-pane interface with a Monaco text editor on the left for Mermaid syntax and a live diagram preview on the right.

## Commands

### Development
```bash
# Install dependencies and setup
npm run setup

# Start development server (primary command)
npm run tauri:dev

# Frontend-only development (for UI work)
npm run dev

# Type checking
npm run check
npm run lint
```

### Building
```bash
# Build frontend only
npm run build

# Build complete application for distribution
npm run tauri:build:release

# Build debug version
npm run tauri:build:debug
```

### Cleanup
```bash
# Clean build artifacts
npm run clean
```

### File Operations
Key keyboard shortcuts:
- `Ctrl+N` / `Cmd+N` - New file
- `Ctrl+O` / `Cmd+O` - Open file
- `Ctrl+S` / `Cmd+S` - Save file
- `Ctrl+Shift+S` / `Cmd+Shift+S` - Save as

## Architecture

### Frontend Architecture (React + TypeScript)

**Core Application State Flow:**
- `App.tsx` is the root component managing window settings, file state, and the split-pane interface
- State is managed through custom hooks: `useFileManager` for file operations and `useTextEditor` for diagram parsing
- The application uses a reactive pattern where text changes trigger Mermaid parsing via the backend

**Key Components:**
- `TextEditor` - Monaco Editor with Mermaid syntax highlighting and error indicators
- `DiagramViewer` - Renders multiple parsed Mermaid diagrams with interaction capabilities
- Custom hooks provide state management and business logic separation

**File Management:**
The application uses a file-centric architecture where:
- Files are managed through the `useFileManager` hook
- State includes current file, unsaved changes tracking, and error handling
- All file operations go through Tauri backend commands

### Backend Architecture (Rust + Tauri)

**Core Modules:**
- `lib.rs` - Main entry point with all Tauri command handlers
- `mermaid_parser.rs` - Regex-based Mermaid syntax parser with validation
- `file_manager.rs` - File I/O operations with dialog support

**Command Categories:**
1. **Window Management** - Always on top, click-through, opacity, position/size persistence
2. **Mermaid Processing** - Content parsing, diagram validation, type detection
3. **File Operations** - Create, open, save operations with dialog integration

**State Management:**
- Window settings stored in global `WINDOW_STATE` HashMap
- Mermaid parser instance shared via `LazyLock` for performance
- File operations are stateless, managed by the frontend

### Split-Pane Architecture

The application uses a custom split-pane implementation:
- Dynamic resizing via mouse drag on divider
- Position persisted in window settings
- Real-time content synchronization between editor and viewer panes

### Mermaid Integration

**Parsing Pipeline:**
1. Text content parsed for `\`\`\`mermaid` blocks
2. Each block validated and assigned unique ID
3. Diagram type detected via regex patterns
4. Rendering handled client-side via Mermaid.js library

**Supported Diagram Types:**
- Flowcharts, Sequence, Class, State, ER, Gantt, Pie, Journey, GitGraph, Requirements, C4Context, Mindmap, Timeline

## Testing

Currently, the test infrastructure mentions future test implementation. When adding tests:
- Rust tests should go in `src-tauri/src/` with `#[cfg(test)]` modules
- Frontend tests would use the React testing library
- The Mermaid parser already has unit tests as examples

## Configuration Files

### Key Configuration Files
- `src-tauri/tauri.conf.json` - Main Tauri configuration (window settings, security, bundle)
- `src-tauri/Cargo.toml` - Rust dependencies and build configuration  
- `package.json` - Frontend dependencies and npm scripts
- `vite.config.ts` - Build tool configuration

### Environment Setup
- Uses `.env.example` for environment variable templates
- Development server runs on port 1420 (frontend) and 1421 (HMR)

## Development Workflow

### Adding New Features

1. **Mermaid Features**: Extend `mermaid_parser.rs` with new diagram type patterns
2. **Window Features**: Add new Tauri commands in `lib.rs` with corresponding frontend API calls
3. **UI Features**: Use the existing hook pattern for state management and component composition

### File Structure Conventions
```
src/
├── components/     # React components
├── hooks/         # Custom hooks for state/logic
├── lib/          # API wrappers and utilities  
├── types/        # TypeScript type definitions
└── *.css         # Component-specific styles

src-tauri/src/
├── lib.rs        # Main Tauri integration
├── main.rs       # Application entry point
├── mermaid_parser.rs  # Core parsing logic
└── file_manager.rs    # File I/O operations
```

### Common Patterns

**Adding Tauri Commands:**
1. Define command function in appropriate Rust module
2. Add to `invoke_handler!` macro in `lib.rs`  
3. Add TypeScript wrapper in `src/lib/tauri-api.ts`
4. Use in components via the `TauriAPI` class

**State Management:**
- Use custom hooks for complex state logic
- Keep component state minimal and focused
- Prefer controlled components with callbacks

## Specification-Driven Development

This project follows a spec-driven approach with detailed requirements in `.kiro/specs/uml-float/`. Refer to these documents for:
- Complete feature requirements and acceptance criteria
- Implementation tasks and priorities  
- Design decisions and architectural rationale

## Platform Notes

### Windows Specific
- Custom title bar implementation due to `decorations: false` in config
- Window control buttons handled manually in React

### Cross-Platform Considerations
- File dialogs use Tauri's cross-platform dialog plugin
- Window management APIs abstracted through Tauri
- Path handling uses Rust's cross-platform path utilities
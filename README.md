# Parch - UML Float

Parch is a lightweight, cross-platform desktop application designed to help developers plan software using text-based UML with live diagram visualization. The application provides a floating window with a split-pane interface: a left pane for UML text editing and a right pane for real-time diagram rendering.

## Features

- **Floating Window**: Always-on-top window that stays accessible alongside your IDE
- **Split-Pane Interface**: Text editor on the left, live diagram preview on the right
- **Mermaid Support**: Create UML diagrams using Mermaid syntax
- **Window Management**: Opacity control, click-through mode, and customizable positioning
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **File Management**: Create, save, and manage Mermaid diagram files
- **Cloud Sync**: Authenticate with Google/GitHub and sync diagrams across devices (coming soon)
- **Diagram Sharing**: Export and share diagrams in multiple formats (coming soon)

## Technology Stack

- **Framework**: Tauri (Rust backend + WebView frontend)
- **Backend**: Rust with Tauri APIs
- **Frontend**: React with TypeScript
- **Build Tool**: Vite + Tauri CLI

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [Rust](https://rustup.rs/) (latest stable)
- [Tauri CLI](https://tauri.app/v1/guides/getting-started/prerequisites)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd parch
```

2. Install dependencies:
```bash
npm run setup
```

3. Start development server:
```bash
npm run tauri:dev
```

### Available Scripts

- `npm run dev` - Start Vite development server
- `npm run tauri:dev` - Start Tauri development mode
- `npm run build` - Build the frontend
- `npm run tauri:build` - Build the complete application
- `npm run tauri:build:debug` - Build debug version
- `npm run tauri:build:release` - Build release version
- `npm run check` - Type check TypeScript
- `npm run lint` - Lint TypeScript files
- `npm run clean` - Clean build artifacts
- `npm run setup` - Install all dependencies

## Project Structure

```
parch/
├── src/                    # Frontend React application
│   ├── components/         # React components
│   ├── lib/               # Utility libraries and API wrappers
│   ├── types/             # TypeScript type definitions
│   └── App.tsx            # Main application component
├── src-tauri/             # Rust backend
│   ├── src/               # Rust source code
│   ├── capabilities/      # Tauri permission definitions
│   ├── icons/            # Application icons
│   └── tauri.conf.json   # Tauri configuration
├── public/               # Static assets
└── dist/                # Built frontend (generated)
```

## Configuration

The application uses several configuration files:

- `src-tauri/tauri.conf.json` - Main Tauri configuration
- `src-tauri/capabilities/default.json` - Permission definitions
- `src-tauri/Cargo.toml` - Rust dependencies
- `package.json` - Node.js dependencies and scripts
- `.env.example` - Environment variables template

## Building for Production

To build the application for distribution:

```bash
npm run tauri:build:release
```

This will create platform-specific installers in `src-tauri/target/release/bundle/`.

## Contributing

This project follows a spec-driven development approach. See the `.kiro/specs/uml-float/` directory for detailed requirements, design, and implementation tasks.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

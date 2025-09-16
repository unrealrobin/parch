import { useState, useEffect, useRef, useCallback } from "react";
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';

import { TauriAPI } from "./lib/tauri-api";
import type { WindowSettings } from "./types/tauri";
import TextEditor from "./components/TextEditor";
import DiagramViewer from "./components/DiagramViewer";
import { useTextEditor } from "./hooks/useTextEditor";
import { useSimpleFileManager } from "./hooks/useSimpleFileManager";
import type { ParsedDiagram } from "./types/editor";
import "./App.css";
import "./components/TextEditor.css";
import "./components/DiagramViewer.css";

function App() {
  const [windowSettings, setWindowSettings] = useState<WindowSettings>({
    alwaysOnTop: false,
    clickThrough: false,
    opacity: 1.0,
    splitPaneSize: 0.5
  });
  const [showSettings, setShowSettings] = useState(false);
  const [splitPosition, setSplitPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [activeDiagramIndex, setActiveDiagramIndex] = useState(-1);

  // File management state
  const [fileManagerState, fileManagerActions] = useSimpleFileManager();
  
  // Debug file manager state changes (can be removed later)
  useEffect(() => {
    if (fileManagerState.error) {
      console.error('File manager error:', fileManagerState.error);
    }
  }, [fileManagerState.error]);

  // Save theme preference when it changes
  useEffect(() => {
    localStorage.setItem('parch-theme', theme);
  }, [theme]);

  // Handle file opening - simplified
  const handleOpenFile = useCallback(async () => {
    console.log('🚀 STARTING FILE OPEN PROCESS');
    await fileManagerActions.openFile();
    console.log('🚀 FILE OPEN PROCESS COMPLETE');
  }, [fileManagerActions]);

  // File content is automatically synced through editorContent derivation
  // No need for a separate sync effect since editorContent is derived from fileManagerState

  // Update window title based on file state
  useEffect(() => {
    const title = fileManagerState.currentFile 
      ? `${fileManagerState.currentFile.name}${fileManagerState.hasUnsavedChanges ? ' *' : ''} - Parch`
      : 'Parch - UML Float';
    
    console.log('📋 TITLE UPDATE:', title);
    console.log('  - File name:', fileManagerState.currentFile?.name);
    console.log('  - File path:', fileManagerState.currentFile?.path);
    console.log('  - Has unsaved changes:', fileManagerState.hasUnsavedChanges);
    
    document.title = title;
  }, [fileManagerState.currentFile?.name, fileManagerState.currentFile?.path, fileManagerState.hasUnsavedChanges]);
  
  // Use file manager as single source of truth for content
  const editorContent = fileManagerState.currentFile?.content || "";
  
  // We don't need setEditorContent since editorContent is derived from fileManagerState
  
  // Text editor state management for diagrams (keeping for diagram parsing)
  const {
    content: _,
    setContent: setTextEditorContent,
    diagrams,
    errors: _errors,
    setCursorPosition
  } = useTextEditor({
    initialContent: "",
    validateOnChange: true,
    debounceMs: 300
  });

  // Sync editor content with text editor for diagram parsing
  useEffect(() => {
    setTextEditorContent(editorContent);
  }, [editorContent, setTextEditorContent]);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    TauriAPI.getWindowSettings().then(settings => {
      setWindowSettings(settings);
      setSplitPosition(settings.splitPaneSize * 100);
      // Apply initial opacity
      document.body.style.opacity = settings.opacity.toString();
    }).catch(console.error);

    // Load saved theme or detect system preference
    const savedTheme = localStorage.getItem('parch-theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      setTheme(mediaQuery.matches ? 'dark' : 'light');
    }

    // Listen for opacity changes from the backend
    const unlistenOpacity = listen<number>('opacity-changed', (event) => {
      document.body.style.opacity = event.payload.toString();
    });

    // Listen for window resize events to track maximize state
    const appWindow = getCurrentWindow();
    const unlistenResize = appWindow.onResized(() => {
      TauriAPI.isWindowMaximized().then(setIsMaximized).catch(console.error);
    });

    // Check initial maximize state
    TauriAPI.isWindowMaximized().then(setIsMaximized).catch(console.error);

    return () => {
      unlistenOpacity.then(fn => fn());
      unlistenResize.then(fn => fn());
    };
  }, []);

  // Save window state when settings change
  useEffect(() => {
    const saveState = async () => {
      try {
        await TauriAPI.saveWindowState();
      } catch (error) {
        console.error('Failed to save window state:', error);
      }
    };

    const timeoutId = setTimeout(saveState, 500);
    return () => clearTimeout(timeoutId);
  }, [windowSettings]);

  const handleSettingChange = async (key: keyof WindowSettings, value: boolean) => {
    const newSettings = { ...windowSettings, [key]: value };
    setWindowSettings(newSettings);

    try {
      switch (key) {
        case 'alwaysOnTop':
          await TauriAPI.setAlwaysOnTop(value);
          break;
        case 'clickThrough':
          await TauriAPI.setClickThrough(value);
          break;
      }
    } catch (error) {
      console.error(`Failed to update ${key}:`, error);
    }
  };

  const handleOpacityChange = async (opacity: number) => {
    const newSettings = { ...windowSettings, opacity };
    setWindowSettings(newSettings);

    try {
      await TauriAPI.setOpacity(opacity);
      // Apply opacity to the document body for visual feedback
      document.body.style.opacity = opacity.toString();
    } catch (error) {
      console.error('Failed to update opacity:', error);
    }
  };

  // Window control functions
  const handleMinimize = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Minimize button clicked');
    try {
      await TauriAPI.minimizeWindow();
    } catch (error) {
      console.error('Failed to minimize window:', error);
      // Fallback to direct API
      try {
        const appWindow = getCurrentWindow();
        await appWindow.minimize();
      } catch (fallbackError) {
        console.error('Fallback minimize failed:', fallbackError);
      }
    }
  };

  const handleMaximize = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Maximize button clicked, current state:', isMaximized);
    try {
      const currentMaximized = await TauriAPI.isWindowMaximized();
      
      if (currentMaximized) {
        await TauriAPI.unmaximizeWindow();
        setIsMaximized(false);
      } else {
        await TauriAPI.maximizeWindow();
        setIsMaximized(true);
      }
    } catch (error) {
      console.error('Failed to toggle maximize:', error);
      // Fallback to direct API
      try {
        const appWindow = getCurrentWindow();
        const currentMaximized = await appWindow.isMaximized();
        
        if (currentMaximized) {
          await appWindow.unmaximize();
          setIsMaximized(false);
        } else {
          await appWindow.maximize();
          setIsMaximized(true);
        }
      } catch (fallbackError) {
        console.error('Fallback maximize failed:', fallbackError);
      }
    }
  };

  const handleClose = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Close button clicked');
    try {
      await TauriAPI.closeWindow();
    } catch (error) {
      console.error('Failed to close window with TauriAPI:', error);
      // Try multiple fallback methods
      try {
        const appWindow = getCurrentWindow();
        await appWindow.close();
      } catch (windowError) {
        console.error('Failed to close window with window.close():', windowError);
        // If all else fails, the window should close
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const newPosition = ((e.clientX - rect.left) / rect.width) * 100;
    const clampedPosition = Math.max(15, Math.min(85, newPosition));

    setSplitPosition(clampedPosition);
    TauriAPI.setSplitPaneSize(clampedPosition / 100).catch(console.error);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging]);

  // Diagram interaction handlers
  const handleDiagramClick = (index: number) => {
    setActiveDiagramIndex(index);
    const diagram = diagrams[index];
    if (diagram) {
      // Focus the editor on the diagram's start line
      setCursorPosition({ line: diagram.startLine, column: 1 });
    }
  };

  const handleDiagramShare = (diagram: ParsedDiagram) => {
    // TODO: Implement sharing functionality in future tasks
    console.log('Share diagram:', diagram.id);
    alert(`Sharing functionality will be implemented in task 9.\nDiagram: ${diagram.type} (${diagram.id})`);
  };

  const handleDiagramExport = (diagram: ParsedDiagram) => {
    // TODO: Implement export functionality in future tasks
    console.log('Export diagram:', diagram.id);
    alert(`Export functionality will be implemented in task 9.\nDiagram: ${diagram.type} (${diagram.id})`);
  };

  // Handle cursor position changes to update active diagram (simplified for now)
  // const handleCursorChange = (position: { line: number; column: number }) => {
  //   setCursorPosition(position);
    
  //   if (diagrams.length === 0) return;
    
  //   const diagramIndex = diagrams.findIndex(diagram => 
  //     position.line >= diagram.startLine && position.line <= diagram.endLine
  //   );
    
  //   setActiveDiagramIndex(diagramIndex);
  // };

  // Handle content changes from text editor
  const handleEditorContentChange = (content: string) => {
    console.log('🔥 EDITOR CONTENT CHANGE - START');
    console.log('  - New content length:', content.length);
    console.log('  - Current file before change:', fileManagerState.currentFile?.name);
    console.log('  - Current file path before change:', fileManagerState.currentFile?.path);
    
    // Update the file manager with the new content
    fileManagerActions.updateContent(content);
    
    console.log('🔥 EDITOR CONTENT CHANGE - END');
  };

  // Keyboard shortcuts for file operations
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'n':
            event.preventDefault();
            fileManagerActions.createNewFile();
            break;
          case 'o':
            event.preventDefault();
            handleOpenFile();
            break;
          case 's':
            event.preventDefault();
            if (event.shiftKey) {
              fileManagerActions.saveFileAs();
            } else {
              fileManagerActions.saveFile();
            }
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [fileManagerActions]);

  // Handle window close event to check for unsaved changes
  useEffect(() => {
    const handleBeforeUnload = async (event: BeforeUnloadEvent) => {
      if (fileManagerState.hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = 'You have unsaved changes. Are you sure you want to close?';
        return event.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [fileManagerState.hasUnsavedChanges]);

  return (
    <div className="app" ref={containerRef}>
      {/* Custom Title Bar */}
      <div className="title-bar" data-tauri-drag-region>
        <div className="title-bar-title">
          {fileManagerState.currentFile 
            ? `${fileManagerState.currentFile.name}${fileManagerState.hasUnsavedChanges ? ' *' : ''} - Parch`
            : 'Parch - UML Float'
          }
        </div>
        <div className="title-bar-actions">
          {showSettings ? (
            <button
              className="home-button"
              onClick={() => setShowSettings(false)}
              title="Back to workspace"
              type="button"
            >
              🏠 Home
            </button>
          ) : (
            <>
              <button
                className="file-button"
                onClick={fileManagerActions.createNewFile}
                title="New File (Ctrl+N)"
                type="button"
                disabled={fileManagerState.isLoading}
              >
                {fileManagerState.isLoading ? '⏳' : '📄'} New
              </button>
              <button
                className="file-button"
                onClick={handleOpenFile}
                title="Open File (Ctrl+O)"
                type="button"
                disabled={fileManagerState.isLoading}
              >
                {fileManagerState.isLoading ? '⏳' : '📁'} Open
              </button>
              <button
                className="file-button"
                onClick={fileManagerActions.saveFile}
                title="Save File (Ctrl+S)"
                type="button"
                disabled={fileManagerState.isLoading || !fileManagerState.currentFile}
              >
                {fileManagerState.isLoading ? '⏳' : '💾'} Save
              </button>
              <button
                className="file-button"
                onClick={fileManagerActions.saveFileAs}
                title="Save As (Ctrl+Shift+S)"
                type="button"
                disabled={fileManagerState.isLoading || !fileManagerState.currentFile}
              >
                {fileManagerState.isLoading ? '⏳' : '💾'} Save As
              </button>
              <button
                className="theme-toggle-button"
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
                type="button"
              >
                {theme === 'light' ? '🌙' : '☀️'}
              </button>
              <button
                className="settings-button-titlebar"
                onClick={() => setShowSettings(true)}
                title="Settings"
                type="button"
              >
                ⚙️
              </button>
            </>
          )}
        </div>
        <div className="title-bar-controls">
          <button 
            className="title-bar-button minimize" 
            onClick={handleMinimize} 
            onMouseDown={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            title="Minimize"
            type="button"
          >
            −
          </button>
          <button 
            className="title-bar-button maximize" 
            onClick={handleMaximize}
            onMouseDown={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            title={isMaximized ? "Restore" : "Maximize"}
            type="button"
          >
            {isMaximized ? "⧉" : "□"}
          </button>
          <button 
            className="title-bar-button close" 
            onClick={handleClose}
            onMouseDown={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            title="Close"
            type="button"
          >
            ×
          </button>
        </div>
      </div>

      {showSettings ? (
        <div className="settings-fullscreen">
          <div className="settings-container">
            <div className="settings-main">
              <h1 className="settings-title">Settings</h1>
              
              <div className="settings-sections">
                <section className="settings-section">
                  <h2 className="section-title">Appearance</h2>
                  <div className="settings-grid">
                    <div className="setting-card">
                      <div className="setting-header">
                        <h3>Theme</h3>
                        <p>Choose your preferred color scheme</p>
                      </div>
                      <div className="setting-control">
                        <select
                          value={theme}
                          onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}
                          className="theme-selector-large"
                        >
                          <option value="light">Light</option>
                          <option value="dark">Dark</option>
                        </select>
                      </div>
                    </div>

                    <div className="setting-card">
                      <div className="setting-header">
                        <h3>Window Opacity</h3>
                        <p>Adjust window transparency ({Math.round(windowSettings.opacity * 100)}%)</p>
                      </div>
                      <div className="setting-control">
                        <input
                          type="range"
                          min="10"
                          max="100"
                          value={windowSettings.opacity * 100}
                          onChange={(e) => handleOpacityChange(parseInt(e.target.value) / 100)}
                          className="opacity-slider-large"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                <section className="settings-section">
                  <h2 className="section-title">Window Behavior</h2>
                  <div className="settings-grid">
                    <div className="setting-card">
                      <div className="setting-header">
                        <h3>Always on Top</h3>
                        <p>Keep window above all other applications</p>
                      </div>
                      <div className="setting-control">
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={windowSettings.alwaysOnTop}
                            onChange={(e) => handleSettingChange('alwaysOnTop', e.target.checked)}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                    </div>

                    <div className="setting-card">
                      <div className="setting-header">
                        <h3>Click Through</h3>
                        <p>Allow clicks to pass through the window</p>
                      </div>
                      <div className="setting-control">
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={windowSettings.clickThrough}
                            onChange={(e) => handleSettingChange('clickThrough', e.target.checked)}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="settings-section">
                  <h2 className="section-title">Editor</h2>
                  <div className="settings-grid">
                    <div className="setting-card">
                      <div className="setting-header">
                        <h3>Split Pane Position</h3>
                        <p>Adjust the editor and preview pane sizes ({Math.round(splitPosition)}% / {Math.round(100 - splitPosition)}%)</p>
                      </div>
                      <div className="setting-control">
                        <input
                          type="range"
                          min="20"
                          max="80"
                          value={splitPosition}
                          onChange={(e) => {
                            const newPosition = parseInt(e.target.value);
                            setSplitPosition(newPosition);
                            TauriAPI.setSplitPaneSize(newPosition / 100).catch(console.error);
                          }}
                          className="split-slider"
                        />
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="split-container">
          <div
            className="editor-pane"
            style={{ width: `${splitPosition}%` }}
          >
            {fileManagerState.error && (
              <div className="file-error-banner">
                <span className="error-icon">⚠️</span>
                <span className="error-message">{fileManagerState.error}</span>
                <button 
                  className="error-dismiss"
                  onClick={fileManagerActions.clearError}
                  title="Dismiss error"
                >
                  ×
                </button>
              </div>
            )}

            <TextEditor
              content={editorContent}
              onChange={handleEditorContentChange}
              onCursorChange={(position) => {
                setCursorPosition(position);
                // Update active diagram based on cursor position
                if (diagrams.length > 0) {
                  const diagramIndex = diagrams.findIndex(diagram => 
                    position.line >= diagram.startLine && position.line <= diagram.endLine
                  );
                  setActiveDiagramIndex(diagramIndex);
                }
              }}
              errors={_errors}
              theme={theme}
            />
          </div>

          <div
            className={`split-divider ${isDragging ? 'dragging' : ''}`}
            onMouseDown={handleMouseDown}
          />

          <div
            className="diagram-pane"
            style={{ width: `${100 - splitPosition}%` }}
          >
            <DiagramViewer
              diagrams={diagrams}
              activeIndex={activeDiagramIndex}
              onDiagramClick={handleDiagramClick}
              onDiagramShare={handleDiagramShare}
              onDiagramExport={handleDiagramExport}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
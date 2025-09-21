import { useState, useEffect, useRef, useCallback } from "react";
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';

import { TauriAPI } from "./lib/tauri-api";
import type { WindowSettings, ApplicationState } from "./types/tauri";
import TextEditor from "./components/TextEditor";
import DiagramViewer from "./components/DiagramViewer";
import { ErrorBoundary, FileManagerErrorFallback } from "./components/ErrorBoundary";
import { useTextEditor } from "./hooks/useTextEditor";
import { useSimpleFileManager } from "./hooks/useSimpleFileManager";
import type { ParsedDiagram } from "./types/editor";
import { themes, defaultTheme, applyTheme, type ThemeId } from "./lib/themes";
import "./App.css";
import "./components/TextEditor.css";
import "./components/DiagramViewer.css";

// Theme system - 4 predefined themes

function App() {
  const [windowSettings, setWindowSettings] = useState<WindowSettings>({
    alwaysOnTop: false,
    clickThrough: false,
    opacity: 1.0, // Keep for compatibility but won't be used in UI
    splitPaneSize: 0.5
  });
  const [showSettings, setShowSettings] = useState(false);
  const [splitPosition, setSplitPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [theme, setTheme] = useState<ThemeId>(defaultTheme);
  const [activeDiagramIndex, setActiveDiagramIndex] = useState(-1);
  const [showTreeView, setShowTreeView] = useState(false);
  const [appState, setAppState] = useState<ApplicationState | null>(null);
  // Apply theme when theme changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // File management state
  const [fileManagerState, fileManagerActions] = useSimpleFileManager();
  
  // Debug file manager state changes (can be removed later)
  useEffect(() => {
    if (fileManagerState.error) {
      console.error('File manager error:', fileManagerState.error);
    }
  }, [fileManagerState.error]);

  // Create a default file on startup if no file exists and no file was restored
  useEffect(() => {
    if (!fileManagerState.currentFile && !fileManagerState.isLoading && appState !== null) {
      // Only create default file if no file state was restored from persistence
      if (!appState.lastFileContent) {
        console.log('🚀 Creating default file on startup');
        fileManagerActions.createNewFile();
      }
    }
  }, [fileManagerState.currentFile, fileManagerState.isLoading, appState, fileManagerActions]);

  // Save theme preference when it changes
  useEffect(() => {
    if (theme && appState !== null) { // Only save after initial load
      console.log('🔄 Saving theme:', theme);
      TauriAPI.updateTheme(theme).catch((error) => {
        console.error('❌ Failed to save theme:', error);
      });
    }
  }, [theme, appState]);

  // Save settings panel state when it changes
  useEffect(() => {
    if (appState !== null) { // Only save after initial load
      console.log('🔄 Saving settings panel state:', showSettings);
      TauriAPI.updateSettingsPanelState(showSettings).catch((error) => {
        console.error('❌ Failed to save settings panel state:', error);
      });
      
      // When closing settings, restore the split position from windowSettings
      if (!showSettings && windowSettings.splitPaneSize !== undefined) {
        const restoredPosition = windowSettings.splitPaneSize * 100;
        console.log('🔄 Restoring split position from settings:', restoredPosition);
        setSplitPosition(restoredPosition);
      }
    }
  }, [showSettings, appState, windowSettings.splitPaneSize]);

  // Save active diagram index when it changes
  useEffect(() => {
    if (appState !== null) { // Only save after initial load
      TauriAPI.updateActiveDiagramIndex(activeDiagramIndex).catch((error) => {
        console.error('❌ Failed to save active diagram index:', error);
      });
    }
  }, [activeDiagramIndex, appState]);

  // Save tree view state when it changes
  useEffect(() => {
    if (appState !== null) { // Only save after initial load
      console.log('🔄 Saving tree view state:', showTreeView);
      TauriAPI.updateTreeViewState(showTreeView).catch((error) => {
        console.error('❌ Failed to save tree view state:', error);
      });
    }
  }, [showTreeView, appState]);

  // File state persistence removed - no longer saving file content

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
    // Load window settings and application state
    Promise.all([
      TauriAPI.getWindowSettings(),
      TauriAPI.getApplicationState()
    ]).then(([windowSettings, applicationState]) => {
      console.log('🔄 Loading application state:', applicationState);
      console.log('🔄 Loading window settings:', windowSettings);
      console.log('🔄 Always on top from settings:', windowSettings.alwaysOnTop);
      console.log('🔄 Click through from settings:', windowSettings.clickThrough);
      
      // Set window settings
      setWindowSettings(windowSettings);
      console.log('🔄 Setting split position from loaded settings:', windowSettings.splitPaneSize * 100);
      setSplitPosition(windowSettings.splitPaneSize * 100);
      // Opacity is no longer used in the UI
      
      // Set application state
      setAppState(applicationState);
      setTheme(applicationState.theme as 'light' | 'dark');
      setShowSettings(applicationState.showSettings);
      setActiveDiagramIndex(applicationState.activeDiagramIndex);
      setShowTreeView(applicationState.showTreeView);
      
      // File content persistence removed - always start with new/open file options
      console.log('🔄 File content persistence disabled - starting fresh');
    }).catch(console.error);

    // Opacity listener removed - no longer using opacity in UI

    // Get the window instance for event listeners
    const appWindow = getCurrentWindow();

    // Listen for window resize events to track maximize state and save state
    const unlistenResize = appWindow.onResized(() => {
      TauriAPI.isWindowMaximized().then(setIsMaximized).catch(console.error);
      // Save window state when resized (debounced)
      TauriAPI.saveWindowState().catch(console.error);
    });

    // Listen for window move events to save position
    const unlistenMoved = appWindow.onMoved(() => {
      // Save window state when moved (debounced)
      TauriAPI.saveWindowState().catch(console.error);
    });

    // Check initial maximize state
    TauriAPI.isWindowMaximized().then(setIsMaximized).catch(console.error);

    return () => {
      unlistenResize.then(fn => fn());
      unlistenMoved.then(fn => fn());
    };
  }, []);

  // Window state is now saved immediately when changes occur

  const handleSettingChange = async (key: keyof WindowSettings, value: boolean) => {
    console.log('🔄 Setting change:', key, '=', value);
    const newSettings = { ...windowSettings, [key]: value };
    setWindowSettings(newSettings);

    try {
      switch (key) {
        case 'alwaysOnTop':
          console.log('🔄 Saving always on top:', value);
          await TauriAPI.setAlwaysOnTop(value);
          console.log('✅ Always on top saved successfully');
          break;
        case 'clickThrough':
          console.log('🔄 Saving click through:', value);
          await TauriAPI.setClickThrough(value);
          console.log('✅ Click through saved successfully');
          break;
      }
    } catch (error) {
      console.error(`❌ Failed to update ${key}:`, error);
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
    
    // Update window settings state
    setWindowSettings(prev => ({ ...prev, splitPaneSize: clampedPosition / 100 }));
    
    // Save to persistent storage
    console.log('🔄 Saving split pane position:', clampedPosition / 100);
    TauriAPI.setSplitPaneSize(clampedPosition / 100)
      .then(() => {
        console.log('✅ Split pane position saved successfully');
      })
      .catch((error) => {
        console.error('❌ Failed to save split pane position:', error);
      });
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
    
    try {
      // 🛡️ GUARD: Validate content before processing
      if (typeof content !== 'string') {
        console.error('🚨 GUARD VIOLATION: handleEditorContentChange received non-string content:', typeof content);
        return;
      }

      // 🛡️ GUARD: Ensure fileManagerActions exists and has updateContent method
      if (!fileManagerActions || typeof fileManagerActions.updateContent !== 'function') {
        console.error('🚨 GUARD VIOLATION: fileManagerActions.updateContent is not available');
        return;
      }

      // Update the file manager with the new content
      fileManagerActions.updateContent(content);
      
      console.log('🔥 EDITOR CONTENT CHANGE - SUCCESS');
    } catch (error) {
      console.error('🚨 ERROR in handleEditorContentChange:', error);
      // Don't crash the app, but show user-friendly error
      if (error instanceof Error) {
        console.error('Error details:', error.message, error.stack);
      }
    }
    
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
    <ErrorBoundary fallback={FileManagerErrorFallback}>
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
New
              </button>
              <button
                className="file-button"
                onClick={handleOpenFile}
                title="Open File (Ctrl+O)"
                type="button"
                disabled={fileManagerState.isLoading}
              >
Open
              </button>
              <button
                className="file-button"
                onClick={fileManagerActions.saveFile}
                title="Save File (Ctrl+S)"
                type="button"
                disabled={fileManagerState.isLoading || !fileManagerState.currentFile}
              >
                Save
              </button>
              <button
                className="file-button"
                onClick={fileManagerActions.saveFileAs}
                title="Save As (Ctrl+Shift+S)"
                type="button"
                disabled={fileManagerState.isLoading || !fileManagerState.currentFile}
              >
                Save As
              </button>
              <button
                className="settings-button-titlebar"
                onClick={() => setShowSettings(true)}
                title="Settings"
                type="button"
              >
                Settings
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
                          onChange={(e) => setTheme(e.target.value as ThemeId)}
                          className="theme-selector-large"
                        >
                          {Object.values(themes).map((themeOption) => (
                            <option key={themeOption.id} value={themeOption.id}>
                              {themeOption.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                  </div>
                </section>


                <section className="settings-section">
                  <h2 className="section-title">Editor</h2>
                  <div className="settings-grid">
                    <div className="setting-card">
                      <div className="setting-header">
                        <h3>Minimap</h3>
                        <p>Show zoomed-out overview on the side of the text editor</p>
                      </div>
                      <div className="setting-control">
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={showTreeView || false}
                            onChange={(e) => setShowTreeView(e.target.checked)}
                          />
                          <span className="toggle-slider"></span>
                        </label>
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
                            checked={windowSettings.alwaysOnTop || false}
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
                            checked={windowSettings.clickThrough || false}
                            onChange={(e) => handleSettingChange('clickThrough', e.target.checked)}
                          />
                          <span className="toggle-slider"></span>
                        </label>
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
            // Save cursor position to persistent state
            TauriAPI.updateCursorPosition(position.line, position.column).catch(console.error);
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
          showTreeView={showTreeView}
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
    </ErrorBoundary>
  );
}

export default App;
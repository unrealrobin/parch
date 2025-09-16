import { useState, useEffect, useRef } from "react";
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';

import { TauriAPI } from "./lib/tauri-api";
import type { WindowSettings } from "./types/tauri";
import TextEditor from "./components/TextEditor";
import { useTextEditor } from "./hooks/useTextEditor";
import "./App.css";
import "./components/TextEditor.css";

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

  // Save theme preference when it changes
  useEffect(() => {
    localStorage.setItem('parch-theme', theme);
  }, [theme]);
  
  // Text editor state management
  const {
    content: editorContent,
    setContent: setEditorContent,
    diagrams,
    errors,
    isValidating,
    setCursorPosition
  } = useTextEditor({
    initialContent: "```mermaid\ngraph TD\n    A[Start] --> B[Process]\n    B --> C[End]\n```",
    validateOnChange: true,
    debounceMs: 300
  });

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

  return (
    <div className="app" ref={containerRef}>
      {/* Custom Title Bar */}
      <div className="title-bar" data-tauri-drag-region>
        <div className="title-bar-title">Parch - UML Float</div>
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
            <TextEditor
              content={editorContent}
              onChange={setEditorContent}
              onCursorChange={setCursorPosition}
              errors={errors}
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
          <div className="diagram-content">
            {diagrams.length > 0 ? (
              <div className="diagrams-container">
                <div className="diagrams-header">
                  <h3>Diagrams ({diagrams.length})</h3>
                  {isValidating && <span className="validating">Validating...</span>}
                  {errors.length > 0 && (
                    <span className="error-count">
                      {errors.length} error{errors.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className="diagrams-list">
                  {diagrams.map((diagram) => (
                    <div 
                      key={diagram.id} 
                      className={`diagram-item ${diagram.hasError ? 'has-error' : 'valid'}`}
                    >
                      <div className="diagram-header">
                        <span className="diagram-type">{diagram.type}</span>
                        <span className="diagram-lines">
                          Lines {diagram.startLine}-{diagram.endLine}
                        </span>
                        {diagram.hasError && (
                          <span className="error-indicator">⚠️</span>
                        )}
                      </div>
                      {diagram.hasError && diagram.errorMessage && (
                        <div className="diagram-error">
                          {diagram.errorMessage}
                        </div>
                      )}
                      <div className="diagram-preview">
                        {diagram.hasError ? (
                          <div className="error-placeholder">
                            Fix syntax errors to see diagram
                          </div>
                        ) : (
                          <div className="render-placeholder">
                            Diagram rendering will be implemented in task 4
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <h3>No diagrams found</h3>
                <p>Start typing Mermaid syntax in code blocks:</p>
                <pre className="example-code">
{`\`\`\`mermaid
graph TD
    A[Start] --> B[Process]
    B --> C[End]
\`\`\``}
                </pre>
              </div>
            )}
          </div>
        </div>
        </div>
      )}
    </div>
  );
}

export default App;
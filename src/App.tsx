import { useState, useEffect, useRef } from "react";
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';

import { TauriAPI } from "./lib/tauri-api";
import type { WindowSettings } from "./types/tauri";
import "./App.css";

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
  const [editorContent, setEditorContent] = useState("");
  const [isMaximized, setIsMaximized] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    TauriAPI.getWindowSettings().then(settings => {
      setWindowSettings(settings);
      setSplitPosition(settings.splitPaneSize * 100);
      // Apply initial opacity
      document.body.style.opacity = settings.opacity.toString();
    }).catch(console.error);

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

      {showSettings && (
        <div className="settings-overlay">
          <div className="settings-panel">
            <div className="settings-header">
              <h3>Settings</h3>
              <button
                className="close-button"
                onClick={() => setShowSettings(false)}
              >
                ×
              </button>
            </div>

            <div className="settings-content">
              <div className="setting-item">
                <label>
                  <input
                    type="checkbox"
                    checked={windowSettings.alwaysOnTop}
                    onChange={(e) => handleSettingChange('alwaysOnTop', e.target.checked)}
                  />
                  Always on Top
                </label>
              </div>

              <div className="setting-item">
                <label>
                  <input
                    type="checkbox"
                    checked={windowSettings.clickThrough}
                    onChange={(e) => handleSettingChange('clickThrough', e.target.checked)}
                  />
                  Click Through
                </label>
              </div>

              <div className="setting-item">
                <label>
                  Opacity: {Math.round(windowSettings.opacity * 100)}%
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={windowSettings.opacity * 100}
                    onChange={(e) => handleOpacityChange(parseInt(e.target.value) / 100)}
                    className="opacity-slider"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        className="settings-button"
        onClick={() => setShowSettings(!showSettings)}
        title="Settings"
      >
        ⚙️
      </button>

      <div className="split-container">
        <div
          className="editor-pane"
          style={{ width: `${splitPosition}%` }}
        >
          <textarea
            className="editor-textarea"
            placeholder="Enter your Mermaid diagram here..."
            value={editorContent}
            onChange={(e) => setEditorContent(e.target.value)}
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
            {editorContent ? (
              <div className="diagram-placeholder">
                Diagram will render here
              </div>
            ) : (
              <div className="empty-state">
                Start typing Mermaid syntax to see your diagram
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
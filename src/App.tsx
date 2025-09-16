import { useState, useEffect } from "react";
import { TauriAPI } from "./lib/tauri-api";
import type { WindowSettings } from "./types/tauri";
import "./App.css";

function App() {
  const [appVersion, setAppVersion] = useState<string>("");
  const [windowSettings, setWindowSettings] = useState<WindowSettings>({
    alwaysOnTop: false,
    clickThrough: false
  });

  useEffect(() => {
    // Load app version on startup
    TauriAPI.getAppVersion().then(setAppVersion).catch(console.error);
  }, []);

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

  return (
    <main className="container">
      <h1>Parch - UML Float</h1>
      <p>Version: {appVersion}</p>
      
      <div className="settings-panel">
        <h2>Window Settings</h2>
        
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
      </div>

      <div className="main-content">
        <div className="editor-pane">
          <h3>Text Editor</h3>
          <textarea 
            placeholder="Mermaid diagram content will go here..."
            style={{ width: '100%', height: '200px', resize: 'vertical' }}
          />
        </div>
        
        <div className="diagram-pane">
          <h3>Diagram Preview</h3>
          <div style={{ 
            width: '100%', 
            height: '200px', 
            border: '1px solid #ccc', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: '#f9f9f9'
          }}>
            Diagram rendering will appear here
          </div>
        </div>
      </div>
    </main>
  );
}

export default App;
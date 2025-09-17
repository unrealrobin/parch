use serde::{Deserialize, Serialize};
use std::sync::{Mutex, LazyLock, Arc};
use tauri::{WebviewWindow, Emitter};
use tauri_plugin_store::{Store, StoreExt};
use anyhow::{Result, Context};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowSettings {
    #[serde(rename = "alwaysOnTop")]
    pub always_on_top: bool,
    #[serde(rename = "clickThrough")]
    pub click_through: bool,
    pub opacity: f64,
    pub position: Option<(i32, i32)>,
    pub size: Option<(u32, u32)>,
    #[serde(rename = "splitPaneSize")]
    pub split_pane_size: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApplicationState {
    pub theme: String, // "light" or "dark"
    #[serde(rename = "showSettings")]
    pub show_settings: bool,
    #[serde(rename = "activeDiagramIndex")]
    pub active_diagram_index: i32,
    #[serde(rename = "cursorPosition")]
    pub cursor_position: Option<(u32, u32)>, // (line, column)
    #[serde(rename = "lastFilePath")]
    pub last_file_path: Option<String>,
    #[serde(rename = "lastFileContent")]
    pub last_file_content: Option<String>,
    #[serde(rename = "lastFileName")]
    pub last_file_name: Option<String>,
    #[serde(rename = "hasUnsavedChanges")]
    pub has_unsaved_changes: bool,
    #[serde(rename = "showTreeView")]
    pub show_tree_view: bool,
}

impl Default for WindowSettings {
    fn default() -> Self {
        Self {
            always_on_top: false,
            click_through: false,
            opacity: 1.0,
            position: None,
            size: None,
            split_pane_size: 0.5,
        }
    }
}

impl Default for ApplicationState {
    fn default() -> Self {
        Self {
            theme: "light".to_string(),
            show_settings: false,
            active_diagram_index: -1,
            cursor_position: None,
            last_file_path: None,
            last_file_content: None,
            last_file_name: None,
            has_unsaved_changes: false,
            show_tree_view: false, // Off by default as requested
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowState {
    pub settings: WindowSettings,
    pub app_state: ApplicationState,
    pub last_saved: chrono::DateTime<chrono::Utc>,
}

// Old window state structure for migration
#[derive(Debug, Clone, Serialize, Deserialize)]
struct OldWindowState {
    pub settings: WindowSettings,
    pub last_saved: chrono::DateTime<chrono::Utc>,
}

impl Default for WindowState {
    fn default() -> Self {
        Self {
            settings: WindowSettings::default(),
            app_state: ApplicationState::default(),
            last_saved: chrono::Utc::now(),
        }
    }
}

// Global state manager
static WINDOW_STATE_MANAGER: LazyLock<Mutex<Option<WindowStateManager>>> = LazyLock::new(|| {
    Mutex::new(None)
});

pub struct WindowStateManager {
    store: Arc<Store<tauri::Wry>>,
    current_state: WindowState,
}

impl WindowStateManager {
    const STORE_PATH: &'static str = "window-state.json";
    const SETTINGS_KEY: &'static str = "window_settings";

    pub fn new(app_handle: &tauri::AppHandle) -> Result<Self> {
        let store = app_handle
            .store_builder(Self::STORE_PATH)
            .build()
            .context("Failed to create store")?;

        let current_state = Self::load_state_from_store(&*store)?;

        Ok(Self {
            store,
            current_state,
        })
    }

    pub fn initialize(app_handle: &tauri::AppHandle) -> Result<()> {
        let manager = Self::new(app_handle)?;
        
        if let Ok(mut global_manager) = WINDOW_STATE_MANAGER.lock() {
            *global_manager = Some(manager);
        }

        Ok(())
    }

    pub fn get_current_settings() -> WindowSettings {
        if let Ok(manager_guard) = WINDOW_STATE_MANAGER.lock() {
            if let Some(manager) = manager_guard.as_ref() {
                return manager.current_state.settings.clone();
            }
        }
        WindowSettings::default()
    }

    pub fn get_current_app_state() -> ApplicationState {
        if let Ok(manager_guard) = WINDOW_STATE_MANAGER.lock() {
            if let Some(manager) = manager_guard.as_ref() {
                return manager.current_state.app_state.clone();
            }
        }
        ApplicationState::default()
    }

    pub fn update_setting<F>(updater: F) -> Result<()>
    where
        F: FnOnce(&mut WindowSettings),
    {
        if let Ok(mut manager_guard) = WINDOW_STATE_MANAGER.lock() {
            if let Some(manager) = manager_guard.as_mut() {
                updater(&mut manager.current_state.settings);
                manager.current_state.last_saved = chrono::Utc::now();
                return manager.save_state();
            }
        }
        Err(anyhow::anyhow!("Window state manager not initialized"))
    }

    pub fn update_app_state<F>(updater: F) -> Result<()>
    where
        F: FnOnce(&mut ApplicationState),
    {
        if let Ok(mut manager_guard) = WINDOW_STATE_MANAGER.lock() {
            if let Some(manager) = manager_guard.as_mut() {
                updater(&mut manager.current_state.app_state);
                manager.current_state.last_saved = chrono::Utc::now();
                return manager.save_state();
            }
        }
        Err(anyhow::anyhow!("Window state manager not initialized"))
    }

    pub fn save_window_geometry(window: &WebviewWindow) -> Result<()> {
        let position = window.outer_position().ok().map(|pos| (pos.x, pos.y));
        let size = window.outer_size().ok().map(|size| (size.width, size.height));

        Self::update_setting(|settings| {
            settings.position = position;
            settings.size = size;
        })
    }

    pub fn restore_window_state(window: &WebviewWindow) -> Result<()> {
        let settings = Self::get_current_settings();

        // Restore position
        if let Some((x, y)) = settings.position {
            let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition { x, y }));
        }

        // Restore size
        if let Some((width, height)) = settings.size {
            let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize { width, height }));
        }

        // Restore window properties
        let _ = window.set_always_on_top(settings.always_on_top);
        let _ = window.set_ignore_cursor_events(settings.click_through);

        // Emit opacity event to frontend
        if settings.opacity != 1.0 {
            let _ = window.emit("opacity-changed", settings.opacity);
        }

        Ok(())
    }

    fn load_state_from_store(store: &Store<tauri::Wry>) -> Result<WindowState> {
        match store.get(Self::SETTINGS_KEY) {
            Some(value) => {
                // Try to deserialize as new format first
                match serde_json::from_value::<WindowState>(value.clone()) {
                    Ok(state) => Ok(state),
                    Err(_) => {
                        // If that fails, clear the old state and start fresh
                        println!("Old window state format detected, clearing and starting fresh");
                        store.delete(Self::SETTINGS_KEY.to_string());
                        store.save().context("Failed to clear old state")?;
                        Ok(WindowState::default())
                    }
                }
            }
            None => Ok(WindowState::default()),
        }
    }

    fn save_state(&mut self) -> Result<()> {
        let value = serde_json::to_value(&self.current_state)
            .context("Failed to serialize window state")?;
        
        self.store
            .set(Self::SETTINGS_KEY.to_string(), value);
        
        self.store
            .save()
            .context("Failed to persist store to disk")?;

        Ok(())
    }
}

// Tauri command implementations
#[tauri::command]
pub async fn set_always_on_top(window: WebviewWindow, enabled: bool) -> Result<(), String> {
    window.set_always_on_top(enabled).map_err(|e| e.to_string())?;
    
    WindowStateManager::update_setting(|settings| {
        settings.always_on_top = enabled;
    }).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub async fn set_click_through(window: WebviewWindow, enabled: bool) -> Result<(), String> {
    window.set_ignore_cursor_events(enabled).map_err(|e| e.to_string())?;
    
    WindowStateManager::update_setting(|settings| {
        settings.click_through = enabled;
    }).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub async fn set_opacity(window: WebviewWindow, opacity: f64) -> Result<(), String> {
    let clamped_opacity = opacity.max(0.1).min(1.0);
    
    WindowStateManager::update_setting(|settings| {
        settings.opacity = clamped_opacity;
    }).map_err(|e| e.to_string())?;
    
    // Emit an event to the frontend to update the visual opacity
    window.emit("opacity-changed", clamped_opacity).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub async fn get_window_settings(window: WebviewWindow) -> Result<WindowSettings, String> {
    let mut settings = WindowStateManager::get_current_settings();
    
    // Update with current window position and size
    let position = window.outer_position().ok().map(|pos| (pos.x, pos.y));
    let size = window.outer_size().ok().map(|size| (size.width, size.height));
    
    settings.position = position;
    settings.size = size;
    
    Ok(settings)
}

#[tauri::command]
pub async fn save_window_state(window: WebviewWindow) -> Result<(), String> {
    WindowStateManager::save_window_geometry(&window).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn restore_window_state(window: WebviewWindow) -> Result<(), String> {
    WindowStateManager::restore_window_state(&window).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn set_split_pane_size(size: f64) -> Result<(), String> {
    let clamped_size = size.max(0.1).min(0.9);
    
    WindowStateManager::update_setting(|settings| {
        settings.split_pane_size = clamped_size;
    }).map_err(|e| e.to_string())?;
    
    Ok(())
}

// Application state commands
#[tauri::command]
pub async fn get_application_state() -> Result<ApplicationState, String> {
    Ok(WindowStateManager::get_current_app_state())
}

#[tauri::command]
pub async fn update_theme(theme: String) -> Result<(), String> {
    WindowStateManager::update_app_state(|app_state| {
        app_state.theme = theme;
    }).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub async fn update_settings_panel_state(show: bool) -> Result<(), String> {
    WindowStateManager::update_app_state(|app_state| {
        app_state.show_settings = show;
    }).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub async fn update_active_diagram_index(index: i32) -> Result<(), String> {
    WindowStateManager::update_app_state(|app_state| {
        app_state.active_diagram_index = index;
    }).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub async fn update_cursor_position(line: u32, column: u32) -> Result<(), String> {
    WindowStateManager::update_app_state(|app_state| {
        app_state.cursor_position = Some((line, column));
    }).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub async fn update_file_state(
    file_path: Option<String>,
    file_name: Option<String>,
    file_content: Option<String>,
    has_unsaved_changes: bool,
) -> Result<(), String> {
    WindowStateManager::update_app_state(|app_state| {
        app_state.last_file_path = file_path;
        app_state.last_file_name = file_name;
        app_state.last_file_content = file_content;
        app_state.has_unsaved_changes = has_unsaved_changes;
    }).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub async fn update_tree_view_state(show: bool) -> Result<(), String> {
    WindowStateManager::update_app_state(|app_state| {
        app_state.show_tree_view = show;
    }).map_err(|e| e.to_string())?;
    
    Ok(())
}
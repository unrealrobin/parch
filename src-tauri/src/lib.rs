use tauri::{Manager, Emitter};
use serde::{Deserialize, Serialize};
use std::sync::{Mutex, LazyLock};
use std::collections::HashMap;

// Data structures for application state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowSettings {
    pub always_on_top: bool,
    pub click_through: bool,
    pub opacity: f64,
    pub position: Option<(i32, i32)>,
    pub size: Option<(u32, u32)>,
    pub split_pane_size: f64,
}

// Global state to track window settings
static WINDOW_STATE: LazyLock<Mutex<HashMap<String, WindowSettings>>> = LazyLock::new(|| {
    Mutex::new(HashMap::new())
});

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

// Window management commands
#[tauri::command]
async fn set_always_on_top(window: tauri::Window, enabled: bool) -> Result<(), String> {
    window.set_always_on_top(enabled).map_err(|e| e.to_string())?;
    
    // Update state
    let window_label = window.label().to_string();
    if let Ok(mut state) = WINDOW_STATE.lock() {
        let settings = state.entry(window_label).or_insert_with(WindowSettings::default);
        settings.always_on_top = enabled;
    }
    
    Ok(())
}

#[tauri::command]
async fn set_click_through(window: tauri::Window, enabled: bool) -> Result<(), String> {
    window.set_ignore_cursor_events(enabled).map_err(|e| e.to_string())?;
    
    // Update state
    let window_label = window.label().to_string();
    if let Ok(mut state) = WINDOW_STATE.lock() {
        let settings = state.entry(window_label).or_insert_with(WindowSettings::default);
        settings.click_through = enabled;
    }
    
    Ok(())
}

#[tauri::command]
async fn set_opacity(window: tauri::Window, opacity: f64) -> Result<(), String> {
    let clamped_opacity = opacity.max(0.1).min(1.0);
    
    // Update state - opacity will be handled by the frontend CSS
    let window_label = window.label().to_string();
    if let Ok(mut state) = WINDOW_STATE.lock() {
        let settings = state.entry(window_label).or_insert_with(WindowSettings::default);
        settings.opacity = clamped_opacity;
    }
    
    // Emit an event to the frontend to update the visual opacity
    window.emit("opacity-changed", clamped_opacity).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
async fn get_window_settings(window: tauri::Window) -> Result<WindowSettings, String> {
    let position = window.outer_position().ok().map(|pos| (pos.x, pos.y));
    let size = window.outer_size().ok().map(|size| (size.width, size.height));
    
    let window_label = window.label().to_string();
    
    // Get stored settings or create default
    let mut settings = if let Ok(state) = WINDOW_STATE.lock() {
        state.get(&window_label).cloned().unwrap_or_default()
    } else {
        WindowSettings::default()
    };
    
    // Update with current window position and size
    settings.position = position;
    settings.size = size;
    
    Ok(settings)
}

#[tauri::command]
async fn save_window_state(window: tauri::Window) -> Result<(), String> {
    let position = window.outer_position().ok().map(|pos| (pos.x, pos.y));
    let size = window.outer_size().ok().map(|size| (size.width, size.height));
    
    let window_label = window.label().to_string();
    
    if let Ok(mut state) = WINDOW_STATE.lock() {
        let settings = state.entry(window_label).or_insert_with(WindowSettings::default);
        settings.position = position;
        settings.size = size;
    }
    
    Ok(())
}

#[tauri::command]
async fn restore_window_state(window: tauri::Window) -> Result<(), String> {
    let window_label = window.label().to_string();
    
    if let Ok(state) = WINDOW_STATE.lock() {
        if let Some(settings) = state.get(&window_label) {
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
            // Note: opacity restoration handled through CSS/frontend for better cross-platform support
        }
    }
    
    Ok(())
}

#[tauri::command]
async fn set_split_pane_size(window: tauri::Window, size: f64) -> Result<(), String> {
    let clamped_size = size.max(0.1).min(0.9);
    let window_label = window.label().to_string();
    
    if let Ok(mut state) = WINDOW_STATE.lock() {
        let settings = state.entry(window_label).or_insert_with(WindowSettings::default);
        settings.split_pane_size = clamped_size;
    }
    
    Ok(())
}

// Window control commands
#[tauri::command]
async fn minimize_window(window: tauri::Window) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
async fn maximize_window(window: tauri::Window) -> Result<(), String> {
    window.maximize().map_err(|e| e.to_string())
}

#[tauri::command]
async fn unmaximize_window(window: tauri::Window) -> Result<(), String> {
    window.unmaximize().map_err(|e| e.to_string())
}

#[tauri::command]
async fn close_window(window: tauri::Window) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

#[tauri::command]
async fn is_window_maximized(window: tauri::Window) -> Result<bool, String> {
    window.is_maximized().map_err(|e| e.to_string())
}

// Basic application commands
#[tauri::command]
async fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
async fn get_app_info() -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "name": env!("CARGO_PKG_NAME"),
        "version": env!("CARGO_PKG_VERSION"),
        "description": env!("CARGO_PKG_DESCRIPTION")
    }))
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            set_always_on_top,
            set_click_through,
            set_opacity,
            get_window_settings,
            save_window_state,
            restore_window_state,
            set_split_pane_size,
            minimize_window,
            maximize_window,
            unmaximize_window,
            close_window,
            is_window_maximized,
            get_app_version,
            get_app_info
        ])
        .setup(|app| {
            // Get the main window
            let window = app.get_webview_window("main").unwrap();
            
            // Set initial window properties
            window.set_title("Parch - UML Float").unwrap();
            
            // Force remove decorations programmatically
            window.set_decorations(false).unwrap_or_else(|e| {
                eprintln!("Failed to remove decorations: {}", e);
            });
            
            // Additional Windows-specific configuration
            #[cfg(target_os = "windows")]
            {
                use tauri::Manager;
                // Try to remove the title bar using Windows-specific methods
                if let Err(e) = window.set_decorations(false) {
                    eprintln!("Windows decoration removal failed: {}", e);
                }
            }
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

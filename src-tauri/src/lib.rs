use tauri::Manager;
use serde::{Deserialize, Serialize};

// Data structures for application state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowSettings {
    pub always_on_top: bool,
    pub click_through: bool,
    pub position: Option<(i32, i32)>,
    pub size: Option<(u32, u32)>,
}

impl Default for WindowSettings {
    fn default() -> Self {
        Self {
            always_on_top: false,
            click_through: false,
            position: None,
            size: None,
        }
    }
}

// Window management commands
#[tauri::command]
async fn set_always_on_top(window: tauri::Window, enabled: bool) -> Result<(), String> {
    window.set_always_on_top(enabled).map_err(|e| e.to_string())
}

#[tauri::command]
async fn set_click_through(window: tauri::Window, enabled: bool) -> Result<(), String> {
    window.set_ignore_cursor_events(enabled).map_err(|e| e.to_string())
}

// Note: Opacity functionality will be implemented in a later task when Tauri supports it
// #[tauri::command]
// async fn set_opacity(window: tauri::Window, opacity: f64) -> Result<(), String> {
//     let clamped_opacity = opacity.max(0.1).min(1.0);
//     window.set_opacity(clamped_opacity).map_err(|e| e.to_string())
// }

#[tauri::command]
async fn get_window_settings(window: tauri::Window) -> Result<WindowSettings, String> {
    let position = window.outer_position().ok().map(|pos| (pos.x, pos.y));
    let size = window.outer_size().ok().map(|size| (size.width, size.height));
    
    Ok(WindowSettings {
        always_on_top: false, // We'll need to track this in app state
        click_through: false, // We'll need to track this in app state
        position,
        size,
    })
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
            get_window_settings,
            get_app_version,
            get_app_info
        ])
        .setup(|app| {
            // Get the main window
            let window = app.get_webview_window("main").unwrap();
            
            // Set initial window properties
            window.set_title("Parch - UML Float").unwrap();
            
            // Enable transparency for opacity control
            #[cfg(target_os = "macos")]
            {
                use tauri::TitleBarStyle;
                window.set_title_bar_style(TitleBarStyle::Overlay).ok();
            }
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

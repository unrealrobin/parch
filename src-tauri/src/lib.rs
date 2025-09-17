use tauri::Manager;
use std::sync::LazyLock;

mod mermaid_parser;
mod file_manager;
mod window_state;

use mermaid_parser::{MermaidParser, ParseResult, ValidationResult};
use file_manager::{FileManager, FileContent, FileDialogResult, SaveResult};
use window_state::WindowStateManager;

// Global Mermaid parser instance
static MERMAID_PARSER: LazyLock<MermaidParser> = LazyLock::new(|| {
    MermaidParser::new().expect("Failed to initialize Mermaid parser")
});

// Re-export window management commands from the window_state module
pub use window_state::{
    set_always_on_top,
    set_click_through,
    set_opacity,
    get_window_settings,
    save_window_state,
    restore_window_state,
    set_split_pane_size,
    get_application_state,
    update_theme,
    update_settings_panel_state,
    update_active_diagram_index,
    update_cursor_position,
    update_file_state,
    update_tree_view_state,
};

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

// Mermaid parsing commands
#[tauri::command]
async fn parse_mermaid_content(content: String) -> Result<ParseResult, String> {
    let parser = &*MERMAID_PARSER;
    Ok(parser.parse_content(&content))
}

#[tauri::command]
async fn validate_mermaid_diagram(content: String, start_line: Option<usize>) -> Result<ValidationResult, String> {
    let parser = &*MERMAID_PARSER;
    Ok(parser.validate_diagram(&content, start_line.unwrap_or(1)))
}

#[tauri::command]
async fn detect_diagram_type(content: String) -> Result<String, String> {
    let parser = &*MERMAID_PARSER;
    Ok(parser.detect_diagram_type(&content))
}

#[tauri::command]
async fn get_parsing_stats(content: String) -> Result<serde_json::Value, String> {
    let parser = &*MERMAID_PARSER;
    let stats = parser.get_parsing_stats(&content);
    Ok(serde_json::to_value(stats).unwrap_or_default())
}

// File management commands
#[tauri::command]
async fn create_new_file() -> Result<FileContent, String> {
    Ok(FileManager::create_new_file())
}

#[tauri::command]
async fn open_file_dialog(window: tauri::Window) -> Result<FileDialogResult, String> {
    FileManager::open_file_dialog(window).await
}

#[tauri::command]
async fn save_file(file_content: FileContent) -> Result<SaveResult, String> {
    FileManager::save_file(&file_content)
}

#[tauri::command]
async fn save_file_as_dialog(
    window: tauri::Window,
    content: String,
    suggested_name: Option<String>,
) -> Result<SaveResult, String> {
    FileManager::save_file_as_dialog(window, &content, suggested_name.as_deref()).await
}

#[tauri::command]
async fn check_file_modified(file_content: FileContent) -> Result<bool, String> {
    FileManager::check_file_modified(&file_content)
}

#[tauri::command]
async fn get_supported_extensions() -> Result<Vec<String>, String> {
    Ok(FileManager::get_supported_extensions().iter().map(|s| s.to_string()).collect())
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
            get_application_state,
            update_theme,
            update_settings_panel_state,
            update_active_diagram_index,
            update_cursor_position,
            update_file_state,
            update_tree_view_state,
            minimize_window,
            maximize_window,
            unmaximize_window,
            close_window,
            is_window_maximized,
            parse_mermaid_content,
            validate_mermaid_diagram,
            detect_diagram_type,
            get_parsing_stats,
            create_new_file,
            open_file_dialog,
            save_file,
            save_file_as_dialog,
            check_file_modified,
            get_supported_extensions,
            get_app_version,
            get_app_info
        ])
        .setup(|app| {
            // Initialize window state manager
            if let Err(e) = WindowStateManager::initialize(app.handle()) {
                eprintln!("Failed to initialize window state manager: {}", e);
            }

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
                // Try to remove the title bar using Windows-specific methods
                if let Err(e) = window.set_decorations(false) {
                    eprintln!("Windows decoration removal failed: {}", e);
                }
            }

            // Restore window state from persistent storage
            if let Err(e) = WindowStateManager::restore_window_state(&window) {
                eprintln!("Failed to restore window state: {}", e);
            }
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

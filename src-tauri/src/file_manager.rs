use serde::{Deserialize, Serialize};
use std::path::Path;
use std::fs;
use std::time::SystemTime;
use tauri::Window;
use tauri_plugin_dialog::DialogExt;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileContent {
    pub id: String,
    pub name: String,
    pub path: Option<String>,
    pub content: String,
    #[serde(rename = "lastModified")]
    pub last_modified: Option<SystemTime>,
    #[serde(rename = "isSaved")]
    pub is_saved: bool,
    #[serde(rename = "fileType")]
    pub file_type: FileType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FileType {
    Markdown,
    Mermaid,
    MermaidMarkdown,
}

impl FileType {
    pub fn from_extension(ext: &str) -> Self {
        match ext.to_lowercase().as_str() {
            "md" => FileType::Markdown,
            "mmd" => FileType::Mermaid,
            "mermaid" => FileType::MermaidMarkdown,
            _ => FileType::Markdown, // Default to markdown
        }
    }

    pub fn get_extension(&self) -> &'static str {
        match self {
            FileType::Markdown => "md",
            FileType::Mermaid => "mmd",
            FileType::MermaidMarkdown => "mermaid",
        }
    }

    pub fn get_filter_name(&self) -> &'static str {
        match self {
            FileType::Markdown => "Markdown Files",
            FileType::Mermaid => "Mermaid Files",
            FileType::MermaidMarkdown => "Mermaid Diagram Files",
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileDialogResult {
    pub success: bool,
    #[serde(rename = "fileContent")]
    pub file_content: Option<FileContent>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SaveResult {
    pub success: bool,
    #[serde(rename = "filePath")]
    pub file_path: Option<String>,
    pub error: Option<String>,
}

pub struct FileManager;

/// Internal function to load file from path (used in closures)
fn load_file_from_path_internal(path: &Path) -> Result<FileContent, String> {
    let content = fs::read_to_string(path)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    let metadata = fs::metadata(path)
        .map_err(|e| format!("Failed to get file metadata: {}", e))?;

    let last_modified = metadata.modified().ok();

    let extension = path.extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("md");

    let file_type = FileType::from_extension(extension);

    let file_name = path.file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("Unknown")
        .to_string();

    Ok(FileContent {
        id: Uuid::new_v4().to_string(),
        name: file_name,
        path: Some(path.to_string_lossy().to_string()),
        content,
        last_modified,
        is_saved: true,
        file_type,
    })
}

impl FileManager {
    pub fn new() -> Self {
        Self
    }

    /// Create a new empty file
    pub fn create_new_file() -> FileContent {
        FileContent {
            id: Uuid::new_v4().to_string(),
            name: "Untitled".to_string(),
            path: None,
            content: String::new(),
            last_modified: None,
            is_saved: false,
            file_type: FileType::Markdown,
        }
    }

    /// Open a file using file dialog
    pub async fn open_file_dialog(window: Window) -> Result<FileDialogResult, String> {
        use tokio::sync::oneshot;

        println!("=== RUST: Starting file dialog ===");
        let (tx, rx) = oneshot::channel();

        window.dialog()
            .file()
            .add_filter("All Supported", &["md", "mmd", "mermaid"])
            .add_filter("Markdown Files", &["md"])
            .add_filter("Mermaid Files", &["mmd"])
            .add_filter("Mermaid Diagram Files", &["mermaid"])
            .pick_file(move |file_path| {
                println!("=== RUST: File dialog callback triggered ===");
                println!("File path: {:?}", file_path);
                
                let dialog_result = match file_path {
                    Some(path) => {
                        println!("File selected: {:?}", path);
                        match path.as_path() {
                            Some(path_buf) => {
                                println!("Converting to path: {:?}", path_buf);
                                match load_file_from_path_internal(&path_buf) {
                                    Ok(file_content) => {
                                        println!("File loaded successfully: {}", file_content.name);
                                        FileDialogResult {
                                            success: true,
                                            file_content: Some(file_content),
                                            error: None,
                                        }
                                    },
                                    Err(error) => {
                                        println!("Error loading file: {}", error);
                                        FileDialogResult {
                                            success: false,
                                            file_content: None,
                                            error: Some(error),
                                        }
                                    },
                                }
                            }
                            None => {
                                println!("Invalid file path");
                                FileDialogResult {
                                    success: false,
                                    file_content: None,
                                    error: Some("Invalid file path".to_string()),
                                }
                            },
                        }
                    }
                    None => {
                        println!("No file selected (cancelled)");
                        FileDialogResult {
                            success: false,
                            file_content: None,
                            error: None, // Don't treat cancellation as an error
                        }
                    },
                };
                
                println!("Sending result: {:?}", dialog_result.success);
                let send_result = tx.send(dialog_result);
                if send_result.is_err() {
                    println!("Failed to send dialog result!");
                } else {
                    println!("Dialog result sent successfully");
                }
            });

        println!("Waiting for dialog result...");
        match rx.await {
            Ok(result) => {
                println!("Received dialog result: success={}", result.success);
                Ok(result)
            },
            Err(e) => {
                println!("Dialog channel error: {:?}", e);
                Ok(FileDialogResult {
                    success: false,
                    file_content: None,
                    error: Some("Dialog cancelled".to_string()),
                })
            },
        }
    }

    /// Load file from a specific path
    pub fn load_file_from_path(path: &Path) -> Result<FileContent, String> {
        load_file_from_path_internal(path)
    }

    /// Save file with existing path
    pub fn save_file(file_content: &FileContent) -> Result<SaveResult, String> {
        println!("=== RUST: Saving file ===");
        println!("File name: {}", file_content.name);
        println!("File path: {:?}", file_content.path);
        println!("Content length: {}", file_content.content.len());
        println!("Content preview: {}", &file_content.content.chars().take(100).collect::<String>());
        
        if let Some(path) = &file_content.path {
            println!("Writing to path: {}", path);
            match fs::write(path, &file_content.content) {
                Ok(_) => {
                    println!("File saved successfully");
                    Ok(SaveResult {
                        success: true,
                        file_path: Some(path.clone()),
                        error: None,
                    })
                },
                Err(e) => {
                    println!("Error saving file: {}", e);
                    Ok(SaveResult {
                        success: false,
                        file_path: None,
                        error: Some(format!("Failed to save file: {}", e)),
                    })
                },
            }
        } else {
            println!("No file path specified");
            Err("No file path specified. Use save_file_as instead.".to_string())
        }
    }

    /// Save file with file dialog (Save As)
    pub async fn save_file_as_dialog(
        window: Window,
        content: &str,
        suggested_name: Option<&str>,
    ) -> Result<SaveResult, String> {
        use tokio::sync::oneshot;

        println!("=== RUST: Starting Save As dialog ===");
        println!("Content length: {}", content.len());
        println!("Content preview: {}", &content.chars().take(100).collect::<String>());
        println!("Suggested name: {:?}", suggested_name);

        let (tx, rx) = oneshot::channel();
        let content_owned = content.to_string();

        let mut dialog = window.dialog()
            .file()
            .add_filter("Markdown Files", &["md"])
            .add_filter("Mermaid Files", &["mmd"])
            .add_filter("Mermaid Diagram Files", &["mermaid"])
            .set_title("Save File As");

        if let Some(name) = suggested_name {
            dialog = dialog.set_file_name(name);
        }

        dialog.save_file(move |file_path| {
            println!("=== RUST: Save As dialog callback triggered ===");
            println!("File path: {:?}", file_path);
            
            let save_result = match file_path {
                Some(path) => {
                    println!("File selected for save: {:?}", path);
                    match path.as_path() {
                        Some(path_buf) => {
                            println!("Converting to path: {:?}", path_buf);
                            println!("Writing content (length: {})", content_owned.len());
                            match fs::write(&path_buf, &content_owned) {
                                Ok(_) => {
                                    println!("File saved successfully to: {:?}", path_buf);
                                    SaveResult {
                                        success: true,
                                        file_path: Some(path_buf.to_string_lossy().to_string()),
                                        error: None,
                                    }
                                },
                                Err(e) => {
                                    println!("Error saving file: {}", e);
                                    SaveResult {
                                        success: false,
                                        file_path: None,
                                        error: Some(format!("Failed to save file: {}", e)),
                                    }
                                },
                            }
                        }
                        None => {
                            println!("Invalid file path");
                            SaveResult {
                                success: false,
                                file_path: None,
                                error: Some("Invalid file path".to_string()),
                            }
                        },
                    }
                }
                None => {
                    println!("No file selected (cancelled)");
                    SaveResult {
                        success: false,
                        file_path: None,
                        error: None, // Don't treat cancellation as an error
                    }
                },
            };
            
            println!("Sending save result: success={}", save_result.success);
            let send_result = tx.send(save_result);
            if send_result.is_err() {
                println!("Failed to send save result!");
            } else {
                println!("Save result sent successfully");
            }
        });

        println!("Waiting for save dialog result...");
        match rx.await {
            Ok(result) => {
                println!("Received save result: success={}", result.success);
                Ok(result)
            },
            Err(e) => {
                println!("Save dialog channel error: {:?}", e);
                Ok(SaveResult {
                    success: false,
                    file_path: None,
                    error: Some("Dialog cancelled".to_string()),
                })
            },
        }
    }

    /// Check if file has been modified externally
    pub fn check_file_modified(file_content: &FileContent) -> Result<bool, String> {
        if let Some(path) = &file_content.path {
            let metadata = fs::metadata(path)
                .map_err(|e| format!("Failed to get file metadata: {}", e))?;

            let current_modified = metadata.modified()
                .map_err(|e| format!("Failed to get modification time: {}", e))?;

            if let Some(last_modified) = file_content.last_modified {
                Ok(current_modified > last_modified)
            } else {
                Ok(false)
            }
        } else {
            Ok(false)
        }
    }

    /// Get supported file extensions
    pub fn get_supported_extensions() -> Vec<&'static str> {
        vec!["md", "mmd", "mermaid"]
    }

    /// Validate file extension
    pub fn is_supported_file(path: &Path) -> bool {
        if let Some(extension) = path.extension().and_then(|ext| ext.to_str()) {
            Self::get_supported_extensions().contains(&extension.to_lowercase().as_str())
        } else {
            false
        }
    }
}
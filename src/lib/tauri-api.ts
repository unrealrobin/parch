import { invoke } from '@tauri-apps/api/core';
import type { WindowSettings, ApplicationState, AppInfo, FileContent, FileDialogResult, SaveResult } from '../types/tauri';

/**
 * Tauri API wrapper for Parch application commands
 */
export class TauriAPI {
  /**
   * Set window always on top behavior
   */
  static async setAlwaysOnTop(enabled: boolean): Promise<void> {
    return invoke('set_always_on_top', { enabled });
  }

  /**
   * Set window click-through behavior
   */
  static async setClickThrough(enabled: boolean): Promise<void> {
    return invoke('set_click_through', { enabled });
  }

  /**
   * Set window opacity (0.1 to 1.0)
   */
  static async setOpacity(opacity: number): Promise<void> {
    return invoke('set_opacity', { opacity });
  }

  /**
   * Get current window settings
   */
  static async getWindowSettings(): Promise<WindowSettings> {
    return invoke('get_window_settings');
  }

  /**
   * Get application version
   */
  static async getAppVersion(): Promise<string> {
    return invoke('get_app_version');
  }

  /**
   * Get application information
   */
  static async getAppInfo(): Promise<AppInfo> {
    return invoke('get_app_info');
  }

  /**
   * Save current window state
   */
  static async saveWindowState(): Promise<void> {
    return invoke('save_window_state');
  }

  /**
   * Restore window state
   */
  static async restoreWindowState(): Promise<void> {
    return invoke('restore_window_state');
  }

  /**
   * Set split pane size (0.1 to 0.9)
   */
  static async setSplitPaneSize(size: number): Promise<void> {
    return invoke('set_split_pane_size', { size });
  }

  // Application state management
  static async getApplicationState(): Promise<ApplicationState> {
    return invoke('get_application_state');
  }

  static async updateTheme(theme: string): Promise<void> {
    return invoke('update_theme', { theme });
  }

  static async updateSettingsPanelState(show: boolean): Promise<void> {
    return invoke('update_settings_panel_state', { show });
  }

  static async updateActiveDiagramIndex(index: number): Promise<void> {
    return invoke('update_active_diagram_index', { index });
  }

  static async updateCursorPosition(line: number, column: number): Promise<void> {
    return invoke('update_cursor_position', { line, column });
  }

  static async updateFileState(
    filePath?: string,
    fileName?: string,
    fileContent?: string,
    hasUnsavedChanges: boolean = false
  ): Promise<void> {
    return invoke('update_file_state', { 
      file_path: filePath,
      file_name: fileName,
      file_content: fileContent,
      has_unsaved_changes: hasUnsavedChanges
    });
  }

  static async updateTreeViewState(show: boolean): Promise<void> {
    return invoke('update_tree_view_state', { show });
  }

  /**
   * Apply multiple window settings at once
   */
  static async applyWindowSettings(settings: Partial<WindowSettings>): Promise<void> {
    const promises: Promise<void>[] = [];
    
    if (settings.alwaysOnTop !== undefined) {
      promises.push(this.setAlwaysOnTop(settings.alwaysOnTop));
    }
    if (settings.clickThrough !== undefined) {
      promises.push(this.setClickThrough(settings.clickThrough));
    }
    if (settings.splitPaneSize !== undefined) {
      promises.push(this.setSplitPaneSize(settings.splitPaneSize));
    }
    
    await Promise.all(promises);
  }

  /**
   * Window control commands
   */
  static async minimizeWindow(): Promise<void> {
    return invoke('minimize_window');
  }

  static async maximizeWindow(): Promise<void> {
    return invoke('maximize_window');
  }

  static async unmaximizeWindow(): Promise<void> {
    return invoke('unmaximize_window');
  }

  static async closeWindow(): Promise<void> {
    return invoke('close_window');
  }

  static async isWindowMaximized(): Promise<boolean> {
    return invoke('is_window_maximized');
  }

  /**
   * Mermaid parsing commands
   */
  static async parseMermaidContent(content: string): Promise<any> {
    return invoke('parse_mermaid_content', { content });
  }

  static async validateMermaidDiagram(content: string, startLine?: number): Promise<any> {
    return invoke('validate_mermaid_diagram', { content, startLine });
  }

  static async detectDiagramType(content: string): Promise<string> {
    return invoke('detect_diagram_type', { content });
  }

  static async getParsingStats(content: string): Promise<any> {
    return invoke('get_parsing_stats', { content });
  }

  /**
   * File management commands
   */
  static async createNewFile(): Promise<FileContent> {
    return invoke('create_new_file');
  }

  static async openFileDialog(): Promise<FileDialogResult> {
    return invoke('open_file_dialog');
  }

  static async saveFile(fileContent: FileContent): Promise<SaveResult> {
    return invoke('save_file', { fileContent });
  }

  static async saveFileAsDialog(content: string, suggestedName?: string): Promise<SaveResult> {
    return invoke('save_file_as_dialog', { content, suggestedName });
  }

  static async checkFileModified(fileContent: FileContent): Promise<boolean> {
    return invoke('check_file_modified', { fileContent });
  }

  static async getSupportedExtensions(): Promise<string[]> {
    return invoke('get_supported_extensions');
  }
}
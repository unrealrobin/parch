import { invoke } from '@tauri-apps/api/core';
import type { WindowSettings, AppInfo } from '../types/tauri';

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
}
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

  // Note: Opacity functionality will be implemented in a later task
  // static async setOpacity(opacity: number): Promise<void> {
  //   return invoke('set_opacity', { opacity });
  // }

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
    
    await Promise.all(promises);
  }
}
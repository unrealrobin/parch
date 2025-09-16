// Tauri command types for Parch application

export interface WindowSettings {
  alwaysOnTop: boolean;
  clickThrough: boolean;
  position?: [number, number];
  size?: [number, number];
}

export interface AppInfo {
  name: string;
  version: string;
  description: string;
}

// Window management commands
export declare function setAlwaysOnTop(enabled: boolean): Promise<void>;
export declare function setClickThrough(enabled: boolean): Promise<void>;
export declare function getWindowSettings(): Promise<WindowSettings>;
export declare function getAppVersion(): Promise<string>;
export declare function getAppInfo(): Promise<AppInfo>;
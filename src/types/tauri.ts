// Tauri command types for Parch application

export interface WindowSettings {
  alwaysOnTop: boolean;
  clickThrough: boolean;
  opacity: number;
  position?: [number, number];
  size?: [number, number];
  splitPaneSize: number;
}

export interface AppInfo {
  name: string;
  version: string;
  description: string;
}

// File management types
export interface FileContent {
  id: string;
  name: string;
  path?: string;
  content: string;
  lastModified?: string; // ISO string representation of SystemTime
  isSaved: boolean;
  fileType: FileType;
}

export enum FileType {
  Markdown = "Markdown",
  Mermaid = "Mermaid", 
  MermaidMarkdown = "MermaidMarkdown"
}

export interface FileDialogResult {
  success: boolean;
  fileContent?: FileContent;
  error?: string;
}

export interface SaveResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

// Window management commands
export declare function setAlwaysOnTop(enabled: boolean): Promise<void>;
export declare function setClickThrough(enabled: boolean): Promise<void>;
export declare function setOpacity(opacity: number): Promise<void>;
export declare function getWindowSettings(): Promise<WindowSettings>;
export declare function saveWindowState(): Promise<void>;
export declare function restoreWindowState(): Promise<void>;
export declare function setSplitPaneSize(size: number): Promise<void>;
export declare function getAppVersion(): Promise<string>;
export declare function getAppInfo(): Promise<AppInfo>;
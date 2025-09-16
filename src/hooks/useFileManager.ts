import { useState, useCallback, useRef } from 'react';
import { TauriAPI } from '../lib/tauri-api';
import type { FileContent, FileDialogResult, SaveResult } from '../types/tauri';

export interface FileManagerState {
  currentFile: FileContent | null;
  hasUnsavedChanges: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface FileManagerActions {
  createNewFile: () => Promise<void>;
  openFile: () => Promise<void>;
  saveFile: () => Promise<void>;
  saveFileAs: () => Promise<void>;
  updateContent: (content: string) => void;
  checkForExternalChanges: () => Promise<boolean>;
  canCloseFile: () => Promise<boolean>;
  clearError: () => void;
}

export interface UseFileManagerOptions {
  onFileChanged?: (file: FileContent | null) => void;
  onContentChanged?: (content: string) => void;
  onUnsavedChangesChanged?: (hasChanges: boolean) => void;
  onError?: (error: string) => void;
}

export function useFileManager(options: UseFileManagerOptions = {}): [FileManagerState, FileManagerActions] {
  const [state, setState] = useState<FileManagerState>({
    currentFile: null,
    hasUnsavedChanges: false,
    isLoading: false,
    error: null,
  });

  const originalContentRef = useRef<string>('');

  const updateState = useCallback((updates: Partial<FileManagerState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const setError = useCallback((error: string | null) => {
    updateState({ error });
    if (error && options.onError) {
      options.onError(error);
    }
  }, [options.onError, updateState]);

  const setCurrentFile = useCallback((file: FileContent | null) => {
    updateState({ currentFile: file });
    if (file) {
      originalContentRef.current = file.content;
    } else {
      originalContentRef.current = '';
    }
    if (options.onFileChanged) {
      options.onFileChanged(file);
    }
  }, [options.onFileChanged, updateState]);

  const checkUnsavedChanges = useCallback((content: string) => {
    const hasChanges = content !== originalContentRef.current;
    updateState({ hasUnsavedChanges: hasChanges });
    if (options.onUnsavedChangesChanged) {
      options.onUnsavedChangesChanged(hasChanges);
    }
    return hasChanges;
  }, [options.onUnsavedChangesChanged, updateState]);

  const createNewFile = useCallback(async () => {
    try {
      updateState({ isLoading: true, error: null });
      
      // Check for unsaved changes before creating new file
      if (state.hasUnsavedChanges) {
        const shouldProceed = await confirmUnsavedChanges();
        if (!shouldProceed) {
          updateState({ isLoading: false });
          return;
        }
      }

      const newFile = await TauriAPI.createNewFile();
      setCurrentFile(newFile);
      updateState({ hasUnsavedChanges: false });
      
      if (options.onContentChanged) {
        options.onContentChanged(newFile.content);
      }
    } catch (error) {
      setError(`Failed to create new file: ${error}`);
    } finally {
      updateState({ isLoading: false });
    }
  }, [state.hasUnsavedChanges, setCurrentFile, setError, updateState, options.onContentChanged]);

  const openFile = useCallback(async () => {
    console.log('=== OPEN FILE DEBUG ===');
    console.log('Current state:', {
      hasUnsavedChanges: state.hasUnsavedChanges,
      currentFile: state.currentFile?.name,
      isLoading: state.isLoading
    });
    console.log('Original content ref:', originalContentRef.current.substring(0, 50) + '...');
    
    try {
      updateState({ isLoading: true, error: null });
      
      // Check for unsaved changes before opening file
      if (state.hasUnsavedChanges) {
        console.log('Unsaved changes detected, asking user for confirmation');
        const shouldProceed = await confirmUnsavedChanges();
        console.log('User response to unsaved changes:', shouldProceed);
        if (!shouldProceed) {
          console.log('User cancelled file open due to unsaved changes');
          updateState({ isLoading: false });
          return;
        }
      }

      console.log('Opening file dialog...');
      const result: FileDialogResult = await TauriAPI.openFileDialog();
      console.log('File dialog result:', JSON.stringify(result, null, 2));
      
      if (result.success && result.fileContent) {
        console.log('File loaded successfully:', result.fileContent.name);
        console.log('File content preview:', result.fileContent.content.substring(0, 100) + '...');
        setCurrentFile(result.fileContent);
        updateState({ hasUnsavedChanges: false });
        
        if (options.onContentChanged) {
          console.log('Calling onContentChanged with new content');
          options.onContentChanged(result.fileContent.content);
        }
      } else if (result.error) {
        console.error('File dialog error:', result.error);
        setError(result.error);
      } else {
        console.log('File dialog was cancelled or no file selected');
        // Don't show an error if user just cancelled the dialog
      }
    } catch (error) {
      console.error('Failed to open file:', error);
      setError(`Failed to open file: ${error}`);
    } finally {
      updateState({ isLoading: false });
      console.log('=== END OPEN FILE DEBUG ===');
    }
  }, [state.hasUnsavedChanges, setCurrentFile, setError, updateState, options.onContentChanged]);

  const saveFile = useCallback(async () => {
    console.log('=== SAVE FILE DEBUG ===');
    console.log('Current file:', state.currentFile?.name);
    console.log('Has unsaved changes:', state.hasUnsavedChanges);
    
    if (!state.currentFile) {
      setError('No file to save');
      return;
    }

    try {
      updateState({ isLoading: true, error: null });

      if (state.currentFile.path) {
        console.log('Saving to existing path:', state.currentFile.path);
        // Save to existing path
        const result: SaveResult = await TauriAPI.saveFile(state.currentFile);
        console.log('Save result:', result);
        
        if (result.success) {
          console.log('Save successful, updating original content ref');
          originalContentRef.current = state.currentFile.content;
          updateState({ hasUnsavedChanges: false });
          setCurrentFile({ ...state.currentFile, isSaved: true });
          console.log('Updated original content ref to:', originalContentRef.current.substring(0, 50) + '...');
        } else if (result.error) {
          setError(result.error);
        }
      } else {
        console.log('No path, using Save As');
        // No path, use Save As - inline implementation
        const result: SaveResult = await TauriAPI.saveFileAsDialog(
          state.currentFile.content,
          state.currentFile.name
        );
        
        if (result.success && result.filePath) {
          const updatedFile: FileContent = {
            ...state.currentFile,
            path: result.filePath,
            name: extractFileName(result.filePath),
            isSaved: true,
          };
          
          console.log('Save As successful, updating file');
          originalContentRef.current = state.currentFile.content;
          setCurrentFile(updatedFile);
          updateState({ hasUnsavedChanges: false });
        } else if (result.error) {
          setError(result.error);
        }
      }
    } catch (error) {
      console.error('Save error:', error);
      setError(`Failed to save file: ${error}`);
    } finally {
      updateState({ isLoading: false });
      console.log('=== END SAVE FILE DEBUG ===');
    }
  }, [state.currentFile, setError, updateState, setCurrentFile]);

  const saveFileAs = useCallback(async () => {
    if (!state.currentFile) {
      setError('No file to save');
      return;
    }

    try {
      updateState({ isLoading: true, error: null });

      const result: SaveResult = await TauriAPI.saveFileAsDialog(
        state.currentFile.content,
        state.currentFile.name
      );
      
      if (result.success && result.filePath) {
        const updatedFile: FileContent = {
          ...state.currentFile,
          path: result.filePath,
          name: extractFileName(result.filePath),
          isSaved: true,
        };
        
        originalContentRef.current = state.currentFile.content;
        setCurrentFile(updatedFile);
        updateState({ hasUnsavedChanges: false });
      } else if (result.error) {
        setError(result.error);
      }
    } catch (error) {
      setError(`Failed to save file: ${error}`);
    } finally {
      updateState({ isLoading: false });
    }
  }, [state.currentFile, setError, updateState, setCurrentFile]);

  const updateContent = useCallback((content: string) => {
    console.log('=== UPDATE CONTENT DEBUG ===');
    console.log('Current file:', state.currentFile?.name);
    console.log('New content length:', content.length);
    console.log('New content preview:', content.substring(0, 100) + '...');
    
    if (!state.currentFile) {
      console.log('No current file, ignoring content update');
      return;
    }

    const updatedFile: FileContent = {
      ...state.currentFile,
      content,
      isSaved: false,
    };

    console.log('Updated file content length:', updatedFile.content.length);
    setCurrentFile(updatedFile);
    checkUnsavedChanges(content);
    
    if (options.onContentChanged) {
      options.onContentChanged(content);
    }
    console.log('=== END UPDATE CONTENT DEBUG ===');
  }, [state.currentFile, setCurrentFile, checkUnsavedChanges, options.onContentChanged]);

  const checkForExternalChanges = useCallback(async (): Promise<boolean> => {
    if (!state.currentFile || !state.currentFile.path) {
      return false;
    }

    try {
      const isModified = await TauriAPI.checkFileModified(state.currentFile);
      return isModified;
    } catch (error) {
      console.warn('Failed to check for external file changes:', error);
      return false;
    }
  }, [state.currentFile]);

  const canCloseFile = useCallback(async (): Promise<boolean> => {
    if (!state.hasUnsavedChanges) {
      return true;
    }

    return await confirmUnsavedChanges();
  }, [state.hasUnsavedChanges]);

  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  return [
    state,
    {
      createNewFile,
      openFile,
      saveFile,
      saveFileAs,
      updateContent,
      checkForExternalChanges,
      canCloseFile,
      clearError,
    },
  ];
}

// Helper functions
function extractFileName(filePath: string): string {
  const parts = filePath.split(/[/\\]/);
  return parts[parts.length - 1] || 'Unknown';
}

async function confirmUnsavedChanges(): Promise<boolean> {
  return new Promise((resolve) => {
    const result = window.confirm(
      'You have unsaved changes. Do you want to continue without saving?'
    );
    resolve(result);
  });
}


import { useState, useCallback } from 'react';
import { TauriAPI } from '../lib/tauri-api';
import type { FileContent, FileDialogResult, SaveResult } from '../types/tauri';

export interface SimpleFileManagerState {
  currentFile: FileContent | null;
  hasUnsavedChanges: boolean;
  isLoading: boolean;
  error: string | null;
  isSettingContent: boolean; // Flag to prevent updateContent from overriding loaded files
}

export interface SimpleFileManagerActions {
  createNewFile: () => Promise<void>;
  openFile: (onFileLoaded?: (content: string) => void) => Promise<void>;
  saveFile: () => Promise<void>;
  saveFileAs: () => Promise<void>;
  updateContent: (content: string) => void;
  clearError: () => void;
}

export function useSimpleFileManager(): [SimpleFileManagerState, SimpleFileManagerActions] {
  const [state, setState] = useState<SimpleFileManagerState>({
    currentFile: null,
    hasUnsavedChanges: false,
    isLoading: false,
    error: null,
    isSettingContent: false,
  });

  const updateState = useCallback((updates: Partial<SimpleFileManagerState>) => {
    console.log('=== UPDATING FILE MANAGER STATE ===');
    console.log('Updates:', updates);
    setState(prev => {
      const newState = { ...prev, ...updates };
      console.log('New state:', newState);
      return newState;
    });
  }, []);

  const createNewFile = useCallback(async () => {
    console.log('=== CREATING NEW FILE ===');
    try {
      updateState({ isLoading: true, error: null });
      
      const newFile = await TauriAPI.createNewFile();
      console.log('New file created:', newFile);
      
      updateState({ 
        currentFile: newFile, 
        hasUnsavedChanges: false,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to create new file:', error);
      updateState({ error: `Failed to create new file: ${error}`, isLoading: false });
    }
  }, [updateState]);

  const openFile = useCallback(async (onFileLoaded?: (content: string) => void) => {
    console.log('=== OPENING FILE ===');
    try {
      updateState({ isLoading: true, error: null });
      
      const result: FileDialogResult = await TauriAPI.openFileDialog();
      console.log('Open file result:', JSON.stringify(result, null, 2));
      
      if (result.success && result.fileContent) {
        console.log('Setting current file to:', result.fileContent.name);
        console.log('File content:', result.fileContent.content);
        console.log('File content length:', result.fileContent.content?.length);
        
        // Set flag to prevent updateContent from overriding this file and update state atomically
        setState(prevState => ({
          ...prevState,
          currentFile: result.fileContent!, 
          hasUnsavedChanges: false,
          isLoading: false,
          isSettingContent: true, // Prevent updateContent from creating new file
          error: null
        }));
        
        // Directly call the callback with the file content
        if (onFileLoaded) {
          console.log('Calling onFileLoaded callback with content');
          onFileLoaded(result.fileContent.content || '');
        }
        
        // Clear the flag after a short delay to allow editor to update
        setTimeout(() => {
          setState(prevState => ({
            ...prevState,
            isSettingContent: false
          }));
        }, 100); // Reduced timeout for faster response
        
        console.log('File state updated successfully');
      } else if (result.error) {
        console.log('File dialog error:', result.error);
        updateState({ error: result.error, isLoading: false });
      } else {
        console.log('File dialog cancelled or no file selected');
        updateState({ isLoading: false });
      }
    } catch (error) {
      console.error('Failed to open file:', error);
      updateState({ error: `Failed to open file: ${error}`, isLoading: false });
    }
  }, [updateState]);

  const saveFile = useCallback(async () => {
    console.log('=== SAVING FILE ===');
    console.log('Current file:', state.currentFile);
    
    if (!state.currentFile) {
      updateState({ error: 'No file to save' });
      return;
    }

    try {
      updateState({ isLoading: true, error: null });

      let result: SaveResult;
      
      if (state.currentFile.path) {
        console.log('Saving to existing path:', state.currentFile.path);
        result = await TauriAPI.saveFile(state.currentFile);
      } else {
        console.log('No path, using Save As');
        result = await TauriAPI.saveFileAsDialog(
          state.currentFile.content,
          state.currentFile.name
        );
      }
      
      console.log('Save result:', result);
      
      if (result.success) {
        let updatedFile = { 
          ...state.currentFile, 
          isSaved: true,
        };
        
        // If we got a new file path (Save As case), update path and name
        if (result.filePath) {
          updatedFile = {
            ...updatedFile,
            path: result.filePath,
            name: extractFileName(result.filePath)
          };
        }
        
        console.log('Save successful - updated file:', updatedFile.name, 'Path:', updatedFile.path);
        
        updateState({ 
          currentFile: updatedFile,
          hasUnsavedChanges: false,
          isLoading: false 
        });
      } else if (result.error) {
        updateState({ error: result.error, isLoading: false });
      } else {
        updateState({ isLoading: false });
      }
    } catch (error) {
      console.error('Failed to save file:', error);
      updateState({ error: `Failed to save file: ${error}`, isLoading: false });
    }
  }, [state.currentFile, updateState]);

  const saveFileAs = useCallback(async () => {
    console.log('=== SAVE FILE AS ===');
    
    if (!state.currentFile) {
      updateState({ error: 'No file to save' });
      return;
    }

    try {
      updateState({ isLoading: true, error: null });

      const result: SaveResult = await TauriAPI.saveFileAsDialog(
        state.currentFile.content,
        state.currentFile.name
      );
      
      console.log('Save As result:', result);
      
      if (result.success && result.filePath) {
        const updatedFile = { 
          ...state.currentFile, 
          path: result.filePath,
          name: extractFileName(result.filePath),
          isSaved: true
        };
        
        updateState({ 
          currentFile: updatedFile,
          hasUnsavedChanges: false,
          isLoading: false 
        });
      } else if (result.error) {
        updateState({ error: result.error, isLoading: false });
      } else {
        updateState({ isLoading: false });
      }
    } catch (error) {
      console.error('Failed to save file as:', error);
      updateState({ error: `Failed to save file as: ${error}`, isLoading: false });
    }
  }, [state.currentFile, updateState]);

  const updateContent = useCallback((content: string) => {
    console.log('⚡ UPDATE CONTENT CALLED');
    console.log('  - New content length:', content.length);
    console.log('  - Current file:', state.currentFile?.name);
    console.log('  - Current file path:', state.currentFile?.path);
    console.log('  - Is setting content flag:', state.isSettingContent);
    
    // If we're currently setting content from a loaded file, don't override it
    if (state.isSettingContent) {
      console.log('⚡ BLOCKED: Currently setting content from loaded file, ignoring updateContent call');
      return;
    }
    
    setState(prevState => {
      if (!prevState.currentFile) {
        console.log('⚡ CREATING NEW FILE: No current file, creating new one with content');
        // If no current file, create one with the content
        const newFile: FileContent = {
          id: Date.now().toString(),
          name: 'Untitled',
          path: undefined,
          content,
          lastModified: undefined,
          isSaved: false,
          fileType: 'Markdown' as any
        };
        
        console.log('⚡ NEW FILE CREATED: Untitled');
        return {
          ...prevState,
          currentFile: newFile, 
          hasUnsavedChanges: content.length > 0 
        };
      }

      // IMPORTANT: Preserve the file identity (name, path, etc.) when updating content
      const updatedFile: FileContent = {
        ...prevState.currentFile, // Keep all existing properties including name and path
        content,
        isSaved: false, // Mark as unsaved since content changed
      };

      const hasChanges = content !== (prevState.currentFile.content || '');
      
      console.log('⚡ UPDATING EXISTING FILE:', updatedFile.name, 'Path:', updatedFile.path);
      console.log('⚡ UPDATE COMPLETE: hasUnsavedChanges:', hasChanges);
      
      return {
        ...prevState,
        currentFile: updatedFile, 
        hasUnsavedChanges: hasChanges 
      };
    });
  }, [state.isSettingContent]);

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
      clearError,
    },
  ];
}

// Helper function
function extractFileName(filePath: string): string {
  const parts = filePath.split(/[/\\]/);
  return parts[parts.length - 1] || 'Unknown';
}
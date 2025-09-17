# Complete Application State Persistence Test

## Test Plan for Step 6 Completion

This test verifies that **ALL** application state persists across restarts, not just window settings.

### Test Steps

1. **Launch Application**
   - Run `npm run tauri:dev`
   - Verify it opens with default settings

2. **Modify ALL Application State**
   - **Theme**: Switch to dark mode
   - **Settings Panel**: Open settings panel
   - **Window Settings**: 
     - Change opacity to 70%
     - Enable "Always on Top"
     - Adjust split pane to 30%/70%
     - Move window to a different position
     - Resize window to a different size
   - **File State**: 
     - Create some content with multiple Mermaid diagrams
     - Make some edits (create unsaved changes)
     - Position cursor in the middle of a diagram
   - **Diagram State**: 
     - Click on a specific diagram to make it active
   - **Editor State**: 
     - Position cursor at a specific line/column

3. **Close and Reopen**
   - Close the application completely
   - Reopen the application
   - **Verify ALL state is restored**:
     - ✅ Theme should be dark mode
     - ✅ Settings panel should be open
     - ✅ Opacity should be 70%
     - ✅ Always on top should be enabled
     - ✅ Split pane should be 30%/70%
     - ✅ Window position should be preserved
     - ✅ Window size should be preserved
     - ✅ File content should be restored
     - ✅ Unsaved changes should be indicated
     - ✅ Cursor should be at the same position
     - ✅ Active diagram should be highlighted
     - ✅ All diagrams should render correctly

## Expected Results

**✅ Complete Application State Persistence:**
- All window settings persist
- All application settings persist  
- File state (content, path, unsaved changes) persists
- Editor state (cursor position) persists
- UI state (settings panel, active diagram) persists
- Theme preference persists

## Implementation Details

The complete state persistence is implemented using:
- `tauri-plugin-store` for persistent storage
- Extended `WindowStateManager` with `ApplicationState`
- Automatic saving on all state changes
- Restoration on application startup
- File state restoration with proper error handling

## Files Modified

- `src-tauri/src/window_state.rs` - Extended with ApplicationState
- `src-tauri/src/lib.rs` - Added new Tauri commands
- `src/types/tauri.ts` - Added ApplicationState type
- `src/lib/tauri-api.ts` - Added application state API methods
- `src/App.tsx` - Integrated complete state persistence

## Success Criteria

**Step 6 is complete when:**
- ✅ All window settings persist
- ✅ All application settings persist
- ✅ File state (content, path, unsaved changes) persists
- ✅ Editor state (cursor position) persists
- ✅ UI state (settings panel, active diagram) persists
- ✅ Theme preference persists
- ✅ No data loss on application restart

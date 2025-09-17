# Window State Persistence Test

## Test Steps

1. **Launch Application**
   - Run the Parch application
   - Verify it opens with default settings

2. **Modify Window Settings**
   - Change window opacity to 70%
   - Enable "Always on Top"
   - Adjust split pane to 30%/70%
   - Move window to a different position
   - Resize window to a different size

3. **Close and Reopen**
   - Close the application
   - Reopen the application
   - Verify all settings are restored:
     - Opacity should be 70%
     - Always on top should be enabled
     - Split pane should be 30%/70%
     - Window position should be preserved
     - Window size should be preserved

## Expected Results

✅ All window settings should persist across application restarts
✅ Window position and size should be restored
✅ Split pane layout should be preserved
✅ Window management settings (opacity, always-on-top) should be restored

## Implementation Details

The window state persistence is implemented using:
- `tauri-plugin-store` for persistent storage
- Automatic saving on window move/resize events
- Immediate saving when settings change
- Restoration on application startup

## Files Modified

- `src-tauri/src/window_state.rs` - New persistent window state manager
- `src-tauri/src/lib.rs` - Updated to use new window state manager
- `src/App.tsx` - Added window event listeners for automatic saving
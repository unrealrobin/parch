# Window State Persistence Test Plan

## Overview
This test verifies that all window settings, position, size, and layout preferences are properly saved and restored across application restarts.

## Test Environment Setup
1. **Clean State**: Delete any existing window state file to start fresh
2. **Test Location**: `%APPDATA%/com.tauri.parch/` (Windows) or equivalent on other platforms
3. **State File**: Look for `window-state.json` file

## Test Procedure

### Phase 1: Initial Setup and Baseline
1. **Launch Application**
   ```bash
   # Run the application
   ./parch.exe
   ```

2. **Record Initial State**
   - Note default window position (X, Y coordinates)
   - Note default window size (Width x Height)
   - Note default split pane position (should be 50/50)
   - Note default opacity (should be 100%)
   - Note default "Always on Top" (should be OFF)

### Phase 2: Modify All Settings
3. **Change Window Position**
   - Drag window to a different location on screen
   - Record new position coordinates

4. **Change Window Size**
   - Resize window to a different size
   - Record new dimensions

5. **Modify Split Pane Layout**
   - Open Settings (⚙️ button)
   - Adjust "Split Pane Position" slider to 30% (70% diagram pane)
   - Verify the split changes in real-time
   - Go back to main view

6. **Change Opacity**
   - Open Settings
   - Set opacity to 70% using the slider
   - Verify window becomes semi-transparent
   - Go back to main view

7. **Enable Always on Top**
   - Open Settings
   - Toggle "Always on Top" to ON
   - Verify window stays above other applications
   - Go back to main view

8. **Verify State File Creation**
   - Check that `window-state.json` exists in app data directory
   - Verify file contains the settings we changed

### Phase 3: Restart and Verify Persistence
9. **Close Application**
   - Close the application completely
   - Wait a few seconds

10. **Reopen Application**
    - Launch the application again
    - **VERIFY**: Window opens at the SAME position as before closing
    - **VERIFY**: Window has the SAME size as before closing
    - **VERIFY**: Split pane is at 30/70 ratio (not default 50/50)
    - **VERIFY**: Window opacity is 70% (semi-transparent)
    - **VERIFY**: Window stays on top of other applications

### Phase 4: Additional State Changes
11. **Make More Changes**
    - Move window to another position
    - Resize to different dimensions
    - Change split pane to 60/40
    - Change opacity to 90%
    - Disable "Always on Top"

12. **Repeat Restart Test**
    - Close and reopen application
    - Verify ALL new settings are preserved

## Expected Results ✅

| Setting | Expected Behavior |
|---------|------------------|
| **Window Position** | Exact same X,Y coordinates after restart |
| **Window Size** | Exact same width/height after restart |
| **Split Pane Layout** | Same percentage split (30/70, 60/40, etc.) |
| **Opacity** | Same transparency level (70%, 90%, etc.) |
| **Always on Top** | Same on/off state |
| **Click Through** | Same on/off state (if changed) |

## Verification Commands

### Check State File (Windows)
```powershell
# Navigate to app data directory
cd "$env:APPDATA\com.tauri.parch"

# View the state file
Get-Content window-state.json | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

### Check State File (macOS/Linux)
```bash
# Navigate to app data directory
cd ~/.local/share/com.tauri.parch  # Linux
# or
cd ~/Library/Application\ Support/com.tauri.parch  # macOS

# View the state file
cat window-state.json | jq .
```

## Troubleshooting

### If Settings Don't Persist:
1. Check if `window-state.json` file exists
2. Verify file permissions (should be writable)
3. Check console logs for errors during save/restore
4. Verify the WindowStateManager is properly initialized

### If File Exists But Settings Don't Restore:
1. Check file contents for valid JSON
2. Verify all expected fields are present
3. Check for errors in console during restoration
4. Verify the restore function is called on startup

## Test Results Template

```
Date: ___________
Tester: ___________

✅/❌ Window Position Persistence
✅/❌ Window Size Persistence  
✅/❌ Split Pane Layout Persistence
✅/❌ Opacity Setting Persistence
✅/❌ Always on Top Persistence
✅/❌ Click Through Persistence
✅/❌ State File Creation
✅/❌ State File Restoration

Notes:
_________________________________
_________________________________
```

## Automated Test Script

Here's a PowerShell script to help verify the state file:

```powershell
# test-window-state.ps1
$appDataPath = "$env:APPDATA\com.tauri.parch"
$stateFile = "$appDataPath\window-state.json"

Write-Host "Checking window state persistence..." -ForegroundColor Green

if (Test-Path $stateFile) {
    Write-Host "✅ State file exists: $stateFile" -ForegroundColor Green
    
    $state = Get-Content $stateFile | ConvertFrom-Json
    
    Write-Host "Current state:" -ForegroundColor Yellow
    Write-Host "  Position: $($state.settings.position)" -ForegroundColor White
    Write-Host "  Size: $($state.settings.size)" -ForegroundColor White
    Write-Host "  Split Pane: $($state.settings.split_pane_size)" -ForegroundColor White
    Write-Host "  Opacity: $($state.settings.opacity)" -ForegroundColor White
    Write-Host "  Always on Top: $($state.settings.always_on_top)" -ForegroundColor White
    Write-Host "  Click Through: $($state.settings.click_through)" -ForegroundColor White
    Write-Host "  Last Saved: $($state.last_saved)" -ForegroundColor White
} else {
    Write-Host "❌ State file not found: $stateFile" -ForegroundColor Red
    Write-Host "Make sure to run the application and change some settings first." -ForegroundColor Yellow
}
```
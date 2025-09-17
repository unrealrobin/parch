# Window State Persistence Test Script
# This script helps verify that window state is being saved and restored correctly

param(
    [switch]$Clean,
    [switch]$Watch
)

$appDataPath = "$env:APPDATA\com.tauri.parch"
$stateFile = "$appDataPath\window-state.json"

function Show-WindowState {
    Write-Host "`n=== Window State Check ===" -ForegroundColor Cyan
    Write-Host "Timestamp: $(Get-Date)" -ForegroundColor Gray
    
    if (Test-Path $stateFile) {
        Write-Host "✅ State file exists: $stateFile" -ForegroundColor Green
        
        try {
            $state = Get-Content $stateFile | ConvertFrom-Json
            
            Write-Host "`nCurrent Settings:" -ForegroundColor Yellow
            Write-Host "  Position: " -NoNewline -ForegroundColor White
            if ($state.settings.position) {
                Write-Host "($($state.settings.position[0]), $($state.settings.position[1]))" -ForegroundColor Cyan
            } else {
                Write-Host "Not set" -ForegroundColor Gray
            }
            
            Write-Host "  Size: " -NoNewline -ForegroundColor White
            if ($state.settings.size) {
                Write-Host "$($state.settings.size[0]) x $($state.settings.size[1])" -ForegroundColor Cyan
            } else {
                Write-Host "Not set" -ForegroundColor Gray
            }
            
            Write-Host "  Split Pane: " -NoNewline -ForegroundColor White
            $splitPercent = [math]::Round($state.settings.split_pane_size * 100, 1)
            Write-Host "$splitPercent% / $([math]::Round(100 - $splitPercent, 1))%" -ForegroundColor Cyan
            
            Write-Host "  Opacity: " -NoNewline -ForegroundColor White
            $opacityPercent = [math]::Round($state.settings.opacity * 100, 1)
            Write-Host "$opacityPercent%" -ForegroundColor Cyan
            
            Write-Host "  Always on Top: " -NoNewline -ForegroundColor White
            $alwaysOnTop = if ($state.settings.always_on_top) { "ON" } else { "OFF" }
            $color = if ($state.settings.always_on_top) { "Green" } else { "Red" }
            Write-Host $alwaysOnTop -ForegroundColor $color
            
            Write-Host "  Click Through: " -NoNewline -ForegroundColor White
            $clickThrough = if ($state.settings.click_through) { "ON" } else { "OFF" }
            $color = if ($state.settings.click_through) { "Green" } else { "Red" }
            Write-Host $clickThrough -ForegroundColor $color
            
            Write-Host "  Last Saved: " -NoNewline -ForegroundColor White
            Write-Host $state.last_saved -ForegroundColor Gray
            
        } catch {
            Write-Host "❌ Error reading state file: $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ State file not found: $stateFile" -ForegroundColor Red
        Write-Host "   Make sure to run the application and change some settings first." -ForegroundColor Yellow
    }
    
    Write-Host "=========================" -ForegroundColor Cyan
}

function Clean-WindowState {
    Write-Host "Cleaning window state..." -ForegroundColor Yellow
    
    if (Test-Path $stateFile) {
        Remove-Item $stateFile -Force
        Write-Host "✅ Removed state file: $stateFile" -ForegroundColor Green
    } else {
        Write-Host "ℹ️  No state file to remove" -ForegroundColor Gray
    }
    
    if (Test-Path $appDataPath) {
        $files = Get-ChildItem $appDataPath
        if ($files.Count -eq 0) {
            Remove-Item $appDataPath -Force
            Write-Host "✅ Removed empty app data directory" -ForegroundColor Green
        }
    }
}

function Watch-WindowState {
    Write-Host "Watching for window state changes... (Press Ctrl+C to stop)" -ForegroundColor Green
    Write-Host "Move/resize the window or change settings to see updates.`n" -ForegroundColor Yellow
    
    $lastModified = $null
    
    while ($true) {
        if (Test-Path $stateFile) {
            $currentModified = (Get-Item $stateFile).LastWriteTime
            
            if ($lastModified -ne $currentModified) {
                $lastModified = $currentModified
                Show-WindowState
            }
        }
        
        Start-Sleep -Milliseconds 500
    }
}

# Main execution
Write-Host "Parch Window State Persistence Test" -ForegroundColor Magenta
Write-Host "===================================" -ForegroundColor Magenta

if ($Clean) {
    Clean-WindowState
} elseif ($Watch) {
    Watch-WindowState
} else {
    Show-WindowState
}

Write-Host "`nUsage:" -ForegroundColor Yellow
Write-Host "  .\test-window-state.ps1           # Check current state" -ForegroundColor White
Write-Host "  .\test-window-state.ps1 -Clean   # Clean state file" -ForegroundColor White
Write-Host "  .\test-window-state.ps1 -Watch   # Watch for changes" -ForegroundColor White
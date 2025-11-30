# PowerShell script to open .env file in default editor
# Run this script from the project root: .\backend\open-env.ps1

$envPath = Join-Path $PSScriptRoot ".env"

if (Test-Path $envPath) {
    Write-Host "Opening .env file..." -ForegroundColor Green
    Write-Host "File location: $envPath" -ForegroundColor Cyan
    
    # Try to open in VS Code/Cursor first
    if (Get-Command code -ErrorAction SilentlyContinue) {
        code $envPath
    }
    # Fallback to notepad
    elseif (Get-Command notepad -ErrorAction SilentlyContinue) {
        notepad $envPath
    }
    # Last resort - open in default editor
    else {
        Start-Process $envPath
    }
} else {
    Write-Host "Error: .env file not found at $envPath" -ForegroundColor Red
    Write-Host "Creating .env file from env.example..." -ForegroundColor Yellow
    
    $examplePath = Join-Path $PSScriptRoot "env.example"
    if (Test-Path $examplePath) {
        Copy-Item $examplePath $envPath
        Write-Host ".env file created! Please edit it with your actual values." -ForegroundColor Green
        if (Get-Command code -ErrorAction SilentlyContinue) {
            code $envPath
        } else {
            notepad $envPath
        }
    } else {
        Write-Host "Error: env.example file not found. Please create .env manually." -ForegroundColor Red
    }
}


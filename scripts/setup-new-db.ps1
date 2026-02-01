# Setup New Database Schema
# This script runs Prisma migrations on the new database

# Load environment variables from .env file if it exists
$envFile = ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        # Skip empty lines and comments
        if ($_ -match '^\s*([^#][^=]*)\s*=\s*(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            
            # Remove surrounding quotes if present
            if ($value -match '^["''](.+)["'']$') {
                $value = $matches[1]
            }
            
            # Set environment variable
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
    Write-Host "Loaded environment variables from .env file" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Setting up new database schema" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Check if NEW_DATABASE_URL is set
if (-not $env:NEW_DATABASE_URL) {
    Write-Host "Error: NEW_DATABASE_URL environment variable not found!" -ForegroundColor Red
    Write-Host "Please set NEW_DATABASE_URL in your .env file or environment." -ForegroundColor Yellow
    exit 1
}

# Check if NEW_DIRECT_DATABASE_URL is set
if (-not $env:NEW_DIRECT_DATABASE_URL) {
    Write-Host "Warning: NEW_DIRECT_DATABASE_URL not set, using NEW_DATABASE_URL" -ForegroundColor Yellow
    $env:NEW_DIRECT_DATABASE_URL = $env:NEW_DATABASE_URL
}

# Store original values
$originalDatabaseUrl = $env:DATABASE_URL
$originalDirectUrl = $env:DIRECT_DATABASE_URL

# Function to restore environment variables
function Restore-Environment {
    $env:DATABASE_URL = $originalDatabaseUrl
    $env:DIRECT_DATABASE_URL = $originalDirectUrl
    Write-Host "  Restored original environment variables" -ForegroundColor Gray
}

Write-Host "[Step 1/2] Setting environment variables for new database..." -ForegroundColor Yellow
# Temporarily set the new database URLs
$env:DATABASE_URL = $env:NEW_DATABASE_URL
$env:DIRECT_DATABASE_URL = $env:NEW_DIRECT_DATABASE_URL

Write-Host "  Environment variables set" -ForegroundColor Green
Write-Host ""

Write-Host "[Step 2/2] Running Prisma migrations on new database..." -ForegroundColor Yellow
Write-Host "  This may take a few minutes..." -ForegroundColor Gray
Write-Host ""

# Run Prisma migrate deploy
$migrationResult = & npx prisma migrate deploy 2>&1
$exitCode = $LASTEXITCODE

# Restore environment variables
Restore-Environment

if ($exitCode -ne 0) {
    Write-Host ""
    Write-Host "Error: Prisma migrations failed!" -ForegroundColor Red
    Write-Host $migrationResult -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "New database schema setup completed successfully!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "You can now run the data migration:" -ForegroundColor Cyan
Write-Host "  npm run migrate:db:ts" -ForegroundColor White
Write-Host ""

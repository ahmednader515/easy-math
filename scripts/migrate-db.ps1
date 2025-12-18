# Database Migration Script
# This script exports data from Aiven database and imports it into Prisma database

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
}

# Get source database URL (Aiven)
$sourceDatabaseUrl = $env:SOURCE_DATABASE_URL
if (-not $sourceDatabaseUrl) {
    Write-Host "Error: SOURCE_DATABASE_URL environment variable not found!" -ForegroundColor Red
    Write-Host "Please set SOURCE_DATABASE_URL to your Aiven database connection string." -ForegroundColor Yellow
    Write-Host "Example: SOURCE_DATABASE_URL=postgresql://user:password@host:port/database" -ForegroundColor Gray
    exit 1
}

# Get target database URL (Prisma database)
$targetDatabaseUrl = $env:TARGET_DATABASE_URL
if (-not $targetDatabaseUrl) {
    # Fallback to DIRECT_DATABASE_URL first (for Prisma connection pooling)
    $targetDatabaseUrl = $env:DIRECT_DATABASE_URL
    if (-not $targetDatabaseUrl) {
        # Then fallback to DATABASE_URL
        $targetDatabaseUrl = $env:DATABASE_URL
    }
}

if (-not $targetDatabaseUrl) {
    Write-Host "Error: TARGET_DATABASE_URL, DIRECT_DATABASE_URL, or DATABASE_URL environment variable not found!" -ForegroundColor Red
    Write-Host "Please set one of these environment variables:" -ForegroundColor Yellow
    Write-Host "  - TARGET_DATABASE_URL (recommended for migration)" -ForegroundColor Gray
    Write-Host "  - DIRECT_DATABASE_URL (required by Prisma schema)" -ForegroundColor Gray
    Write-Host "  - DATABASE_URL (fallback)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Example: TARGET_DATABASE_URL=postgresql://user:password@host:port/database" -ForegroundColor Gray
    exit 1
}

# Ensure DATABASE_URL and DIRECT_DATABASE_URL are set (required by Prisma schema)
# Note: These are set for this PowerShell session, but Prisma CLI reads from .env file directly
$needsEnvUpdate = $false

if (-not $env:DATABASE_URL) {
    Write-Host ""
    Write-Host "Warning: DATABASE_URL is not set but is required by Prisma schema." -ForegroundColor Yellow
    Write-Host "Setting DATABASE_URL for this session..." -ForegroundColor Yellow
    [Environment]::SetEnvironmentVariable("DATABASE_URL", $targetDatabaseUrl, "Process")
    Write-Host "  ✓ DATABASE_URL set to target database URL" -ForegroundColor Green
    $needsEnvUpdate = $true
}

if (-not $env:DIRECT_DATABASE_URL) {
    Write-Host ""
    Write-Host "Warning: DIRECT_DATABASE_URL is not set but is required by Prisma schema." -ForegroundColor Yellow
    Write-Host "Setting DIRECT_DATABASE_URL for this session..." -ForegroundColor Yellow
    [Environment]::SetEnvironmentVariable("DIRECT_DATABASE_URL", $targetDatabaseUrl, "Process")
    Write-Host "  ✓ DIRECT_DATABASE_URL set to target database URL" -ForegroundColor Green
    $needsEnvUpdate = $true
}

if ($needsEnvUpdate) {
    Write-Host ""
    Write-Host "Important: For Prisma CLI commands (like 'npx prisma migrate deploy')," -ForegroundColor Yellow
    Write-Host "you need to add these to your .env file:" -ForegroundColor Yellow
    Write-Host "  DATABASE_URL=$targetDatabaseUrl" -ForegroundColor Cyan
    Write-Host "  DIRECT_DATABASE_URL=$targetDatabaseUrl" -ForegroundColor Cyan
    Write-Host ""
}

# Remove quotes if present
$sourceDatabaseUrl = $sourceDatabaseUrl.Trim('"', "'")
$targetDatabaseUrl = $targetDatabaseUrl.Trim('"', "'")

# Function to parse database URL
function Parse-DatabaseUrl {
    param([string]$databaseUrl)
    
    $pattern = '^(?:postgresql|postgres)://(?:([^:]+)(?::([^@]+))?@)?([^:/]+)(?::(\d+))?/([^?]+)'
    
    if ($databaseUrl -match $pattern) {
        $dbUser = if ($matches[1]) { $matches[1] } else { "postgres" }
        $dbPassword = if ($matches[2]) { $matches[2] } else { "" }
        $dbHost = $matches[3]
        $dbPort = if ($matches[4]) { $matches[4] } else { "5432" }
        $dbName = $matches[5]
        
        # URL decode the password
        if ($dbPassword) {
            try {
                $dbPassword = [System.Uri]::UnescapeDataString($dbPassword)
            } catch {
                # If decoding fails, use the password as-is
            }
        }
        
        return @{
            User = $dbUser
            Password = $dbPassword
            Host = $dbHost
            Port = $dbPort
            Name = $dbName
        }
    } else {
        throw "Invalid database URL format"
    }
}

# Parse source database URL
try {
    $sourceDb = Parse-DatabaseUrl -databaseUrl $sourceDatabaseUrl
    Write-Host "Source Database (Aiven):" -ForegroundColor Cyan
    Write-Host "  Host: $($sourceDb.Host):$($sourceDb.Port)" -ForegroundColor Gray
    Write-Host "  Database: $($sourceDb.Name)" -ForegroundColor Gray
    Write-Host "  User: $($sourceDb.User)" -ForegroundColor Gray
} catch {
    Write-Host "Error: Could not parse SOURCE_DATABASE_URL!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Yellow
    exit 1
}

# Parse target database URL
try {
    $targetDb = Parse-DatabaseUrl -databaseUrl $targetDatabaseUrl
    Write-Host ""
    Write-Host "Target Database (Prisma):" -ForegroundColor Cyan
    Write-Host "  Host: $($targetDb.Host):$($targetDb.Port)" -ForegroundColor Gray
    Write-Host "  Database: $($targetDb.Name)" -ForegroundColor Gray
    Write-Host "  User: $($targetDb.User)" -ForegroundColor Gray
} catch {
    Write-Host "Error: Could not parse TARGET_DATABASE_URL!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Yellow
    exit 1
}

# Check if pg_dump and psql are available
$pgDumpExe = $null
$psqlExe = $null

# Find pg_dump
$pgDumpPath = Get-Command pg_dump -ErrorAction SilentlyContinue
if ($pgDumpPath) {
    $pgDumpExe = $pgDumpPath.Source
} else {
    $searchPaths = @(
        "C:\Program Files\PostgreSQL",
        "C:\Program Files (x86)\PostgreSQL",
        "$env:LOCALAPPDATA\Programs\PostgreSQL",
        "$env:ProgramFiles\PostgreSQL"
    )
    
    foreach ($path in $searchPaths) {
        if (Test-Path $path) {
            $found = Get-ChildItem -Path $path -Recurse -Filter "pg_dump.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($found) {
                $pgDumpExe = $found.FullName
                break
            }
        }
    }
}

# Find psql
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue
if ($psqlPath) {
    $psqlExe = $psqlPath.Source
} else {
    $searchPaths = @(
        "C:\Program Files\PostgreSQL",
        "C:\Program Files (x86)\PostgreSQL",
        "$env:LOCALAPPDATA\Programs\PostgreSQL",
        "$env:ProgramFiles\PostgreSQL"
    )
    
    foreach ($path in $searchPaths) {
        if (Test-Path $path) {
            $found = Get-ChildItem -Path $path -Recurse -Filter "psql.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($found) {
                $psqlExe = $found.FullName
                break
            }
        }
    }
}

if (-not $pgDumpExe) {
    Write-Host ""
    Write-Host "Error: pg_dump command not found!" -ForegroundColor Red
    Write-Host "Please install PostgreSQL client tools." -ForegroundColor Yellow
    exit 1
}

if (-not $psqlExe) {
    Write-Host ""
    Write-Host "Error: psql command not found!" -ForegroundColor Red
    Write-Host "Please install PostgreSQL client tools." -ForegroundColor Yellow
    exit 1
}

# Create temp directory for migration files
$tempDir = "temp_migration"
if (-not (Test-Path $tempDir)) {
    New-Item -ItemType Directory -Path $tempDir | Out-Null
    Write-Host "Created temp directory: $tempDir" -ForegroundColor Green
}

# Generate dump filename with timestamp
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$dumpFile = "$tempDir\migration_$timestamp.sql"

Write-Host ""
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "Starting Database Migration" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""

# Step 1: Export data from source database
Write-Host "[Step 1/3] Exporting data from source database..." -ForegroundColor Yellow
Write-Host "  Dump file: $dumpFile" -ForegroundColor Gray

$env:PGPASSWORD = $sourceDb.Password

try {
    $pgDumpArgs = @(
        "-h", $sourceDb.Host,
        "-p", $sourceDb.Port,
        "-U", $sourceDb.User,
        "-d", $sourceDb.Name,
        "-F", "p",
        "-f", $dumpFile,
        "--no-owner",
        "--no-acl",
        "--data-only",  # Only export data, not schema (schema should be managed by Prisma migrations)
        "--disable-triggers"  # Disable triggers during import for better performance
    )
    
    & $pgDumpExe $pgDumpArgs
    
    if ($LASTEXITCODE -ne 0) {
        throw "pg_dump failed with exit code $LASTEXITCODE"
    }
    
    $fileSize = (Get-Item $dumpFile).Length / 1MB
    Write-Host "  ✓ Export completed successfully!" -ForegroundColor Green
    Write-Host "  Size: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Gray
} catch {
    Write-Host ""
    Write-Host "Error: Failed to export data from source database" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
    exit 1
} finally {
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host ""

# Step 2: Verify target database schema exists
Write-Host "[Step 2/3] Verifying target database schema..." -ForegroundColor Yellow

$env:PGPASSWORD = $targetDb.Password

try {
    # Check if database exists and has tables
    $checkQuery = "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
    $checkArgs = @(
        "-h", $targetDb.Host,
        "-p", $targetDb.Port,
        "-U", $targetDb.User,
        "-d", $targetDb.Name,
        "-t",  # Terse output
        "-c", $checkQuery
    )
    
    $tableCount = & $psqlExe $checkArgs 2>&1 | Select-Object -Last 1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ⚠ Warning: Could not verify target database schema" -ForegroundColor Yellow
        Write-Host "  Make sure you have run Prisma migrations on the target database first!" -ForegroundColor Yellow
        Write-Host "  Run: npx prisma migrate deploy" -ForegroundColor Yellow
    } else {
        Write-Host "  ✓ Target database schema verified" -ForegroundColor Green
    }
} catch {
    Write-Host "  ⚠ Warning: Could not verify target database schema" -ForegroundColor Yellow
    Write-Host "  Make sure you have run Prisma migrations on the target database first!" -ForegroundColor Yellow
} finally {
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host ""

# Step 3: Import data into target database
Write-Host "[Step 3/3] Importing data into target database..." -ForegroundColor Yellow
Write-Host "  This may take a while depending on data size..." -ForegroundColor Gray

# Ask for confirmation
Write-Host ""
$confirmation = Read-Host "Do you want to proceed with importing data? This will modify your target database. (yes/no)"
if ($confirmation -ne "yes" -and $confirmation -ne "y") {
    Write-Host "Migration cancelled by user." -ForegroundColor Yellow
    exit 0
}

$env:PGPASSWORD = $targetDb.Password

try {
    $psqlArgs = @(
        "-h", $targetDb.Host,
        "-p", $targetDb.Port,
        "-U", $targetDb.User,
        "-d", $targetDb.Name,
        "-f", $dumpFile,
        "-v", "ON_ERROR_STOP=1"
    )
    
    & $psqlExe $psqlArgs
    
    if ($LASTEXITCODE -ne 0) {
        throw "psql failed with exit code $LASTEXITCODE"
    }
    
    Write-Host ""
    Write-Host "  ✓ Import completed successfully!" -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "Error: Failed to import data into target database" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "The dump file has been saved at: $dumpFile" -ForegroundColor Yellow
    Write-Host "You can manually review and import it later." -ForegroundColor Yellow
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
    exit 1
} finally {
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "=" * 60 -ForegroundColor Green
Write-Host "Migration Completed Successfully!" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Green
Write-Host ""
Write-Host "Dump file saved at: $dumpFile" -ForegroundColor Cyan
Write-Host "You can delete the temp_migration directory after verifying the migration." -ForegroundColor Gray
Write-Host ""


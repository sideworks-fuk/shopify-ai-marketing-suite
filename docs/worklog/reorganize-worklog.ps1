# Worklog Reorganization Script
# Purpose: Organize worklog files by year/month structure

Write-Host "=== Starting Worklog Reorganization ===" -ForegroundColor Cyan

# Create directory structure
Write-Host "`nPhase 1: Creating directory structure" -ForegroundColor Yellow

$directories = @(
    "worklog\2025",
    "worklog\2025\05",
    "worklog\2025\06",
    "worklog\2025\07",
    "worklog\daily",
    "worklog\releases",
    "worklog\archive"
)

foreach ($dir in $directories) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "  [OK] Created: $dir" -ForegroundColor Green
    } else {
        Write-Host "  [-] Already exists: $dir" -ForegroundColor Gray
    }
}

# Phase 2: Move files based on date pattern
Write-Host "`nPhase 2: Moving files to year/month folders" -ForegroundColor Yellow

# Get all markdown files in worklog root
$files = Get-ChildItem -Path "worklog" -Filter "*.md" -File

$movedCount = 0
$skippedCount = 0

foreach ($file in $files) {
    # Skip special files
    if ($file.Name -match "^(README|reorganize-worklog)") {
        Write-Host "  [-] Skipping: $($file.Name)" -ForegroundColor Gray
        $skippedCount++
        continue
    }
    
    # Extract date from filename (format: YYYYMMDD or YYYY-MM-DD)
    if ($file.Name -match "^(\d{4})(\d{2})(\d{2})-" -or 
        $file.Name -match "^(\d{4})-(\d{2})-(\d{2})-") {
        $year = $matches[1]
        $month = $matches[2]
        
        # Rename files with old format to new format
        $newName = $file.Name
        if ($file.Name -match "^(\d{8})-(.+)$") {
            $dateStr = $matches[1]
            $restOfName = $matches[2]
            $newName = "$($dateStr.Substring(0,4))-$($dateStr.Substring(4,2))-$($dateStr.Substring(6,2))-$restOfName"
        }
        
        $targetDir = "worklog\$year\$month"
        $targetPath = Join-Path $targetDir $newName
        
        # Ensure target directory exists
        if (!(Test-Path $targetDir)) {
            New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
        }
        
        # Move and rename if needed
        if ($newName -ne $file.Name) {
            Move-Item -Path $file.FullName -Destination $targetPath -Force
            Write-Host "  [OK] Moved & Renamed: $($file.Name) -> $year/$month/$newName" -ForegroundColor Green
        } else {
            Move-Item -Path $file.FullName -Destination $targetPath -Force
            Write-Host "  [OK] Moved: $($file.Name) -> $year/$month/" -ForegroundColor Green
        }
        $movedCount++
    }
    # Handle daily logs
    elseif ($file.Name -match "^daily-") {
        $targetPath = Join-Path "worklog\daily" $file.Name
        Move-Item -Path $file.FullName -Destination $targetPath -Force
        Write-Host "  [OK] Moved: $($file.Name) -> daily/" -ForegroundColor Green
        $movedCount++
    }
    # Handle other files
    else {
        Write-Host "  [?] Unknown pattern: $($file.Name)" -ForegroundColor Yellow
        $skippedCount++
    }
}

# Phase 3: Move subdirectories
Write-Host "`nPhase 3: Organizing subdirectories" -ForegroundColor Yellow

# Move tasks folder (keep as is)
if (Test-Path "worklog\tasks") {
    Write-Host "  [-] Keeping: tasks/ folder" -ForegroundColor Gray
}

# Phase 4: Create index file
Write-Host "`nPhase 4: Creating index file" -ForegroundColor Yellow

$indexContent = @"
# Worklog Index

## Directory Structure

\`\`\`
worklog/
├── 2025/           # Logs organized by year
│   ├── 05/         # May 2025
│   ├── 06/         # June 2025
│   └── 07/         # July 2025
├── daily/          # Daily reports
├── releases/       # Release notes
├── tasks/          # Task management
└── archive/        # Old logs (> 1 year)
\`\`\`

## Quick Links

### Recent Logs (July 2025)
"@

# Add links to recent files
$recentFiles = Get-ChildItem -Path "worklog\2025\07" -Filter "*.md" -ErrorAction SilentlyContinue | 
               Sort-Object Name -Descending | 
               Select-Object -First 10

if ($recentFiles) {
    foreach ($file in $recentFiles) {
        $indexContent += "`n- [2025/07/$($file.Name)](2025/07/$($file.Name))"
    }
}

$indexContent += @"

## Naming Convention

- Date format: YYYY-MM-DD
- Pattern: \`YYYY-MM-DD-description.md\`
- Example: \`2025-07-20-feature-planning.md\`
"@

$indexContent | Out-File -FilePath "worklog\README.md" -Encoding UTF8
Write-Host "  [OK] Created: worklog/README.md" -ForegroundColor Green

# Summary
Write-Host "`n=== Reorganization Complete! ===" -ForegroundColor Cyan
Write-Host "  Files moved: $movedCount" -ForegroundColor Green
Write-Host "  Files skipped: $skippedCount" -ForegroundColor Yellow
Write-Host "`nNote: Please update any links to worklog files in other documents." -ForegroundColor Yellow 
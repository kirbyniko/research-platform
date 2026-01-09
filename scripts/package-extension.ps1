# Package Chrome Extension for Distribution
# Creates a zip file that beta testers can download and install

$ExtensionPath = Join-Path $PSScriptRoot "..\extension"
$OutputPath = Join-Path $PSScriptRoot "..\extension-dist"
$Version = (Get-Content "$ExtensionPath\manifest.json" | ConvertFrom-Json).version
$ZipName = "ice-deaths-extension-v$Version.zip"

Write-Host "Packaging ICE Deaths Research Assistant Extension..." -ForegroundColor Cyan
Write-Host "   Version: $Version" -ForegroundColor Gray

# Create output directory
if (!(Test-Path $OutputPath)) {
    New-Item -ItemType Directory -Path $OutputPath | Out-Null
}

# Files to include in the package
$FilesToInclude = @(
    "manifest.json",
    "background.js",
    "content.js",
    "content.css",
    "sidepanel.js",
    "sidepanel.html",
    "overlay.js",
    "pdf-handler.js",
    "pdf.min.js",
    "pdf.worker.min.js",
    "README.md",
    "INSTALLATION.md",
    "icons"
)

# Create temporary staging directory
$StagingPath = Join-Path $env:TEMP "ice-extension-staging"
if (Test-Path $StagingPath) {
    Remove-Item -Recurse -Force $StagingPath
}
New-Item -ItemType Directory -Path $StagingPath | Out-Null

# Copy files to staging
Write-Host "Copying files..." -ForegroundColor Yellow
foreach ($file in $FilesToInclude) {
    $sourcePath = Join-Path $ExtensionPath $file
    $destPath = Join-Path $StagingPath $file
    
    if (Test-Path $sourcePath) {
        if ((Get-Item $sourcePath).PSIsContainer) {
            Copy-Item -Recurse -Force $sourcePath $destPath
            Write-Host "   + $file/" -ForegroundColor Green
        } else {
            Copy-Item -Force $sourcePath $destPath
            Write-Host "   + $file" -ForegroundColor Green
        }
    } else {
        Write-Host "   ! $file not found, skipping" -ForegroundColor Yellow
    }
}

# Create zip file
$ZipPath = Join-Path $OutputPath $ZipName
Write-Host "Creating zip file..." -ForegroundColor Yellow

if (Test-Path $ZipPath) {
    Remove-Item $ZipPath
}

Compress-Archive -Path "$StagingPath\*" -DestinationPath $ZipPath -CompressionLevel Optimal

# Clean up staging
Remove-Item -Recurse -Force $StagingPath

# Display results
$ZipSize = (Get-Item $ZipPath).Length / 1MB
Write-Host ""
Write-Host "Extension packaged successfully!" -ForegroundColor Green
Write-Host "   File: $ZipPath" -ForegroundColor Cyan
Write-Host "   Size: $([math]::Round($ZipSize, 2)) MB" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps for distribution:" -ForegroundColor Yellow
Write-Host "   1. Upload $ZipName to Google Drive or Dropbox"
Write-Host "   2. Share the link with beta testers"
Write-Host "   3. Include the INSTALLATION.md file"
Write-Host ""
Write-Host "Or publish to Chrome Web Store:" -ForegroundColor Yellow
Write-Host "   1. Go to https://chrome.google.com/webstore/devconsole"
Write-Host "   2. Click New Item"
Write-Host "   3. Upload $ZipName"
Write-Host "   4. Set visibility to Unlisted"
Write-Host "   5. Share the private link with testers"
Write-Host ""

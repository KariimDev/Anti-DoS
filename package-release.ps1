# Sentinel Shield Packaging Script (Windows PowerShell)
# Creates a clean release ZIP that can be deployed on ANY server.

$releaseName = "Sentinel_Shield_Release.zip"

# 1. Cleanup old release with retry logic
if (Test-Path $releaseName) { 
    try {
        Remove-Item $releaseName -Force -ErrorAction Stop
    } catch {
        $releaseName = "Sentinel_Shield_v" + (Get-Date -Format "yyyyMMdd_HHmm") + ".zip"
        Write-Host "Warning: Original ZIP locked. Creating unique version: $releaseName" -ForegroundColor Yellow
    }
}

# 2. Create a temporary staging area
$stage = "staging_sentinel"
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Path $stage | Out-Null

# 3. Copy Shield-Proxy (excluding node_modules) using robocopy
$shieldSrc = Join-Path $PWD "Shield-Proxy"
$shieldDest = Join-Path $stage "Shield-Proxy"
robocopy $shieldSrc $shieldDest /E /XD node_modules | Out-Null

# 4. Copy config files
Copy-Item "docker-compose.yml" -Destination $stage
Copy-Item "setup.sh" -Destination $stage
Copy-Item "README_PRODUCT.md" -Destination (Join-Path $stage "README.md")

# 5. Create a clean .env.example (never ship real keys)
$envExampleDest = Join-Path $stage ".env.example"
if (Test-Path ".env.example") {
    Copy-Item ".env.example" -Destination $envExampleDest
} else {
    # Generate from .env, sanitizing the ADMIN_KEY
    if (Test-Path ".env") {
        (Get-Content ".env") -replace 'ADMIN_KEY=.*', 'ADMIN_KEY=YOUR_SECURE_KEY_HERE' | Out-File $envExampleDest -Encoding UTF8
    }
}

# 6. Create the ZIP
$zipSource = Join-Path $stage "*"
Compress-Archive -Path $zipSource -DestinationPath $releaseName

# 7. Cleanup staging
Remove-Item $stage -Recurse -Force

Write-Host ""
Write-Host "RELEASE READY: $releaseName" -ForegroundColor Green
Write-Host ""
Write-Host "What is inside:" -ForegroundColor Cyan
Write-Host "   Shield-Proxy/      - The protection engine"
Write-Host "   docker-compose.yml - Container orchestration"
Write-Host "   setup.sh           - Interactive installer"
Write-Host "   .env.example       - Config template"
Write-Host "   README.md          - Documentation"
Write-Host ""
Write-Host "To deploy on any server:" -ForegroundColor Yellow
Write-Host "   1. Upload and extract the ZIP"
Write-Host "   2. chmod +x setup.sh then ./setup.sh"
Write-Host "   3. Done! Shield is active."
Write-Host ""

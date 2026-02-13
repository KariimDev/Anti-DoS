# Sentinel Shield Packaging Script (Windows PowerShell)
$releaseName = "Sentinel_Shield_Pro.zip"

# 1. Cleanup old release with retry logic
if (Test-Path $releaseName) { 
    try {
        Remove-Item $releaseName -Force -ErrorAction Stop
    } catch {
        $releaseName = "Sentinel_Shield_v" + (Get-Date -Format "yyyyMMdd_HHmm") + ".zip"
        Write-Host "⚠️ Warning: Original ZIP locked. Creating unique version: $releaseName" -ForegroundColor Yellow
    }
}

# 2. Define files to include
$includeFiles = @(
    "Shield-Proxy\*",
    "docker-compose.yml",
    ".env.example",
    "setup.sh",
    "README_PRODUCT.md",
    "RELEASE_GUIDE.md"
)

# 3. Create a temporary staging area
$stage = "staging_sentinel"
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Path $stage

# 4. Copy current project files (excluding node_modules)
Copy-Item "Shield-Proxy" "$stage\" -Recurse -Exclude "node_modules"
Copy-Item "docker-compose.yml" "$stage\"
Copy-Item "setup.sh" "$stage\"
Copy-Item "README_PRODUCT.md" "$stage\README.md"
Copy-Item ".env" "$stage\.env.example"

# 4.5 Sanitize .env.example
(Get-Content "$stage\.env.example") -replace 'ADMIN_KEY=.*', 'ADMIN_KEY=YOUR_SECURE_KEY_HERE' | Out-File "$stage\.env.example" -Encoding UTF8

# 5. Create the ZIP
Compress-Archive -Path "$stage\*" -DestinationPath $releaseName

# 6. Cleanup staging
Remove-Item $stage -Recurse -Force

Write-Host "✅ RELEASE READY: $releaseName" -ForegroundColor Green
Write-Host "You can now send this ZIP to your client."

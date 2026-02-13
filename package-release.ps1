# Sentinel Shield Packaging Script (Windows PowerShell)
$releaseName = "Sentinel_Shield_Release.zip"

# 1. Cleanup old release
if (Test-Path $releaseName) { Remove-Item $releaseName }

# 2. Define files to include
$includeFiles = @(
    "Shield-Proxy\*",
    "dashboard\*",
    "docker-compose.yml",
    ".env.example",
    "RELEASE_GUIDE.md"
)

# 3. Create a temporary staging area
$stage = "staging_sentinel"
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Path $stage

# 4. Copy current project files (excluding node_modules)
Copy-Item "Shield-Proxy" "$stage\" -Recurse -Exclude "node_modules"
Copy-Item "dashboard" "$stage\" -Recurse
Copy-Item "docker-compose.yml" "$stage\"
Copy-Item ".env" "$stage\.env.example"

# 5. Create the ZIP
Compress-Archive -Path "$stage\*" -DestinationPath $releaseName

# 6. Cleanup staging
Remove-Item $stage -Recurse -Force

Write-Host "✅ RELEASE READY: $releaseName" -ForegroundColor Green
Write-Host "You can now send this ZIP to your client."

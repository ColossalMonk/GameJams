# Build Golden Hour and zip dist/ for itch.io, with index.html at the root of the zip.
#
#   powershell -ExecutionPolicy Bypass -File tools\package-itch.ps1
#
# Compress-Archive in Windows PowerShell 5.1 writes "assets\file.js" with a backslash,
# which itch.io's servers can treat as part of the file name (the game then fails to
# load), so the zip is written entry by entry with forward slashes instead.

$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

node node_modules/vite/bin/vite.js build
if ($LASTEXITCODE -ne 0) { throw 'build failed' }

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$out = Join-Path (Get-Location) 'golden-hour-itch.zip'
if (Test-Path $out) { Remove-Item $out }
$root = (Resolve-Path dist).Path
$zip = [System.IO.Compression.ZipFile]::Open($out, 'Create')
try {
  Get-ChildItem dist -Recurse -File | ForEach-Object {
    $name = $_.FullName.Substring($root.Length + 1).Replace('\', '/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $name, 'Optimal') | Out-Null
  }
} finally {
  $zip.Dispose()
}
Write-Host "Wrote $out ($((Get-Item $out).Length) bytes)"

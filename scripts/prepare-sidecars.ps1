# AllMedia 本地开发环境准备：编译/放置 sidecar 与资源。
# CI（.github/workflows/build.yml）在云端执行同样步骤；本脚本供本地 tauri dev 使用。
#
# 需要：Go 1.25+（编译 mediago）、.NET 10 SDK（发布 HelloCrab）、网络（下载 aria2c/ffmpeg）。
# 缺少某个工具时跳过对应部分并提示，已存在的产物默认跳过（-Force 重建全部）。
#requires -Version 5.1
param(
    [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$binaries = Join-Path $root 'src-tauri/binaries'
$resources = Join-Path $root 'src-tauri/resources'
$hellocrabOut = Join-Path $resources 'hellocrab'
New-Item -ItemType Directory -Force -Path $binaries | Out-Null
New-Item -ItemType Directory -Force -Path $resources | Out-Null

# Tauri externalBin 需要带 target triple 后缀的文件名
$triple = 'x86_64-pc-windows-msvc'

# ---------------------------------------------------------------- aria2c
$ariaTarget = Join-Path $binaries "aria2c-$triple.exe"
if ($Force -or -not (Test-Path $ariaTarget)) {
    Write-Host '[aria2c] downloading...' -ForegroundColor Cyan
    $url = 'https://github.com/aria2/aria2/releases/download/release-1.37.0/aria2-1.37.0-win-64bit-build1.zip'
    $tmp = Join-Path $env:TEMP 'allmedia-aria2'
    Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
    Invoke-WebRequest -Uri $url -OutFile "$tmp.zip"
    Expand-Archive -Path "$tmp.zip" -DestinationPath $tmp -Force
    $exe = Get-ChildItem -Path $tmp -Recurse -Filter aria2c.exe | Select-Object -First 1
    Copy-Item $exe.FullName $ariaTarget -Force
    Remove-Item "$tmp.zip", $tmp -Recurse -Force -ErrorAction SilentlyContinue
} else {
    Write-Host '[aria2c] exists, skip' -ForegroundColor DarkGray
}

# ---------------------------------------------------------------- mediago
$mediagoTarget = Join-Path $binaries "mediago-$triple.exe"
if (Get-Command go -ErrorAction SilentlyContinue) {
    Write-Host '[mediago] building...' -ForegroundColor Cyan
    Push-Location (Join-Path $root 'engines/mediago')
    try {
        $env:GOOS = 'windows'; $env:GOARCH = 'amd64'
        go build -ldflags '-s -w' -o $mediagoTarget ./cmd/mediago
    } finally {
        Remove-Item Env:GOOS, Env:GOARCH -ErrorAction SilentlyContinue
        Pop-Location
    }
} else {
    Write-Warning '[mediago] 未找到 Go 工具链，跳过（全网下载功能在 dev 模式将不可用）'
}

# ---------------------------------------------------------------- HelloCrab
if (Get-Command dotnet -ErrorAction SilentlyContinue) {
    if ($Force -or -not (Test-Path (Join-Path $hellocrabOut 'HelloCrab.exe'))) {
        Write-Host '[hellocrab] publishing (self-contained win-x64)...' -ForegroundColor Cyan
        dotnet publish (Join-Path $root 'engines/hellocrab/src/HelloCrab.Desktop/HelloCrab.Desktop.csproj') `
            -c Release -r win-x64 --self-contained true `
            -p:UseAppHost=true -p:PublishSingleFile=false `
            -o $hellocrabOut
        if ($LASTEXITCODE -ne 0) { throw "dotnet publish 失败：$LASTEXITCODE" }
    } else {
        Write-Host '[hellocrab] exists, skip' -ForegroundColor DarkGray
    }
} else {
    Write-Warning '[hellocrab] 未找到 .NET SDK，跳过（社交采集功能在 dev 模式将不可用）'
}

# ---------------------------------------------------------------- ffmpeg（两引擎共用）
$ffmpegDir = Join-Path $hellocrabOut 'ffmpeg'
if ($Force -or -not (Test-Path (Join-Path $ffmpegDir 'ffmpeg.exe'))) {
    Write-Host '[ffmpeg] downloading essentials build...' -ForegroundColor Cyan
    New-Item -ItemType Directory -Force -Path $ffmpegDir | Out-Null
    $url = 'https://github.com/GyanD/codexffmpeg/releases/download/7.1/ffmpeg-7.1-essentials_build.zip'
    $tmp = Join-Path $env:TEMP 'allmedia-ffmpeg'
    Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
    Invoke-WebRequest -Uri $url -OutFile "$tmp.zip"
    Expand-Archive -Path "$tmp.zip" -DestinationPath $tmp -Force
    Copy-Item (Get-ChildItem -Path $tmp -Recurse -Filter ffmpeg.exe  | Select-Object -First 1).FullName $ffmpegDir -Force
    Copy-Item (Get-ChildItem -Path $tmp -Recurse -Filter ffprobe.exe | Select-Object -First 1).FullName $ffmpegDir -Force
    Remove-Item "$tmp.zip", $tmp -Recurse -Force -ErrorAction SilentlyContinue
} else {
    Write-Host '[ffmpeg] exists, skip' -ForegroundColor DarkGray
}

Write-Host "`nDone. sidecars -> $binaries" -ForegroundColor Green
Write-Host "      resources -> $resources" -ForegroundColor Green

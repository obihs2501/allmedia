# AllMedia

三引擎全能媒体下载器（Windows 桌面应用，Tauri + React）。整合三个开源项目的下载能力于一个界面：

| 引擎 | 来源项目 | 能力 |
|---|---|---|
| **X 下载**（内置） | [x-spider-mod-2026](https://github.com/obihs2501/x-spider-mod-2026)（基于 [x-spider](https://github.com/MiningCattiva/x-spider)） | 推特（X）媒体批量下载：免登录游客模式、博主管理、增量下载、多账号轮换、本地画廊 |
| **全网下载**（mediago sidecar） | [mediago](https://github.com/Sophomoresty/mediago) | 92 个中文站点 / 103 个提取器：B 站（含 DASH 合并）、抖音、CCTV、以及大量在线课程平台；HLS/DASH/直链，AES-128 解密，并发分片 |
| **社交采集**（HelloCrab 无头引擎） | [HelloCrab](https://github.com/hupo376787/HelloCrab) | 通过真实浏览器（Playwright）采集作者主页并批量下载：抖音、TikTok、快手、微博、小红书、美篇、Instagram、B 站、Pinterest、YouTube |

## 架构

```
AllMedia (Tauri 壳 + React UI)
├── aria2c sidecar         ← X/Twitter 文件下载（JSON-RPC over WebSocket）
├── mediago sidecar        ← 全网 URL 下载（--progress-json NDJSON 进度）
└── HelloCrab.exe 无头子进程 ← 社交平台采集（--headless-host，HTTP Remote API 遥控）
    └── Playwright Chromium ← 用户在真实浏览器中登录 / 打开作者主页
```

- `src/`、`src-tauri/` — 应用本体（继承自 x-spider，GPL-3.0）
- `engines/mediago/` — Go 下载引擎源码（新增 `--progress-json`、`--ffmpeg-location`）
- `engines/hellocrab/` — C#/.NET 采集引擎源码（新增 `--headless-host` 无窗口模式）
- FFmpeg 由 CI 捆绑至 `resources/hellocrab/ffmpeg/`，两个引擎共用

## 构建

正式构建由 GitHub Actions 完成（见 `.github/workflows/build.yml`）：编译 mediago（Go）、发布 HelloCrab（.NET 10 self-contained）、下载 aria2c 与 FFmpeg、`tauri build` 产出 NSIS 安装包并发布 Release。

### 本地开发

依赖：Node 20+ / pnpm、Rust（Tauri 1.x）、Go 1.25+（可选）、.NET 10 SDK（可选）。

```bash
pnpm i
# 准备 sidecar 与资源（需要 Go / .NET / 网络）
powershell -ExecutionPolicy Bypass -File scripts/prepare-sidecars.ps1
pnpm start          # tauri dev
pnpm typeCheck      # 仅前端类型检查（无需 Rust/Go/.NET）
```

## 许可证

GPL-3.0-only（继承自 x-spider）。集成项目的原始许可证保留在各自目录，详见 [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)。

本项目仅用于学习交流，请遵守各平台服务条款，勿用于商业或非法用途。

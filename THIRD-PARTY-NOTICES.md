# Third-Party Notices

AllMedia is a combined work that integrates the following open-source projects.
The combined work is distributed under **GPL-3.0-only** (see root `LICENSE`).

## Bundled source code

| Project | Location in repo | License | Copyright / Origin |
|---|---|---|---|
| x-spider / x-spider-mod-2026 | repository root (`src/`, `src-tauri/`) | GPL-3.0-only | MiningCattiva (original author), obihs2501 (mod maintainer) — <https://github.com/MiningCattiva/x-spider> |
| mediago | `engines/mediago/` | The Unlicense (public domain) | Sophomoresty — <https://github.com/Sophomoresty/mediago> |
| HelloCrab | `engines/hellocrab/` | MIT | Copyright (c) 2026 Vincent Wang — <https://github.com/hupo376787/HelloCrab> |

Each bundled project keeps its original LICENSE file in its directory.

## Binaries downloaded at build time (CI)

| Component | License | Source |
|---|---|---|
| aria2c | GPL-2.0-or-later | <https://github.com/aria2/aria2> |
| FFmpeg (gyan.dev essentials build) | GPL-3.0 | <https://www.gyan.dev/ffmpeg/builds/> |

## Notable runtime dependencies

- Tauri (MIT/Apache-2.0), React (MIT), Ant Design (MIT), Zustand (MIT)
- .NET Runtime & Avalonia (MIT), Microsoft.Playwright (Apache-2.0), YoloDotNet (MIT), ONNX Runtime (MIT), YoutubeExplode (LGPL-3.0)
- Go standard library (BSD-3-Clause), cobra (Apache-2.0), gjson (MIT), progressbar (MIT)

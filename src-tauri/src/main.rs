// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod hellocrab;
mod network;

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct PathMetadata {
    path: String,
    modified_at: Option<u64>,
}

#[tauri::command]
fn filesystem_metadata(paths: Vec<String>) -> Vec<PathMetadata> {
    use std::time::UNIX_EPOCH;

    paths
        .into_iter()
        .map(|path| {
            let modified_at = std::fs::metadata(&path)
                .and_then(|metadata| metadata.modified())
                .ok()
                .and_then(|modified| modified.duration_since(UNIX_EPOCH).ok())
                .map(|duration| duration.as_millis() as u64);
            PathMetadata { path, modified_at }
        })
        .collect()
}

fn main() {
    use tauri::Manager;

    tauri::Builder::default()
        .manage(hellocrab::HellocrabState::default())
        .invoke_handler(tauri::generate_handler![
          network::network_fetch,
          network::network_get_system_proxy_url,
          filesystem_metadata,
          hellocrab::hellocrab_start,
          hellocrab::hellocrab_status,
          hellocrab::hellocrab_stop,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            // 退出兜底：确保 HelloCrab 及其 Playwright/Chromium 子进程树被清理，
            // 不依赖前端 beforeunload 里的异步 invoke。
            if let tauri::RunEvent::Exit = event {
                let state = app.state::<hellocrab::HellocrabState>();
                hellocrab::kill_on_exit(&state);
            }
        });
}

use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::Manager;

/// 托管 HelloCrab 无头宿主子进程。
/// spawn/kill 都走 Rust 而非前端 shell scope：HelloCrab 是目录型发布物
/// （resources/hellocrab/HelloCrab.exe），Tauri v1 的 sidecar 只支持单文件，
/// 且 JS beforeunload 里的异步 invoke 不保证送达，进程清理必须由 Rust 兜底。
pub struct HellocrabState(pub Mutex<Option<Child>>);

impl Default for HellocrabState {
    fn default() -> Self {
        Self(Mutex::new(None))
    }
}

/// 去掉 Windows 扩展路径前缀（\\?\），部分子进程与命令行解析对它不友好。
fn strip_extended_prefix(path: &str) -> String {
    path.strip_prefix(r"\\?\")
        .map(|s| s.to_string())
        .unwrap_or_else(|| path.to_string())
}

fn resolve_hellocrab_exe(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    // 打包环境：resources/hellocrab/HelloCrab.exe
    if let Some(resource) = app
        .path_resolver()
        .resolve_resource("resources/hellocrab/HelloCrab.exe")
    {
        if resource.exists() {
            return Ok(resource);
        }
    }

    // 开发环境回退：src-tauri/resources/hellocrab/HelloCrab.exe
    // （由 scripts/prepare-sidecars.ps1 放置）
    let dev_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("resources")
        .join("hellocrab")
        .join("HelloCrab.exe");
    if dev_path.exists() {
        return Ok(dev_path);
    }

    Err(
        "找不到 HelloCrab.exe（resources/hellocrab/）。开发模式请先运行 \
         scripts/prepare-sidecars.ps1 发布 HelloCrab。"
            .to_string(),
    )
}

fn is_running(child: &mut Child) -> bool {
    matches!(child.try_wait(), Ok(None))
}

/// 树杀进程：HelloCrab 会派生 Playwright node driver 与 Chromium 子进程树，
/// 直接 kill 父进程会留下孤儿浏览器。
fn kill_tree(pid: u32) {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        let _ = Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/T", "/F"])
            .creation_flags(CREATE_NO_WINDOW)
            .output();
    }
    #[cfg(not(windows))]
    {
        let _ = Command::new("kill").args(["-9", &pid.to_string()]).output();
    }
}

#[tauri::command]
pub fn hellocrab_start(
    app: tauri::AppHandle,
    state: tauri::State<'_, HellocrabState>,
    port: u16,
    token: String,
) -> Result<u32, String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;

    // 已有存活实例时直接复用（前端负责在参数不匹配时先 stop）。
    if let Some(child) = guard.as_mut() {
        if is_running(child) {
            return Ok(child.id());
        }
    }

    let exe = resolve_hellocrab_exe(&app)?;
    let exe_str = strip_extended_prefix(&exe.to_string_lossy());
    let work_dir = std::path::Path::new(&exe_str)
        .parent()
        .map(|p| p.to_path_buf())
        .ok_or_else(|| "无法解析 HelloCrab 所在目录".to_string())?;

    let child = Command::new(&exe_str)
        .args([
            "--headless-host",
            "--remote-port",
            &port.to_string(),
            "--remote-token",
            &token,
        ])
        .current_dir(&work_dir)
        .spawn()
        .map_err(|e| format!("启动 HelloCrab 失败：{e}"))?;

    let pid = child.id();
    *guard = Some(child);
    Ok(pid)
}

#[tauri::command]
pub fn hellocrab_status(state: tauri::State<'_, HellocrabState>) -> Result<String, String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    let running = match guard.as_mut() {
        Some(child) => is_running(child),
        None => false,
    };
    if !running {
        *guard = None;
    }
    Ok(if running { "running" } else { "stopped" }.to_string())
}

#[tauri::command]
pub fn hellocrab_stop(state: tauri::State<'_, HellocrabState>) -> Result<(), String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    if let Some(mut child) = guard.take() {
        if is_running(&mut child) {
            kill_tree(child.id());
            let _ = child.wait();
        }
    }
    Ok(())
}

/// 应用退出兜底：无论前端是否来得及发 shutdown/stop，都清掉子进程树。
pub fn kill_on_exit(state: &HellocrabState) {
    if let Ok(mut guard) = state.0.lock() {
        if let Some(mut child) = guard.take() {
            if is_running(&mut child) {
                kill_tree(child.id());
                let _ = child.wait();
            }
        }
    }
}

namespace HelloCrab.Core.Services.Settings;

/// <summary>
/// 无头宿主模式（--headless-host）的进程级覆盖参数。
/// 由 Desktop 的 Program.Main 在 Avalonia 启动前根据命令行填充；
/// SettingsService.Load 在返回设置前应用覆盖，使外部编排器
/// （例如 AllMedia）能够以固定端口与令牌接管远程 API，
/// 而不必预写或理解 settings.json 的全部字段。
/// </summary>
public static class HeadlessHostOverride
{
    /// <summary>是否处于无头宿主模式（隐藏主窗口，仅保留远程 API 与浏览器）。</summary>
    public static bool Active { get; set; }

    /// <summary>覆盖远程 API 端口；0 表示沿用 settings.json 的端口。</summary>
    public static int Port { get; set; }

    /// <summary>覆盖远程 API 令牌；空表示沿用 settings.json 的令牌。</summary>
    public static string Token { get; set; } = string.Empty;

    public static void Apply(AppSettings settings)
    {
        if (!Active)
            return;

        settings.RemoteApiEnabled = true;
        if (Port > 0)
        {
            settings.RemoteApiPort = RemoteApiPortState.Normalize(Port);
            RemoteApiPortState.Set(settings.RemoteApiPort);
        }
        if (!string.IsNullOrWhiteSpace(Token))
            settings.RemoteApiToken = Token;
    }
}

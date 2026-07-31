using Avalonia;
using Avalonia.Media;
using HelloCrab.Core.Services.Settings;
using System;

namespace HelloCrab.Desktop;

internal static class Program
{
    [STAThread]
    public static void Main(string[] args)
    {
        ParseHeadlessHostArgs(args);
        BuildAvaloniaApp().StartWithClassicDesktopLifetime(args);
    }

    /// <summary>
    /// 解析无头宿主参数（--headless-host [--remote-port N] [--remote-token X]）。
    /// 必须在 Avalonia 与任何 SettingsService.Load 之前完成，
    /// 否则视图模型会拿到未覆盖的端口与令牌。
    /// </summary>
    private static void ParseHeadlessHostArgs(string[] args)
    {
        for (var i = 0; i < args.Length; i++)
        {
            switch (args[i])
            {
                case "--headless-host":
                    HeadlessHostOverride.Active = true;
                    break;

                case "--remote-port" when i + 1 < args.Length:
                    if (int.TryParse(args[i + 1], out var port))
                        HeadlessHostOverride.Port = port;
                    i++;
                    break;

                case "--remote-token" when i + 1 < args.Length:
                    HeadlessHostOverride.Token = args[i + 1];
                    i++;
                    break;
            }
        }
    }

    public static AppBuilder BuildAvaloniaApp()
        => AppBuilder.Configure<App>()
            // Register Emoji as a real Unicode-range fallback. A comma-separated FontFamily on a
            // TextBlock is not equivalent to FontManager fallback and can leave supplementary-plane
            // characters as missing-glyph boxes when the primary CJK font is selected.
            .With(CreateFontManagerOptions())
            .UsePlatformDetect()
            .LogToTrace();

    private static FontManagerOptions CreateFontManagerOptions()
    {
        var emojiFamily = OperatingSystem.IsWindows()
            ? "Segoe UI Emoji"
            : OperatingSystem.IsMacOS()
                ? "Apple Color Emoji"
                : "Noto Color Emoji";

        return new FontManagerOptions
        {
            FontFallbacks =
            [
                new FontFallback
                {
                    FontFamily = new FontFamily(emojiFamily),
                    // Miscellaneous Symbols, Dingbats and all modern pictographic blocks.
                    UnicodeRange = UnicodeRange.Parse("200D,20E3,2600-27BF,FE0E-FE0F,1F000-1FAFF")
                }
            ]
        };
    }
}

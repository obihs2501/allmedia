import { Child, Command } from '@tauri-apps/api/shell';
import { path } from '@tauri-apps/api';
import { MediagoEvent, MediagoMediaInfo } from '../interfaces/Mediago';
import { useSettingsStore } from '../stores/settings';
import { useAppStateStore } from '../stores/app-state';

/** 去掉 Windows 扩展路径前缀（\\?\），Go 子进程参数解析对它不友好。 */
function stripExtendedPrefix(p: string): string {
  return p.startsWith('\\\\?\\') ? p.slice(4) : p;
}

let cachedFfmpegPath: string | null | undefined;

/**
 * 解析捆绑 ffmpeg 的路径（resources/hellocrab/ffmpeg/ffmpeg.exe，
 * 与 HelloCrab 共用一份）。开发模式 resolveResource 落在
 * src-tauri/resources/ 下，由 scripts/prepare-sidecars.ps1 放置。
 * 找不到时返回 null，mediago 会回退到 PATH 查找。
 */
export async function resolveFfmpegPath(): Promise<string | null> {
  if (cachedFfmpegPath !== undefined) return cachedFfmpegPath;
  try {
    const resolved = await path.resolveResource(
      'resources/hellocrab/ffmpeg/ffmpeg.exe',
    );
    const { fs } = await import('@tauri-apps/api');
    cachedFfmpegPath = (await fs.exists(resolved))
      ? stripExtendedPrefix(resolved)
      : null;
  } catch {
    cachedFfmpegPath = null;
  }
  return cachedFfmpegPath;
}

/** 根据设置构建 cookie / 代理相关的公共参数。 */
function buildCommonArgs(): string[] {
  const settings = useSettingsStore.getState();
  const args: string[] = [];

  if (settings.mediago.cookieMode === 'browser') {
    args.push('--cookies-from-browser', settings.mediago.cookieBrowser);
  } else if (
    settings.mediago.cookieMode === 'file' &&
    settings.mediago.cookieFile
  ) {
    args.push('--cookies', settings.mediago.cookieFile);
  }

  if (settings.mediago.useAppProxy && settings.proxy.enable) {
    const proxyUrl = settings.proxy.useSystem
      ? useAppStateStore.getState().systemProxyUrl
      : settings.proxy.url;
    if (proxyUrl) {
      args.push('--proxy', proxyUrl);
    }
  }

  return args;
}

/**
 * 解析 URL 信息：`mediago -j --no-progress <url>`。
 * stdout 是完整的 pretty JSON（MediaInfo）。
 */
export async function analyzeUrl(url: string): Promise<MediagoMediaInfo> {
  const args = ['-j', '--no-progress', ...buildCommonArgs(), url];
  log.category('MEDIAGO').info('analyze:', args.join(' '));

  const command = Command.sidecar('binaries/mediago', args);
  const output = await command.execute();
  if (output.code !== 0) {
    const stderrTail = output.stderr.trim().split('\n').slice(-3).join('\n');
    throw new Error(stderrTail || `mediago 退出码 ${output.code}`);
  }
  try {
    return JSON.parse(output.stdout) as MediagoMediaInfo;
  } catch {
    throw new Error('无法解析 mediago 输出，请检查 URL 是否受支持');
  }
}

export interface MediagoDownloadOptions {
  url: string;
  /** 格式选择器（best/1080p/… 或具体 stream key） */
  format: string;
  /** 输出目录（绝对路径） */
  saveDir: string;
  /** 是否下载整个播放列表 */
  playlist: boolean;
  onEvent: (event: MediagoEvent) => void;
  onExit: (code: number | null) => void;
}

export interface MediagoDownloadHandle {
  child: Child;
  kill: () => Promise<void>;
}

/**
 * 启动下载：`mediago --progress-json -f <fmt> -o <dir>/%(title)s.%(ext)s <url>`。
 * stdout 每行一个 NDJSON 事件，stderr 是人类可读日志（转发到应用日志）。
 */
export async function startDownload(
  options: MediagoDownloadOptions,
): Promise<MediagoDownloadHandle> {
  const settings = useSettingsStore.getState();
  const logger = log.category('MEDIAGO');

  // 输出模板目录部分用 / 分隔（mediago 内部按 / 切分目录）
  const dir = options.saveDir.replace(/\\/g, '/').replace(/\/+$/, '');
  const args = [
    '--progress-json',
    '-f',
    options.format,
    '-o',
    `${dir}/%(title)s.%(ext)s`,
    '-N',
    String(settings.mediago.concurrentFragments || 10),
  ];
  if (options.playlist) {
    args.push('--yes-playlist');
  }
  const ffmpeg = await resolveFfmpegPath();
  if (ffmpeg) {
    args.push('--ffmpeg-location', ffmpeg);
  }
  args.push(...buildCommonArgs(), options.url);

  logger.info('download:', args.join(' '));

  const command = Command.sidecar('binaries/mediago', args);

  let buffer = '';
  command.stdout.on('data', (line: string) => {
    // Tauri 按行分发，但保险起见处理粘包/半行
    buffer += line;
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const one of lines) {
      const trimmed = one.trim();
      if (!trimmed) continue;
      try {
        options.onEvent(JSON.parse(trimmed) as MediagoEvent);
      } catch {
        logger.warn('无法解析进度行:', trimmed);
      }
    }
  });
  command.stderr.on('data', (line: string) => {
    const trimmed = String(line).trim();
    if (trimmed) logger.info(trimmed);
  });
  command.on('close', (payload: { code: number | null }) => {
    // 关闭时冲刷缓冲区里最后一行
    const trimmed = buffer.trim();
    if (trimmed) {
      try {
        options.onEvent(JSON.parse(trimmed) as MediagoEvent);
      } catch {
        // ignore
      }
      buffer = '';
    }
    options.onExit(payload.code);
  });
  command.on('error', (message: string) => {
    logger.error('mediago 进程错误:', message);
    options.onExit(null);
  });

  const child = await command.spawn();
  return {
    child,
    kill: async () => {
      try {
        await child.kill();
      } catch (err) {
        logger.warn('终止 mediago 失败', err);
      }
    },
  };
}

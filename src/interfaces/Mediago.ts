/** mediago sidecar（engines/mediago）的数据契约。 */

/** `mediago -j` 输出的流信息（Go 侧 extractor.Stream 的 json tag）。 */
export interface MediagoStream {
  quality: string;
  urls: string[];
  format: string;
  size: number;
  need_merge: boolean;
  audio_url?: string;
  headers?: Record<string, string>;
  extra?: Record<string, unknown>;
}

/** `mediago -j` 输出的媒体信息（extractor.MediaInfo）。 */
export interface MediagoMediaInfo {
  site: string;
  title: string;
  artist: string;
  streams: Record<string, MediagoStream> | null;
  entries?: MediagoMediaInfo[] | null;
  extra?: Record<string, unknown>;
}

/** `--progress-json` 模式下 stdout 的 NDJSON 事件。 */
export type MediagoEvent =
  | { event: 'start'; url: string }
  | {
      event: 'info';
      title: string;
      site: string;
      playlist: boolean;
      count: number;
    }
  | { event: 'item-start'; index: number; total: number; title: string }
  | {
      event: 'progress';
      index: number;
      written: number;
      total: number;
      segDone: number;
      segTotal: number;
    }
  | { event: 'merging'; index: number }
  | { event: 'item-done'; index: number; path: string; size: number }
  | { event: 'item-error'; index: number; title: string; message: string }
  | { event: 'url-error'; url: string; message: string }
  | { event: 'done'; success: number; failed: number };

export type MediagoTaskStatus =
  | 'waiting'
  | 'downloading'
  | 'merging'
  | 'complete'
  | 'error'
  | 'canceled';

/** 一次 mediago 下载任务（对应一次 sidecar 进程调用，可能含多个播放列表条目）。 */
export interface MediagoTask {
  id: string;
  url: string;
  title: string;
  site: string;
  /** 用户选择的格式（stream key 或 best/1080p 等选择器） */
  format: string;
  saveDir: string;
  status: MediagoTaskStatus;
  /** 播放列表总条目数（单视频为 1） */
  itemTotal: number;
  /** 当前正在下载的条目序号（1 起） */
  itemIndex: number;
  currentItemTitle: string;
  /** 字节进度（total 为 0 表示未知大小） */
  written: number;
  total: number;
  /** HLS 分段进度（segTotal 为 0 表示非分段模式） */
  segDone: number;
  segTotal: number;
  /** 已完成条目的输出文件路径 */
  outputPaths: string[];
  errorMessage: string;
  createdAt: number;
  /** 是否下载整个播放列表 */
  playlist: boolean;
}

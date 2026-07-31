/**
 * HelloCrab 无头宿主（engines/hellocrab）Remote API 的数据契约。
 * 与 HelloCrab.Core/Contracts/RemoteContracts.cs 逐字段对应；
 * 服务端使用 JsonSerializerDefaults.Web，因此全部是 camelCase。
 */

export interface HellocrabHealth {
  service: string;
  version: string;
  serverTime: string;
}

export interface HellocrabSettings {
  theme: string;
  selectedPlatformId: string;
  /** Playwright 浏览器无头开关；采集需要用户在浏览器里登录，必须保持 false */
  headlessMode: boolean;
  browserUrl: string;
  downloadRoot: string;
  includeWorkId: boolean;
  downloadCover: boolean;
  downloadMusic: boolean;
  checkVideoAudio: boolean;
  enablePersonDetection: boolean;
  personDetectionConfidence: number;
  stopOnDuplicateThreshold: boolean;
  duplicateStopThreshold: number;
}

export interface HellocrabHistoryItem {
  id: number;
  platform: string;
  userId: string;
  userName: string;
  originalUrl: string;
  folderPath: string;
  headUrl: string;
  itemsCount: number;
  itemsSize: number;
  updatedAt: string;
}

export interface HellocrabSnapshot {
  serverTime: string;
  isBusy: boolean;
  isCapturing: boolean;
  isBrowserStarted: boolean;
  statusText: string;
  currentUrl: string;
  currentWork: string;
  isDownloading: boolean;
  isDownloadIndeterminate: boolean;
  downloadProgressPercent: number;
  downloadProgressText: string;
  currentCoverUrl: string;
  currentAuthorName: string | null;
  currentAuthorId: string | null;
  currentAuthorDirectory: string | null;
  responseCount: number;
  discoveredCount: number;
  downloadedCount: number;
  skippedCount: number;
  failedCount: number;
  settings: HellocrabSettings;
  logs: string[];
  history: HellocrabHistoryItem[];
}

export interface HellocrabCommandResult {
  success: boolean;
  message: string;
}

export type HellocrabAction =
  | 'install-chromium'
  | 'install-ffmpeg'
  | 'open-browser'
  | 'start'
  | 'stop'
  | 'open-download-folder'
  | 'shutdown';

/** HelloCrab 支持的采集平台（Sites/ 目录下的适配器 ID）。 */
export const HELLOCRAB_PLATFORMS: { id: string; name: string }[] = [
  { id: 'douyin', name: '抖音' },
  { id: 'tiktok', name: 'TikTok' },
  { id: 'kuaishou', name: '快手' },
  { id: 'weibo', name: '微博' },
  { id: 'xiaohongshu', name: '小红书' },
  { id: 'meipian', name: '美篇' },
  { id: 'instagram', name: 'Instagram' },
  { id: 'bilibili', name: '哔哩哔哩' },
  { id: 'pinterest', name: 'Pinterest' },
  { id: 'youtube', name: 'YouTube' },
];

export type HellocrabEngineState = 'stopped' | 'starting' | 'running';

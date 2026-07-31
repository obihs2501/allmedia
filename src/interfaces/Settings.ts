export interface Settings_V1 {
  proxy: {
    enable: boolean;
    url: string;
    useSystem: boolean;
  };
  download: {
    savePath: string;
    fileNameTemplate: string;
    sameFileSkip: boolean;
  };
  app: {
    autoCheckUpdate: boolean;
    acceptPrerelease: boolean;
  };
}

export interface Settings_V2 {
  proxy: {
    enable: boolean;
    url: string;
    useSystem: boolean;
  };
  download: {
    saveDirBase: string;
    dirTemplate: string;
    fileNameTemplate: string;
    sameFileSkip: boolean;
    consecutiveSkipThreshold: number;
  };
  app: {
    autoCheckUpdate: boolean;
    acceptPrerelease: boolean;
    writeLogs: boolean;
    theme?: 'light' | 'dark';
  };
}

export interface Settings_V3 {
  proxy: {
    enable: boolean;
    url: string;
    useSystem: boolean;
  };
  download: {
    saveDirBase: string;
    dirTemplate: string;
    fileNameTemplate: string;
    sameFileSkip: boolean;
    consecutiveSkipThreshold: number;
  };
  accountRotation: {
    /** 每开始一个博主的批量任务时切换到下一个账号 */
    rotateOnBlogger: boolean;
    /** 每 N 次 API 请求切换账号，0 表示关闭 */
    rotateEveryNRequests: number;
    /** 收到 429 后该账号的冷却时长（分钟） */
    rateLimitCooldownMinutes: number;
  };
  app: {
    autoCheckUpdate: boolean;
    acceptPrerelease: boolean;
    writeLogs: boolean;
    theme?: 'light' | 'dark';
  };
}

export interface Settings_V4 {
  proxy: {
    enable: boolean;
    url: string;
    useSystem: boolean;
  };
  download: {
    saveDirBase: string;
    dirTemplate: string;
    fileNameTemplate: string;
    sameFileSkip: boolean;
    consecutiveSkipThreshold: number;
  };
  accountRotation: {
    /** 每开始一个博主的批量任务时切换到下一个账号 */
    rotateOnBlogger: boolean;
    /** 每 N 次 API 请求切换账号，0 表示关闭 */
    rotateEveryNRequests: number;
    /** 收到 429 后该账号的冷却时长（分钟） */
    rateLimitCooldownMinutes: number;
  };
  app: {
    autoCheckUpdate: boolean;
    acceptPrerelease: boolean;
    writeLogs: boolean;
    /** 输出的最低日志等级 */
    logLevel: 'error' | 'warn' | 'info' | 'debug';
    /** 日志文件保留天数，0 表示不自动清理 */
    logRetentionDays: number;
    theme?: 'light' | 'dark';
  };
}

export interface Settings_V5 {
  proxy: {
    enable: boolean;
    url: string;
    useSystem: boolean;
  };
  download: {
    saveDirBase: string;
    dirTemplate: string;
    fileNameTemplate: string;
    sameFileSkip: boolean;
    consecutiveSkipThreshold: number;
  };
  accountRotation: {
    /** 每开始一个博主的批量任务时切换到下一个账号 */
    rotateOnBlogger: boolean;
    /** 每 N 次 API 请求切换账号，0 表示关闭 */
    rotateEveryNRequests: number;
    /** 收到 429 后该账号的冷却时长（分钟） */
    rateLimitCooldownMinutes: number;
  };
  /** 全网下载（mediago 引擎） */
  mediago: {
    /** 保存目录；留空时使用 download.saveDirBase 下的 AllMedia 子目录 */
    saveDir: string;
    /** 默认清晰度选择器 */
    defaultFormat: 'best' | '1080p' | '720p' | '480p' | 'worst';
    /** 分片并发数 */
    concurrentFragments: number;
    /** Cookie 来源：none 不带；browser 从浏览器读取；file 使用 Netscape 文件 */
    cookieMode: 'none' | 'browser' | 'file';
    cookieBrowser: 'chrome' | 'edge' | 'firefox';
    cookieFile: string;
    /** 下载时是否沿用应用代理设置 */
    useAppProxy: boolean;
  };
  /** 社交采集（HelloCrab 引擎） */
  hellocrab: {
    /** 打开社交采集页时自动启动引擎 */
    autoStartEngine: boolean;
    /** 固定远程端口；0 表示每次随机 */
    fixedPort: number;
  };
  app: {
    autoCheckUpdate: boolean;
    acceptPrerelease: boolean;
    writeLogs: boolean;
    /** 输出的最低日志等级 */
    logLevel: 'error' | 'warn' | 'info' | 'debug';
    /** 日志文件保留天数，0 表示不自动清理 */
    logRetentionDays: number;
    theme?: 'light' | 'dark';
  };
}

export type Settings = Settings_V5;

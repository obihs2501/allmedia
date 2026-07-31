import { create } from 'zustand';
import {
  HellocrabEngineState,
  HellocrabSnapshot,
} from '../interfaces/Hellocrab';
import {
  HellocrabClient,
  hellocrabProcessStatus,
  randomHellocrabPort,
  randomHellocrabToken,
  startHellocrabProcess,
  stopHellocrabProcess,
  waitForHealth,
} from '../utils/hellocrab';
import { useSettingsStore } from './settings';

/**
 * HelloCrab 引擎运行时状态。纯运行时 store，不持久化：
 * 端口/令牌每次会话生成，快照靠轮询刷新。
 */
export interface HellocrabStore {
  engineState: HellocrabEngineState;
  client: HellocrabClient | null;
  snapshot: HellocrabSnapshot | null;
  coverObjectUrl: string | null;
  lastError: string;

  startEngine: () => Promise<void>;
  stopEngine: () => Promise<void>;
  /** 页面挂载时开始轮询快照，返回清理函数 */
  beginPolling: () => () => void;
}

let pollTimer: ReturnType<typeof setInterval> | null = null;
let pollBusy = false;
let lastCoverUrlKey = '';

export const useHellocrabStore = create<HellocrabStore>((set, get) => ({
  engineState: 'stopped',
  client: null,
  snapshot: null,
  coverObjectUrl: null,
  lastError: '',

  startEngine: async () => {
    const state = get();
    if (state.engineState !== 'stopped') return;

    const logger = log.category('HELLOCRAB');
    set({ engineState: 'starting', lastError: '' });
    try {
      const settings = useSettingsStore.getState();
      const port =
        settings.hellocrab.fixedPort > 0
          ? settings.hellocrab.fixedPort
          : randomHellocrabPort();
      const token = randomHellocrabToken();

      // 若之前的进程仍存活（例如异常热重载），先清理再以新令牌启动
      if ((await hellocrabProcessStatus()) === 'running') {
        await stopHellocrabProcess();
      }

      const pid = await startHellocrabProcess(port, token);
      logger.info('HelloCrab started, pid =', pid, 'port =', port);

      const client = new HellocrabClient(port, token);
      const healthy = await waitForHealth(client);
      if (!healthy) {
        await stopHellocrabProcess();
        throw new Error('HelloCrab 远程 API 启动超时（20 秒）');
      }

      set({ engineState: 'running', client });
    } catch (err: any) {
      logger.error('启动 HelloCrab 失败', err);
      set({
        engineState: 'stopped',
        client: null,
        lastError: err?.message || String(err),
      });
    }
  },

  stopEngine: async () => {
    const { client, coverObjectUrl } = get();
    const logger = log.category('HELLOCRAB');

    if (coverObjectUrl) URL.revokeObjectURL(coverObjectUrl);
    lastCoverUrlKey = '';
    set({
      engineState: 'stopped',
      client: null,
      snapshot: null,
      coverObjectUrl: null,
    });

    // 先请求优雅退出（落盘设置、关闭浏览器），3 秒后强杀兜底
    if (client) {
      try {
        await client.action('shutdown');
        await new Promise((resolve) => setTimeout(resolve, 3000));
      } catch (err) {
        logger.warn('shutdown 请求失败，直接强杀', err);
      }
    }
    try {
      await stopHellocrabProcess();
    } catch (err) {
      logger.warn('停止 HelloCrab 进程失败', err);
    }
  },

  beginPolling: () => {
    const poll = async () => {
      if (pollBusy) return;
      const { client, engineState, coverObjectUrl } = get();
      if (!client || engineState !== 'running') return;

      pollBusy = true;
      try {
        const snapshot = await client.snapshot();
        set({ snapshot });

        // 封面按 currentCoverUrl 变化拉取，避免每秒重复下载
        if (snapshot.currentCoverUrl !== lastCoverUrlKey) {
          lastCoverUrlKey = snapshot.currentCoverUrl;
          if (coverObjectUrl) URL.revokeObjectURL(coverObjectUrl);
          const objectUrl = snapshot.currentCoverUrl
            ? await client.fetchCoverObjectUrl()
            : null;
          set({ coverObjectUrl: objectUrl });
        }
      } catch {
        // 快照失败可能是进程被外部关闭，探测一次
        try {
          if ((await hellocrabProcessStatus()) === 'stopped') {
            set({ engineState: 'stopped', client: null, snapshot: null });
          }
        } catch {
          // ignore
        }
      } finally {
        pollBusy = false;
      }
    };

    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(poll, 1000);
    void poll();

    return () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };
  },
}));

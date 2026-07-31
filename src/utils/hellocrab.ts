import { invoke } from '@tauri-apps/api';
import {
  HellocrabAction,
  HellocrabCommandResult,
  HellocrabHealth,
  HellocrabSettings,
  HellocrabSnapshot,
} from '../interfaces/Hellocrab';

const TOKEN_HEADER = 'X-SMC-Token';

/**
 * HelloCrab 无头宿主进程控制（Rust command）+ Remote API HTTP 客户端。
 * HelloCrab 的 Kestrel 已配置 CORS AllowAnyOrigin 与 Private Network Access
 * 头，WebView 里直接 fetch http://127.0.0.1 即可，无需经过 Rust 转发。
 */
export class HellocrabClient {
  constructor(
    public readonly port: number,
    public readonly token: string,
  ) {}

  get baseUrl() {
    return `http://127.0.0.1:${this.port}`;
  }

  async health(timeoutMs = 2000): Promise<HellocrabHealth> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const resp = await fetch(`${this.baseUrl}/api/health`, {
        signal: controller.signal,
      });
      if (!resp.ok) throw new Error(`health HTTP ${resp.status}`);
      return (await resp.json()) as HellocrabHealth;
    } finally {
      clearTimeout(timer);
    }
  }

  async snapshot(): Promise<HellocrabSnapshot> {
    const resp = await fetch(`${this.baseUrl}/api/snapshot`, {
      headers: { [TOKEN_HEADER]: this.token },
    });
    if (!resp.ok) throw new Error(`snapshot HTTP ${resp.status}`);
    return (await resp.json()) as HellocrabSnapshot;
  }

  async putSettings(
    settings: HellocrabSettings,
  ): Promise<HellocrabCommandResult> {
    const resp = await fetch(`${this.baseUrl}/api/settings`, {
      method: 'PUT',
      headers: {
        [TOKEN_HEADER]: this.token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    });
    return (await resp.json()) as HellocrabCommandResult;
  }

  async action(action: HellocrabAction): Promise<HellocrabCommandResult> {
    const resp = await fetch(`${this.baseUrl}/api/actions/${action}`, {
      method: 'POST',
      headers: { [TOKEN_HEADER]: this.token },
    });
    return (await resp.json()) as HellocrabCommandResult;
  }

  /**
   * 拉取当前封面 PNG。接口需要 token 头，<img src> 无法携带，
   * 必须 fetch → blob → objectURL；调用方负责 revokeObjectURL。
   */
  async fetchCoverObjectUrl(): Promise<string | null> {
    const resp = await fetch(`${this.baseUrl}/api/current-cover`, {
      headers: { [TOKEN_HEADER]: this.token },
    });
    if (!resp.ok) return null;
    const blob = await resp.blob();
    if (blob.size === 0) return null;
    return URL.createObjectURL(blob);
  }

  avatarUrl(historyId: number): string {
    return `${this.baseUrl}/api/history/${historyId}/avatar`;
  }

  async fetchAvatarObjectUrl(historyId: number): Promise<string | null> {
    const resp = await fetch(this.avatarUrl(historyId), {
      headers: { [TOKEN_HEADER]: this.token },
    });
    if (!resp.ok) return null;
    const blob = await resp.blob();
    if (blob.size === 0) return null;
    return URL.createObjectURL(blob);
  }
}

/** 启动无头宿主进程，返回 pid。 */
export async function startHellocrabProcess(
  port: number,
  token: string,
): Promise<number> {
  return await invoke<number>('hellocrab_start', { port, token });
}

export async function stopHellocrabProcess(): Promise<void> {
  await invoke('hellocrab_stop');
}

export async function hellocrabProcessStatus(): Promise<'running' | 'stopped'> {
  return await invoke<'running' | 'stopped'>('hellocrab_status');
}

/**
 * 等待远程 API 就绪（进程启动到 Kestrel 监听有数秒延迟）。
 * 成功返回 true；超时返回 false。
 */
export async function waitForHealth(
  client: HellocrabClient,
  timeoutMs = 20000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await client.health(1500);
      return true;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  return false;
}

export function randomHellocrabPort(): number {
  return 51000 + Math.floor(Math.random() * 10000);
}

export function randomHellocrabToken(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

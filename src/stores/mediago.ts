import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import { createTauriFileStorage } from './persist/tauri-file-storage';
import { MediagoEvent, MediagoTask } from '../interfaces/Mediago';
import { MediagoDownloadHandle, startDownload } from '../utils/mediago';

/** 运行中任务的进程句柄，不进入持久化。 */
const runningHandles = new Map<string, MediagoDownloadHandle>();

export interface MediagoStore {
  tasks: MediagoTask[];

  createTask: (params: {
    url: string;
    title: string;
    site: string;
    format: string;
    saveDir: string;
    playlist: boolean;
    itemTotal: number;
  }) => Promise<string>;
  cancelTask: (id: string) => Promise<void>;
  retryTask: (id: string) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  clearFinished: () => void;
}

function patchTask(
  tasks: MediagoTask[],
  id: string,
  patch: Partial<MediagoTask>,
): MediagoTask[] {
  return tasks.map((t) => (t.id === id ? { ...t, ...patch } : t));
}

export const useMediagoStore = create(
  persist<MediagoStore>(
    (set, get) => ({
      tasks: [],

      createTask: async ({
        url,
        title,
        site,
        format,
        saveDir,
        playlist,
        itemTotal,
      }) => {
        const id = nanoid();
        const task: MediagoTask = {
          id,
          url,
          title,
          site,
          format,
          saveDir,
          status: 'downloading',
          itemTotal,
          itemIndex: 0,
          currentItemTitle: '',
          written: 0,
          total: 0,
          segDone: 0,
          segTotal: 0,
          outputPaths: [],
          errorMessage: '',
          createdAt: Date.now(),
          playlist,
        };
        set({ tasks: [task, ...get().tasks] });

        const onEvent = (event: MediagoEvent) => {
          const state = get();
          switch (event.event) {
            case 'info':
              set({
                tasks: patchTask(state.tasks, id, {
                  title: event.title || title,
                  site: event.site || site,
                  itemTotal:
                    event.playlist && event.count > 0
                      ? playlist
                        ? event.count
                        : 1
                      : 1,
                }),
              });
              break;
            case 'item-start':
              set({
                tasks: patchTask(state.tasks, id, {
                  status: 'downloading',
                  itemIndex: event.index,
                  itemTotal: event.total,
                  currentItemTitle: event.title,
                  written: 0,
                  total: 0,
                  segDone: 0,
                  segTotal: 0,
                }),
              });
              break;
            case 'progress':
              set({
                tasks: patchTask(state.tasks, id, {
                  written: event.written,
                  total: event.total,
                  segDone: event.segDone,
                  segTotal: event.segTotal,
                }),
              });
              break;
            case 'merging':
              set({ tasks: patchTask(state.tasks, id, { status: 'merging' }) });
              break;
            case 'item-done': {
              const current = state.tasks.find((t) => t.id === id);
              set({
                tasks: patchTask(state.tasks, id, {
                  status: 'downloading',
                  outputPaths: [...(current?.outputPaths ?? []), event.path],
                }),
              });
              break;
            }
            case 'item-error':
              set({
                tasks: patchTask(state.tasks, id, {
                  errorMessage: `第 ${event.index} 项失败：${event.message}`,
                }),
              });
              break;
            case 'url-error':
              set({
                tasks: patchTask(state.tasks, id, {
                  errorMessage: event.message,
                }),
              });
              break;
            case 'done':
              set({
                tasks: patchTask(state.tasks, id, {
                  status: event.failed > 0 ? 'error' : 'complete',
                }),
              });
              break;
          }
        };

        const onExit = (code: number | null) => {
          runningHandles.delete(id);
          const task = get().tasks.find((t) => t.id === id);
          if (!task) return;
          // done 事件已定状态的不再覆盖；被取消的保持 canceled
          if (task.status === 'downloading' || task.status === 'merging') {
            set({
              tasks: patchTask(get().tasks, id, {
                status: code === 0 ? 'complete' : 'error',
                errorMessage:
                  code === 0
                    ? task.errorMessage
                    : task.errorMessage || `mediago 退出码 ${code ?? '未知'}`,
              }),
            });
          }
        };

        try {
          const handle = await startDownload({
            url,
            format,
            saveDir,
            playlist,
            onEvent,
            onExit,
          });
          runningHandles.set(id, handle);
        } catch (err: any) {
          set({
            tasks: patchTask(get().tasks, id, {
              status: 'error',
              errorMessage: err?.message || String(err),
            }),
          });
        }

        return id;
      },

      cancelTask: async (id) => {
        const handle = runningHandles.get(id);
        runningHandles.delete(id);
        set({
          tasks: patchTask(get().tasks, id, {
            status: 'canceled',
            errorMessage: '',
          }),
        });
        if (handle) {
          await handle.kill();
        }
      },

      retryTask: async (id) => {
        const task = get().tasks.find((t) => t.id === id);
        if (!task) return;
        // 移除旧记录，按原参数重建任务
        set({ tasks: get().tasks.filter((t) => t.id !== id) });
        await get().createTask({
          url: task.url,
          title: task.title,
          site: task.site,
          format: task.format,
          saveDir: task.saveDir,
          playlist: task.playlist,
          itemTotal: task.itemTotal,
        });
      },

      removeTask: async (id) => {
        const handle = runningHandles.get(id);
        runningHandles.delete(id);
        if (handle) {
          await handle.kill();
        }
        set({ tasks: get().tasks.filter((t) => t.id !== id) });
      },

      clearFinished: () => {
        set({
          tasks: get().tasks.filter(
            (t) => !['complete', 'canceled'].includes(t.status),
          ),
        });
      },
    }),
    {
      name: 'mediago-tasks',
      storage: createTauriFileStorage(),
      version: 1,
      partialize: (s) => ({ tasks: s.tasks }) as any,
      merge: (persisted: any, current) => {
        const revived: MediagoTask[] = (persisted?.tasks || []).map(
          (t: MediagoTask): MediagoTask =>
            ['downloading', 'merging', 'waiting'].includes(t.status)
              ? {
                  ...t,
                  // 重启后 sidecar 进程已不存在，进行中的任务标记为错误供重试
                  status: 'error',
                  errorMessage: '应用重启，任务已中断，可重新下载',
                }
              : t,
        );
        return { ...current, tasks: revived };
      },
    },
  ),
);

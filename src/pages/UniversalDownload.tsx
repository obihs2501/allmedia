/* eslint-disable react/prop-types */
import React, { useMemo, useState } from 'react';
import {
  Button,
  Empty,
  Input,
  List,
  Popconfirm,
  Progress,
  Select,
  Space,
  Switch,
  Tag,
  message,
} from 'antd';
import {
  CloseOutlined,
  DeleteOutlined,
  FolderOpenOutlined,
  RedoOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { PageHeader } from '../components/PageHeader';
import { MediagoMediaInfo, MediagoTask } from '../interfaces/Mediago';
import { analyzeUrl } from '../utils/mediago';
import { useMediagoStore } from '../stores/mediago';
import { useSettingsStore } from '../stores/settings';
import { showInFolder } from '../utils/shell';
import { path } from '@tauri-apps/api';

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '未知大小';
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

/** 按清晰度对 stream key 排序（仿 mediago output.go 的 formatRank）。 */
function formatRank(quality: string, key: string): number {
  const q = (quality || key).trim().toLowerCase();
  const table: Record<string, number> = {
    source: 5000,
    best: 4500,
    default: 4000,
    hd: 3500,
    high: 3500,
    sd: 3000,
    medium: 3000,
    low: 1000,
  };
  if (table[q] !== undefined) return table[q];
  const m = q.match(/(\d{3,4})\s*p?/);
  if (m) return parseInt(m[1], 10);
  return 0;
}

const STATUS_TAG: Record<
  MediagoTask['status'],
  { color: string; text: string }
> = {
  waiting: { color: 'default', text: '等待中' },
  downloading: { color: 'processing', text: '下载中' },
  merging: { color: 'processing', text: '合并中' },
  complete: { color: 'success', text: '已完成' },
  error: { color: 'error', text: '失败' },
  canceled: { color: 'default', text: '已取消' },
};

const TaskProgress: React.FC<{ task: MediagoTask }> = ({ task }) => {
  const active = task.status === 'downloading' || task.status === 'merging';
  if (!active && task.status !== 'complete') return null;

  let percent: number | undefined;
  let label = '';
  if (task.status === 'complete') {
    percent = 100;
  } else if (task.total > 0) {
    percent = Math.min(99, Math.round((task.written / task.total) * 100));
    label = `${formatBytes(task.written)} / ${formatBytes(task.total)}`;
  } else if (task.segTotal > 0) {
    percent = Math.min(99, Math.round((task.segDone / task.segTotal) * 100));
    label = `分片 ${task.segDone} / ${task.segTotal}`;
  } else if (task.written > 0) {
    label = formatBytes(task.written);
  }

  return (
    <div>
      <Progress
        percent={percent ?? 99}
        status={
          task.status === 'complete'
            ? 'success'
            : percent === undefined
              ? 'active'
              : 'normal'
        }
        showInfo={percent !== undefined}
        size="small"
      />
      <span className="text-xs text-gray-400">
        {task.status === 'merging' ? '正在合并（ffmpeg）…' : label}
        {task.itemTotal > 1 &&
          active &&
          ` · 第 ${task.itemIndex}/${task.itemTotal} 项 ${task.currentItemTitle}`}
      </span>
    </div>
  );
};

export const UniversalDownload: React.FC = () => {
  const [url, setUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [info, setInfo] = useState<MediagoMediaInfo | null>(null);
  const [selectedFormat, setSelectedFormat] = useState('best');
  const [wholePlaylist, setWholePlaylist] = useState(true);
  const tasks = useMediagoStore((s) => s.tasks);
  const { createTask, cancelTask, retryTask, removeTask, clearFinished } =
    useMediagoStore();
  const settings = useSettingsStore();

  const isPlaylist = !!info?.entries && info.entries.length > 0;
  // 播放列表的格式在各条目内，此处让用户选通用清晰度；单视频列出具体流
  const formatOptions = useMemo(() => {
    const generic = [
      { value: 'best', label: '最高画质（best）' },
      { value: '1080p', label: '1080p' },
      { value: '720p', label: '720p' },
      { value: '480p', label: '480p' },
      { value: 'worst', label: '最低画质' },
    ];
    if (!info || isPlaylist || !info.streams) return generic;
    const keys = Object.keys(info.streams);
    if (keys.length === 0) return generic;
    const specific = keys
      .sort(
        (a, b) =>
          formatRank(info.streams![b].quality, b) -
          formatRank(info.streams![a].quality, a),
      )
      .map((key) => {
        const s = info.streams![key];
        const parts = [
          s.quality || key,
          s.format || '',
          s.size > 0 ? formatBytes(s.size) : '',
        ].filter(Boolean);
        return { value: s.quality || key, label: parts.join(' · ') };
      });
    // 去重（多个流可能同 quality）
    const seen = new Set<string>();
    return [
      { value: 'best', label: '最高画质（best）' },
      ...specific.filter((o) => {
        if (seen.has(o.value)) return false;
        seen.add(o.value);
        return true;
      }),
    ];
  }, [info, isPlaylist]);

  const handleAnalyze = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setAnalyzing(true);
    setInfo(null);
    try {
      const result = await analyzeUrl(trimmed);
      setInfo(result);
      setSelectedFormat(settings.mediago.defaultFormat);
    } catch (err: any) {
      message.error(err?.message || '解析失败');
    } finally {
      setAnalyzing(false);
    }
  };

  const resolveSaveDir = async (): Promise<string> => {
    if (settings.mediago.saveDir) return settings.mediago.saveDir;
    const base = settings.download.saveDirBase || (await path.downloadDir());
    return await path.join(base, 'AllMedia');
  };

  const handleDownload = async () => {
    if (!info) return;
    const saveDir = await resolveSaveDir();
    await createTask({
      url: url.trim(),
      title: info.title,
      site: info.site,
      format: selectedFormat,
      saveDir,
      playlist: isPlaylist && wholePlaylist,
      itemTotal: isPlaylist && wholePlaylist ? info.entries!.length : 1,
    });
    message.success('任务已开始');
    setInfo(null);
    setUrl('');
  };

  return (
    <>
      <PageHeader />
      <section className="bg-white p-4 border-[1px] rounded-md mb-4">
        <Space.Compact className="w-full">
          <Input
            placeholder="粘贴视频 / 课程链接（B 站、抖音、CCTV 及 92 个站点），例如 https://www.bilibili.com/video/BV..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onPressEnter={handleAnalyze}
            allowClear
          />
          <Button
            type="primary"
            icon={<SearchOutlined />}
            loading={analyzing}
            onClick={handleAnalyze}
          >
            解析
          </Button>
        </Space.Compact>

        {info && (
          <div className="mt-4 border-t pt-4">
            <div className="font-bold text-base mb-1">{info.title}</div>
            <div className="text-gray-400 text-sm mb-3">
              <Tag>{info.site}</Tag>
              {info.artist && <span className="mr-2">{info.artist}</span>}
              {isPlaylist && (
                <Tag color="blue">播放列表 · {info.entries!.length} 项</Tag>
              )}
            </div>
            <Space wrap>
              <Select
                className="min-w-[240px]"
                value={selectedFormat}
                onChange={setSelectedFormat}
                options={formatOptions}
              />
              {isPlaylist && (
                <span>
                  <Switch
                    checked={wholePlaylist}
                    onChange={setWholePlaylist}
                    className="mr-1"
                  />
                  下载全部 {info.entries!.length} 项
                </span>
              )}
              <Button type="primary" onClick={handleDownload}>
                开始下载
              </Button>
            </Space>
          </div>
        )}
      </section>

      <section className="bg-white p-4 border-[1px] rounded-md">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold text-base">下载任务</h2>
          <Button size="small" onClick={clearFinished}>
            清除已完成
          </Button>
        </div>
        {tasks.length === 0 ? (
          <Empty description="暂无任务。粘贴链接并解析，即可从 92 个站点下载视频。" />
        ) : (
          <List
            dataSource={tasks}
            rowKey={(t) => t.id}
            renderItem={(task) => {
              const st = STATUS_TAG[task.status];
              const running =
                task.status === 'downloading' || task.status === 'merging';
              return (
                <List.Item
                  actions={[
                    running && (
                      <Button
                        key="cancel"
                        size="small"
                        icon={<CloseOutlined />}
                        onClick={() => cancelTask(task.id)}
                      >
                        取消
                      </Button>
                    ),
                    ['error', 'canceled'].includes(task.status) && (
                      <Button
                        key="retry"
                        size="small"
                        icon={<RedoOutlined />}
                        onClick={() => retryTask(task.id)}
                      >
                        重试
                      </Button>
                    ),
                    task.outputPaths.length > 0 && (
                      <Button
                        key="open"
                        size="small"
                        icon={<FolderOpenOutlined />}
                        onClick={() => showInFolder(task.outputPaths[0], true)}
                      >
                        打开
                      </Button>
                    ),
                    !running && (
                      <Popconfirm
                        key="remove"
                        title="删除该任务记录？（不会删除已下载文件）"
                        onConfirm={() => removeTask(task.id)}
                      >
                        <Button size="small" icon={<DeleteOutlined />} danger />
                      </Popconfirm>
                    ),
                  ].filter(Boolean)}
                >
                  <List.Item.Meta
                    title={
                      <span>
                        <Tag color={st.color}>{st.text}</Tag>
                        {task.title || task.url}
                      </span>
                    }
                    description={
                      <div>
                        <div className="text-xs text-gray-400 mb-1">
                          <Tag>{task.site || '未知站点'}</Tag>
                          {task.format} · {task.saveDir}
                        </div>
                        <TaskProgress task={task} />
                        {task.errorMessage && (
                          <div className="text-xs text-red-500 mt-1">
                            {task.errorMessage}
                          </div>
                        )}
                      </div>
                    }
                  />
                </List.Item>
              );
            }}
          />
        )}
      </section>
    </>
  );
};

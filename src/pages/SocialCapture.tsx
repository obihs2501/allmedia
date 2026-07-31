/* eslint-disable react/prop-types */
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Progress,
  Select,
  Space,
  Statistic,
  Switch,
  Tag,
  message,
} from 'antd';
import {
  ChromeOutlined,
  DownloadOutlined,
  FolderOpenOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  PoweroffOutlined,
  SettingOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { PageHeader } from '../components/PageHeader';
import { useHellocrabStore } from '../stores/hellocrab';
import { useSettingsStore } from '../stores/settings';
import {
  HELLOCRAB_PLATFORMS,
  HellocrabSettings,
} from '../interfaces/Hellocrab';

const EngineStateBadge: React.FC = () => {
  const engineState = useHellocrabStore((s) => s.engineState);
  switch (engineState) {
    case 'running':
      return <Badge status="success" text="引擎运行中" />;
    case 'starting':
      return <Badge status="processing" text="正在启动…" />;
    default:
      return <Badge status="default" text="引擎未启动" />;
  }
};

const CaptureSettingsDrawer: React.FC<{
  open: boolean;
  onClose: () => void;
}> = ({ open, onClose }) => {
  const client = useHellocrabStore((s) => s.client);
  const snapshot = useHellocrabStore((s) => s.snapshot);
  const [form] = Form.useForm<HellocrabSettings>();

  useEffect(() => {
    if (open && snapshot) {
      form.setFieldsValue(snapshot.settings);
    }
  }, [open, snapshot, form]);

  const save = async () => {
    if (!client || !snapshot) return;
    const values = form.getFieldsValue();
    const result = await client.putSettings({
      ...snapshot.settings,
      ...values,
      // 采集需要用户在浏览器里登录，浏览器必须可见
      headlessMode: false,
    });
    if (result.success) {
      message.success('采集设置已保存');
      onClose();
    } else {
      message.error(result.message);
    }
  };

  return (
    <Drawer title="采集设置" open={open} onClose={onClose} width={420}>
      <Form form={form} layout="vertical">
        <Form.Item name="downloadRoot" label="下载根目录">
          <Input placeholder="留空使用 HelloCrab 默认目录" />
        </Form.Item>
        <Form.Item
          name="downloadCover"
          label="下载封面"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
        <Form.Item
          name="downloadMusic"
          label="下载背景音乐"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
        <Form.Item
          name="includeWorkId"
          label="文件名包含作品 ID"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
        <Form.Item
          name="checkVideoAudio"
          label="检测无声视频并补音轨"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
        <Form.Item
          name="stopOnDuplicateThreshold"
          label="连续重复自动停止"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
        <Form.Item name="duplicateStopThreshold" label="连续重复阈值">
          <InputNumber min={1} max={10000} className="w-full" />
        </Form.Item>
        <Button type="primary" onClick={save} block>
          保存
        </Button>
      </Form>
    </Drawer>
  );
};

export const SocialCapture: React.FC = () => {
  const {
    engineState,
    client,
    snapshot,
    coverObjectUrl,
    lastError,
    startEngine,
    stopEngine,
    beginPolling,
  } = useHellocrabStore();
  const autoStartEngine = useSettingsStore((s) => s.hellocrab.autoStartEngine);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [platformId, setPlatformId] = useState('douyin');

  useEffect(() => beginPolling(), [beginPolling]);

  useEffect(() => {
    if (autoStartEngine && engineState === 'stopped' && !lastError) {
      void startEngine();
    }
    // 仅在挂载时尝试自动启动一次
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (snapshot?.settings.selectedPlatformId) {
      setPlatformId(snapshot.settings.selectedPlatformId);
    }
  }, [snapshot?.settings.selectedPlatformId]);

  const running = engineState === 'running';
  const busy = !!snapshot?.isBusy;
  const capturing = !!snapshot?.isCapturing;

  const doAction = async (
    action: Parameters<NonNullable<typeof client>['action']>[0],
  ) => {
    if (!client) return;
    try {
      const result = await client.action(action);
      if (result.success) {
        message.success(result.message);
      } else {
        message.error(result.message);
      }
    } catch (err: any) {
      message.error(err?.message || '请求失败');
    }
  };

  const selectPlatform = async (id: string) => {
    setPlatformId(id);
    if (client && snapshot) {
      await client.putSettings({
        ...snapshot.settings,
        selectedPlatformId: id,
        headlessMode: false,
      });
    }
  };

  return (
    <>
      <PageHeader />

      <section className="bg-white p-4 border-[1px] rounded-md mb-4">
        <div className="flex items-center justify-between">
          <Space size="large">
            <EngineStateBadge />
            {running && client && (
              <span className="text-xs text-gray-400">
                127.0.0.1:{client.port}
              </span>
            )}
          </Space>
          <Space>
            {!running ? (
              <Button
                type="primary"
                icon={<ThunderboltOutlined />}
                loading={engineState === 'starting'}
                onClick={() => startEngine()}
              >
                启动采集引擎
              </Button>
            ) : (
              <Button
                danger
                icon={<PoweroffOutlined />}
                onClick={() => stopEngine()}
              >
                关闭引擎
              </Button>
            )}
          </Space>
        </div>
        {lastError && (
          <Alert className="mt-3" type="error" message={lastError} showIcon />
        )}
        {!running && !lastError && (
          <Alert
            className="mt-3"
            type="info"
            showIcon
            message="工作流程"
            description="启动引擎 → 首次使用先「安装 Chromium」→ 「打开浏览器」并在其中登录平台、进入作者主页 → 选择平台后「开始采集」。程序会自动滚动页面、解析作品并批量下载视频/图集/封面。"
          />
        )}
      </section>

      {running && (
        <section className="bg-white p-4 border-[1px] rounded-md mb-4">
          <Space wrap>
            <Select
              className="min-w-[160px]"
              value={platformId}
              onChange={selectPlatform}
              options={HELLOCRAB_PLATFORMS.map((p) => ({
                value: p.id,
                label: p.name,
              }))}
              disabled={capturing}
            />
            <Button
              icon={<ChromeOutlined />}
              onClick={() => doAction('open-browser')}
              disabled={busy}
            >
              打开浏览器
            </Button>
            {!capturing ? (
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={() => doAction('start')}
                disabled={busy || !snapshot?.isBrowserStarted}
              >
                开始采集
              </Button>
            ) : (
              <Button
                danger
                icon={<PauseCircleOutlined />}
                onClick={() => doAction('stop')}
              >
                停止采集
              </Button>
            )}
            <Button
              icon={<FolderOpenOutlined />}
              onClick={() => doAction('open-download-folder')}
            >
              打开下载目录
            </Button>
            <Button
              icon={<SettingOutlined />}
              onClick={() => setSettingsOpen(true)}
            >
              采集设置
            </Button>
            <Button
              size="small"
              onClick={() => doAction('install-chromium')}
              disabled={busy}
            >
              安装 Chromium
            </Button>
            <Button
              size="small"
              onClick={() => doAction('install-ffmpeg')}
              disabled={busy}
            >
              安装 FFmpeg
            </Button>
          </Space>
        </section>
      )}

      {running && snapshot && (
        <section className="bg-white p-4 border-[1px] rounded-md mb-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="mb-2">
                <Tag color={capturing ? 'processing' : 'default'}>
                  {capturing ? '采集中' : '空闲'}
                </Tag>
                <span className="text-sm">{snapshot.statusText}</span>
              </div>
              {snapshot.currentWork && (
                <div className="text-xs text-gray-400 mb-2 truncate">
                  当前作品：{snapshot.currentWork}
                </div>
              )}
              {snapshot.isDownloading && (
                <Progress
                  percent={Math.round(snapshot.downloadProgressPercent)}
                  status={
                    snapshot.isDownloadIndeterminate ? 'active' : 'normal'
                  }
                  size="small"
                />
              )}
              {snapshot.currentAuthorName && (
                <div className="text-xs text-gray-400 mt-1">
                  作者：{snapshot.currentAuthorName}
                  {snapshot.currentAuthorDirectory &&
                    ` → ${snapshot.currentAuthorDirectory}`}
                </div>
              )}
              <div className="grid grid-cols-5 gap-2 mt-4">
                <Statistic title="响应" value={snapshot.responseCount} />
                <Statistic title="发现" value={snapshot.discoveredCount} />
                <Statistic
                  title="已下载"
                  value={snapshot.downloadedCount}
                  valueStyle={{ color: '#3f8600' }}
                />
                <Statistic title="跳过" value={snapshot.skippedCount} />
                <Statistic
                  title="失败"
                  value={snapshot.failedCount}
                  valueStyle={
                    snapshot.failedCount > 0 ? { color: '#cf1322' } : undefined
                  }
                />
              </div>
            </div>
            {coverObjectUrl && (
              <img
                src={coverObjectUrl}
                alt="当前封面"
                className="w-32 h-32 object-cover rounded-md self-start"
              />
            )}
          </div>

          <div className="mt-4 border-t pt-2">
            <div className="text-xs text-gray-400 mb-1">最近日志</div>
            <div className="text-xs font-mono max-h-40 overflow-y-auto whitespace-pre-wrap text-gray-500">
              {snapshot.logs.slice(-30).join('\n') || '（暂无日志）'}
            </div>
          </div>
        </section>
      )}

      {running && snapshot && snapshot.history.length > 0 && (
        <section className="bg-white p-4 border-[1px] rounded-md">
          <h2 className="font-bold text-base mb-3">
            <DownloadOutlined className="mr-1" />
            采集历史
          </h2>
          <div className="space-y-1">
            {snapshot.history.slice(0, 30).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between text-sm border-b border-gray-100 py-1"
              >
                <span className="truncate">
                  <Tag>{item.platform}</Tag>
                  {item.userName || item.userId}
                </span>
                <span className="text-xs text-gray-400 shrink-0">
                  {item.itemsCount} 项
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {!running && <Empty className="mt-8" description="引擎未启动" />}

      <CaptureSettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
};

# 统一媒体下载器 (allmedia)

<p align="center">
  <strong>一个功能强大的多平台媒体下载器，整合100+平台支持，完全可视化操作</strong>
</p>


---

## ✨ 核心特色

### 🌐 多平台支持



#### 社交媒体平台

- **Twitter/X**: 博主主页批量下载、单条推文解析、账号池轮换
- **抖音**: 作者主页采集、滚动加载、视频/图集下载
- **快手**: 主站与Live站支持
- **小红书**: 首屏、分页与详情解析
- **微博**: 普通视频和图文混排，4K/2K/1080p高清
- **Instagram**: GraphQL接口、Reels、轮播图
- **Pinterest**: Pin、画板、HLS视频
- **Bilibili**: DASH最高画质、音视频合并
- **TikTok**: item_list接口、最高分辨率

#### 中国在线教育平台（92个站点，103个提取器）

- **综合平台**: 学堂在线、智慧树、中国大学MOOC、网易云课堂
- **职业考试**: 粉笔、华图、高顿、建设工程教育网、医学教育网
- **企业培训**: 钉钉、飞书、腾讯会议、ClassIn
- **知识付费**: 小鹅通、有赞、荔枝微课、千聊
- **更多**: ICVE、超星、fenbi、xueersi等

### 📂 智能文件管理

- **去重机制**: 文件名匹配、MD5校验
- **增量下载**: 记录上次位置，一键续传
- **自动跳过**: 检测已存在文件自动跳过
- **自定义命名**: 支持变量模板命名

### 🎯 灵活下载控制

- **可视化界面**: 所有操作通过图形界面完成，无需命令行
- **批量管理**: 博主分组、批量导入/导出
- **进度监控**: 实时显示下载进度、速度、状态
- **任务队列**: 智能队列管理，支持暂停/恢复
- **格式选择**: 自动选择最高质量或手动指定格式
- **Cookie管理**: 可视化Cookie配置，支持浏览器导入

### 🖼️ 本地画廊

- 按平台/博主分组浏览
- 多级子目录浏览
- 网格/列表视图切换
- 实时刷新展示

### 🎨 现代化界面

- 深色/浅色主题
- 响应式布局
- 实时状态反馈
- 优雅的交互设计

---

## 📸 平台覆盖

### 社交媒体 (9+)

✅ Twitter/X | ✅ 抖音 | ✅ 快手 | ✅ 微博 | ✅ 小红书  
✅ Instagram | ✅ Pinterest | ✅ Bilibili | ✅ TikTok  

### 在线教育 (92+)

Bilibili系列、Douyin、CCTV、Chaoxing、iCourse163、Xuetang、Zhihuishu、iMOOC、DingTalk、Feishu、Fenbi、Huatu、Gaodun、Jianshe99、Med66等

<details>
<summary><strong>完整平台列表</strong> (点击展开)</summary>


**视频平台**: Bilibili (video/cheese/gongfang/bangumi), Douyin, CCTV

**在线教育**: Chaoxing, iCourse163 (mooc/app/youdao/textbook), Xuetang, Zhihuishu (course/live/school/smart), iMOOC

**企业培训**: DingTalk, Feishu, Meeting, ClassIn, CCTalk, Baijiayunxiao, Keqq

**职业考试**: Fenbi, Huatu, Gaodun, Jianshe99, Med66, Hqwx, Wangxiao, Wangxiao233, Dongao, Eoffcn, Kaoyanvip, Yikaobang

**K12教育**: Xueersi, Yangcong, Yixiaoerguo, Speiyou, Gaotu, Koolearn

**IT培训**: Cto51, Huke88, Magedu, Itbaizhan, Luffycity, Tmooc, Mashibing

**知识付费**: Xiaoetech, Xiaoeapp, Youzan, Qlchat, Lizhiweike, Renrenjiang, Sanjieke, Duanshu

**其他**: Lexueyun, Smartedu, Icourses, ICVE (ai/mooc/course), Cnmooc, Open163, Unipus等

</details>

---

## 💡 主要功能

### 1. 平台管理

- 可视化选择目标平台
- 查看平台支持的功能
- 配置平台特定选项

### 2. 账号管理

- Cookie可视化配置
- 浏览器Cookie导入
- 多账号轮换
- 账号状态检测

### 3. 下载任务

- 添加博主/频道/课程
- 批量导入列表
- 分组管理
- 增量更新

### 4. 进度监控

- 实时进度显示
- 速度/时间估算
- 错误日志查看
- 任务统计

### 5. 文件管理

- 本地画廊浏览
- 文件去重检测
- 存储位置管理
- 命名模板配置

---

## 🔧 高级功能

### Cookie配置

- 支持Netscape格式
- 浏览器Cookie提取（Chrome/Edge/Firefox）
- 可视化编辑器
- 账号池轮换策略

### 代理设置

- HTTP/HTTPS/SOCKS5代理
- 系统代理自动检测
- 每个平台独立配置

### 下载选项

- 并发数控制
- 重试策略
- 速度限制
- 格式优先级

### 格式处理

- 自动选择最高质量
- HLS/DASH流处理
- 音视频合并（FFmpeg）
- 字幕下载

---

## 🛠️ 技术栈

- **前端**: React + TypeScript + Ant Design + TailwindCSS
- **状态管理**: Zustand
- **桌面框架**: Tauri
- **后端语言**: Rust
- **下载引擎**: reqwest + aria2c
- **媒体处理**: FFmpeg

---

## 🎯 设计理念

1. **统一界面**: 所有平台使用一致的操作界面
2. **零命令行**: 完全图形化操作，无需记忆命令
3. **智能化**: 自动检测、自动去重、自动重试
4. **可扩展**: 插件化架构，轻松添加新平台
5. **跨平台**: Windows/macOS/Linux统一体验

---

## ⚠️ 免责声明

本项目仅供学习、研究与技术交流使用。使用者应遵守目标平台的服务条款和相关法律法规。下载的内容仅限个人学习使用，不得用于商业用途。使用本工具产生的任何后果由使用者自行承担。

---

## 📄 开源协议

GPL-3.0-only

---

## 🙏 致谢

本项目整合了以下优秀开源项目的功能：

- [x-spider](https://github.com/obihs2501/x-spider-mod-2026) - Twitter下载器
- [HelloCrab](https://github.com/hupo376787/HelloCrab) - 多平台采集器

感谢所有贡献者的付出！

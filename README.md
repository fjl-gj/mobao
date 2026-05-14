<div align="center">
  <img src="icon.svg" alt="墨宝图标" width="160" />
  <h1>墨宝 · 小说编辑器</h1>
  <p>
    一款面向长篇小说创作的跨平台写作工具<br/>
    支持 Markdown 编辑、Word/Markdown 导入、写作资料管理、章节标注、笔记与历史快照
  </p>
  <p>
    <img alt="License" src="https://img.shields.io/github/license/fjl-gj/mobao" />
    <img alt="GitHub release" src="https://img.shields.io/github/v/release/fjl-gj/mobao" />
    <img alt="Build" src="https://img.shields.io/github/actions/workflow/status/fjl-gj/mobao/build.yml" />
  </p>
</div>

---

## 功能概览

### 写作与编辑

- 基于 CodeMirror 的 Markdown 编辑器
- 常用 Markdown 工具栏：加粗、斜体、删除线、标题、引用、列表、链接、图片、分割线、撤销与重做
- 支持 `Ctrl+S` 保存、`Ctrl+E` 切换编辑/预览
- 编辑器状态栏显示本章字数、全书字数、光标行列
- 支持专注模式、章节标题编辑、自动保存
- Markdown 预览优化了段落、标题、引用、列表、分割线等排版间距

### 项目与章节管理

- 按项目、目录、卷、章节组织长篇作品
- 支持新建卷、新建章节、章节选择与结构刷新
- 左侧栏包含：项目、目录、大纲、人物、世界、时间、线索
- 顶部提供侧边栏控制：
  - 收起/展开两侧侧边栏
  - 单独收起/展开左侧边栏

### 导入与导出

- 支持 Markdown 文件导入
- 支持 Word `.docx` 导入，使用 `mammoth` 转换为 Markdown 风格内容
- 支持整部作品导出为 Markdown
- 桌面端三横菜单中集中放置导入、导出、搜索、设置等全局操作

### 标注、笔记与上下文

- 右侧上下文面板包含：预览、标注、历史、笔记、AI
- 标注基于编辑器当前选区创建，记录：
  - 章节路径
  - 选中文本
  - 起止位置
  - 标注内容
  - 创建时间
- 笔记基于编辑器当前选区或光标位置创建，适合记录正文相关想法
- 标注和笔记都支持多条记录，不再覆盖旧内容

### 历史快照

- 按章节记录最近 10 条历史快照
- 手动保存、自动保存、切换章节、退出编辑时记录历史
- 自动保存会过滤过小变化，避免生成过多无意义记录
- 支持从历史记录恢复到旧版本
- 恢复前会自动记录一条“恢复前备份”，降低误操作风险

### 设置中心

- 全局设置从应用菜单打开
- 支持编辑器偏好：
  - 编辑方式：Markdown / Word 式富文本预留
  - 字体
  - 字号
  - 行高
  - 自动保存
  - 行号
  - 拼写检查
- 账户与云空间区域已预留：
  - 登录/注册入口
  - 300MB 免费 OSS 空间展示
  - 云同步开关占位
- AI 功能配置已预留：
  - 服务商
  - 默认模型
  - 当前章节上下文
  - 写作资料上下文
  - 对话历史保存

### AI 助手预留

- 右侧栏新增 AI 工作区占位
- 支持“对话 / 编辑”两个模式的 UI 结构
- 预留续写、润色、提取大纲、检查设定冲突等快捷动作
- 当前版本不接入真实模型接口，AI 开关默认关闭

### 存储

- 桌面端使用 Tauri + SQLite 持久化项目资料、人物、世界观、时间线、线索、标注、笔记与历史
- Web/浏览器环境使用本地存储作为兼容方案
- 正文内容按项目文件结构保存，写作资料与上下文记录存储在应用数据库中

---

## 快速开始

### 环境要求

| 依赖 | 建议版本 | 说明 |
| --- | --- | --- |
| Node.js | 18+ / 20+ / 22+ | 前端开发环境 |
| npm | 随 Node 安装 | 包管理器 |
| Rust | 1.77+ | Tauri 桌面端开发需要 |
| Android SDK / NDK | 按 Tauri 要求配置 | Android 构建需要 |
| Xcode | 最新稳定版 | iOS 构建需要，仅 macOS |

### 安装依赖

```bash
npm install
```

### Web 开发模式

```bash
npm run dev
```

默认由 Vite 启动本地开发服务。

### 桌面端开发模式

```bash
npm run tauri dev
```

该命令会先启动 Vite，再启动 Tauri 桌面窗口。

### 构建 Web 版本

```bash
npm run build
```

### 构建桌面安装包

```bash
npm run tauri build
```

构建产物位于：

- Windows：`src-tauri/target/release/bundle/msi/` 或 `src-tauri/target/release/bundle/nsis/`
- macOS：`src-tauri/target/release/bundle/dmg/`
- Linux：`src-tauri/target/release/bundle/deb/` 或 `src-tauri/target/release/bundle/appimage/`

---

## 常见问题

### 端口被占用

如果运行 `npm run tauri dev` 时看到：

```text
Port 1420 is already in use
```

说明 Vite 默认端口被占用。可以先查找并结束占用进程：

```powershell
netstat -ano | findstr :1420
taskkill /PID <进程ID> /F
```

### SQLite 提示缺少字段

如果本地旧数据库与新版本表结构不一致，可能出现缺少字段的提示。当前版本已加入部分迁移逻辑；若仍遇到旧库问题，需要根据报错字段补迁移或重建本地开发数据库。

---

## 项目结构

```text
mobao/
├─ src/
│  ├─ components/
│  │  ├─ app/          # 应用布局、工具栏、侧边栏、上下文面板、AI 占位
│  │  ├─ common/       # 通用弹窗、设置、搜索、主题、提示
│  │  ├─ editor/       # 编辑器、编辑工具栏、目录树
│  │  ├─ project/      # 项目与小说导入/创建
│  │  ├─ reader/       # 预览与全屏阅读
│  │  └─ tools/        # 大纲、人物、世界、时间线、线索
│  ├─ contexts/        # React 全局状态
│  ├─ core/            # 平台、文件系统、存储适配
│  ├─ hooks/           # 业务 hooks
│  ├─ utils/           # 文件、导入导出、Markdown 渲染等工具
│  ├─ App.tsx
│  └─ App.css
├─ src-tauri/          # Tauri 桌面端工程
├─ package.json
├─ vite.config.ts
└─ README.md
```

---

## 技术栈

- React 18
- TypeScript
- Vite
- CodeMirror 6
- Marked
- Mammoth
- Tauri 2
- SQLite plugin for Tauri

---

## 路线规划

- 接入真正的 Word 式富文本编辑器
- 接入用户登录与云端 OSS 同步
- 接入 AI 模型对话与 AI 编辑工作流
- 标注与笔记定位高亮回显
- 历史版本差异对比
- 更完整的移动端写作体验

---

## 贡献

欢迎通过 Issue 或 Pull Request 参与改进：

- 反馈 bug
- 提出写作流程建议
- 改进 UI/交互
- 补充文档
- 完善跨平台构建

提交前建议运行：

```bash
npm run build
```

---

## 许可证

本项目基于 Apache License 2.0 开源。

---

## 联系方式

- 作者：fangjl
- GitHub：fjl-gj
- 仓库：https://github.com/fjl-gj/mobao

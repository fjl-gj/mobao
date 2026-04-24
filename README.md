<div align="center">
  <img src="icon.svg" alt="墨宝图标" width="160" />
  <h1>墨宝 · 小说编辑器</h1>
  <p>
    📖 一款清新免打扰的跨平台小说创作工具<br/>
    支持 Markdown / Word 导入 · 多层目录 · 大纲设计 · 沉浸式阅读
  </p>
  <p>
    <img alt="License" src="https://img.shields.io/github/license/fjl-gj/mobao" />
    <img alt="GitHub release (latest by date)" src="https://img.shields.io/github/v/release/fjl-gj/mobao" />
    <img alt="GitHub Actions Workflow Status" src="https://img.shields.io/github/actions/workflow/status/fjl-gj/mobao/build.yml" />
  </p>
</div>

---

## ✨ 功能特性

- **📝 专注写作**  
  极简 Markdown 编辑器，左侧写作，右侧实时预览，自动保存至浏览器本地，让你专注于故事本身。

- **📚 分层目录**  
  按 **卷 → 章节** 组织小说结构，支持新建、重命名、上下移动、删除，轻松管理长篇作品。

- **🧭 大纲设计**  
  独立的大纲面板，可规划故事线索，每条大纲支持添加、删除，后期可关联到具体章节。

- **📥 双格式导入**  
  支持导入 Markdown 文件（`.md`）和 Word 文档（`.docx`），自动按标题层级解析为卷和章节。

- **📤 一键导出**  
  将整部作品导出为标准 Markdown 文件，便于备份或跨平台发布。

- **📖 阅读与预览**  
  侧边预览面板支持“普通模式”与“阅读器模式”；点击“全屏”可进入沉浸式阅读，支持 PC / 手机版式切换、字体缩放、翻页按钮及键盘快捷键（← → 切换章节，↑ ↓ 翻页，Esc 退出）。

- **💾 离线存储**  
  所有数据自动保存在浏览器 `localStorage`，无需网络，也无需注册账号。

- **🖥️ 全平台可用**  
  基于 Tauri 2 构建，可打包为 **Windows、macOS、Linux、Android、iOS** 安装包（iOS 需自行签名）。

- **🎨 干净色调**  
  暖灰宣纸底色，竖线稿纸风格，毛笔砚台元素，营造古朴、专注的创作氛围。

---

## 🚀 快速开始

### 环境要求

| 依赖 | 版本要求 | 说明 |
|------|---------|------|
| Node.js | ≥ 22 | 前端运行时 |
| Yarn (或 npm) | 最新版 | 包管理器 |
| Rust | ≥ 1.77 | 仅桌面/移动端打包需要 |
| Android SDK / NDK | API 34, NDK 27 | 仅构建 Android 时需要 |
| Xcode | 最新版 | 仅构建 iOS 时需要（macOS） |

### 纯 Web 版开发

无需安装 Rust 或任何原生环境。

```bash
# 克隆仓库
git clone https://github.com/fjl-gj/mobao.git
cd mobao

# 安装依赖
yarn install

# 启动开发服务器
yarn dev
```


## 桌面版开发（Tauri）

```bash
# 安装前端依赖（如果还没装）
yarn install

# 启动 Tauri 开发模式（会自动打开桌面窗口）
yarn tauri dev
```

## 打包桌面安装包
```bash
yarn tauri build
```

构建完成后，安装包位于：

Windows: src-tauri/target/release/bundle/msi/ 或 nsis/

macOS: src-tauri/target/release/bundle/dmg/

Linux: src-tauri/target/release/bundle/deb/ 或 appimage/


📱 移动端构建

Android
```bash
# 初始化 Android 项目（首次）
npx tauri android init

# 开发调试
yarn tauri android dev

# 打包 APK
yarn tauri android build
```

iOS（仅限 macOS）
```bash
# 初始化 iOS 项目（首次）
npx tauri ios init

# 开发调试
yarn tauri ios dev

# 打包 IPA
yarn tauri ios build
```

## 📂 项目结构

```text
mobao/
├── index.html                     # HTML 入口
├── package.json                   # 项目配置与依赖
├── vite.config.ts                 # Vite 配置
├── tsconfig.json                  # TypeScript 配置
├── tsconfig.node.json
├── yarn.lock
├── .gitignore
├── .github/
│   └── workflows/
│       └── build.yml              # GitHub Actions 全平台构建
├── icon.svg                       # 应用图标源文件
├── LICENSE                        # 许可证
├── README.md
├── src/                           # 前端源代码
│   ├── main.tsx                   # React 挂载入口
│   ├── App.tsx                    # 主布局（全屏阅读器控制）
│   ├── App.css                    # 主布局样式
│   ├── contexts/
│   │   └── NovelContext.tsx       # 全局状态（Reducer + Provider）
│   ├── hooks/
│   │   └── useNovel.ts            # 便捷 hook
│   ├── components/
│   │   ├── Toolbar.tsx            # 顶部工具栏
│   │   ├── Sidebar.tsx            # 左侧面板（目录/大纲切换）
│   │   ├── Tree.tsx               # 目录树（卷/章）
│   │   ├── Outline.tsx            # 大纲面板
│   │   ├── Editor.tsx             # 编辑器
│   │   ├── Preview.tsx            # 预览 / 阅读器
│   │   ├── FullScreenReader.tsx   # 沉浸式全屏阅读器
│   │   ├── Modal.tsx              # 弹窗
│   │   └── Toast.tsx              # 提示消息
│   ├── utils/
│   │   ├── store.ts               # 本地存储（load / persist）
│   │   ├── io.ts                  # 导入导出，Markdown 渲染
│   │   └── helpers.ts             # 生成 ID、防抖、HTML 转义
│   └── styles/
│       └── global.css             # 全局样式变量与重置
└── src-tauri/                     # Tauri 后端（Rust）
    ├── Cargo.toml
    ├── tauri.conf.json
    ├── build.rs
    ├── icons/                     # 应用图标（各尺寸）
    ├── src/
    │   ├── main.rs
    │   └── lib.rs
    └── capabilities/
        └── default.json


```



## 🤝 贡献

欢迎任何形式的贡献！包括但不限于：

- 提交 Issue 反馈问题或建议

- 发起 Pull Request 改进代码

- 编写文档

- 分享你的使用体验

请在提交前确保代码风格一致，并遵循 Apache 2.0 许可证。


## 📄 许可证

本项目基于 Apache License 2.0 开源，可自由使用、修改和分发，包括商用。保留原始版权声明即可。


## 💬 联系方式
作者：fangjl

GitHub：@fjl-gj

仓库：https://github.com/fjl-gj/mobao


墨香盈袖，宝思如泉 —— 你的下一部作品，从这里开始。
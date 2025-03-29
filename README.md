# (麓咕) LuguManus

[English](./@docs/README.en.md)
[繁體中文](./@docs/README.zh-TW.md)
[日本語](./@docs/README.ja.md)

LuguManus 是一款使用 Electron 和 TypeScript 构建的智能化桌面应用框架，它将先进的大型语言模型与实用工具组件深度整合，创造出一个强大的自动化和辅助系统。

<div style="text-align: center;">
    <img src="./docs/star.gif" alt="start"   />
</div>

## 主要特点

- **多代理协作机制**：采用基础代理、对话代理和任务导向代理三层架构，通过协同工作模式解决复杂问题
- **智能任务分解**：能够自动将复杂任务拆解为多个可执行的子任务，并按顺序或依赖关系执行
- **工具链集成**：内置网页搜索、文档处理、图表生成和代码执行等多种工具组件
- **响应式数据流**：基于 RxJS 构建的响应式架构，提供流畅的异步消息处理能力
- **浏览器模拟交互**：通过 Electron 实现的浏览器行为模拟，可执行网页浏览、内容提取、执行网页行为等操作
- **多模型支持**：支持不同类型的 AI 模型（文本、长文本、代码、图像识别等）

## 技术栈

- Electron 桌面应用框架 
- TypeScript 类型安全
- Prisma ORM + SQLite 数据持久化
- RxJS 响应式编程
- OpenAI SDK 模型集成(Qwen)

## 应用场景

LuguManus 适用于需要 AI 辅助的各类桌面应用场景，包括但不限于：

- 智能文档处理与分析
- 自动化网络信息检索与整合
- 复杂任务规划与执行
- 代码辅助与运行
- ...

我们正在不断完善这个框架，欢迎开发者参与贡献，共同打造更强大的 AI 桌面工具生态。

## 目录

- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [架构设计](#架构设计)
- [安装设置](#安装设置)
- [贡献指南](#贡献指南)
- [许可证](#许可证)
- [致谢](#致谢)
- [联系我](#联系我)

## 快速开始

1. 安装依赖

```bash
# 克隆项目
git clone https://github.com/electron-manus/lugumanus.git
cd lugumanus

# 安装依赖
bun install

# 构建 packages
bun run build-deps

# 运行渲染进程
bun nx run @lugu-manus/renderer:dev

# 运行主进程
bun nx run @lugu-manus/main:dev
```

## 项目结构

```bash
lugumanus/
├── apps/                       # 应用程序目录
│   ├── main/                   # Electron 主进程
│   │   ├── src/                # 主进程源代码
│   │   │   ├── agent/          # 代理系统 (基础代理、对话代理、任务代理)
│   │   │   ├── model/          # 模型集成 (聊天完成等)
│   │   │   ├── toolkits/       # 工具套件集合
│   │   │   │   ├── search-toolkit/      # 搜索工具集成
│   │   │   │   ├── chart-toolkit/       # 图表生成工具
│   │   │   │   ├── document-toolkit/    # 文档处理工具 (Markdown、Excel、PPT)
│   │   │   │   └── code-toolkit/        # 代码执行工具
│   │   │   ├── routers/        # tRPC API 路由
│   │   │   ├── studio-preload/ # Studio 预加载脚本
│   │   │   ├── window.ts       # 窗口管理
│   │   │   ├── main.ts         # 主进程入口
│   │   │   └── preload.ts      # 预加载脚本
│   │   ├── prisma/             # Prisma ORM 相关
│   │   │   └── schema.prisma   # 数据库模型定义
│   │   └── scripts/            # 构建脚本
│   └── renderer/               # 渲染进程 (前端UI)
│       └── src/
│           └── components/     # React 组件
│               └── studio/     # Studio 相关组件
│
├── packages/                   # 可复用模块包
│   ├── electron-browseruse/    # 浏览器自动化工具
│   │   ├── src/                # 浏览器工具源代码
│   │   └── README.md           # 浏览器工具说明文档
│   ├── shrink-dom/             # DOM 处理工具
│   │   └── src/                # DOM 处理源代码
│   └── share/                  # 共享工具和组件
│
├── package.json                # 项目依赖和脚本
├── nx.json                     # Nx 配置
├── commitlint.config.js        # 提交规范配置
├── .gitignore                  # Git 忽略配置
└── README.md                   # 项目说明文档
```

### 核心目录说明

- **apps/main**: 包含 Electron 主进程代码和后端逻辑
  - 代理系统 (`agent/`): 实现多代理协同工作机制
  - 工具集 (`toolkits/`): 各种功能工具实现
  - 数据库 (`prisma/`): 使用 Prisma ORM 与 SQLite 管理数据

- **apps/renderer**: 包含前端界面代码，基于 React 实现

- **packages/electron-browseruse**: 浏览器自动化工具包，支持 AI 驱动的网页交互

- **packages/shrink-dom**: DOM 处理工具包，优化网页内容提取和分析
  
- **packages/share**: 在主进程和渲染进程之间共享的代码和类型

## 架构设计

![架构设计](./docs/architecture.png)


## 安装设置

## 贡献指南

我们非常欢迎社区成员参与LuguManus项目的开发与改进。以下是参与贡献的基本流程：

1. **Fork 项目仓库**：在GitHub上fork本项目到您的账户下
2. **克隆您的fork**：`git clone https://github.com/YOUR-USERNAME/lugumanus.git`
3. **创建功能分支**：`git checkout -b feature/your-feature-name`
4. **提交您的更改**：
   - 遵循[Conventional Commits](https://www.conventionalcommits.org/)规范
5. **推送到您的fork**：`git push origin feature/your-feature-name`
6. **创建Pull Request**：从您的分支到主仓库的main分支

### 代码规范

- 使用TypeScript编写所有代码
- 遵循项目已有的代码风格和模式, 使用 Biome 进行代码格式化
- 为新功能编写测试
- 更新相关文档

### 报告问题

如发现bug或有新功能建议，请通过GitHub Issues提交，并尽可能提供：
- 清晰的问题描述
- 复现步骤
- 预期行为与实际行为
- 截图或日志（如适用）
- 系统环境信息

## 许可证

LuguManus项目采用[MIT许可证](./LICENSE)开源。

## 致谢

LuguManus项目得以实现，离不开以下开源项目和技术的支持：

- [Electron](https://www.electronjs.org/) - 提供跨平台桌面应用开发框架
- [TypeScript](https://www.typescriptlang.org/) - 增强代码类型安全
- [React](https://reactjs.org/) - 用户界面开发
- [Prisma](https://www.prisma.io/) - 数据库ORM
- [RxJS](https://rxjs.dev/) - 响应式编程库
- [OpenAI](https://openai.com/) - AI模型技术支持
- [Nx](https://nx.dev/) - 构建系统和项目管理

## 特别感谢

- [CAMEL](https://github.com/camel-ai/camel) - 大模型框架

特别感谢所有为项目做出贡献的开发者和提供宝贵反馈的社区成员。

## 联系我

- **项目维护者**：微信（taixw2）
- **电子邮件**：fex@0000o.net
- **GitHub**：[https://github.com/electron-manus]

我们期待您的反馈和建议，共同打造更好的 AI 桌面工具
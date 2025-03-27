# electron-browseruse

[![npm version](https://img.shields.io/npm/v/electron-browser-use.svg)](https://www.npmjs.com/package/electron-browser-use)

## 项目介绍

electron-browseruse 是一个强大的 Electron 浏览器自动化工具，它利用 AI 模型来模拟用户浏览网页和执行操作。支持基于 DOM 结构和基于屏幕截图的两种智能交互模式，可实现网页浏览、表单填写、点击操作等自动化任务。

## 主要特性

- **双模式操作**：支持基于 DOM 结构和基于屏幕截图的 AI 决策
- **智能交互**：使用大型语言模型自动分析网页内容并执行最合适的操作
- **丰富操作集**：提供点击、滚动、表单填写等多种操作
- **中文支持**：完全支持中文输入和中文页面内容识别
- **异常处理**：智能检测并处理登录墙、验证码等各类网页障碍
- **可扩展 API**：易于集成到现有 Electron 应用中

## 安装

```bash
bun install
```


## 使用方法

```bash
bun run index.ts
```


## 代码示例

```typescript
import { BrowserUse } from './browser-use';
import { ElectronInputSimulator } from './electron-input-simulator';

// 创建浏览器自动化实例
const browserUse = new BrowserUse({
  modelConfig: { apiKey: 'your-api-key' },
  models: {
    longText: 'model-for-long-text',
    shortText: 'model-for-short-text',
    screenshot: 'model-for-screenshot',
  },
});

// 假设你有一个 WebContentsView 实例
const yourWebContentsView = new WebContentsView();

// 创建输入模拟器
const simulator = new ElectronInputSimulator(yourWebContentsView);

// 运行自动化任务
const result = await browserUse.run(
  {
    webUrl: 'https://example.com',
    webTitle: '示例网站',
    instruction: '点击搜索框，输入"electron browser use"，点击搜索按钮',
    actionCallback: (action) => console.log('执行操作:', action),
  },
  simulator
);
```


## 核心组件

1. **BrowserUse**：核心类，管理整个自动化流程，协调 AI 决策和操作执行
2. **ElectronInputSimulator**：模拟用户输入的工具类，支持鼠标点击、键盘输入和特殊中文输入
3. **Action 定义**：规范化的操作集合，包括基础操作和特定情境操作

## 支持的操作

- 基础操作：返回、重启、滚动、完成、失败、异常（登陆、验证码、禁止访问）识别等
- 基于元素的操作：点击元素、设置元素值
- 基于坐标的操作：按坐标点击、按坐标设置值

## 高级功能

- **智能模式切换**：在 DOM 和截图模式间自动切换以处理不同类型的网页
- **循环检测**：检测并避免重复操作，提高效率
- **中断与超时处理**：支持任务中断和超时处理机制
- **多级错误恢复**：提供多次重试和错误恢复机制

## 技术栈

- Bun: 高性能 JavaScript 运行时（同样可以运行在nodejs上）
- Electron: 跨平台桌面应用框架
- OpenAI API: AI 决策引擎
- TypeScript: 类型安全的代码组织


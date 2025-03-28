import { beforeEach, describe, expect, mock, test } from 'bun:test';
import OpenAI from 'openai';
import { BrowserUse } from './browser-use';
import type { ElectronInputSimulator } from './electron-input-simulator';

// 模拟 OpenAI 客户端
mock.module('openai', () => {
  return {
    default: class MockOpenAI {
      private callCount = 0;

      chat = {
        completions: {
          create: mock(() => {
            this.callCount++;

            if (this.callCount === 1) {
              return {
                choices: [
                  {
                    message: {
                      content: `<Thought>测试思考</Thought>
<Action>click(100)</Action>
<PageSummary>测试摘要</PageSummary>`,
                    },
                  },
                ],
                usage: { total_tokens: 100 },
              };
            }
            return {
              choices: [
                {
                  message: {
                    content: `<Thought>完成任务</Thought>
<Action>finish()</Action>
<PageSummary>任务完成</PageSummary>`,
                  },
                },
              ],
              usage: { total_tokens: 100 },
            };
          }),
        },
      };
    },
  };
});

// 创建全局变量
let browserUse: BrowserUse;
let mockBrowserSimulator: ElectronInputSimulator;
let abortController: AbortController;

beforeEach(() => {
  // 重置 mock
  mock.restore();

  // 创建新的中断控制器
  abortController = new AbortController();

  // 创建模拟的浏览器模拟器
  mockBrowserSimulator = createMockBrowserSimulator();

  // 创建 BrowserUse 实例
  browserUse = new BrowserUse({
    browserSimulator: mockBrowserSimulator,
    models: {
      longText: {
        sdk: new OpenAI({ apiKey: 'test-key' }),
        model: 'test-model-long',
      },
      text: {
        sdk: new OpenAI({ apiKey: 'test-key' }),
        model: 'test-model-short',
      },
      screenshot: {
        sdk: new OpenAI({ apiKey: 'test-key' }),
        model: 'test-model-screenshot',
      },
    },
  });
});

// 模拟 shrink-html
mock.module('./shrink-html', () => {
  return (html: string) => Promise.resolve(html);
});

// 创建模拟的 ElectronInputSimulator
function createMockBrowserSimulator(): ElectronInputSimulator {
  return {
    webContents: {
      loadURL: mock(() => Promise.resolve()),
      loadFile: mock(() => Promise.resolve()),
      getURL: mock(() => 'https://example.com'),
      isLoading: mock(() => Promise.resolve(false)),
      capturePage: mock(() => ({
        toJPEG: () => Buffer.from('test-image'),
      })),
    },
    getTitle: mock(() => Promise.resolve('测试网页')),
    scrollDown: mock(() => Promise.resolve()),
    scrollUp: mock(() => Promise.resolve()),
    simulateMouseClickSequence: mock(() => Promise.resolve()),
    setValueAtCoordinates: mock(() => Promise.resolve()),
    getElementCenter: mock(() => Promise.resolve({ x: 100, y: 100 })),
    sendCommandToWebContents: mock((command) => {
      if (command === 'Main.getAnnotatedHTML') {
        return Promise.resolve('<html><body>测试内容</body></html>');
      }
      return Promise.resolve('Continue');
    }),
  } as unknown as ElectronInputSimulator;
}

describe('BrowserUse', () => {
  test('初始化 BrowserUse 实例', () => {
    expect(browserUse).toBeDefined();
  });

  test('运行任务 - 基本流程', async () => {
    const actionCallbackMock = mock(() => {});

    const result = await browserUse.run({
      webUrl: 'https://example1.com',
      webTitle: '测试网页',
      instruction: '点击测试按钮',
      actionCallback: actionCallbackMock,
      abortSignal: abortController.signal,
    });
    console.log('🚀 ~ test ~ result:', result);

    expect(result.status).toBe('completed');
    expect(mockBrowserSimulator.webContents.loadURL).toHaveBeenCalledWith('https://example1.com');
    expect(actionCallbackMock).toHaveBeenCalled();
  });

  test('处理不同操作类型 - click', async () => {
    // 修改 mock 来测试特定操作
    mock.module('openai', () => ({
      default: class MockOpenAI {
        chat = {
          completions: {
            create: mock(() => ({
              choices: [
                {
                  message: {
                    content: `<Thought>测试点击</Thought>
<Action>click(200, 300)</Action>
<PageSummary>点击测试</PageSummary>`,
                  },
                },
              ],
              usage: { total_tokens: 100 },
            })),
          },
        };
      },
    }));

    const result = await browserUse.run({
      webUrl: 'https://example.com',
      webTitle: '测试网页',
      instruction: '点击测试按钮',
      abortSignal: abortController.signal,
    });

    expect(result.status).toBe('completed');
    expect(mockBrowserSimulator.simulateMouseClickSequence).toHaveBeenCalled();
  });

  test('处理中断信号', async () => {
    // 启动任务
    const runPromise = browserUse.run({
      webUrl: 'https://example.com',
      webTitle: '测试网页',
      instruction: '点击测试按钮',
      abortSignal: abortController.signal,
    });

    // 中断任务
    abortController.abort();

    const result = await runPromise;
    expect(result.status).toBe('failed');
    expect(result.error).toContain('Task aborted');
  });
});

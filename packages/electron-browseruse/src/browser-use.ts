import type { ChatCompletion } from 'openai/resources';

import { formatPrompt, formatPromptForScreenshot, systemMessage } from './prompt';
import { detectRepeatedActions } from './utils/action-detector';
import { parseAiResponse } from './utils/response-parser';

import shrinkHtml from './shrink-html';

import { sleep } from 'radash';
import { ElectronInputSimulator } from './electron-input-simulator';
import type {
  BrowserUseOptions,
  BrowserUseResult,
  NextAction,
  ParsedResponseSuccess,
  RunOptions as RunOption,
  TaskHistoryEntry,
} from './types/browser-use.types';

// 为每个任务创建状态类型
interface TaskState {
  webUrl: string; // 添加网址作为任务属性
  status: 'idle' | 'running' | 'completed' | 'failed';
  error?: string;
  history: TaskHistoryEntry[];
  errorHistory: TaskHistoryEntry[];
  restartCount: number;
  instruction: string;
  forceUseScreenshot: boolean;
  runOption: RunOption;
  startTime?: number; // 添加任务开始时间
  lastActionTime?: number; // 添加最后一次操作时间
  abortSignal: AbortSignal;
}

export class BrowserUse {
  // 任务和历史记录限制
  private readonly MAX_HISTORY_SIZE = 20;
  private readonly MAX_RESTART_COUNT = 1;
  private readonly MAX_RETRY_COUNT = 5;
  private readonly MAX_ERROR_HISTORY_SIZE = 10; // 新增错误历史大小

  // 超时设置
  private readonly PAGE_LOAD_TIMEOUT = 5000;
  private readonly DEFAULT_TASK_TIMEOUT = 300000; // 默认5分钟任务超时
  private readonly ACTION_DELAY = 1000; // 动作间延迟
  private readonly LOADING_CHECK_INTERVAL = 500; // 页面加载检查间隔

  // API参数
  private readonly DEFAULT_MAX_TOKENS = 3000;
  private readonly DEFAULT_TEMPERATURE = 0;
  private readonly MAX_AI_COMPLETION_RETRIES = 3;

  // 判断文本长度阈值
  private readonly HTML_SIZE_SMALL = 25000;
  private readonly HTML_SIZE_MEDIUM = 100000;

  // 配置信息
  private models: BrowserUseOptions['models'];
  private browserSimulator: ElectronInputSimulator;

  // 更新 taskInfo 类型以使用taskId作为键
  private taskInfo: TaskState | undefined;

  constructor(options: BrowserUseOptions) {
    this.models = options.models;
    if (!options.targetWebContents && !options.browserSimulator) {
      throw new Error('targetWebContents or browserSimulator is required');
    }
    this.browserSimulator =
      // biome-ignore lint/style/noNonNullAssertion: targetWebContents or browserSimulator is required
      options.browserSimulator ?? new ElectronInputSimulator(options.targetWebContents!);
  }

  // 获取当前任务的状态
  private getTaskState(): TaskState | undefined {
    return this.taskInfo;
  }

  // 检查任务是否已停止
  private isTaskStopped(): boolean {
    const taskState = this.getTaskState();
    return !taskState || taskState.status !== 'running';
  }

  public get webContents() {
    return this.browserSimulator.webContents;
  }

  public get webContentsView() {
    return this.browserSimulator.targetWebContents;
  }

  public async loadWebPage(webUrl: string) {
    // 检查当前URL与要加载的URL是否相同，如果相同则不重新加载
    const currentUrl = this.browserSimulator.webContents.getURL();
    if (currentUrl === webUrl) {
      return Promise.resolve();
    }

    // 加载新的URL
    if (/^(http|https|file):/.test(webUrl)) {
      return this.browserSimulator.webContents.loadURL(webUrl);
    }
    return this.browserSimulator.webContents.loadFile(webUrl);
  }

  public async run(options: RunOption): Promise<BrowserUseResult> {
    const initResult = this.initializeTask(options);
    if (initResult.error) {
      return initResult.error;
    }

    await this.loadWebPage(options.webUrl);
    let retryCount = 0;
    let nextQuery: NextAction | null = null;

    while (true) {
      // 检查中断和重试条件
      if (this.shouldBreakExecution(options.abortSignal, retryCount)) {
        break;
      }
      retryCount++;

      // 确定下一步操作
      nextQuery = await this.determineNextAction(options.webTitle, options.abortSignal);
      if (!nextQuery || this.isTaskStopped()) {
        break;
      }

      // 解析和处理模型响应
      const action = nextQuery.action;
      if ('error' in action) {
        this.updateTaskState({
          status: 'failed',
          error: action.error ?? 'An error occurred while executing the operation',
        });
        options.actionCallback?.(action.error ?? 'An error occurred while executing the operation');
        continue;
      }

      // 处理特殊动作
      const specialActionResult = await this.handleSpecialActions(
        action,

        options.actionCallback,
      );
      if (specialActionResult.shouldBreak) {
        if (specialActionResult.result) {
          return specialActionResult.result;
        }
        break;
      }

      if (specialActionResult.shouldContinue) {
        continue;
      }

      // 记录当前URL，用于判断执行后页面是否发生了跳转
      const currentUrl = this.browserSimulator.webContents.getURL();

      // 执行浏览器操作
      try {
        const executionResult = await this.executeAction(action, options.actionCallback);
        if (executionResult.error) {
          this.updateTaskState({
            status: 'failed',
            error: executionResult.error,
          });
          continue;
        }

        // 操作成功，记录历史
        this.recordActionHistory(nextQuery);

        // 重置重试计数
        retryCount = 0;

        // 等待页面加载
        await this.waitForPageLoad(currentUrl);

        // 检查历史大小限制
        if ((this.getTaskState()?.history.length ?? 0) > this.MAX_HISTORY_SIZE * 2) {
          this.updateTaskState({
            status: 'failed',
            error: 'Task history exceeds limit, task terminated',
          });
          break;
        }
      } catch (error) {
        this.updateTaskState({
          status: 'failed',
          error: (error as Error).message,
        });
      }
    }

    // 完成任务并根据 summary 生成总结
    return this.completeTask(options.actionCallback);
  }

  // 初始化任务
  private initializeTask(options: RunOption): { error?: BrowserUseResult } {
    const existingTask = this.getTaskState();

    if (existingTask && existingTask.status === 'running') {
      return {
        error: {
          status: 'failed',
          error: `A task is currently running, ${existingTask.instruction} task ended`,
          history: existingTask.history,
        },
      };
    }

    if (!options.instruction || !options.webUrl) {
      return {
        error: {
          status: 'failed',
          error: !options.instruction
            ? 'Task not started: instruction is empty'
            : 'Task not started: web URL is empty',
          history: [],
        },
      };
    }

    // 如果任务不存在或不是重启任务，重置重启计数器
    let restartCount = 0;
    if (existingTask && existingTask.instruction === options.instruction) {
      restartCount = existingTask.restartCount;
    }

    // 创建新的任务状态并存储
    this.taskInfo = {
      abortSignal: options.abortSignal,
      webUrl: options.webUrl,
      status: 'running',
      history: [],
      errorHistory: [],
      restartCount: restartCount,
      instruction: options.instruction,
      forceUseScreenshot: options.useScreenshot ?? false,
      runOption: options,
      startTime: Date.now(), // 记录任务开始时间
      lastActionTime: Date.now(), // 初始化最后操作时间
    };

    return {};
  }

  // 检查是否应该中断执行
  private shouldBreakExecution(abortSignal?: AbortSignal, retryCount?: number): boolean {
    if (abortSignal?.aborted) {
      this.updateTaskState({
        status: 'failed',
        error: 'Task aborted',
      });
      return true;
    }

    if (retryCount && retryCount > this.MAX_RETRY_COUNT) {
      this.updateTaskState({
        status: 'failed',
        error: 'Retry count exceeded, task terminated',
      });
      return true;
    }

    const taskState = this.getTaskState();
    if (!taskState) {
      return true;
    }

    // 添加任务超时检查
    const currentTime = Date.now();
    const taskDuration = currentTime - (taskState.startTime || 0);
    if (taskDuration > this.DEFAULT_TASK_TIMEOUT) {
      this.updateTaskState({
        status: 'failed',
        error: 'Task execution timeout',
      });
      return true;
    }

    return this.isTaskStopped();
  }

  // 处理特殊动作
  private async handleSpecialActions(
    action: ParsedResponseSuccess,

    actionCallback?: (action: string) => void,
  ): Promise<{ shouldBreak?: boolean; shouldContinue?: boolean; result?: BrowserUseResult }> {
    if (
      action === null ||
      action.parsedAction.name === 'finish' ||
      action.parsedAction.name === 'fail'
    ) {
      return { shouldBreak: true };
    }

    if (action.parsedAction.name === 'restart') {
      return this.handleRestartAction(action, actionCallback);
    }

    if (action.parsedAction.name === 'identifyBlocker') {
      return await this.handleBlockerAction(action, actionCallback);
    }

    return {};
  }

  // 处理重启动作
  private async handleRestartAction(
    action: ParsedResponseSuccess,

    actionCallback?: (action: string) => void,
  ): Promise<{ shouldBreak: boolean; result?: BrowserUseResult }> {
    const taskState = this.getTaskState();
    if (!taskState) {
      return {
        shouldBreak: true,
        result: { status: 'failed', error: 'Task state does not exist', history: [] },
      };
    }

    taskState.restartCount++;
    if (taskState.restartCount > this.MAX_RESTART_COUNT) {
      this.updateTaskState({
        status: 'failed',
        error: `Retry count exceeded, task terminated. Original task: ${taskState.instruction}, Retry reason: ${action.thought}`,
      });
      actionCallback?.('Retry count exceeded, task terminated');
      return {
        shouldBreak: true,
        result: {
          status: 'failed',
          error: `Retry count exceeded, task terminated. Original task: ${taskState.instruction}, Retry reason: ${action.thought}`,
          history: taskState.history,
        },
      };
    }

    this.updateTaskState({
      status: 'idle',
      error: `${action.thought}, Restarting task ${taskState.instruction}`,
    });
    actionCallback?.(`${action.thought}, Restarting task ${taskState.instruction}`);

    return {
      shouldBreak: true,
      result: await this.run(taskState.runOption),
    };
  }

  // 处理阻塞动作
  private async handleBlockerAction(
    action: ParsedResponseSuccess,

    actionCallback?: (action: string) => void,
  ): Promise<{ shouldBreak?: boolean; shouldContinue?: boolean; result?: BrowserUseResult }> {
    const taskState = this.getTaskState();
    if (!taskState) {
      return {
        shouldBreak: true,
        result: { status: 'failed', error: 'Task state does not exist', history: [] },
      };
    }

    actionCallback?.(action.thought);

    if (
      action.parsedAction.args.blockerType === 'content_loading' ||
      action.parsedAction.args.blockerType === 'content_not_found'
    ) {
      // 使用截图识别重试
      this.updateTaskState({
        forceUseScreenshot: true,
        error: 'Received, you manually clicked continue, I will continue execution',
      });
      return { shouldContinue: true };
    }

    // 处理需要用户交互的阻塞
    const operation = await this.handleUserInteractionBlocker(action);
    if (operation === 'Continue' || operation === '继续') {
      this.updateTaskState({
        error: 'Received, you manually clicked continue, I will continue execution',
      });
      return { shouldContinue: true };
    }

    console.log('action', action);

    this.updateTaskState({
      status: 'failed',
      error: `${action.thought}, Execution failed, browser automated task ended, task: ${taskState.instruction}, webpage: ${taskState.runOption.webUrl}, try other methods to complete this task`,
    });

    return {
      shouldBreak: true,
      result: {
        status: 'failed',
        error: `${action.thought}, Requires manual user handling, browser automated task ended, task: ${taskState.instruction}, webpage: ${taskState.runOption.webUrl}, try other methods to complete this task`,
        history: taskState.history,
      },
    };
  }

  // 处理需要用户交互的阻塞
  private async handleUserInteractionBlocker(action: ParsedResponseSuccess): Promise<string> {
    let currentHref = '';
    let currentHrefInterval: NodeJS.Timeout | null = null;

    const operation = await Promise.race([
      this.browserSimulator.sendCommandToWebContents(
        ElectronInputSimulator.DEFAULT_BROWSER_COMMANDS.showOperation,
        action.thought,
        'Continue',
        'Cancel',
      ),
      new Promise((resolve) => {
        // @ts-ignore
        currentHrefInterval = setInterval(async () => {
          const href = this.browserSimulator.webContents.getURL();
          if (href !== currentHref && currentHref !== '') {
            resolve('Continue');
          }
          currentHref = href;
        }, 1000);
      }),
    ]);

    if (currentHrefInterval) {
      clearInterval(currentHrefInterval);
    }

    return operation as string;
  }

  // 执行动作
  private async executeAction(
    action: ParsedResponseSuccess,
    actionCallback?: (action: string) => void,
  ): Promise<{ error?: string }> {
    const taskState = this.getTaskState();
    if (!taskState) {
      return { error: 'Task state does not exist' };
    }

    try {
      actionCallback?.(action.thought);

      // 更新最后操作时间
      this.updateTaskState({
        lastActionTime: Date.now(),
      });

      const name = action.parsedAction.name;
      const args = action.parsedAction.args ?? {};

      // 处理滚动操作
      if (name === 'scrollDown' || name === 'scrollUp') {
        this.browserSimulator[name === 'scrollDown' ? 'scrollDown' : 'scrollUp']();
        return {};
      }

      // 处理需要坐标的操作
      const elementId = args.elementId;
      let x = args.x;
      let y = args.y;
      const value = args.value;

      if (elementId) {
        const domObjectId = await this.browserSimulator.elementIdConvertObjectId(Number(elementId));
        try {
          const position = await this.browserSimulator.getElementCenter(domObjectId as string);
          x = position.x;
          y = position.y;
        } catch (err) {
          return { error: `Cannot get element coordinates: ${(err as Error).message}` };
        }
      }

      if (Number.isNaN(Number(x)) || Number.isNaN(Number(y))) {
        return { error: 'Cannot identify element coordinates' };
      }

      const pointCoordinates = {
        x: Number(x),
        y: Number(y),
      };

      // 执行点击或设置值操作
      switch (name) {
        case 'click':
        case 'clickByCoordinate':
          await this.browserSimulator.simulateMouseClickSequence(pointCoordinates);
          break;
        case 'setValue':
        case 'setValueByCoordinate':
          await this.browserSimulator.setValueAtCoordinates(
            pointCoordinates,
            value ? String(value) : '',
          );
          break;
        default:
          return { error: `Unsupported operation: ${name}` };
      }

      return {};
    } catch (error) {
      return { error: (error as Error).message };
    }
  }

  // 记录动作历史
  private recordActionHistory(nextQuery: NextAction) {
    const taskState = this.getTaskState();
    if (!taskState) {
      return;
    }
    if ('error' in nextQuery.action) {
      return;
    }

    taskState.history.push({
      prompt: nextQuery.prompt,
      action: nextQuery.action,
      summary: nextQuery.action.summary,
      usage: nextQuery.usage,
      isScreenshot: nextQuery.isScreenshot,
    });
  }

  // 等待页面加载
  private async waitForPageLoad(previousUrl: string) {
    const taskState = this.getTaskState();
    if (!taskState) {
      return;
    }

    await sleep(this.ACTION_DELAY);

    const currentUrl = this.browserSimulator.webContents.getURL();
    if (currentUrl !== previousUrl) {
      await Promise.race([
        new Promise((resolve) => {
          const checkLoading = async () => {
            const isLoading = await this.browserSimulator.webContents.isLoading();
            if (!isLoading) {
              resolve(true);
            } else {
              setTimeout(checkLoading, this.LOADING_CHECK_INTERVAL);
            }
          };
          checkLoading();
        }),
        sleep(this.PAGE_LOAD_TIMEOUT),
      ]);
    }
  }

  // 完成任务并生成总结
  private async completeTask(actionCallback?: (action: string) => void): Promise<BrowserUseResult> {
    const taskState = this.getTaskState();

    // 只有当任务存在且状态为running时才更新为completed
    if (taskState && taskState.status === 'running') {
      this.updateTaskState({
        status: 'completed',
        error: '',
      });
    }

    // 避免在taskState不存在时访问undefined的instruction
    if (taskState) {
      actionCallback?.(`Browser automated task ended, task: ${taskState.instruction}`);
    } else {
      actionCallback?.('Browser automated task ended');
    }

    // 返回值应反映实际状态
    return {
      status: taskState?.status || 'completed',
      error: taskState?.error || '',
      history: taskState?.history || [],
    };
  }

  private async determineNextAction(
    webTitle: string,
    abortSignal?: AbortSignal,
  ): Promise<NextAction | null> {
    const taskState = this.getTaskState();
    if (!taskState) {
      return null;
    }

    for (let i = 0; i < 3; i++) {
      if (abortSignal?.aborted) {
        this.updateTaskState({
          status: 'failed',
          error: 'Task aborted',
        });
        break;
      }

      // 获取网页内容
      const webContent = await this.getWebContent();
      if (!webContent) continue;

      // 处理DOM内容
      const domResult = await this.processDomContent(webContent.annotatedHTML);
      if (!domResult) continue;

      try {
        const result = await this.requestAICompletion(
          // DOM 结果
          domResult,
          // 截图结果
          webContent.screenshotDataUrl,
          // 网页URL

          // 网页标题
          webTitle,
          // 中断信号
          abortSignal,
        );

        // 添加内存清理
        this.limitHistorySize();

        return result;
      } catch (error) {
        if (i === 2) {
          this.updateTaskState({
            status: 'failed',
            error: 'Multiple attempts failed, task terminated',
          });
          return null;
        }
      }
    }

    this.updateTaskState({
      status: 'failed',
      error: 'Multiple attempts failed, task terminated',
    });
    return null;
  }

  // 获取网页内容
  private async getWebContent() {
    const taskState = this.getTaskState();
    if (!taskState) {
      return null;
    }
    const annotatedHTML = (await this.browserSimulator.sendCommandToWebContents(
      ElectronInputSimulator.DEFAULT_BROWSER_COMMANDS.getAnnotatedHTML,
    )) as string;
    if (!annotatedHTML) {
      this.updateTaskState({
        status: 'failed',
        error: 'Failed to get webpage content',
      });
      return null;
    }

    const screenshot = await this.browserSimulator.webContents.capturePage();
    if (!screenshot) {
      this.updateTaskState({
        status: 'failed',
        error: 'Failed to get webpage screenshot',
      });
      return null;
    }

    const screenshotBuffer = screenshot.toJPEG(50);
    const screenshotDataUrl = `data:image/jpeg;base64,${screenshotBuffer.toString('base64')}`;

    return { annotatedHTML, screenshotDataUrl };
  }

  // 处理DOM内容
  private async processDomContent(annotatedHTML: string) {
    const taskState = this.getTaskState();
    if (!taskState) {
      return null;
    }
    if (taskState.forceUseScreenshot) {
      return { isValidDom: false, shrunkenHtml: '' };
    }

    if (!shrinkHtml) {
      return { isValidDom: false, shrunkenHtml: '' };
    }

    try {
      const shrunkenHtml = await shrinkHtml(annotatedHTML);
      return { isValidDom: true, shrunkenHtml: shrunkenHtml as string };
    } catch (error) {
      return { isValidDom: false, shrunkenHtml: '' };
    }
  }

  // 准备提示并决定使用模式和模型
  private preparePromptsAndDetermineMode(domResult: { isValidDom: boolean; shrunkenHtml: string }) {
    const taskState = this.getTaskState();
    if (!taskState) {
      return null;
    }

    const previousActions = taskState.history
      .map((h) => h.action)
      .filter(Boolean) as ParsedResponseSuccess[];
    const html = domResult.shrunkenHtml;

    const prompt = formatPrompt(taskState.instruction, previousActions, html);
    const promptForScreenshot = formatPromptForScreenshot(
      taskState.instruction,
      previousActions,
      taskState.errorHistory,
    );

    // 检测是否陷入循环操作
    const isStuckInLoop = detectRepeatedActions(taskState.history, 2);

    // 决定是否使用截图模式
    let shouldUseScreenshot =
      !domResult.isValidDom || !html
        ? true
        : taskState.forceUseScreenshot || html.length > this.HTML_SIZE_MEDIUM;

    if (isStuckInLoop) {
      const recentEntries = taskState.history.slice(-2);
      const allUsingScreenshot = recentEntries.every((entry) => entry.isScreenshot);

      if (allUsingScreenshot) {
        if (domResult.isValidDom) {
          // 如果之前都在使用截图模式但陷入循环，尝试切换到DOM模式
          shouldUseScreenshot = false;
        }
      } else {
        // 如果之前使用DOM模式但陷入循环，切换到截图模式
        shouldUseScreenshot = true;
      }
    }

    // 选择合适的模型
    const modelInfo = shouldUseScreenshot
      ? this.models.screenshot
      : html.length < this.HTML_SIZE_SMALL
        ? this.models.text
        : html.length <= this.HTML_SIZE_MEDIUM
          ? this.models.longText
          : this.models.screenshot;

    return { html, prompt, promptForScreenshot, shouldUseScreenshot, modelInfo };
  }

  private async requestAICompletion(
    domResult: { isValidDom: boolean; shrunkenHtml: string },
    screenshotDataUrl: string,
    webTitle: string,
    abortSignal?: AbortSignal,
  ): Promise<NextAction | null> {
    const promptAndMode = this.preparePromptsAndDetermineMode(domResult);
    if (!promptAndMode) {
      return null;
    }

    const { prompt, promptForScreenshot, shouldUseScreenshot, modelInfo } = promptAndMode;

    // 添加重试逻辑
    for (let attempt = 1; attempt <= this.MAX_AI_COMPLETION_RETRIES; attempt++) {
      try {
        const completion: ChatCompletion | null = await modelInfo.sdk.chat.completions.create(
          {
            messages: [
              {
                role: 'system',
                content: systemMessage(shouldUseScreenshot, webTitle),
              },
              {
                role: 'user',
                content: shouldUseScreenshot
                  ? [
                      {
                        type: 'text',
                        text: promptForScreenshot,
                      },
                      {
                        type: 'image_url',
                        image_url: {
                          url: screenshotDataUrl,
                        },
                      },
                    ]
                  : prompt,
              },
            ],
            model: modelInfo.model,
            temperature: this.DEFAULT_TEMPERATURE,
            max_tokens: this.DEFAULT_MAX_TOKENS,
            n: 3,
          },
          { signal: abortSignal },
        );

        const response = completion.choices[0].message.content;

        const shouldRequestScreenshot =
          response?.includes('[REQUEST_SCREENSHOT]') && !shouldUseScreenshot;
        const action = parseAiResponse(response ?? '', shouldUseScreenshot);
        const usage = completion.usage;

        if (shouldRequestScreenshot && !shouldUseScreenshot) {
          this.updateTaskState({
            forceUseScreenshot: true,
            error: 'Need to retake screenshot',
          });
          return this.requestAICompletion(
            domResult,
            screenshotDataUrl,

            webTitle,
            abortSignal,
          ) as Promise<NextAction>;
        }

        return {
          action,
          usage,
          prompt: shouldUseScreenshot ? promptForScreenshot : prompt,
          isScreenshot: shouldUseScreenshot,
        } as NextAction;
      } catch (error) {
        if (attempt === this.MAX_AI_COMPLETION_RETRIES || abortSignal?.aborted) {
          this.updateTaskState({
            status: 'failed',
            error: `AI request failed: ${(error as Error).message}`,
          });
          return null;
        }

        // 指数退避重试
        await sleep(this.ACTION_DELAY * attempt);
      }
    }

    return null;
  }

  // 限制历史记录大小
  private limitHistorySize() {
    const taskState = this.getTaskState();
    if (!taskState) {
      return;
    }

    if (taskState.history.length > this.MAX_HISTORY_SIZE) {
      taskState.history = taskState.history.slice(-this.MAX_HISTORY_SIZE);
    }
    if (taskState.errorHistory.length > this.MAX_ERROR_HISTORY_SIZE) {
      taskState.errorHistory = taskState.errorHistory.slice(-this.MAX_ERROR_HISTORY_SIZE);
    }
  }

  private updateTaskState(newState: Partial<TaskState>) {
    const taskState = this.getTaskState();
    if (taskState) {
      this.taskInfo = Object.assign(taskState, newState);
    }
  }
}

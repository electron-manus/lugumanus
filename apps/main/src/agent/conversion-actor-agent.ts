import { BrowserUse, ElectronInputSimulator } from '@lugu-manus/electron-browser-use';
import type { MessageStatus } from '@prisma/client';
import { ReplaySubject } from 'rxjs';
import type { Observable } from 'rxjs';
import { loadSdkAndModel } from '../ai-sdk/index.js';
import { MessageHandler } from '../utils/agent-message-handler.js';
import { WebViewManager } from '../utils/webview-manager.js';
import { getMainWindow } from '../window.js';
import { CoordinateRolePlayAgent } from './coordinate-role-play.js';
import { Studio } from './studio/index.js';
import type { AgentTaskRef, MessageStream } from './type.js';

export class ConversionActorAgent {
  private readonly abortSignal: AbortSignal;

  private browserUse: BrowserUse | null = null;
  private studio: Studio | null = null;
  private coordinateRolePlay: CoordinateRolePlayAgent = new CoordinateRolePlayAgent();
  private observer: ReplaySubject<MessageStream>;

  // 新增的辅助类实例
  private webViewManager: WebViewManager;
  private messageHandler: MessageHandler;

  constructor(
    private conversationId: string,
    abortSignal: AbortSignal,
    observer = new ReplaySubject<MessageStream>(),
  ) {
    this.abortSignal = abortSignal;
    this.observer = observer;

    // 初始化辅助类
    this.messageHandler = new MessageHandler(conversationId);
    this.webViewManager = new WebViewManager();
  }

  async init(): Promise<void> {
    const mainWindow = getMainWindow();
    if (!mainWindow) {
      throw new Error('Main window not initialized');
    }

    if (this.browserUse && this.webViewManager.getWebView()) {
      await this.webViewManager.resetBounds(mainWindow);
      return;
    }

    try {
      const models = await loadSdkAndModel();

      // 初始化WebView
      const webview = await this.webViewManager.initialize(mainWindow);

      // 初始化BrowserUse
      this.browserUse = new BrowserUse({
        browserSimulator: new ElectronInputSimulator(webview, {
          mouseAnimationCommand: 'Main.mouseMoveThenClick',
          setEditableValueCommand: 'Main.setValue',
          elementBlurCommand: 'Main.blurElement',
          getActiveElementObjectIdCommand: 'Main.getObjectIdByFocusElement',
          isEditableElementCommand: 'Main.isInputElement',
          getBoundingClientRectCommand: 'Main.getBoundingClientRect',
          getWindowHeightCommand: 'Main.getWindowHeight',
          getAnnotatedHTML: 'Main.getAnnotatedHTML',
          showOperation: 'Main.showOperation',
          elementIdConvertObjectIdCommand: 'Main.geObjectIdByElementById',
        }),
        debug: true,
        models: {
          // @ts-ignore
          text: models.TEXT,
          // @ts-ignore
          longText: models.LONG_TEXT,
          // @ts-ignore
          screenshot: models.IMAGE_TO_TEXT,
        },
      });

      this.studio = new Studio(this.browserUse, this.conversationId);
      this.webViewManager.setStudio(this.studio);

      await this.webViewManager.resetBounds(mainWindow);
      this.webViewManager.setupEventListeners(this.observer, this.abortSignal);

      console.log('init success');
    } catch (error) {
      this.destroy();
      throw new Error(
        `Initialization failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  destroy() {
    if (this.observer) {
      this.observer.complete();
      this.observer.unsubscribe();
      this.observer = new ReplaySubject<MessageStream>();
    }

    const mainWindow = getMainWindow();
    this.webViewManager.destroy(mainWindow);

    this.browserUse = null;
    this.studio = null;
  }

  getObserver(): Observable<MessageStream> {
    return this.observer.asObservable();
  }

  getStudio(): Studio | null {
    return this.studio;
  }

  async start() {
    this.validateInitialization();

    const message = await this.messageHandler.getIdleMessage();
    if (!message || message.status !== 'IDLE') {
      return this.observer.asObservable();
    }

    await this.messageHandler.updateMessageStatus(message.id, 'PENDING', message.content);

    this.resetObserver();

    const agentTaskRef = this.createAgentTaskRef();
    const task = message.content;

    this.coordinateRolePlay
      .play(task, agentTaskRef)
      .then(() => this.observer.complete())
      .catch((error) => this.observer.error(error));

    return this.observer.asObservable();
  }

  private resetObserver() {
    if (this.observer) {
      this.observer.complete();
      this.observer.unsubscribe();
    }
    this.observer = new ReplaySubject<MessageStream>();
  }

  private createAgentTaskRef(): AgentTaskRef {
    if (!this.studio) {
      throw new Error('Studio not initialized');
    }
    return {
      conversationId: this.conversationId,
      abortSignal: this.abortSignal,
      observer: this.observer,
      createTaskMessage: async (task) => {
        const taskModel = await this.messageHandler.createTask(task);
        const messageModel = await this.messageHandler.createMessage('Task', taskModel.id, 'TASK');
        return messageModel;
      },
      completeTaskMessage: async (task) => {
        await this.messageHandler.completeTask(task);
      },
      createMessage: (roleName: string, taskId?: string) =>
        this.messageHandler.createMessage(roleName, taskId),
      completeMessage: (message, status = 'COMPLETED' as MessageStatus) =>
        this.messageHandler.completeMessage(message, status),
      studio: this.studio,
    };
  }

  private validateInitialization() {
    if (!this.browserUse) {
      this.init();
      return;
    }
    if (!this.webViewManager.getWebView()) {
      this.init();
      return;
    }
  }
}

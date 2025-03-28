import type { BrowserUse } from '@lugu-manus/electron-browser-use';
import type { StudioAction } from '@lugu-manus/share';
import { type ReplaySubject, lastValueFrom } from 'rxjs';
import { caller } from '../../app-router.js';
import type { ChatCompletion } from '../../model/chat-completion.js';
import { getMainWindow } from '../../window.js';
import type { MessageStream } from '../type.js';

export class Studio {
  constructor(
    public browserUse: BrowserUse,
    public conversationId: string,
  ) {}

  async start(
    action: StudioAction,
    observer: ReplaySubject<MessageStream>,
    abortSignal: AbortSignal,
  ) {
    const mainWindow = getMainWindow();
    if (!mainWindow) {
      throw new Error('Main window not initialized');
    }

    const payload = JSON.stringify(action.payload);
    this.preview(action);

    const task = await caller.task.createTask({
      type: action.type,
      description: action.description,
      payload,
    });

    const message = await caller.message.addMessage({
      conversationId: this.conversationId,
      content: '',
      type: 'TASK',
      role: 'ASSISTANT',
      status: 'COMPLETED',
      roleName: 'Tool',
      taskId: task.id,
    });

    observer.next(message);
  }

  async startWithStream(
    action: StudioAction,
    chatCompletion: ChatCompletion,
    observer: ReplaySubject<MessageStream>,
  ) {
    const mainWindow = getMainWindow();
    if (!mainWindow) {
      throw new Error('Main window not initialized');
    }

    const task = await caller.task.createTask({
      type: action.type,
      description: action.description,
      payload: '',
    });

    const message = await caller.message.addMessage({
      conversationId: this.conversationId,
      content: '',
      type: 'TASK',
      role: 'ASSISTANT',
      status: 'PENDING',
      roleName: 'Tool',
      taskId: task.id,
    });

    chatCompletion.contentStream.subscribe({
      next: (chunk) => {
        if (message.task) {
          message.task.payload = chunk;
          mainWindow.webContents.send('studio', {
            type: action.type,
            description: action.description,
            payload: message.task.payload,
          });
        }
        observer.next(message);
      },
      async complete() {
        if (message.task) {
          await caller.task.updateTask({
            id: message.task.id,
            payload: message.task.payload,
          });
        }
        await caller.message.updateMessage({
          id: message.id,
          content: '',
          status: 'COMPLETED',
        });
        observer.next(message);
      },
    });

    await lastValueFrom(chatCompletion.completed);
  }

  async preview(action: StudioAction) {
    const mainWindow = getMainWindow();
    if (!mainWindow) {
      throw new Error('Main window not initialized');
    }
    this.browserUse.webContentsView.setVisible(false);

    switch (action.type) {
      case 'openUrl':
        this.browserUse.webContentsView.setVisible(true);
        await this.browserUse.loadWebPage(action.payload.url);
        break;
      case 'searchResults':
      case 'editor':
      case 'openFolder':
      case 'openFile':
        mainWindow.webContents.send('studio', action);
        break;
    }
  }
}

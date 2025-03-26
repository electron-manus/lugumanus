import type { StudioAction } from '@lugu-manus/share';
import type { BrowserUse } from 'electron-browser-use';
import type { ReplaySubject } from 'rxjs';
import { caller } from '../../app-router.js';
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

  async preview(action: StudioAction) {
    const mainWindow = getMainWindow();
    if (!mainWindow) {
      throw new Error('Main window not initialized');
    }
    this.browserUse.webContentsView.setVisible(false);

    switch (action.type) {
      case 'openFolder':
        // mainWindow.webContents.send('studio', action);
        break;
      case 'openFile':
        // mainWindow.webContents.send('studio', action);
        break;
      case 'openUrl':
        this.browserUse.webContentsView.setVisible(true);
        await this.browserUse.loadWebPage(action.payload.url);
        break;
      case 'showSearchResults':
        mainWindow.webContents.send('studio', action);
        break;
    }
  }
}

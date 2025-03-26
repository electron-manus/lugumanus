import { WebContentsView } from 'electron';
import type { ReplaySubject } from 'rxjs';
import type { Studio } from '../agent/studio/index.js';
import type { MessageStream } from '../agent/type.js';
import { getRectJavascript } from '../javascript-code/get-rect.js';
import { ContextMenuHandler } from './context-menu-handler.js';

// WebView管理器类
export class WebViewManager {
  private webview: WebContentsView | null = null;

  constructor(private studio: Studio | null = null) {}

  setStudio(studio: Studio) {
    this.studio = studio;
  }

  async initialize(mainWindow: Electron.BrowserWindow): Promise<WebContentsView> {
    this.webview = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        allowRunningInsecureContent: true,
      },
    });

    mainWindow.contentView.addChildView(this.webview);
    return this.webview;
  }

  async resetBounds(mainWindow: Electron.BrowserWindow): Promise<void> {
    if (!this.webview) return;

    const bounds = await mainWindow.webContents.executeJavaScript(getRectJavascript);
    this.webview.setBounds({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
    });
  }

  setupEventListeners(observer: ReplaySubject<MessageStream>, abortSignal: AbortSignal): void {
    if (!this.webview || !this.studio) return;

    const webContents = this.webview.webContents;

    webContents.on('will-navigate', (event, url) => {
      event.preventDefault();
      this.studio?.start(
        { type: 'openUrl', description: '打开URL', payload: { url } },
        observer,
        abortSignal,
      );
    });

    webContents.setWindowOpenHandler(({ url }) => {
      this.studio?.start(
        { type: 'openUrl', description: '打开URL', payload: { url } },
        observer,
        abortSignal,
      );
      return { action: 'deny' };
    });

    webContents.on('context-menu', (event, params) => {
      const contextMenuHandler = new ContextMenuHandler(this.webview);
      contextMenuHandler.handleContextMenu(params);
    });
  }

  destroy(mainWindow: Electron.BrowserWindow | null): void {
    if (this.webview) {
      this.webview.removeAllListeners();
      this.webview.webContents.removeAllListeners();
      this.webview.webContents.close();
      if (mainWindow) {
        mainWindow.contentView.removeChildView(this.webview);
      }
      this.webview = null;
    }
  }

  getWebView(): WebContentsView | null {
    return this.webview;
  }
}

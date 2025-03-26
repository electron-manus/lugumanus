import type { WebContentsView } from 'electron';

export class ContextMenuHandler {
  constructor(private readonly webview: WebContentsView | null) {}

  handleContextMenu(params: Electron.ContextMenuParams): void {
    if (!this.webview) return;

    const { Menu, clipboard } = require('electron');
    const menuItems = this.buildContextMenuItems(params, clipboard);
    const menu = Menu.buildFromTemplate(menuItems);
    menu.popup();
  }

  private buildContextMenuItems(
    params: Electron.ContextMenuParams,
    clipboard: Electron.Clipboard,
  ): Electron.MenuItemConstructorOptions[] {
    const menuItems: Electron.MenuItemConstructorOptions[] = [];

    if (params.linkURL) {
      menuItems.push(
        {
          label: '复制链接地址',
          click: () => clipboard.writeText(params.linkURL),
        },
        { type: 'separator' },
      );
    }

    if (params.selectionText) {
      menuItems.push(
        {
          label: '复制文本',
          click: () => this.webview?.webContents.copy(),
        },
        { type: 'separator' },
      );
    }

    menuItems.push(
      {
        label: '后退',
        enabled: this.webview?.webContents.canGoBack(),
        click: () => this.webview?.webContents.goBack(),
      },
      {
        label: '前进',
        enabled: this.webview?.webContents.canGoForward(),
        click: () => this.webview?.webContents.goForward(),
      },
      {
        label: '刷新',
        click: () => this.webview?.webContents.reload(),
      },
      { type: 'separator' },
      {
        label: '全选',
        click: () => this.webview?.webContents.selectAll(),
      },
    );

    if (process.env.NODE_ENV === 'development') {
      menuItems.push(
        { type: 'separator' },
        {
          label: '检查元素',
          click: () => this.webview?.webContents.inspectElement(params.x, params.y),
        },
      );
    }

    return menuItems;
  }
}

import path from 'node:path';
import { BrowserWindow, app } from 'electron';

// 导出主窗口变量，使其可以全局访问
export let mainWindow: BrowserWindow | null = null;

// 创建窗口的函数
export function createMainWindow(): BrowserWindow {
  // 如果已经存在窗口，则直接返回
  if (mainWindow) {
    return mainWindow;
  }

  // 创建新窗口
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    frame: false,
    show: true,
    resizable: false,
    fullscreenable: false,
    titleBarStyle: 'hidden' as const,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(import.meta.dirname, 'preload.js'),
    },
  });

  // 根据实际情况加载页面
  if (app.isPackaged) {
    mainWindow.loadFile(path.join(import.meta.dirname, '../renderer/index.html'));
  } else {
    // 开发环境下加载本地服务器
    mainWindow.loadURL('http://localhost:4200');
    mainWindow.webContents.openDevTools();
  }

  // 窗口关闭时的处理
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 禁止跳转
  mainWindow.webContents.setWindowOpenHandler((details) => {
    return { action: 'deny' };
  });

  // 禁止跳转
  mainWindow.webContents.on('will-navigate', (event, url) => {
    event.preventDefault();
  });

  // 禁止缩放
  mainWindow.webContents.setZoomFactor(1);
  return mainWindow;
}

// 获取主窗口实例的函数
export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

// 关闭主窗口的函数
export function closeMainWindow(): void {
  if (mainWindow) {
    mainWindow.close();
    mainWindow = null;
  }
}

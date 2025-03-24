import * as path from 'node:path';
import * as url from 'node:url';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { BrowserWindow, app, protocol } from 'electron';
import { appRouter } from './app-router.js';
import { createContext } from './trpc.js';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    frame: false,
    show: true,
    resizable: false,
    fullscreenable: false,
    titleBarStyle: 'hidden' as const,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:4200');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL(
      url.format({
        pathname: path.join(import.meta.dirname, '../renderer/index.html'),
        protocol: 'file:',
        slashes: true,
      }),
    );
  }

  // 当窗口关闭时触发
  mainWindow.on('closed', () => {
    // 取消引用窗口对象
    mainWindow = null;
  });
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'handle',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
    },
  },
]);

app.whenReady().then(() => {
  app.commandLine.appendSwitch('disable-features', 'site-per-process');
  app.commandLine.appendSwitch('ignore-certificate-errors');
  app.commandLine.appendSwitch('allow-insecure-localhost', 'true');
  app.commandLine.appendSwitch('ignore-certificate-errors-spki-list', '*');
  app.on('certificate-error', (event, _webContents, _url, _error, _certificate, callback) => {
    event.preventDefault();
    callback(true);
  });

  protocol.handle('handle', (request) => {
    return fetchRequestHandler({
      endpoint: '/',
      req: request,
      createContext: createContext,
      router: appRouter,
    });
  });

  createWindow();
  app.on('activate', () => {
    if (mainWindow === null) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

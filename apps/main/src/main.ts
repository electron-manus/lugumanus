import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { app, protocol } from 'electron';
import { appRouter } from './app-router.js';
import { createContext } from './trpc.js';
import { createMainWindow, getMainWindow } from './window.js';

process.on('unhandledRejection', (error) => {
  if (process.env.NODE_ENV === 'development') {
    // Will print "unhandledRejection err is not defined"
    console.log('unhandledRejection', (error as Error).message);
  }
});

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

// 当 Electron 初始化完成后创建窗口
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

  createMainWindow();

  app.on('activate', () => {
    // 在 macOS 上，当点击 dock 图标且没有其他窗口打开时，通常会重新创建一个窗口
    if (getMainWindow() === null) {
      createMainWindow();
    }
  });
});

// 当所有窗口关闭时退出应用（Windows & Linux）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// require('electron').contextBridge.exposeInMainWorld('ipcRenderer', require('electron').ipcRenderer);

import type { IpcRendererEvent } from 'electron';

const api = {
  on: (event: string, callback: (event: IpcRendererEvent, data: unknown) => void) => {
    require('electron').ipcRenderer.on(event, callback);
  },
  off: (channel: string, callback: (event: IpcRendererEvent, data: unknown) => void) => {
    require('electron').ipcRenderer.off(channel, callback);
  },
};

require('electron').contextBridge.exposeInMainWorld('Main', api);

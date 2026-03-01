const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openExternal: (url) => ipcRenderer.send('open-external', url),
  setPin: (value) => ipcRenderer.send('set-pin', value),
  resizeHeight: (h) => ipcRenderer.send('resize-height', h),
  onPinState: (callback) => ipcRenderer.on('pin-state', (_e, value) => callback(value)),
});

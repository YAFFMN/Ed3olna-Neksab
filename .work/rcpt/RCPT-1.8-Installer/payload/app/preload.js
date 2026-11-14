const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('novaBridge', {
  hasKey: () => ipcRenderer.invoke('nova:hasKey'),
  saveKey: (k) => ipcRenderer.invoke('nova:saveKey', String(k)),
  clearKey: () => ipcRenderer.invoke('nova:clearKey'),
  chat: (req) => ipcRenderer.invoke('nova:chat', req),
  spaceWeather: (refresh) => ipcRenderer.invoke('data:swpc', { refresh: !!refresh })
});

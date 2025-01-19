const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  download: (url, mode) => ipcRenderer.invoke('download', url, mode),
  onDownloadProgress: (callback) => ipcRenderer.on('download-progress', callback),
  onDownloadComplete: (callback) => ipcRenderer.on('download-complete', callback),
  onDownloadError: (callback) => ipcRenderer.on('download-error', callback),
  onWindowVisibilityChange: (callback) => ipcRenderer.on('window-visibility-change', callback),
  removeWindowVisibilityChangeListener: (callback) => ipcRenderer.removeListener('window-visibility-change', callback)
})

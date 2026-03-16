import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // ダイアログ
  selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),

  // シェル
  openFile: (filePath: string) => ipcRenderer.invoke('shell:openFile', filePath),
  openFolder: (folderPath: string) => ipcRenderer.invoke('shell:openFolder', folderPath),

  // ファイルシステム
  ensureDir: (dirPath: string) => ipcRenderer.invoke('fs:ensureDir', dirPath),
  listFiles: (dirPath: string) => ipcRenderer.invoke('fs:listFiles', dirPath),
  copyFile: (src: string, dest: string) => ipcRenderer.invoke('fs:copyFile', src, dest),
  deleteFile: (filePath: string) => ipcRenderer.invoke('fs:deleteFile', filePath),
  moveDir: (src: string, dest: string) => ipcRenderer.invoke('fs:moveDir', src, dest),
  readJson: <T>(filePath: string) => ipcRenderer.invoke('fs:readJson', filePath) as Promise<T | null>,
  writeJson: (filePath: string, data: unknown) => ipcRenderer.invoke('fs:writeJson', filePath, data),
  exists: (path: string) => ipcRenderer.invoke('fs:exists', path),

  // アプリ設定
  getSettingsPath: () => ipcRenderer.invoke('app:getSettingsPath'),
})

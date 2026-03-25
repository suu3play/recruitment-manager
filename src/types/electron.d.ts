export interface ElectronAPI {
  selectDirectory: () => Promise<string | null>
  openFile: (filePath: string) => Promise<void>
  openFolder: (folderPath: string) => Promise<void>
  ensureDir: (dirPath: string) => Promise<boolean>
  listFiles: (dirPath: string) => Promise<string[]>
  copyFile: (src: string, dest: string) => Promise<boolean>
  deleteFile: (filePath: string) => Promise<boolean>
  moveDir: (src: string, dest: string) => Promise<boolean>
  readJson: <T>(filePath: string) => Promise<T | null>
  writeJson: (filePath: string, data: unknown) => Promise<boolean>
  deleteDir: (dirPath: string) => Promise<boolean>
  exists: (path: string) => Promise<boolean>
  getSettingsPath: () => Promise<string>
  postWebhook: (url: string, type: 'teams' | 'slack', message: string) => Promise<boolean>
  getFilePath: (file: File) => string
  watchStart: (dirPath: string) => Promise<boolean>
  onFsChanged: (callback: () => void) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

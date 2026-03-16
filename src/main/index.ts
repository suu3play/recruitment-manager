import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readdirSync, renameSync, copyFileSync, unlinkSync, readFileSync, writeFileSync } from 'fs'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'default',
    title: '採用管理',
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ---- IPC ハンドラー ----

// ディレクトリ選択ダイアログ
ipcMain.handle('dialog:selectDirectory', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
  return result.canceled ? null : result.filePaths[0]
})

// ファイルをOSのデフォルトアプリで開く
ipcMain.handle('shell:openFile', async (_event, filePath: string) => {
  await shell.openPath(filePath)
})

// フォルダをエクスプローラーで開く
ipcMain.handle('shell:openFolder', async (_event, folderPath: string) => {
  shell.showItemInFolder(folderPath)
})

// ディレクトリ作成
ipcMain.handle('fs:ensureDir', (_event, dirPath: string) => {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true })
  }
  return true
})

// ファイル一覧取得
ipcMain.handle('fs:listFiles', (_event, dirPath: string): string[] => {
  if (!existsSync(dirPath)) return []
  return readdirSync(dirPath)
})

// ファイルコピー（drag&drop からフォルダへ）
ipcMain.handle('fs:copyFile', (_event, srcPath: string, destPath: string) => {
  copyFileSync(srcPath, destPath)
  return true
})

// ファイル削除
ipcMain.handle('fs:deleteFile', (_event, filePath: string) => {
  if (existsSync(filePath)) unlinkSync(filePath)
  return true
})

// フォルダ移動（ステータス変更時）
ipcMain.handle('fs:moveDir', (_event, srcPath: string, destPath: string) => {
  if (!existsSync(srcPath)) return false
  const parentDir = destPath.substring(0, destPath.lastIndexOf('/')) || destPath.substring(0, destPath.lastIndexOf('\\'))
  if (parentDir && !existsSync(parentDir)) {
    mkdirSync(parentDir, { recursive: true })
  }
  renameSync(srcPath, destPath)
  return true
})

// JSONファイル読み込み
ipcMain.handle('fs:readJson', (_event, filePath: string) => {
  if (!existsSync(filePath)) return null
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'))
  } catch {
    return null
  }
})

// JSONファイル書き込み
ipcMain.handle('fs:writeJson', (_event, filePath: string, data: unknown) => {
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
  return true
})

// アプリ設定ファイルのパス（ユーザーデータディレクトリ）
ipcMain.handle('app:getSettingsPath', () => {
  return join(app.getPath('userData'), 'settings.json')
})

// ディレクトリ存在チェック
ipcMain.handle('fs:exists', (_event, dirPath: string) => {
  return existsSync(dirPath)
})

import { app, BrowserWindow, ipcMain, dialog, shell, session } from 'electron'
import { join, isAbsolute } from 'path'
import { watch } from 'fs'
import type { FSWatcher } from 'fs'
import { access, mkdir, readdir, rename, copyFile, unlink, readFile, writeFile, rm } from 'fs/promises'

let mainWindow: BrowserWindow | null = null
let fsWatcher: FSWatcher | null = null

/**
 * 指定ディレクトリの監視を開始する。既存のウォッチャーがあれば先に閉じる。
 */
function startWatcher(dirPath: string): void {
  if (fsWatcher) {
    fsWatcher.close()
    fsWatcher = null
  }
  try {
    fsWatcher = watch(dirPath, { recursive: true }, () => {
      mainWindow?.webContents.send('fs:changed')
    })
    fsWatcher.on('error', () => {
      fsWatcher?.close()
      fsWatcher = null
    })
  } catch {
    fsWatcher = null
  }
}

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
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'",
        ],
      },
    })
  })

  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ---- バリデーション ----

/**
 * IPC ハンドラーが受け取るパス引数を検証する。
 * 文字列かつ絶対パスでない場合はエラーをスローする。
 */
function validatePath(value: unknown, argName = 'path'): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`引数 "${argName}" は空でない文字列である必要があります`)
  }
  if (!isAbsolute(value)) {
    throw new Error(`引数 "${argName}" は絶対パスである必要があります: "${value}"`)
  }
  return value
}

/** fs/promises の access を利用してパスの存在を確認する */
async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

// ---- IPC ハンドラー ----

// ディレクトリ選択ダイアログ
ipcMain.handle('dialog:selectDirectory', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
  return result.canceled ? null : result.filePaths[0]
})

// ファイルをOSのデフォルトアプリで開く
ipcMain.handle('shell:openFile', async (_event, filePath: string) => {
  validatePath(filePath, 'filePath')
  await shell.openPath(filePath)
})

// フォルダをエクスプローラーで開く
ipcMain.handle('shell:openFolder', async (_event, folderPath: string) => {
  validatePath(folderPath, 'folderPath')
  shell.showItemInFolder(folderPath)
})

// ディレクトリ作成
ipcMain.handle('fs:ensureDir', async (_event, dirPath: string) => {
  validatePath(dirPath, 'dirPath')
  if (!(await pathExists(dirPath))) {
    await mkdir(dirPath, { recursive: true })
  }
  return true
})

// ファイル一覧取得
ipcMain.handle('fs:listFiles', async (_event, dirPath: string): Promise<string[]> => {
  validatePath(dirPath, 'dirPath')
  if (!(await pathExists(dirPath))) return []
  return readdir(dirPath)
})

// ファイルコピー（drag&drop からフォルダへ）
ipcMain.handle('fs:copyFile', async (_event, srcPath: string, destPath: string) => {
  validatePath(srcPath, 'srcPath')
  validatePath(destPath, 'destPath')
  try {
    await copyFile(srcPath, destPath)
    return true
  } catch {
    return false
  }
})

// ファイル削除
ipcMain.handle('fs:deleteFile', async (_event, filePath: string) => {
  validatePath(filePath, 'filePath')
  if (await pathExists(filePath)) await unlink(filePath)
  return true
})

// フォルダ移動（ステータス変更時）
ipcMain.handle('fs:moveDir', async (_event, srcPath: string, destPath: string) => {
  validatePath(srcPath, 'srcPath')
  validatePath(destPath, 'destPath')
  if (!(await pathExists(srcPath))) return false
  const parentDir = destPath.substring(0, destPath.lastIndexOf('/')) || destPath.substring(0, destPath.lastIndexOf('\\'))
  if (parentDir && !(await pathExists(parentDir))) {
    await mkdir(parentDir, { recursive: true })
  }
  await rename(srcPath, destPath)
  return true
})

// JSONファイル読み込み
ipcMain.handle('fs:readJson', async (_event, filePath: string) => {
  validatePath(filePath, 'filePath')
  if (!(await pathExists(filePath))) return null
  try {
    return JSON.parse(await readFile(filePath, 'utf-8'))
  } catch {
    return null
  }
})

// JSONファイル書き込み
ipcMain.handle('fs:writeJson', async (_event, filePath: string, data: unknown) => {
  validatePath(filePath, 'filePath')
  try {
    await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
    return true
  } catch (err) {
    throw err instanceof Error ? err : new Error(String(err))
  }
})

// アプリ設定ファイルのパス（ユーザーデータディレクトリ）
ipcMain.handle('app:getSettingsPath', () => {
  return join(app.getPath('userData'), 'settings.json')
})

// ディレクトリ削除（再帰的）
ipcMain.handle('fs:deleteDir', async (_event, dirPath: string) => {
  validatePath(dirPath, 'dirPath')
  if (await pathExists(dirPath)) await rm(dirPath, { recursive: true, force: true })
  return true
})

// ディレクトリ存在チェック
ipcMain.handle('fs:exists', async (_event, dirPath: string) => {
  validatePath(dirPath, 'dirPath')
  return pathExists(dirPath)
})

// FSウォッチャー起動
ipcMain.handle('fs:watch-start', async (_event, dirPath: string) => {
  validatePath(dirPath, 'dirPath')
  if (!(await pathExists(dirPath))) return false
  startWatcher(dirPath)
  return true
})

// 許可するWebhookのホスト一覧
const ALLOWED_WEBHOOK_HOSTS = [
  'teams.microsoft.com',
  'hooks.slack.com',
  'outlook.office.com',
  'outlook.office365.com',
]

function validateWebhookUrl(url: string): void {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('無効なURLです')
  }
  if (parsed.protocol !== 'https:') {
    throw new Error('HTTPSのURLのみ許可されています')
  }
  const isAllowed = ALLOWED_WEBHOOK_HOSTS.some(
    host => parsed.hostname === host || parsed.hostname.endsWith('.' + host)
  )
  if (!isAllowed) {
    throw new Error(`許可されていないホストです: ${parsed.hostname}`)
  }
}

// Webhook 送信（Teams / Slack）
ipcMain.handle('webhook:post', async (_event, url: string, webhookType: 'teams' | 'slack', message: string) => {
  validateWebhookUrl(url)
  let body: string
  if (webhookType === 'teams') {
    // Teams Incoming Webhook は {"text": "..."} で送信可能
    body = JSON.stringify({ text: message })
  } else {
    // Slack Incoming Webhook
    body = JSON.stringify({ text: message })
  }

  const TIMEOUT_MS = 10_000
  const MAX_RETRIES = 3
  const RETRY_INTERVAL_MS = 1_000

  let lastError: Error | null = null
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: controller.signal,
      })
      clearTimeout(timer)
      if (!response.ok) {
        throw new Error(`Webhook 送信失敗: ${response.status} ${response.statusText}`)
      }
      return true
    } catch (err) {
      clearTimeout(timer)
      lastError = err instanceof Error ? err : new Error(String(err))
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL_MS))
      }
    }
  }
  throw lastError ?? new Error('Webhook 送信失敗')
})

import { app, BrowserWindow, nativeImage } from 'electron'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { BridgeManager, PythonManager } from './managers.js'
import { registerIpcHandlers } from './ipc-handlers.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isDev = !app.isPackaged

// ── Logging setup ────────────────────────────────────────────────────────────
const logDir = path.join(app.getPath('home'), 'Library', 'Logs', 'WeWork')
fs.mkdirSync(logDir, { recursive: true })
export const logFile = path.join(logDir, 'main.log')
// Overwrite on each launch — keeps the log fresh and bounded
const logStream = fs.createWriteStream(logFile, { flags: 'w' })

function log(line) {
  const ts = new Date().toISOString()
  const msg = `${ts} ${line}\n`
  process.stdout.write(msg)
  logStream.write(msg)
}

// Capture uncaught errors in main process
process.on('uncaughtException', (err) => log(`[main] uncaughtException: ${err.stack || err}`))
process.on('unhandledRejection', (reason) => log(`[main] unhandledRejection: ${reason}`))

let mainWindow
const bridgeManager = new BridgeManager(log)
const pythonManager = new PythonManager(log, logFile)

async function createWindow() {
  const iconPath = path.join(__dirname, '../asset/logo.png')
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'WeWorker',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#f5f5f7',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/dist/index.html'))
  }
}

app.whenReady().then(async () => {
  log('[main] app ready')

  // Set app icon from logo.png (dev + production fallback)
  const logoPath = path.join(__dirname, '../asset/logo.png')
  if (fs.existsSync(logoPath)) {
    const icon = nativeImage.createFromPath(logoPath)
    if (process.platform === 'darwin' && app.dock) {
      app.dock.setIcon(icon)
    }
    // mainWindow icon set below after creation
  }

  registerIpcHandlers(bridgeManager, pythonManager)

  // Start bridge and python in parallel
  await Promise.allSettled([bridgeManager.start(), pythonManager.start()])

  await createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', async () => {
  await Promise.allSettled([pythonManager.stop(), bridgeManager.stop()])
})

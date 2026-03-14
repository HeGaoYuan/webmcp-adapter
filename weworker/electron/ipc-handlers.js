import { ipcMain, shell } from 'electron'
import { app } from 'electron'

export function registerIpcHandlers(bridgeManager, pythonManager) {
  ipcMain.handle('get-status', () => ({
    bridge: bridgeManager.getStatus(),
    python: pythonManager.getStatus(),
  }))

  ipcMain.handle('get-version', () => app.getVersion())

  ipcMain.handle('open-external', (_event, url) => {
    shell.openExternal(url)
  })
}

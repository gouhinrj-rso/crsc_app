import { app, BrowserWindow } from 'electron'
import path from 'path'
import { initDb, closeDb } from './db/database'
import { runMigrations } from './db/migrations'
import { registerSettingsHandlers } from './ipc/settings'
import { registerFormDataHandlers } from './ipc/formData'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.mjs')
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  initDb()
  runMigrations()
  registerSettingsHandlers()
  registerFormDataHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('before-quit', () => {
  closeDb()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

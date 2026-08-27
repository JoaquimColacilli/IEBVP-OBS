import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { setBiblesDir } from './bible/library'
import { getSettings } from './config'
import { registerIpc } from './ipc'
import { connectObs } from './obs/service'
import { startOverlayServer, stopOverlayServer, type OverlayPaths } from './overlay/server'
import { resourcePath } from './resources'
import { startUpdater } from './updater'
import { NORMAL_MIN } from './window'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: NORMAL_MIN.width,
    minHeight: NORMAL_MIN.height,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: '#F6F2E9',
    ...(process.platform === 'darwin' ? {} : { icon }),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

void app.whenReady().then(async () => {
  electronApp.setAppUserModelId('ar.org.iebvp.versiculos')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  setBiblesDir(resourcePath('bibles'))

  const paths: OverlayPaths = {
    overlayDir: resourcePath('overlay'),
    fontsDir: resourcePath('fonts'),
    tokensFile: resourcePath('tokens.css')
  }

  registerIpc(paths)

  const settings = getSettings()
  await startOverlayServer(paths, settings.overlayPort)
  createWindow()

  startUpdater()

  if (settings.wizardDone) void connectObs(settings.obs, settings.inputName)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  void stopOverlayServer()
})

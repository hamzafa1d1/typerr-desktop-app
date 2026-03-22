import { join } from 'path'
import {
  app,
  shell,
  BrowserWindow,
  ipcMain,
  Tray,
  Menu,
  nativeImage,
  systemPreferences
} from 'electron'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { TypingMonitor } from './typing-monitor'
import { closeDb, endSession, getDb, recentErrors, startSession } from './db'

const ACCESSIBILITY_URL =
  'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'

let mainWindow: BrowserWindow | null = null
let permissionsWindow: BrowserWindow | null = null
let tray: Tray | null = null
let monitor: TypingMonitor | null = null
let sessionId = 0
let statsTimer: ReturnType<typeof setInterval> | null = null
let accessibilityPoll: ReturnType<typeof setInterval> | null = null
let appIsQuitting = false
let coreStarted = false

function isMacAccessibilityOk(): boolean {
  if (process.platform !== 'darwin') return true
  return systemPreferences.isTrustedAccessibilityClient(false)
}

function broadcastStats(): void {
  if (!mainWindow || mainWindow.isDestroyed() || !monitor) return
  const { wpm, lastError } = monitor.getLiveStats()
  const errors = recentErrors(5).map((r) => ({
    mistyped_word: r.mistyped_word,
    corrected_word: r.corrected_word || '—',
    timestamp: r.timestamp
  }))
  mainWindow.webContents.send('typerr:stats', { wpm, lastError, recentErrors: errors })
}

function startStatsLoop(): void {
  if (statsTimer) clearInterval(statsTimer)
  statsTimer = setInterval(() => broadcastStats(), 2000)
}

function stopStatsLoop(): void {
  if (statsTimer) {
    clearInterval(statsTimer)
    statsTimer = null
  }
}

function createMainWindow(): void {
  if (mainWindow && !mainWindow.isDestroyed()) return
  mainWindow = new BrowserWindow({
    width: 440,
    height: 560,
    show: false,
    ...(process.platform === 'darwin'
      ? {
          vibrancy: 'under-window' as const,
          visualEffectState: 'active' as const,
          titleBarStyle: 'hiddenInset' as const,
          trafficLightPosition: { x: 12, y: 14 }
        }
      : {}),
    autoHideMenuBar: true,
    backgroundColor: '#0A0A0A',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    /* shown from tray */
  })

  mainWindow.on('close', (e) => {
    if (!appIsQuitting) {
      e.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function permissionsHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Typerr — Permissions</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      margin: 0; padding: 28px;
      background: #0a0a0a; color: #fafafa;
      line-height: 1.5;
    }
    h1 { font-size: 18px; margin: 0 0 12px; }
    p { color: #a3a3a3; font-size: 13px; margin: 0 0 20px; }
    button {
      width: 100%; padding: 12px 16px; border-radius: 10px; border: none;
      font-size: 14px; font-weight: 600; cursor: pointer;
      background: linear-gradient(180deg, #3b82f6, #2563eb); color: white;
    }
    button:hover { filter: brightness(1.06); }
  </style>
</head>
<body>
  <h1>Accessibility permission required</h1>
  <p>Typerr listens to keystrokes locally to compute typing metrics. On macOS, enable Accessibility for this app in System Settings, then return here.</p>
  <button id="open">Open Accessibility Settings</button>
  <script>
    const { ipcRenderer } = require('electron');
    document.getElementById('open').onclick = () => ipcRenderer.send('typerr:open-accessibility');
  </script>
</body>
</html>`
}

function createPermissionsWindow(): void {
  const openAccessibility = (): void => {
    void shell.openExternal(ACCESSIBILITY_URL)
    systemPreferences.isTrustedAccessibilityClient(true)
  }
  ipcMain.removeAllListeners('typerr:open-accessibility')
  ipcMain.on('typerr:open-accessibility', openAccessibility)

  permissionsWindow = new BrowserWindow({
    width: 400,
    height: 280,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    title: 'Typerr — Permissions',
    show: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })
  permissionsWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(permissionsHtml()))
  permissionsWindow.on('closed', () => {
    ipcMain.removeListener('typerr:open-accessibility', openAccessibility)
    permissionsWindow = null
  })
}

function stopAccessibilityPoll(): void {
  if (accessibilityPoll) {
    clearInterval(accessibilityPoll)
    accessibilityPoll = null
  }
}

function beginAccessibilityPoll(onGranted: () => void): void {
  stopAccessibilityPoll()
  accessibilityPoll = setInterval(() => {
    if (isMacAccessibilityOk()) {
      stopAccessibilityPoll()
      permissionsWindow?.close()
      onGranted()
    }
  }, 2000)
}

function createTray(): void {
  const img = nativeImage.createFromPath(icon)
  tray = new Tray(img.resize({ width: 18, height: 18 }))
  tray.setToolTip('Typerr')
  const menu = Menu.buildFromTemplate([
    {
      label: 'Show Typerr',
      click: () => showDashboard()
    },
    {
      label: 'Open Accessibility Settings',
      visible: process.platform === 'darwin',
      click: () => void shell.openExternal(ACCESSIBILITY_URL)
    },
    { type: 'separator' },
    {
      label: 'Quit Typerr',
      click: () => {
        appIsQuitting = true
        app.quit()
      }
    }
  ])
  tray.setContextMenu(menu)
  tray.on('click', () => {
    showDashboard()
  })
}

function showDashboard(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return
  if (mainWindow.isVisible()) {
    mainWindow.hide()
    return
  }
  mainWindow.show()
  mainWindow.focus()
  broadcastStats()
}

function startCore(): void {
  if (coreStarted) return
  coreStarted = true
  createTray()
  createMainWindow()
  getDb()
  sessionId = startSession()
  monitor = new TypingMonitor()
  monitor.start()
  startStatsLoop()
}

function waitForAccessibilityThenStart(): void {
  if (isMacAccessibilityOk()) {
    startCore()
    return
  }
  createPermissionsWindow()
  beginAccessibilityPoll(() => startCore())
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.typerr.app')

  if (process.platform === 'darwin' && app.dock) {
    app.dock.hide()
  }

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.handle('typerr:get-initial-stats', () => {
    if (!monitor) {
      return { wpm: 0, lastError: null, recentErrors: [] as unknown[] }
    }
    const { wpm, lastError } = monitor.getLiveStats()
    const errors = recentErrors(5).map((r) => ({
      mistyped_word: r.mistyped_word,
      corrected_word: r.corrected_word || '—',
      timestamp: r.timestamp
    }))
    return { wpm, lastError, recentErrors: errors }
  })

  waitForAccessibilityThenStart()

  app.on('activate', () => {
    if (!isMacAccessibilityOk() || !coreStarted) return
    if (!mainWindow || mainWindow.isDestroyed()) {
      createMainWindow()
    }
  })
})

app.on('before-quit', () => {
  appIsQuitting = true
  stopStatsLoop()
  stopAccessibilityPoll()
  const avg = monitor?.sessionAverageWpm() ?? 0
  monitor?.stop()
  monitor = null
  if (sessionId) {
    endSession(sessionId, avg)
  }
  closeDb()
})

app.on('window-all-closed', () => {
  /* tray app: keep running */
})

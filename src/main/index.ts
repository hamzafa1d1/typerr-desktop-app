import 'dotenv/config'
import { join } from 'path'
import {
  app,
  shell,
  BrowserWindow,
  ipcMain,
  globalShortcut,
  Tray,
  Menu,
  nativeImage,
  systemPreferences,
  screen
} from 'electron'
import icon from '../../resources/icon.png?asset'
import { watchWindowShortcuts } from './window-shortcuts'
import { TypingMonitor } from './typing-monitor'
import {
  closeDb,
  correctionsSince,
  endSession,
  getDb,
  recentErrors,
  startSession,
  topMistakeDetails,
  topSuggestions
} from './db'
import { analyzeAudit } from './audit-analysis'
import { shutdownUsageAnalytics, trackInstallAndLaunch } from './usage-analytics'

const ACCESSIBILITY_URL =
  'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'

let mainWindow: BrowserWindow | null = null
let permissionsWindow: BrowserWindow | null = null
let tray: Tray | null = null
let monitor: TypingMonitor | null = null
let sessionId = 0
let statsTimer: ReturnType<typeof setInterval> | null = null
const DEFAULT_STATS_INTERVAL_MS = 10 * 1000
const MIN_STATS_INTERVAL_MS = 1000
const MAX_STATS_INTERVAL_MS = 60 * 60 * 1000
let statsIntervalMs = DEFAULT_STATS_INTERVAL_MS
let accessibilityPoll: ReturnType<typeof setInterval> | null = null
let appIsQuitting = false
let coreStarted = false
let spotlightMode = false
let previousBounds: Electron.Rectangle | null = null

function isMacAccessibilityOk(): boolean {
  if (process.platform !== 'darwin') return true
  return systemPreferences.isTrustedAccessibilityClient(false)
}

function broadcastStats(): void {
  if (!mainWindow || mainWindow.isDestroyed() || !monitor) return
  const { wpm, lastError } = monitor.getLiveStats()
  const sessionAvgWpm = monitor.sessionAverageWpm()
  const errors = recentErrors(5).map((r) => ({
    mistyped_word: r.mistyped_word,
    corrected_word: r.corrected_word || '—',
    timestamp: r.timestamp
  }))
  const suggestions = topSuggestions(6)
  const hourAgo = Date.now() - 60 * 60 * 1000
  const correctionsLastHour = correctionsSince(hourAgo)
  const mistakeDetails = topMistakeDetails(10)
  mainWindow.webContents.send('typerr:stats', {
    wpm,
    sessionAvgWpm,
    lastError,
    recentErrors: errors,
    suggestedCorrections: suggestions,
    correctionsLastHour,
    mistakeDetails
  })
}

function startStatsLoop(): void {
  if (statsTimer) clearInterval(statsTimer)
  statsTimer = setInterval(() => broadcastStats(), statsIntervalMs)
}

function stopStatsLoop(): void {
  if (statsTimer) {
    clearInterval(statsTimer)
    statsTimer = null
  }
}

function setStatsInterval(ms: number): number {
  if (!Number.isFinite(ms)) return statsIntervalMs
  const next = Math.min(Math.max(Math.floor(ms), MIN_STATS_INTERVAL_MS), MAX_STATS_INTERVAL_MS)
  statsIntervalMs = next
  startStatsLoop()
  broadcastStats()
  return statsIntervalMs
}

function createMainWindow(): void {
  if (mainWindow && !mainWindow.isDestroyed()) return
  mainWindow = new BrowserWindow({
    title: 'Typerr',
    width: 1080,
    height: 760,
    minWidth: 900,
    minHeight: 640,
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
    ...(process.platform !== 'darwin' ? { icon } : {}),
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

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
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
      margin: 0; padding: 0;
      background: #0a0a0a; color: #fafafa;
      line-height: 1.5;
    }
    main { padding: 28px; }
    h1 { font-size: 20px; margin: 0 0 8px; }
    p { color: #a3a3a3; font-size: 13px; margin: 0 0 18px; }
    .hero {
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 14px;
      padding: 14px;
      background: rgba(255, 255, 255, 0.03);
      margin-bottom: 16px;
    }
    .steps {
      display: grid;
      gap: 10px;
      margin-bottom: 18px;
    }
    .step {
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 10px 12px;
      background: rgba(255, 255, 255, 0.02);
    }
    .step h2 {
      margin: 0 0 4px;
      font-size: 12px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #d4d4d8;
    }
    .step p { margin: 0; font-size: 12px; color: #a1a1aa; }
    button {
      width: 100%; padding: 12px 16px; border-radius: 10px; border: none;
      font-size: 14px; font-weight: 600; cursor: pointer;
      background: linear-gradient(180deg, #3b82f6, #2563eb); color: white;
    }
    button:hover { filter: brightness(1.06); }
    .hint { margin-top: 10px; color: #71717a; font-size: 11px; }
  </style>
</head>
<body>
  <main>
    <h1>Enable Accessibility to start coaching</h1>
    <p>Typerr analyzes typing locally. We need macOS Accessibility access to receive global key events while you work.</p>

    <div class="hero">
      <strong style="font-size:13px;">Why this matters</strong>
      <p style="margin:6px 0 0;">Without this permission, Typerr cannot measure WPM or detect correction patterns in real time.</p>
    </div>

    <div class="steps">
      <div class="step">
        <h2>Step 1</h2>
        <p>Open macOS Accessibility settings.</p>
      </div>
      <div class="step">
        <h2>Step 2</h2>
        <p>Enable Typerr in the allowed applications list.</p>
      </div>
      <div class="step">
        <h2>Step 3</h2>
        <p>Return here. Typerr will detect access automatically.</p>
      </div>
    </div>

    <button id="open">Open Accessibility Settings</button>
    <p class="hint">Privacy note: your raw keystrokes never leave your machine.</p>
  </main>
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
    width: 520,
    height: 520,
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
      label: 'Summon Spotlight (Cmd+Opt+T)',
      click: () => toggleSpotlightDashboard()
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
  if (spotlightMode) {
    restoreDashboardWindow()
  }
  if (mainWindow.isVisible()) {
    mainWindow.hide()
    return
  }
  mainWindow.show()
  mainWindow.focus()
  broadcastStats()
}

function restoreDashboardWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return
  if (previousBounds) {
    mainWindow.setBounds(previousBounds)
  }
  mainWindow.setAlwaysOnTop(false)
  mainWindow.setVisibleOnAllWorkspaces(false)
  spotlightMode = false
}

function toggleSpotlightDashboard(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return

  if (spotlightMode) {
    restoreDashboardWindow()
    mainWindow.hide()
    return
  }

  previousBounds = mainWindow.getBounds()
  const { workArea } = screen.getPrimaryDisplay()
  const width = Math.min(940, Math.max(760, Math.floor(workArea.width * 0.72)))
  const height = Math.min(650, Math.max(520, Math.floor(workArea.height * 0.72)))
  const x = Math.round(workArea.x + (workArea.width - width) / 2)
  const y = Math.round(workArea.y + Math.max(36, (workArea.height - height) / 5))

  mainWindow.setBounds({ x, y, width, height })
  mainWindow.setAlwaysOnTop(true, 'floating')
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  spotlightMode = true
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
  app.setName('Typerr')

  void trackInstallAndLaunch()

  if (process.platform === 'win32') {
    app.setAppUserModelId(!app.isPackaged ? process.execPath : 'com.typerr.app')
  }

  if (process.platform === 'darwin' && app.dock) {
    app.dock.hide()
  }

  app.on('browser-window-created', (_, window) => {
    watchWindowShortcuts(window)
  })

  globalShortcut.register('CommandOrControl+Alt+T', () => {
    toggleSpotlightDashboard()
  })

  ipcMain.handle('typerr:get-initial-stats', () => {
    if (!monitor) {
      return {
        wpm: 0,
        sessionAvgWpm: 0,
        lastError: null,
        recentErrors: [] as unknown[],
        suggestedCorrections: [],
        correctionsLastHour: 0,
        mistakeDetails: []
      }
    }
    const { wpm, lastError } = monitor.getLiveStats()
    const sessionAvgWpm = monitor.sessionAverageWpm()
    const errors = recentErrors(5).map((r) => ({
      mistyped_word: r.mistyped_word,
      corrected_word: r.corrected_word || '—',
      timestamp: r.timestamp
    }))
    const suggestions = topSuggestions(6)
    const hourAgo = Date.now() - 60 * 60 * 1000
    const correctionsLastHour = correctionsSince(hourAgo)
    const mistakeDetails = topMistakeDetails(10)
    return {
      wpm,
      sessionAvgWpm,
      lastError,
      recentErrors: errors,
      suggestedCorrections: suggestions,
      correctionsLastHour,
      mistakeDetails
    }
  })

  ipcMain.handle('typerr:analyze-audit', async (_evt, request) => {
    return analyzeAudit(request)
  })

  ipcMain.handle('typerr:set-stats-interval', (_evt, ms: number) => {
    return setStatsInterval(ms)
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
  globalShortcut.unregisterAll()
  appIsQuitting = true
  stopStatsLoop()
  stopAccessibilityPoll()
  const avg = monitor?.sessionAverageWpm() ?? 0
  monitor?.stop()
  monitor = null
  if (sessionId) {
    endSession(sessionId, avg)
  }
  void shutdownUsageAnalytics()
  closeDb()
})

app.on('window-all-closed', () => {
  /* tray app: keep running */
})

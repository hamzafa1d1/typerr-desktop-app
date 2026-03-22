import { BrowserWindow, app } from 'electron'

/** DevTools (F12) in dev; block reload / devtools shortcuts in prod — same behavior as @electron-toolkit/utils optimizer. */
export function watchWindowShortcuts(
  window: BrowserWindow,
  shortcutOptions?: { escToCloseWindow?: boolean; zoom?: boolean }
): void {
  const { webContents } = window
  const { escToCloseWindow = false, zoom = false } = shortcutOptions || {}
  webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return
    const isDev = !app.isPackaged
    if (!isDev) {
      if (input.code === 'KeyR' && (input.control || input.meta)) event.preventDefault()
      if (input.code === 'KeyI' && ((input.alt && input.meta) || (input.control && input.shift))) {
        event.preventDefault()
      }
    } else {
      if (input.code === 'F12') {
        if (webContents.isDevToolsOpened()) webContents.closeDevTools()
        else webContents.openDevTools({ mode: 'undocked' })
      }
    }
    if (escToCloseWindow) {
      if (input.code === 'Escape' && input.key !== 'Process') {
        window.close()
        event.preventDefault()
      }
    }
    if (!zoom) {
      if (input.code === 'Minus' && (input.control || input.meta)) event.preventDefault()
      if (input.code === 'Equal' && input.shift && (input.control || input.meta))
        event.preventDefault()
    }
  })
}

import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { AuditAnalysis, AuditAnalysisRequest, TyperrStatsPayload } from './typerr-types'

const typerr = {
  getInitialStats: (): Promise<TyperrStatsPayload> =>
    ipcRenderer.invoke('typerr:get-initial-stats'),
  analyzeAudit: (request?: AuditAnalysisRequest): Promise<AuditAnalysis> =>
    ipcRenderer.invoke('typerr:analyze-audit', request),
  onStats: (cb: (payload: TyperrStatsPayload) => void): (() => void) => {
    const handler = (_evt: Electron.IpcRendererEvent, payload: TyperrStatsPayload): void =>
      cb(payload)
    ipcRenderer.on('typerr:stats', handler)
    return () => {
      ipcRenderer.removeListener('typerr:stats', handler)
    }
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('typerr', typerr)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-expect-error preload fallback
  window.electron = electronAPI
  // @ts-expect-error preload fallback
  window.typerr = typerr
}

import { ElectronAPI } from '@electron-toolkit/preload'
import type { TyperrStatsPayload } from './typerr-types'

export interface TyperrAPI {
  getInitialStats: () => Promise<TyperrStatsPayload>
  onStats: (cb: (payload: TyperrStatsPayload) => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    typerr: TyperrAPI
  }
}

export type { TyperrStatsPayload, TyperrErrorRow } from './typerr-types'

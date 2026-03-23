import { ElectronAPI } from '@electron-toolkit/preload'
import type { AuditAnalysis, AuditAnalysisRequest, TyperrStatsPayload } from './typerr-types'

export interface TyperrAPI {
  getInitialStats: () => Promise<TyperrStatsPayload>
  onStats: (cb: (payload: TyperrStatsPayload) => void) => () => void
  analyzeAudit: (request?: AuditAnalysisRequest) => Promise<AuditAnalysis>
  setStatsRefreshInterval: (ms: number) => Promise<number>
}

declare global {
  interface Window {
    electron: ElectronAPI
    typerr: TyperrAPI
  }
}

export type { AuditAnalysis, AuditAnalysisRequest, TyperrStatsPayload, TyperrErrorRow } from './typerr-types'

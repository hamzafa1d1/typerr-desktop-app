export type TyperrErrorRow = {
  mistyped_word: string
  corrected_word: string
  timestamp: number
}

export type TyperrStatsPayload = {
  wpm: number
  lastError: TyperrErrorRow | null
  recentErrors: TyperrErrorRow[]
}

export type AuditSnapshot = {
  sessionsTracked: number
  avgSessionWpm: number
  correctionsLastHour: number
  uniqueMistypedWords: number
  topMistypedWords: Array<{ word: string; count: number }>
  masteredWordsCount: number
}

export type AuditAnalysis = {
  summary: string
  strengths: string[]
  risks: string[]
  nextActions: string[]
  generatedBy: 'heuristic' | 'local-llm'
  model: string
  snapshot: AuditSnapshot
}

export type AuditAnalysisRequest = {
  focus?: string
}

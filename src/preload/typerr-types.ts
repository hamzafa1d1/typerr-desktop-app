export type TyperrErrorRow = {
  mistyped_word: string
  corrected_word: string
  timestamp: number
}

export type TyperrSuggestionRow = {
  mistyped_word: string
  suggested_word: string
  score: number
  count: number
}

export type TyperrMistakeDetailRow = {
  mistyped_word: string
  suggested_word: string
  score: number
  count: number
  definition: string | null
  tip: string | null
}

export type TyperrStatsPayload = {
  wpm: number
  lastError: TyperrErrorRow | null
  recentErrors: TyperrErrorRow[]
  suggestedCorrections: TyperrSuggestionRow[]
  correctionsLastHour: number
  mistakeDetails: TyperrMistakeDetailRow[]
}

export type AuditSnapshot = {
  sessionsTracked: number
  avgSessionWpm: number
  correctionsLastHour: number
  uniqueMistypedWords: number
  topMistypedWords: Array<{ word: string; count: number }>
  masteredWordsCount: number
  suggestedCorrections: TyperrSuggestionRow[]
}

export type AuditAnalysis = {
  summary: string
  strengths: string[]
  risks: string[]
  nextActions: string[]
  generatedBy: 'heuristic' | 'local-llm' | 'gemini-api'
  model: string
  snapshot: AuditSnapshot
}

export type AuditAnalysisRequest = {
  focus?: string
}

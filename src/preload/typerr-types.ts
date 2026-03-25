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
  sessionAvgWpm: number
  lastError: TyperrErrorRow | null
  recentErrors: TyperrErrorRow[]
  suggestedCorrections: TyperrSuggestionRow[]
  correctionsLastHour: number
  mistakeDetails: TyperrMistakeDetailRow[]
}

export type AuditMistakeDetail = {
  mistyped_word: string
  suggested_word: string
  /** Levenshtein similarity score 0–1 */
  score: number
  /** How many times this typo was recorded */
  count: number
  /** Definition of the correct word from the dictionary API */
  definition: string | null
  /** Contextual tip, e.g. "You typed 'teh' — correct word is 'the' (article)." */
  tip: string | null
}

export type AuditSnapshot = {
  sessionsTracked: number
  avgSessionWpm: number
  correctionsLastHour: number
  uniqueMistypedWords: number
  masteredWordsCount: number
  /** Top recurring mistakes enriched with dictionary definitions and tips */
  topMistakeDetails: AuditMistakeDetail[]
}

// ── New structured AI response types ────────────────────────────────────────

export type SessionMission = {
  /** Short challenge title, max 6 words. */
  title: string
  /** One sentence describing what to do this session. */
  objective: string
  /** Specific measurable target, e.g. "< 1 correction/min for 5 minutes". */
  targetMetric: string
}

export type DrillWord = {
  /** The word to practice typing. */
  word: string
  /** Short memory tip for typing it correctly (max 10 words). */
  hint: string
}

export type ChecklistAction = {
  /** The actionable step the user should take. */
  action: string
  /** Estimated time in minutes. */
  durationMinutes: number
}

// ── AuditAnalysis ────────────────────────────────────────────────────────────

export type AuditAnalysis = {
  summary: string
  sessionMission: SessionMission
  strengths: string[]
  risks: string[]
  nextActions: ChecklistAction[]
  drillWords: DrillWord[]
  /** Specific improvements vs the previous report. Empty if this is the first report. */
  improvementHighlights: string[]
  generatedBy: 'heuristic' | 'local-llm' | 'gemini-api'
  model: string
  snapshot: AuditSnapshot
}

export type AuditAnalysisRequest = {
  focus?: string
  /** Snapshot from the previous report, used to surface improvement highlights. */
  previousSnapshot?: AuditSnapshot
}

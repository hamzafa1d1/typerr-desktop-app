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

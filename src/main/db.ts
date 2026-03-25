import { app } from 'electron'
import Database from 'better-sqlite3'
import { join } from 'path'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = join(app.getPath('userData'), 'typerr.db')
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        start_time INTEGER NOT NULL,
        end_time INTEGER,
        average_wpm REAL
      );
      CREATE TABLE IF NOT EXISTS errors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mistyped_word TEXT NOT NULL,
        corrected_word TEXT,
        timestamp INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS mastered_words (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        word TEXT NOT NULL UNIQUE,
        definition TEXT,
        tip TEXT,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS error_suggestions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mistyped_word TEXT NOT NULL,
        suggested_word TEXT NOT NULL,
        score REAL NOT NULL,
        method TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_error_suggestions_mistyped ON error_suggestions (mistyped_word);
    `)
  }
  return db
}

export function closeDb(): void {
  if (db) {
    db.close()
    db = null
  }
}

export function startSession(): number {
  const d = getDb()
  const r = d.prepare('INSERT INTO sessions (start_time) VALUES (?)').run(Date.now())
  return Number(r.lastInsertRowid)
}

export function endSession(sessionId: number, averageWpm: number): void {
  const d = getDb()
  d.prepare('UPDATE sessions SET end_time = ?, average_wpm = ? WHERE id = ?').run(
    Date.now(),
    averageWpm,
    sessionId
  )
}

export function insertError(mistyped: string, corrected: string | null, ts: number): number {
  const d = getDb()
  const r = d
    .prepare('INSERT INTO errors (mistyped_word, corrected_word, timestamp) VALUES (?, ?, ?)')
    .run(mistyped, corrected ?? '', ts)
  return Number(r.lastInsertRowid)
}

export function insertMasteredWord(word: string, definition: string, tip: string): void {
  const d = getDb()
  d.prepare(
    `INSERT INTO mastered_words (word, definition, tip, created_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(word) DO UPDATE SET definition = excluded.definition, tip = excluded.tip, created_at = excluded.created_at`
  ).run(word.toLowerCase(), definition, tip, Date.now())
}

export function getMasteredWord(word: string): { definition: string; tip: string } | null {
  const row = getDb()
    .prepare('SELECT definition, tip FROM mastered_words WHERE word = ?')
    .get(word.toLowerCase()) as { definition: string; tip: string } | undefined
  return row ?? null
}

export function insertSuggestion(
  mistyped: string,
  suggested: string,
  score: number,
  method: string
): void {
  const d = getDb()
  d.prepare(
    `INSERT INTO error_suggestions (mistyped_word, suggested_word, score, method, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(mistyped.toLowerCase(), suggested.toLowerCase(), score, method, Date.now())
}

export function topSuggestions(limit: number): Array<{
  mistyped_word: string
  suggested_word: string
  score: number
  count: number
}> {
  return getDb()
    .prepare(
      `SELECT mistyped_word, suggested_word,
              AVG(score) as score,
              COUNT(*) as count
       FROM error_suggestions
       GROUP BY mistyped_word, suggested_word
       ORDER BY count DESC, score DESC
       LIMIT ?`
    )
    .all(limit) as Array<{ mistyped_word: string; suggested_word: string; score: number; count: number }>
}

export function topMistakeDetails(limit: number): Array<{
  mistyped_word: string
  suggested_word: string
  score: number
  count: number
  definition: string | null
  tip: string | null
}> {
  return getDb()
    .prepare(
      `SELECT es.mistyped_word,
              es.suggested_word,
              AVG(es.score) as score,
              COUNT(*) as count,
              mw.definition as definition,
              mw.tip as tip
       FROM error_suggestions es
       LEFT JOIN mastered_words mw ON mw.word = es.suggested_word
       GROUP BY es.mistyped_word, es.suggested_word
       HAVING COUNT(*) >= 2
       ORDER BY count DESC, score DESC
       LIMIT ?`
    )
    .all(limit) as Array<{
      mistyped_word: string
      suggested_word: string
      score: number
      count: number
      definition: string | null
      tip: string | null
    }>
}

export function correctionsSince(timestamp: number): number {
  const row = getDb()
    .prepare('SELECT COUNT(*) as count FROM errors WHERE timestamp >= ?')
    .get(timestamp) as { count: number }
  return Number(row.count || 0)
}

export function recentErrors(limit: number): Array<{
  mistyped_word: string
  corrected_word: string
  timestamp: number
}> {
  return getDb()
    .prepare('SELECT mistyped_word, corrected_word, timestamp FROM errors ORDER BY id DESC LIMIT ?')
    .all(limit) as Array<{ mistyped_word: string; corrected_word: string; timestamp: number }>
}

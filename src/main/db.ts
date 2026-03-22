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

export function recentErrors(limit: number): Array<{
  mistyped_word: string
  corrected_word: string
  timestamp: number
}> {
  return getDb()
    .prepare('SELECT mistyped_word, corrected_word, timestamp FROM errors ORDER BY id DESC LIMIT ?')
    .all(limit) as Array<{ mistyped_word: string; corrected_word: string; timestamp: number }>
}

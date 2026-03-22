import { appendFileSync, mkdirSync } from 'fs'
import { Notification, app } from 'electron'
import { GlobalKeyboardListener } from 'node-global-key-listener'
import { join } from 'path'
import { insertError, insertMasteredWord } from './db'

const WINDOW_MS = 60_000
const CHARS_PER_WORD = 5
const KEY_BUFFER_MAX = 20
const DICTIONARY_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en/'

type DownMap = Record<string, boolean>

export type LiveStats = {
  wpm: number
  lastError: { mistyped_word: string; corrected_word: string; timestamp: number } | null
}

const SYM: Set<string> = new Set([
  'EQUALS',
  'MINUS',
  'SQUARE BRACKET OPEN',
  'SQUARE BRACKET CLOSE',
  'SEMICOLON',
  'QUOTE',
  'BACKSLASH',
  'COMMA',
  'DOT',
  'FORWARD SLASH',
  'BACKTICK'
])

function isPrintableKey(name: string): boolean {
  if (name.length === 1 && /[A-Z0-9]/.test(name)) return true
  if (name === 'SPACE') return true
  return SYM.has(name)
}

function letterChar(name: string, down: DownMap): string | null {
  if (name.length !== 1 || !/[A-Z]/.test(name)) return null
  const shift = !!(down['LEFT SHIFT'] || down['RIGHT SHIFT'])
  const caps = !!down['CAPS LOCK']
  const upper = shift !== caps
  return upper ? name : name.toLowerCase()
}

function symChar(name: string): string | null {
  const map: Record<string, string> = {
    EQUALS: '=',
    MINUS: '-',
    'SQUARE BRACKET OPEN': '[',
    'SQUARE BRACKET CLOSE': ']',
    SEMICOLON: ';',
    QUOTE: "'",
    BACKSLASH: '\\',
    COMMA: ',',
    DOT: '.',
    'FORWARD SLASH': '/',
    BACKTICK: '`'
  }
  return map[name] ?? null
}

export class TypingMonitor {
  private listener: GlobalKeyboardListener | null = null
  private charTimestamps: number[] = []
  private keyNamesBuffer: string[] = []
  private currentWord = ''
  private lastCompletedWord = ''
  private lastError: LiveStats['lastError'] = null
  private jsonlPath: string
  private correctionEvents = new Map<string, number[]>()
  private notifiedWords = new Map<string, number>()
  private wpmSamples: number[] = []
  private running = false

  constructor() {
    const base = app.getPath('userData')
    mkdirSync(base, { recursive: true })
    this.jsonlPath = join(base, 'typing-errors.jsonl')
  }

  start(): void {
    if (this.running) return
    this.running = true
    this.listener = new GlobalKeyboardListener({
      mac: { onError: (code) => console.error('[Typerr] key listener mac error', code) },
      windows: {
        onError: (code) => console.error('[Typerr] key listener windows error', code)
      }
    })

    this.listener.addListener((e, down) => {
      if (e.state !== 'DOWN' || !e.name) return
      this.pushKeyBuffer(e.name)
      this.handleKey(e.name, down)
    })
  }

  stop(): void {
    this.running = false
    this.listener?.kill()
    this.listener = null
  }

  getLiveStats(): LiveStats {
    const now = Date.now()
    this.charTimestamps = this.charTimestamps.filter((t) => now - t <= WINDOW_MS)
    const chars = this.charTimestamps.length
    const wordsInWindow = chars / CHARS_PER_WORD
    const wpm = Math.round(wordsInWindow)

    this.wpmSamples.push(wpm)
    if (this.wpmSamples.length > 120) this.wpmSamples.shift()

    return { wpm, lastError: this.lastError }
  }

  sessionAverageWpm(): number {
    if (this.wpmSamples.length === 0) return 0
    return Math.round(this.wpmSamples.reduce((a, b) => a + b, 0) / this.wpmSamples.length)
  }

  private pushKeyBuffer(name: string): void {
    this.keyNamesBuffer.push(name)
    if (this.keyNamesBuffer.length > KEY_BUFFER_MAX) {
      this.keyNamesBuffer.shift()
    }
  }

  private handleKey(name: string, down: DownMap): void {
    const now = Date.now()

    if (name === 'BACKSPACE') {
      this.onBackspace(now)
      return
    }

    if (name === 'SPACE' || name === 'RETURN' || name === 'TAB') {
      if ((name === 'SPACE' || name === 'RETURN') && this.currentWord.length > 0) {
        this.lastCompletedWord = this.currentWord
        this.currentWord = ''
      }
      if (name === 'SPACE') {
        this.charTimestamps.push(now)
      }
      return
    }

    if (!isPrintableKey(name)) return

    this.charTimestamps.push(now)

    const lc = letterChar(name, down)
    if (lc) {
      this.currentWord += lc
      return
    }
    if (/^[0-9]$/.test(name)) {
      this.currentWord += name
      return
    }
    const sc = symChar(name)
    if (sc) this.currentWord += sc
  }

  private onBackspace(now: number): void {
    const candidate = this.currentWord.length > 0 ? this.currentWord : this.lastCompletedWord
    if (candidate.length < 2) {
      if (this.currentWord.length > 0) {
        this.currentWord = this.currentWord.slice(0, -1)
      }
      return
    }

    const mistyped = candidate
    const corrected = ''
    this.lastError = {
      mistyped_word: mistyped,
      corrected_word: corrected,
      timestamp: now
    }

    insertError(mistyped, corrected || null, now)
    this.appendJsonl({ mistyped_word: mistyped, corrected_word: corrected, timestamp: now })

    if (this.currentWord.length > 0) {
      this.currentWord = this.currentWord.slice(0, -1)
    } else if (this.lastCompletedWord) {
      this.lastCompletedWord = this.lastCompletedWord.slice(0, -1)
    }

    this.trackCorrections(mistyped, now)
  }

  private appendJsonl(row: object): void {
    try {
      appendFileSync(this.jsonlPath, JSON.stringify(row) + '\n', 'utf8')
    } catch (e) {
      console.error('[Typerr] typing-errors jsonl', e)
    }
  }

  private trackCorrections(word: string, now: number): void {
    const key = word.toLowerCase()
    const hourAgo = now - 60 * 60 * 1000
    let arr = this.correctionEvents.get(key) ?? []
    arr = arr.filter((t) => t > hourAgo)
    arr.push(now)
    this.correctionEvents.set(key, arr)

    if (arr.length > 2) {
      const lastNotify = this.notifiedWords.get(key) ?? 0
      const hourMs = 60 * 60 * 1000
      if (lastNotify === 0 || now - lastNotify >= hourMs) {
        void this.maybeNotifyDefinition(word, key, now)
      }
    }
  }

  private async maybeNotifyDefinition(
    displayWord: string,
    key: string,
    now: number
  ): Promise<void> {
    this.notifiedWords.set(key, now)
    try {
      const res = await fetch(`${DICTIONARY_URL}${encodeURIComponent(key)}`)
      if (!res.ok) {
        this.showToast(
          displayWord,
          'Could not load a definition. Keep practicing this word locally.'
        )
        insertMasteredWord(
          key,
          'Definition unavailable',
          'Typerr will keep tracking corrections for this word.'
        )
        return
      }
      const data = (await res.json()) as Array<{
        meanings?: Array<{ definitions?: Array<{ definition?: string }> }>
      }>
      const def =
        data[0]?.meanings?.[0]?.definitions?.[0]?.definition ?? 'No short definition returned.'
      const tip = `Did you mean to type “${displayWord}” more carefully?`
      this.showToast(displayWord, `${def}\n\n${tip}`)
      insertMasteredWord(key, def, tip)
    } catch (e) {
      console.error('[Typerr] dictionary fetch', e)
      this.notifiedWords.delete(key)
    }
  }

  private showToast(word: string, body: string): void {
    if (!Notification.isSupported()) return
    new Notification({
      title: `Typerr — "${word}"`,
      body,
      silent: false
    }).show()
  }
}

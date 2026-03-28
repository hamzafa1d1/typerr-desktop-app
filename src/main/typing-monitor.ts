import { appendFileSync, chmodSync, existsSync, mkdirSync } from 'fs'
import { Notification, app } from 'electron'
import { GlobalKeyboardListener } from 'node-global-key-listener'
import { join } from 'path'
import { getMasteredWord, insertError, insertMasteredWord, insertSuggestion } from './db'
import { isDictionaryWord, normalizeWord, suggestWord } from './word-suggestions'
import type {
  TyperrFinger,
  TyperrHand,
  TyperrKeyboardInsights,
  TyperrKeyboardKeyStat
} from '../preload/typerr-types'

const CHARS_PER_WORD = 5
// Sliding window used to compute the current WPM when actively typing
const ACTIVE_WINDOW_MS = 15_000
// Require a short continuous typing burst before reporting a new live WPM
const MIN_ACTIVE_TYPING_MS = 2_000
// After this many ms of silence the user is considered idle and WPM returns to 0
const IDLE_THRESHOLD_MS = 3_000
const KEY_BUFFER_MAX = 20
const DICTIONARY_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en/'
const MIN_SUGGESTION_SCORE = 0.78
const KEY_SERVER_REL_PATHS: Partial<Record<NodeJS.Platform, string>> = {
  darwin: 'node_modules/node-global-key-listener/bin/MacKeyServer',
  linux: 'node_modules/node-global-key-listener/bin/X11KeyServer'
}

type DownMap = Record<string, boolean>
type KeyClass = { hand: TyperrHand; finger: TyperrFinger }

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

const UNKNOWN_KEY_CLASS: KeyClass = { hand: 'unknown', finger: 'unknown' }

const KEY_CLASS: Record<string, KeyClass> = {
  '1': { hand: 'left', finger: 'pinky' },
  '2': { hand: 'left', finger: 'ring' },
  '3': { hand: 'left', finger: 'middle' },
  '4': { hand: 'left', finger: 'index' },
  '5': { hand: 'left', finger: 'index' },
  '6': { hand: 'right', finger: 'index' },
  '7': { hand: 'right', finger: 'index' },
  '8': { hand: 'right', finger: 'middle' },
  '9': { hand: 'right', finger: 'ring' },
  '0': { hand: 'right', finger: 'pinky' },
  '-': { hand: 'right', finger: 'pinky' },
  '=': { hand: 'right', finger: 'pinky' },
  Q: { hand: 'left', finger: 'pinky' },
  W: { hand: 'left', finger: 'ring' },
  E: { hand: 'left', finger: 'middle' },
  R: { hand: 'left', finger: 'index' },
  T: { hand: 'left', finger: 'index' },
  Y: { hand: 'right', finger: 'index' },
  U: { hand: 'right', finger: 'index' },
  I: { hand: 'right', finger: 'middle' },
  O: { hand: 'right', finger: 'ring' },
  P: { hand: 'right', finger: 'pinky' },
  '[': { hand: 'right', finger: 'pinky' },
  ']': { hand: 'right', finger: 'pinky' },
  A: { hand: 'left', finger: 'pinky' },
  S: { hand: 'left', finger: 'ring' },
  D: { hand: 'left', finger: 'middle' },
  F: { hand: 'left', finger: 'index' },
  G: { hand: 'left', finger: 'index' },
  H: { hand: 'right', finger: 'index' },
  J: { hand: 'right', finger: 'index' },
  K: { hand: 'right', finger: 'middle' },
  L: { hand: 'right', finger: 'ring' },
  ';': { hand: 'right', finger: 'pinky' },
  "'": { hand: 'right', finger: 'pinky' },
  '\\': { hand: 'right', finger: 'pinky' },
  Z: { hand: 'left', finger: 'pinky' },
  X: { hand: 'left', finger: 'ring' },
  C: { hand: 'left', finger: 'middle' },
  V: { hand: 'left', finger: 'index' },
  B: { hand: 'left', finger: 'index' },
  N: { hand: 'right', finger: 'index' },
  M: { hand: 'right', finger: 'index' },
  ',': { hand: 'right', finger: 'middle' },
  '.': { hand: 'right', finger: 'ring' },
  '/': { hand: 'right', finger: 'pinky' },
  SPACE: { hand: 'thumb', finger: 'thumb' }
}

function keyClassFor(label: string): KeyClass {
  return KEY_CLASS[label] ?? UNKNOWN_KEY_CLASS
}

function keyLabelFromKeyName(name: string, down: DownMap): string | null {
  if (name === 'SPACE') return 'SPACE'
  const lc = letterChar(name, down)
  if (lc) return lc.toUpperCase()
  if (/^[0-9]$/.test(name)) return name
  const sc = symChar(name)
  if (sc) return sc
  return null
}

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
  private cachedDefinitions = new Set<string>()
  private keyPressCounts = new Map<string, number>()
  private keyMistakeCounts = new Map<string, number>()
  private wpmSamples: number[] = []
  private lastLiveWpm = 0
  private activeTypingStartedAt = 0
  private lastKeypressAt = 0
  private running = false

  constructor() {
    const base = app.getPath('userData')
    mkdirSync(base, { recursive: true })
    this.jsonlPath = join(base, 'typing-errors.jsonl')
  }

  start(): void {
    if (this.running) return
    this.ensurePlatformKeyServerExecutable()

    try {
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

      this.running = true
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('[Typerr] failed to start global keyboard listener', {
        platform: process.platform,
        message
      })
      this.listener = null
      this.running = false
    }
  }

  private ensurePlatformKeyServerExecutable(): void {
    const helperRelPath = KEY_SERVER_REL_PATHS[process.platform]
    if (!helperRelPath) return

    const helperPath = join(process.cwd(), helperRelPath)
    if (!existsSync(helperPath)) return

    try {
      chmodSync(helperPath, 0o755)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('[Typerr] failed to set key server executable bit', {
        helperPath,
        platform: process.platform,
        message
      })
    }
  }

  stop(): void {
    this.running = false
    this.listener?.kill()
    this.listener = null
  }

  getLiveStats(): LiveStats {
    const now = Date.now()

    // Purge timestamps older than the active window to keep the array bounded
    this.charTimestamps = this.charTimestamps.filter((t) => now - t <= ACTIVE_WINDOW_MS)

    // If the user is idle, keep the most recent active WPM instead of dropping to 0.
    // This reflects typing pace during active periods only.
    const idle = this.lastKeypressAt === 0 || now - this.lastKeypressAt > IDLE_THRESHOLD_MS
    if (idle) {
      this.activeTypingStartedAt = 0
      return { wpm: this.lastLiveWpm, lastError: this.lastError }
    }

    // Stabilize live WPM: require a short continuous typing burst before recalculating.
    if (this.activeTypingStartedAt === 0) {
      this.activeTypingStartedAt = this.lastKeypressAt
    }
    if (now - this.activeTypingStartedAt < MIN_ACTIVE_TYPING_MS) {
      return { wpm: this.lastLiveWpm, lastError: this.lastError }
    }

    // Scale chars-in-window to a per-minute rate
    const wpm = Math.round(
      (this.charTimestamps.length / CHARS_PER_WORD) * (60_000 / ACTIVE_WINDOW_MS)
    )

    this.lastLiveWpm = wpm
    this.wpmSamples.push(wpm)
    if (this.wpmSamples.length > 120) this.wpmSamples.shift()

    return { wpm, lastError: this.lastError }
  }

  sessionAverageWpm(): number {
    if (this.wpmSamples.length === 0) return 0
    return Math.round(this.wpmSamples.reduce((a, b) => a + b, 0) / this.wpmSamples.length)
  }

  getKeyboardInsights(): TyperrKeyboardInsights {
    const keys = new Set<string>([
      ...Array.from(this.keyPressCounts.keys()),
      ...Array.from(this.keyMistakeCounts.keys())
    ])

    let totalPresses = 0
    let totalMistakes = 0
    const handUsage = { left: 0, right: 0, thumb: 0 }

    const keyStats: TyperrKeyboardKeyStat[] = Array.from(keys).map((key) => {
      const presses = this.keyPressCounts.get(key) ?? 0
      const mistakes = this.keyMistakeCounts.get(key) ?? 0
      totalPresses += presses
      totalMistakes += mistakes

      const keyClass = keyClassFor(key)
      if (keyClass.hand === 'left') handUsage.left += presses
      if (keyClass.hand === 'right') handUsage.right += presses
      if (keyClass.hand === 'thumb') handUsage.thumb += presses

      return {
        key,
        presses,
        mistakes,
        errorRate: presses > 0 ? mistakes / presses : mistakes > 0 ? 1 : 0,
        hand: keyClass.hand,
        finger: keyClass.finger
      }
    })

    const topMistakeKeys = keyStats
      .filter((row) => row.mistakes > 0)
      .sort((a, b) => b.mistakes - a.mistakes || b.errorRate - a.errorRate)
      .slice(0, 8)

    const lrTotal = handUsage.left + handUsage.right
    const handBalanceScore =
      lrTotal === 0
        ? 100
        : Math.max(0, 100 - Math.round((Math.abs(handUsage.left - handUsage.right) / lrTotal) * 100))

    return {
      totalPresses,
      totalMistakes,
      handUsage,
      handBalanceScore,
      topMistakeKeys,
      keyStats
    }
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
      this.markTypingActivity(now)
      this.onBackspace(now)
      return
    }

    if (name === 'SPACE' || name === 'RETURN' || name === 'TAB') {
      if (this.currentWord.length > 0) {
        this.trackWordCandidate(this.currentWord, now)
      }
      if ((name === 'SPACE' || name === 'RETURN') && this.currentWord.length > 0) {
        this.lastCompletedWord = this.currentWord
        this.currentWord = ''
      }
      if (name === 'SPACE') {
        this.charTimestamps.push(now)
        this.recordKeyPress(name, down)
      }
      this.markTypingActivity(now)
      return
    }

    if (!isPrintableKey(name)) return

    this.charTimestamps.push(now)
    this.markTypingActivity(now)
    this.recordKeyPress(name, down)

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

  private markTypingActivity(now: number): void {
    if (this.lastKeypressAt === 0 || now - this.lastKeypressAt > IDLE_THRESHOLD_MS) {
      this.activeTypingStartedAt = now
    }
    this.lastKeypressAt = now
  }

  private recordKeyPress(name: string, down: DownMap): void {
    const key = keyLabelFromKeyName(name, down)
    if (!key) return
    const prev = this.keyPressCounts.get(key) ?? 0
    this.keyPressCounts.set(key, prev + 1)
  }

  private recordMistakeKeys(word: string): void {
    for (const ch of word.toUpperCase()) {
      if (!/^[A-Z]$/.test(ch)) continue
      const prev = this.keyMistakeCounts.get(ch) ?? 0
      this.keyMistakeCounts.set(ch, prev + 1)
    }
  }

  private trackWordCandidate(candidate: string, now: number): void {
    if (candidate.length < 2) return

    const normalized = normalizeWord(candidate)
    const corrected = ''
    const suggestion = normalized ? suggestWord(normalized) : null
    // Only track when:
    //  1. The word normalizes (letters-only, 3-20 chars)
    //  2. The mistyped word is NOT itself a valid English word (avoids tracking intentional edits)
    //  3. A high-confidence dictionary correction exists
    const shouldTrack =
      !!normalized &&
      !isDictionaryWord(normalized) &&
      !!suggestion &&
      suggestion.score >= MIN_SUGGESTION_SCORE

    if (!shouldTrack || !normalized || !suggestion) return

    this.lastError = {
      mistyped_word: normalized,
      corrected_word: corrected,
      timestamp: now
    }

    insertError(normalized, corrected || null, now)
    this.appendJsonl({ mistyped_word: normalized, corrected_word: corrected, timestamp: now })

    insertSuggestion(normalized, suggestion.suggested, suggestion.score, suggestion.method)
    void this.ensureDefinition(suggestion.suggested, normalized)

    this.recordMistakeKeys(normalized)
    this.trackCorrections(normalized, now)
  }

  private onBackspace(now: number): void {
    const candidate = this.currentWord.length > 0 ? this.currentWord : this.lastCompletedWord
    this.trackWordCandidate(candidate, now)

    if (this.currentWord.length > 0) {
      this.currentWord = this.currentWord.slice(0, -1)
    } else if (this.lastCompletedWord) {
      this.lastCompletedWord = this.lastCompletedWord.slice(0, -1)
    }
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
        meanings?: Array<{
          partOfSpeech?: string
          definitions?: Array<{ definition?: string; example?: string }>
        }>
      }>
      const meaning = data[0]?.meanings?.[0]
      const defEntry = meaning?.definitions?.[0]
      const def = defEntry?.definition ?? 'No short definition returned.'
      const partOfSpeech = meaning?.partOfSpeech ? ` (${meaning.partOfSpeech})` : ''
      const example = defEntry?.example ? `\nExample: “${defEntry.example}”` : ''
      const tip = `You keep correcting to “${displayWord}”${partOfSpeech}: ${def}${example}`
      this.showToast(displayWord, tip)
      insertMasteredWord(key, def, tip)
    } catch (e) {
      console.error('[Typerr] dictionary fetch', e)
      this.notifiedWords.delete(key)
    }
  }

  private async ensureDefinition(suggested: string, mistyped: string): Promise<void> {
    const key = suggested.toLowerCase()
    if (this.cachedDefinitions.has(key)) return
    if (getMasteredWord(key)) {
      this.cachedDefinitions.add(key)
      return
    }
    this.cachedDefinitions.add(key)
    try {
      const res = await fetch(`${DICTIONARY_URL}${encodeURIComponent(key)}`)
      if (!res.ok) return
      const data = (await res.json()) as Array<{
        meanings?: Array<{
          partOfSpeech?: string
          definitions?: Array<{ definition?: string; example?: string }>
        }>
      }>

      const entry = data[0]
      const meaning = entry?.meanings?.[0]
      const defEntry = meaning?.definitions?.[0]
      const def = defEntry?.definition ?? 'Definition unavailable.'
      const partOfSpeech = meaning?.partOfSpeech ? ` (${meaning.partOfSpeech})` : ''
      const example = defEntry?.example ? ` Example: "${defEntry.example}."` : ''
      const tip = `You typed "${mistyped}" — the correct word is "${key}"${partOfSpeech}.${example}`

      insertMasteredWord(key, def, tip)
    } catch (e) {
      console.error('[Typerr] dictionary fetch', e)
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

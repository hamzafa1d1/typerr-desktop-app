import { readFileSync } from 'fs'
import wordListPath from 'word-list'

const MAX_WORD_LENGTH = 20
const MIN_WORD_LENGTH = 3

let dictionaryLoaded = false
const buckets = new Map<string, string[]>()
const dictionaryWords = new Set<string>()

function bucketKey(prefix: string, length: number): string {
  return `${prefix}:${length}`
}

function loadDictionary(): void {
  if (dictionaryLoaded) return
  dictionaryLoaded = true

  const raw = readFileSync(wordListPath, 'utf8')
  const words = raw.split('\n')
  for (const word of words) {
    const w = word.trim().toLowerCase()
    if (w.length < MIN_WORD_LENGTH || w.length > MAX_WORD_LENGTH) continue
    if (!/^[a-z]+$/.test(w)) continue
    dictionaryWords.add(w)
    const prefix = w.slice(0, 1)
    const key = bucketKey(prefix, w.length)
    const list = buckets.get(key)
    if (list) {
      list.push(w)
    } else {
      buckets.set(key, [w])
    }
  }
}

function levenshtein(a: string, b: string, maxDist: number): number {
  const aLen = a.length
  const bLen = b.length
  if (Math.abs(aLen - bLen) > maxDist) return maxDist + 1

  const prev: number[] = new Array(bLen + 1)
  const curr: number[] = new Array(bLen + 1)

  for (let j = 0; j <= bLen; j += 1) prev[j] = j

  for (let i = 1; i <= aLen; i += 1) {
    curr[0] = i
    let rowMin = curr[0]
    const aChar = a.charCodeAt(i - 1)
    for (let j = 1; j <= bLen; j += 1) {
      const cost = aChar === b.charCodeAt(j - 1) ? 0 : 1
      const val = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost
      )
      curr[j] = val
      if (val < rowMin) rowMin = val
    }
    if (rowMin > maxDist) return maxDist + 1
    for (let j = 0; j <= bLen; j += 1) prev[j] = curr[j]
  }

  return prev[bLen]
}

export type SuggestionResult = {
  suggested: string
  score: number
  method: string
}

export function normalizeWord(word: string): string | null {
  const cleaned = word.trim().toLowerCase()
  if (cleaned.length < MIN_WORD_LENGTH || cleaned.length > MAX_WORD_LENGTH) return null
  if (!/^[a-z]+$/.test(cleaned)) return null
  return cleaned
}

export function isDictionaryWord(word: string): boolean {
  const cleaned = normalizeWord(word)
  if (!cleaned) return false
  loadDictionary()
  return dictionaryWords.has(cleaned)
}

export function suggestWord(mistyped: string): SuggestionResult | null {
  const cleaned = normalizeWord(mistyped)
  if (!cleaned) return null

  loadDictionary()

  const maxDist = cleaned.length >= 8 ? 3 : 2
  let best: SuggestionResult | null = null
  const prefix = cleaned.slice(0, 1)

  for (let len = cleaned.length - maxDist; len <= cleaned.length + maxDist; len += 1) {
    if (len < MIN_WORD_LENGTH || len > MAX_WORD_LENGTH) continue
    const list = buckets.get(bucketKey(prefix, len))
    if (!list) continue

    for (const candidate of list) {
      if (candidate === cleaned) continue
      const dist = levenshtein(cleaned, candidate, maxDist)
      if (dist > maxDist) continue

      const score = 1 - dist / Math.max(cleaned.length, candidate.length)
      if (!best || score > best.score) {
        best = { suggested: candidate, score, method: 'levenshtein' }
      }
    }
  }

  return best
}

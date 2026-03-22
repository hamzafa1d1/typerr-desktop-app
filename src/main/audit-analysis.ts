import { basename } from 'path'
import { getDb } from './db'
import type { AuditAnalysis, AuditAnalysisRequest, AuditSnapshot } from '../preload/typerr-types'

type ParsedInsight = {
  summary?: unknown
  strengths?: unknown
  risks?: unknown
  nextActions?: unknown
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string').slice(0, 5)
}

function extractJsonBlock(text: string): string | null {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i)
  if (fenced && fenced[1]) return fenced[1].trim()
  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) return text.slice(firstBrace, lastBrace + 1)
  return null
}

function collectSnapshot(): AuditSnapshot {
  const db = getDb()
  const sessions = db
    .prepare('SELECT average_wpm FROM sessions WHERE average_wpm IS NOT NULL ORDER BY id DESC LIMIT 50')
    .all() as Array<{ average_wpm: number }>

  const hourAgo = Date.now() - 60 * 60 * 1000
  const correctionsLastHourRow = db
    .prepare('SELECT COUNT(*) as count FROM errors WHERE timestamp >= ?')
    .get(hourAgo) as { count: number }

  const topMistypedWords = db
    .prepare(
      `SELECT LOWER(mistyped_word) as word, COUNT(*) as count
       FROM errors
       WHERE LENGTH(TRIM(mistyped_word)) > 0
       GROUP BY LOWER(mistyped_word)
       ORDER BY count DESC
       LIMIT 5`
    )
    .all() as Array<{ word: string; count: number }>

  const uniqueMistypedRow = db
    .prepare('SELECT COUNT(DISTINCT LOWER(mistyped_word)) as count FROM errors')
    .get() as { count: number }

  const masteredWordsRow = db
    .prepare('SELECT COUNT(*) as count FROM mastered_words')
    .get() as { count: number }

  const avgSessionWpm =
    sessions.length === 0
      ? 0
      : Number((sessions.reduce((sum, row) => sum + row.average_wpm, 0) / sessions.length).toFixed(1))

  return {
    sessionsTracked: sessions.length,
    avgSessionWpm,
    correctionsLastHour: Number(correctionsLastHourRow.count || 0),
    uniqueMistypedWords: Number(uniqueMistypedRow.count || 0),
    topMistypedWords,
    masteredWordsCount: Number(masteredWordsRow.count || 0)
  }
}

function heuristicAnalysis(snapshot: AuditSnapshot, model: string): AuditAnalysis {
  const topWord = snapshot.topMistypedWords[0]?.word
  const strengths: string[] = []
  const risks: string[] = []
  const nextActions: string[] = []

  if (snapshot.avgSessionWpm >= 45) strengths.push('Strong pace trend across recent sessions.')
  if (snapshot.correctionsLastHour <= 2)
    strengths.push('Low correction volume in the last hour indicates clean output.')
  if (snapshot.masteredWordsCount > 0)
    strengths.push('You are accumulating mastered words, showing targeted learning.')

  if (snapshot.correctionsLastHour >= 5)
    risks.push('Correction bursts are high, likely reducing sustained flow.')
  if (snapshot.avgSessionWpm > 0 && snapshot.avgSessionWpm < 25)
    risks.push('Average pace is still low for fluent typing sessions.')
  if (snapshot.uniqueMistypedWords >= 20)
    risks.push('Error spread is broad, suggesting inconsistent finger patterns.')

  if (topWord) {
    nextActions.push(`Run a 3-minute focused drill on "${topWord}" and adjacent key patterns.`)
  }
  nextActions.push('Do two 90-second blocks at 90% pace and aim to avoid backspace bursts.')
  nextActions.push('Review corrections every 15 minutes and build a shortlist of repeat mistakes.')

  const summary =
    snapshot.sessionsTracked === 0
      ? 'Not enough session history yet. Keep typing for a few minutes to build a useful audit baseline.'
      : `Based on ${snapshot.sessionsTracked} recent sessions, your average pace is ${snapshot.avgSessionWpm} WPM with ${snapshot.correctionsLastHour} corrections in the last hour.`

  return {
    summary,
    strengths: strengths.length > 0 ? strengths : ['Typing data collection is active and ready for trend analysis.'],
    risks: risks.length > 0 ? risks : ['No major risk spike detected in the current snapshot.'],
    nextActions,
    generatedBy: 'heuristic',
    model,
    snapshot
  }
}

async function llmAnalysis(
  snapshot: AuditSnapshot,
  request: AuditAnalysisRequest | undefined,
  modelPath: string
): Promise<AuditAnalysis | null> {
  try {
    const llamaModule = (await import('node-llama-cpp')) as Record<string, unknown>
    const getLlama = llamaModule['getLlama'] as
      | undefined
      | (() => Promise<{ loadModel: (args: { modelPath: string }) => Promise<unknown> }>)
    const LlamaChatSession = llamaModule['LlamaChatSession'] as
      | undefined
      | (new (args: { contextSequence: unknown }) => { prompt: (text: string) => Promise<string> })

    if (!getLlama || !LlamaChatSession) {
      return null
    }

    const llama = await getLlama()
    const model = (await llama.loadModel({ modelPath })) as {
      createContext?: () => Promise<{ getSequence?: () => unknown }>
    }

    if (!model.createContext) {
      return null
    }

    const context = await model.createContext()
    const getSequence = context.getSequence
    if (!getSequence) {
      return null
    }

    const session = new LlamaChatSession({ contextSequence: getSequence.call(context) })

    const prompt = `You are an expert typing coach. Analyze this JSON snapshot and return STRICT JSON only with keys: summary (string), strengths (string[]), risks (string[]), nextActions (string[]). Keep output concise and practical. Optional focus: ${request?.focus || 'none'}\n\nSnapshot:\n${JSON.stringify(snapshot, null, 2)}`

    const response = await session.prompt(prompt)
    const json = extractJsonBlock(response)
    if (!json) return null

    const parsed = JSON.parse(json) as ParsedInsight
    const summary = typeof parsed.summary === 'string' ? parsed.summary : ''
    const strengths = toStringArray(parsed.strengths)
    const risks = toStringArray(parsed.risks)
    const nextActions = toStringArray(parsed.nextActions)

    if (!summary || strengths.length === 0 || risks.length === 0 || nextActions.length === 0) {
      return null
    }

    return {
      summary,
      strengths,
      risks,
      nextActions,
      generatedBy: 'local-llm',
      model: basename(modelPath),
      snapshot
    }
  } catch (error) {
    console.error('[Typerr] local llm analysis failed', error)
    return null
  }
}

export async function analyzeAudit(
  request?: AuditAnalysisRequest
): Promise<AuditAnalysis> {
  const snapshot = collectSnapshot()
  const modelPath = process.env['TYPERR_LLM_MODEL']

  if (!modelPath) {
    return heuristicAnalysis(snapshot, 'heuristic:no-model-configured')
  }

  const llmResult = await llmAnalysis(snapshot, request, modelPath)
  if (llmResult) {
    return llmResult
  }

  return heuristicAnalysis(snapshot, `heuristic:fallback:${basename(modelPath)}`)
}

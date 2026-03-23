import { GoogleGenAI } from '@google/genai'
import { getDb, topSuggestions } from './db'
import type { AuditAnalysis, AuditAnalysisRequest, AuditSnapshot } from '../preload/typerr-types'

type ParsedInsight = {
  summary?: unknown
  strengths?: unknown
  risks?: unknown
  nextActions?: unknown
}

function toStringArray(value: unknown, max = 5): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string').slice(0, max)
}

function collectSnapshot(): AuditSnapshot {
  const db = getDb()

  const sessions = db
    .prepare('SELECT average_wpm FROM sessions WHERE average_wpm IS NOT NULL ORDER BY id DESC LIMIT 50')
    .all() as Array<{ average_wpm: number }>

  // Determine whether the errors.timestamp column stores ms or seconds.
  // We sample one row and check the magnitude — ms timestamps are ~13 digits, s are ~10.
  const sampleRow = db.prepare('SELECT timestamp FROM errors ORDER BY id DESC LIMIT 1').get() as
    | { timestamp: number }
    | undefined
  const timestampIsMs = sampleRow ? sampleRow.timestamp > 1e12 : true
  const hourAgo = timestampIsMs ? Date.now() - 60 * 60 * 1000 : Math.floor(Date.now() / 1000) - 3600

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
    masteredWordsCount: Number(masteredWordsRow.count || 0),
    suggestedCorrections: topSuggestions(6)
  }
}

async function llmAnalysis(
  snapshot: AuditSnapshot,
  request: AuditAnalysisRequest | undefined,
  apiKey: string,
  modelName: string
): Promise<AuditAnalysis> {
  console.info('[Typerr] gemini request: start', {
    modelName,
    focus: request?.focus ?? 'none',
    snapshotSummary: {
      sessionsTracked: snapshot.sessionsTracked,
      avgSessionWpm: snapshot.avgSessionWpm,
      correctionsLastHour: snapshot.correctionsLastHour,
      uniqueMistypedWords: snapshot.uniqueMistypedWords,
      masteredWordsCount: snapshot.masteredWordsCount,
      topMistypedWordsCount: snapshot.topMistypedWords.length
    }
  })

  const prompt = [
    'You are an expert typing coach.',
    'Analyze the JSON snapshot below and return a structured response.',
    'Write directly to the user. Do not use phrases like "user said" or quote the user.',
    `Optional focus: ${request?.focus ?? 'none'}`,
    '',
    'Snapshot:',
    JSON.stringify(snapshot, null, 2)
  ].join('\n')

  const responseSchema = {
    type: 'object',
    description: 'Typing audit analysis results.',
    properties: {
      summary: {
        type: 'string',
        description: 'Concise summary of the typing snapshot.'
      },
      strengths: {
        type: 'array',
        description: 'Key strengths detected in the snapshot.',
        items: { type: 'string' },
        minItems: 1,
        maxItems: 5
      },
      risks: {
        type: 'array',
        description: 'Risks or issues to address next.',
        items: { type: 'string' },
        minItems: 1,
        maxItems: 5
      },
      nextActions: {
        type: 'array',
        description: 'Actionable steps to improve typing.',
        items: { type: 'string' },
        minItems: 1,
        maxItems: 5
      }
    },
    required: ['summary', 'strengths', 'risks', 'nextActions'],
    additionalProperties: false,
    propertyOrdering: ['summary', 'strengths', 'risks', 'nextActions']
  }

  const client = new GoogleGenAI({ apiKey })
  console.info('[Typerr] gemini request: sending', {
    promptLength: prompt.length,
    schemaKeys: Object.keys(responseSchema.properties ?? {})
  })

  const startedAt = Date.now()
  const response = await client.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: responseSchema
    }
  })
  const durationMs = Date.now() - startedAt
  console.info('[Typerr] gemini request: response received', {
    durationMs,
    hasText: Boolean(response.text),
    textLength: response.text?.length ?? 0
  })

  if (!response.text) {
    throw new Error('Gemini response missing text.')
  }

  let parsed: ParsedInsight
  try {
    parsed = JSON.parse(response.text) as ParsedInsight
  } catch (error) {
    console.error('[Typerr] gemini response json parse failed', {
      sample: response.text.slice(0, 500)
    })
    throw new Error(`Gemini response was not valid JSON: ${response.text.slice(0, 500)}`)
  }

  const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : ''
  const strengths = toStringArray(parsed.strengths)
  const risks = toStringArray(parsed.risks)
  const nextActions = toStringArray(parsed.nextActions)

  const missing: string[] = []
  if (!summary) missing.push('summary')
  if (strengths.length === 0) missing.push('strengths')
  if (risks.length === 0) missing.push('risks')
  if (nextActions.length === 0) missing.push('nextActions')

  if (missing.length > 0) {
    throw new Error(`Gemini JSON missing required fields: ${missing.join(', ')}`)
  }

  return {
    summary,
    strengths,
    risks,
    nextActions,
    generatedBy: 'gemini-api',
    model: modelName,
    snapshot
  }
}

export async function analyzeAudit(request?: AuditAnalysisRequest): Promise<AuditAnalysis> {
  const snapshot = collectSnapshot()
  const apiKey = process.env['TYPERR_GEMINI_API_KEY']
  const modelName = process.env['TYPERR_GEMINI_MODEL'] ?? 'gemini-2.5-flash-lite'

  if (!apiKey) {
    throw new Error('Gemini API key missing. Set TYPERR_GEMINI_API_KEY to enable analysis.')
  }

  try {
    return await llmAnalysis(snapshot, request, apiKey, modelName)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[Typerr] gemini analysis failed:', error)
    throw new Error(`Gemini analysis failed: ${message}`)
  }
}
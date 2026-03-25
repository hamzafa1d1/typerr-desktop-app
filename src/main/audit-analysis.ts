import { GoogleGenAI } from '@google/genai'
import { getDb, topMistakeDetails } from './db'
import type {
  AuditAnalysis,
  AuditAnalysisRequest,
  AuditSnapshot,
  ChecklistAction,
  DrillWord,
  SessionMission
} from '../preload/typerr-types'

type ParsedInsight = {
  summary?: unknown
  sessionMission?: unknown
  strengths?: unknown
  risks?: unknown
  nextActions?: unknown
  drillWords?: unknown
  improvementHighlights?: unknown
}

function toStringArray(value: unknown, max = 5): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string').slice(0, max)
}

function toActionArray(value: unknown, max = 5): ChecklistAction[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => ({
      action: typeof item['action'] === 'string' ? item['action'] : '',
      durationMinutes: typeof item['durationMinutes'] === 'number' ? item['durationMinutes'] : 2
    }))
    .filter((item) => item.action.length > 0)
    .slice(0, max)
}

function toDrillWordArray(value: unknown, max = 5): DrillWord[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => ({
      word: typeof item['word'] === 'string' ? item['word'] : '',
      hint: typeof item['hint'] === 'string' ? item['hint'] : ''
    }))
    .filter((item) => item.word.length > 0)
    .slice(0, max)
}

function toSessionMission(value: unknown): SessionMission | null {
  if (typeof value !== 'object' || value === null) return null
  const v = value as Record<string, unknown>
  const title = typeof v['title'] === 'string' ? v['title'].trim() : ''
  const objective = typeof v['objective'] === 'string' ? v['objective'].trim() : ''
  const targetMetric = typeof v['targetMetric'] === 'string' ? v['targetMetric'].trim() : ''
  if (!title || !objective) return null
  return { title, objective, targetMetric: targetMetric || 'See objective above' }
}

function collectSnapshot(): AuditSnapshot {
  const db = getDb()

  const sessions = db
    .prepare('SELECT average_wpm FROM sessions WHERE average_wpm IS NOT NULL ORDER BY id DESC LIMIT 50')
    .all() as Array<{ average_wpm: number }>

  const sampleRow = db.prepare('SELECT timestamp FROM errors ORDER BY id DESC LIMIT 1').get() as
    | { timestamp: number }
    | undefined
  const timestampIsMs = sampleRow ? sampleRow.timestamp > 1e12 : true
  const hourAgo = timestampIsMs ? Date.now() - 60 * 60 * 1000 : Math.floor(Date.now() / 1000) - 3600

  const correctionsLastHourRow = db
    .prepare('SELECT COUNT(*) as count FROM errors WHERE timestamp >= ?')
    .get(hourAgo) as { count: number }

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
    masteredWordsCount: Number(masteredWordsRow.count || 0),
    topMistakeDetails: topMistakeDetails(8)
  }
}

async function llmAnalysis(
  snapshot: AuditSnapshot,
  request: AuditAnalysisRequest | undefined,
  apiKey: string,
  modelName: string
): Promise<AuditAnalysis> {
  const hasPreviousSnapshot = Boolean(request?.previousSnapshot)

  console.info('[Typerr] gemini request: start', {
    modelName,
    focus: request?.focus ?? 'none',
    hasPreviousSnapshot,
    snapshotSummary: {
      sessionsTracked: snapshot.sessionsTracked,
      avgSessionWpm: snapshot.avgSessionWpm,
      correctionsLastHour: snapshot.correctionsLastHour,
      uniqueMistypedWords: snapshot.uniqueMistypedWords,
      masteredWordsCount: snapshot.masteredWordsCount,
      topMistakeDetailsCount: snapshot.topMistakeDetails.length
    }
  })

  const improvementSection = hasPreviousSnapshot
    ? [
        '',
        'Previous snapshot (from the user\'s last report):',
        JSON.stringify(request!.previousSnapshot, null, 2),
        '',
        'Compare the two snapshots and fill improvementHighlights with 2-4 specific, measurable improvements.',
        'Examples: "WPM up from 42 → 48", "Corrections dropped by 5 in the last hour", "3 new words mastered".',
        'Only mention genuine improvements. If nothing improved, return an empty array.'
      ]
    : ['', 'No previous snapshot available. Return an empty array for improvementHighlights.']

  const prompt = [
    'You are an expert typing coach.',
    'Analyze the JSON snapshot below and return a fully structured response.',
    'Write directly to the user ("you", not "the user"). Do not quote raw numbers verbatim — interpret them.',
    `Optional focus: ${request?.focus ?? 'none'}`,
    '',
    'Current snapshot:',
    JSON.stringify(snapshot, null, 2),
    ...improvementSection,
    '',
    'Key instructions:',
    '- topMistakeDetails contains real typos the user makes. Each entry has the mistyped word, the correct word,',
    '  a dictionary definition of the correct word, and a contextual tip. Use this to give highly specific advice.',
    '- For sessionMission: base the challenge directly on the top recurring mistakes. Be concrete and measurable.',
    '- For drillWords: pull words from topMistakeDetails.suggested_word. Use the tip field to craft the hint.',
    '  If topMistakeDetails is empty, pick 3-5 common English words that match the correction patterns.',
    '- For nextActions: reference specific words from the mistakes list. Give realistic time estimates.',
    '- For strengths/risks: derive them from patterns in the mistakes, WPM trend, and correction rate.',
    '- Keep all text concise. Avoid generic advice that could apply to any typist.'
  ].join('\n')

  const responseSchema = {
    type: 'object',
    description: 'Typing audit analysis results.',
    properties: {
      summary: {
        type: 'string',
        description: 'Concise 2-3 sentence summary of the typing snapshot written directly to the user.'
      },
      sessionMission: {
        type: 'object',
        description: 'A single focused challenge for this session based on the user\'s biggest weakness.',
        properties: {
          title: {
            type: 'string',
            description: 'Short challenge title, max 6 words. E.g. "Zero Corrections for 5 Minutes".'
          },
          objective: {
            type: 'string',
            description: 'One sentence describing exactly what to do this session.'
          },
          targetMetric: {
            type: 'string',
            description: 'Specific measurable target. E.g. "< 1 correction/min for 5 minutes".'
          }
        },
        required: ['title', 'objective', 'targetMetric']
      },
      improvementHighlights: {
        type: 'array',
        description: 'Specific improvements vs the previous snapshot. Empty array if no previous snapshot.',
        items: { type: 'string' },
        maxItems: 4
      },
      strengths: {
        type: 'array',
        description: 'Key strengths detected in the snapshot.',
        items: { type: 'string' },
        minItems: 1,
        maxItems: 4
      },
      risks: {
        type: 'array',
        description: 'Risks or issues to address next.',
        items: { type: 'string' },
        minItems: 1,
        maxItems: 4
      },
      drillWords: {
        type: 'array',
        description: '3-5 specific words the user should practice this session.',
        items: {
          type: 'object',
          properties: {
            word: { type: 'string', description: 'The word to practice.' },
            hint: { type: 'string', description: 'Short memory tip for typing it correctly, max 10 words.' }
          },
          required: ['word', 'hint']
        },
        minItems: 1,
        maxItems: 5
      },
      nextActions: {
        type: 'array',
        description: '3-5 actionable steps to improve typing with estimated durations.',
        items: {
          type: 'object',
          properties: {
            action: { type: 'string', description: 'The actionable step.' },
            durationMinutes: { type: 'number', description: 'Realistic estimated time in minutes (1-15).' }
          },
          required: ['action', 'durationMinutes']
        },
        minItems: 1,
        maxItems: 5
      }
    },
    required: ['summary', 'sessionMission', 'improvementHighlights', 'strengths', 'risks', 'drillWords', 'nextActions'],
    additionalProperties: false,
    propertyOrdering: ['summary', 'sessionMission', 'improvementHighlights', 'strengths', 'risks', 'drillWords', 'nextActions']
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
  const sessionMission = toSessionMission(parsed.sessionMission)
  const strengths = toStringArray(parsed.strengths, 4)
  const risks = toStringArray(parsed.risks, 4)
  const nextActions = toActionArray(parsed.nextActions)
  const drillWords = toDrillWordArray(parsed.drillWords)
  const improvementHighlights = toStringArray(parsed.improvementHighlights, 4)

  const missing: string[] = []
  if (!summary) missing.push('summary')
  if (!sessionMission) missing.push('sessionMission')
  if (strengths.length === 0) missing.push('strengths')
  if (risks.length === 0) missing.push('risks')
  if (nextActions.length === 0) missing.push('nextActions')
  if (drillWords.length === 0) missing.push('drillWords')

  if (missing.length > 0) {
    throw new Error(`Gemini JSON missing required fields: ${missing.join(', ')}`)
  }

  return {
    summary,
    sessionMission: sessionMission!,
    strengths,
    risks,
    nextActions,
    drillWords,
    improvementHighlights,
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

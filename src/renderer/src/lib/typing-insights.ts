import type { TyperrErrorRow, TyperrStatsPayload } from '../../../preload/typerr-types'

export type KpiTone = 'neutral' | 'good' | 'warn'

export type TypingKpi = {
  label: string
  value: string
  hint: string
  tone: KpiTone
}

export type ImprovementFocus = {
  title: string
  reason: string
  tips: string[]
}

function average(values: number[]): number {
  if (values.length === 0) return 0
  const total = values.reduce((sum, item) => sum + item, 0)
  return total / values.length
}

function variance(values: number[]): number {
  if (values.length <= 1) return 0
  const avg = average(values)
  return average(values.map((value) => (value - avg) ** 2))
}

function correctionsInWindow(recentErrors: TyperrErrorRow[], now: number, ms: number): number {
  return recentErrors.filter((row) => now - row.timestamp <= ms).length
}

export function buildTypingKpis(
  stats: TyperrStatsPayload,
  wpmHistory: number[],
  lastStatsAt: number | null
): TypingKpi[] {
  const now = Date.now()
  const correctionBursts = correctionsInWindow(stats.recentErrors, now, 60_000)
  const rhythmVariance = variance(wpmHistory)
  const rhythmState =
    rhythmVariance < 12 ? 'steady' : rhythmVariance < 35 ? 'fluctuating' : 'unstable'

  const online = lastStatsAt !== null && now - lastStatsAt <= 4_500

  return [
    {
      label: 'Typing Pace',
      value: `${stats.wpm} WPM`,
      hint: 'Current rolling pace',
      tone: stats.wpm >= 45 ? 'good' : stats.wpm < 25 ? 'warn' : 'neutral'
    },
    {
      label: 'Rhythm',
      value: rhythmState,
      hint: 'Based on the last updates',
      tone: rhythmState === 'steady' ? 'good' : rhythmState === 'unstable' ? 'warn' : 'neutral'
    },
    {
      label: 'Corrections / min',
      value: String(correctionBursts),
      hint: 'Recent backspace-driven edits',
      tone: correctionBursts >= 3 ? 'warn' : correctionBursts === 0 ? 'good' : 'neutral'
    },
    {
      label: 'Tracking Status',
      value: online ? 'Live' : 'Stale',
      hint: online ? 'Incoming updates active' : 'No update for >4.5s',
      tone: online ? 'good' : 'warn'
    }
  ]
}

export function buildImprovementFocus(
  stats: TyperrStatsPayload,
  wpmHistory: number[]
): ImprovementFocus {
  const now = Date.now()
  const correctionBursts = correctionsInWindow(stats.recentErrors, now, 60_000)
  const rhythmVariance = variance(wpmHistory)

  if (correctionBursts >= 3) {
    return {
      title: 'Prioritize Accuracy',
      reason: 'You are correcting frequently in the last minute, which usually slows progress.',
      tips: [
        'Reduce pace by 10-15% for two minutes and aim for clean words.',
        'Keep eyes 2-3 words ahead to lower reactive backspacing.',
        'Use short bursts of 30 seconds where backspace is avoided intentionally.'
      ]
    }
  }

  if (stats.wpm < 25) {
    return {
      title: 'Build Baseline Speed',
      reason: 'Current pace suggests you are still warming up or typing cautiously.',
      tips: [
        'Do one 3-minute block at a constant moderate rhythm.',
        'Focus on smooth hand movement instead of pressing harder.',
        'Measure pace after each minute and keep variance low.'
      ]
    }
  }

  if (rhythmVariance > 35) {
    return {
      title: 'Stabilize Rhythm',
      reason: 'Your speed changes sharply between updates.',
      tips: [
        'Use breathing cadence: inhale for two words, exhale for two words.',
        'Avoid sprinting at sentence starts; keep an even opening pace.',
        'Practice with punctuation-heavy text to control tempo shifts.'
      ]
    }
  }

  return {
    title: 'Maintain Momentum',
    reason: 'Your current pace and correction behavior look balanced.',
    tips: [
      'Increase target pace by 2-3 WPM every few minutes.',
      'Keep wrists relaxed and shoulders neutral to avoid fatigue.',
      'Review corrected words at the end of session for targeted drills.'
    ]
  }
}

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Target,
  TrendingUp,
  Check,
  Square
} from 'lucide-react'
import type {
  AuditAnalysis,
  TyperrErrorRow,
  TyperrMistakeDetailRow
} from '../../../../preload/typerr-types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type FeedbackHubCardProps = {
  analysis: AuditAnalysis | null
  loading: boolean
  error: string | null
  onAnalyze: () => void
  rows: TyperrErrorRow[]
  lastError: TyperrErrorRow | null
  mistakeDetails: TyperrMistakeDetailRow[]
}

export function FeedbackHubCard({
  analysis,
  loading,
  error,
  onAnalyze,
  rows,
  lastError,
  mistakeDetails
}: FeedbackHubCardProps): React.JSX.Element {
  // Checklist state — resets when new analysis arrives
  const [checkedActions, setCheckedActions] = useState<Set<number>>(new Set())
  const [practicedWords, setPracticedWords] = useState<Set<number>>(new Set())

  useEffect(() => {
    setCheckedActions(new Set())
    setPracticedWords(new Set())
  }, [analysis])

  const toggleAction = (idx: number): void => {
    setCheckedActions((prev) => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return next
    })
  }

  const toggleDrillWord = (idx: number): void => {
    setPracticedWords((prev) => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return next
    })
  }

  const allActionsChecked =
    analysis !== null &&
    analysis.nextActions.length > 0 &&
    checkedActions.size === analysis.nextActions.length

  return (
    <Card className="w-full border-border/60 bg-card/70 backdrop-blur-md">
      <CardHeader className="flex flex-wrap items-center justify-between gap-3 pb-3">
        <div>
          <CardTitle>Feedback Hub</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Mistake patterns and AI-powered coaching.
          </p>
        </div>
        <Button onClick={onAnalyze} disabled={loading} size="sm" className="gap-2 shrink-0">
          {loading ? (
            <span className="relative inline-flex h-4 w-4 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#34d399,#2dd4bf,#38bdf8,#34d399)] animate-spin" />
              <span className="absolute inset-[2px] rounded-full bg-primary" />
            </span>
          ) : (
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
          )}
          {loading ? 'Analysing…' : analysis ? 'Re-run Report' : 'Generate Report'}
        </Button>
      </CardHeader>

      <CardContent className="space-y-5 pb-5">

        {/* ── Live stats ──────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md border border-border/60 bg-muted/40 px-3 py-2.5">
            <p className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">Recent Corrections</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-foreground">{rows.length}</p>
          </div>
          <div className="rounded-md border border-border/60 bg-muted/40 px-3 py-2.5">
            <p className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">Latest Mistype</p>
            <p className="mt-1 text-sm font-semibold text-foreground truncate">
              {lastError?.mistyped_word ?? '—'}
            </p>
          </div>
        </div>

        {/* ── Top mistakes ────────────────────────────────── */}
        <div>
          <p className="mb-2 text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
            Top Mistakes
          </p>
          {mistakeDetails.length === 0 ? (
            <p className="text-sm text-muted-foreground">No consistent typo pattern detected yet.</p>
          ) : (
            <div className="space-y-2">
              {mistakeDetails.map((item) => (
                <div
                  key={`${item.mistyped_word}-${item.suggested_word}`}
                  className="rounded-md border border-border/60 bg-muted/30 px-3 py-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
                      <span className="truncate text-rose-400">{item.mistyped_word}</span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={2} />
                      <span className="truncate text-teal-400">{item.suggested_word}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                      <span>{Math.round(item.score * 100)}% match</span>
                      <span className="rounded-full bg-muted px-1.5 py-0.5 font-medium">×{item.count}</span>
                    </div>
                  </div>
                  {item.definition ? (
                    <p className="mt-1.5 text-xs text-muted-foreground leading-snug">{item.definition}</p>
                  ) : null}
                  {item.tip ? (
                    <p className="mt-1 text-xs text-muted-foreground/70 leading-snug italic">{item.tip}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Divider ─────────────────────────────────────── */}
        <div className="border-t border-border/40" />

        {/* ── AI Report ───────────────────────────────────── */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" strokeWidth={2} />
            <p className="text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
              AI Report
            </p>
          </div>

          {error ? (
            <p className="mb-3 rounded-md border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          ) : null}

          <AnimatePresence mode="wait">
            {loading ? (
              /* ── Skeleton ── */
              <motion.div
                key="skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                {[90, 70, 80, 55, 65].map((w) => (
                  <div
                    key={w}
                    className="h-3 rounded-full bg-muted/60 animate-pulse"
                    style={{ width: `${w}%` }}
                  />
                ))}
              </motion.div>

            ) : analysis ? (
              /* ── Full report ── */
              <motion.div
                key="analysis"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="space-y-5"
              >
                {/* Session Mission */}
                <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-indigo-400" strokeWidth={2} />
                    <span className="text-[0.65rem] uppercase tracking-[0.2em] font-semibold text-indigo-400">
                      Session Mission
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-foreground leading-tight">
                    {analysis.sessionMission.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                    {analysis.sessionMission.objective}
                  </p>
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-indigo-500/25 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-400">
                    <Target className="h-3 w-3" strokeWidth={2.5} />
                    {analysis.sessionMission.targetMetric}
                  </div>
                </div>

                {/* Improvement highlights */}
                {analysis.improvementHighlights.length > 0 && (
                  <div className="rounded-md border border-teal-500/25 bg-teal-500/5 px-4 py-3">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-3.5 w-3.5 text-teal-500" strokeWidth={2} />
                      <span className="text-[0.65rem] uppercase tracking-[0.2em] font-semibold text-teal-500">
                        Progress since last report
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {analysis.improvementHighlights.map((h) => (
                        <li key={h} className="flex items-start gap-2 text-xs text-foreground/80">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Summary */}
                <p className="text-sm leading-relaxed text-foreground/85">{analysis.summary}</p>

                {/* Strengths + Risks */}
                {(analysis.strengths.length > 0 || analysis.risks.length > 0) && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {analysis.strengths.length > 0 && (
                      <div className="rounded-md border border-teal-500/20 bg-teal-500/5 px-3 py-2.5 space-y-2">
                        <p className="text-[0.65rem] uppercase tracking-[0.2em] text-teal-500 font-semibold">Strengths</p>
                        <ul className="space-y-1.5">
                          {analysis.strengths.map((s) => (
                            <li key={s} className="flex items-start gap-2 text-xs text-foreground/80">
                              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-500" strokeWidth={2} />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {analysis.risks.length > 0 && (
                      <div className="rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 space-y-2">
                        <p className="text-[0.65rem] uppercase tracking-[0.2em] text-amber-500 font-semibold">Risks</p>
                        <ul className="space-y-1.5">
                          {analysis.risks.map((r) => (
                            <li key={r} className="flex items-start gap-2 text-xs text-foreground/80">
                              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" strokeWidth={2} />
                              {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Drill words */}
                {analysis.drillWords.length > 0 && (
                  <div>
                    <p className="mb-2 text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
                      Drill Words — tap to mark practiced
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {analysis.drillWords.map((dw, idx) => {
                        const done = practicedWords.has(idx)
                        return (
                          <button
                            key={dw.word}
                            onClick={() => toggleDrillWord(idx)}
                            className={`rounded-md border text-left px-3 py-2.5 transition-all duration-200 ${
                              done
                                ? 'border-teal-500/30 bg-teal-500/8 opacity-70'
                                : 'border-border/60 bg-muted/30 hover:bg-muted/50'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-sm font-semibold ${done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                {dw.word}
                              </span>
                              {done
                                ? <CheckCircle2 className="h-3.5 w-3.5 text-teal-500" strokeWidth={2} />
                                : <Square className="h-3.5 w-3.5 text-muted-foreground/40" strokeWidth={1.5} />
                              }
                            </div>
                            <p className="text-[0.65rem] text-muted-foreground leading-snug">{dw.hint}</p>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Action checklist */}
                {analysis.nextActions.length > 0 && (
                  <div>
                    <p className="mb-2 text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
                      Action Checklist
                    </p>
                    <ul className="space-y-2">
                      {analysis.nextActions.map((item, idx) => {
                        const done = checkedActions.has(idx)
                        return (
                          <li
                            key={item.action}
                            onClick={() => toggleAction(idx)}
                            className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 transition-all duration-200 ${
                              done
                                ? 'border-teal-500/20 bg-teal-500/5 opacity-60'
                                : 'border-border/60 bg-muted/30 hover:bg-muted/50'
                            }`}
                          >
                            <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                              done ? 'border-teal-500 bg-teal-500' : 'border-border'
                            }`}>
                              {done && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                            </div>
                            <span className={`flex-1 text-sm leading-snug ${done ? 'line-through text-muted-foreground' : 'text-foreground/85'}`}>
                              {item.action}
                            </span>
                            <span className="shrink-0 self-center rounded-full bg-muted px-2 py-0.5 text-[0.6rem] font-medium text-muted-foreground">
                              ~{item.durationMinutes}m
                            </span>
                          </li>
                        )
                      })}
                    </ul>

                    {allActionsChecked && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 rounded-md border border-teal-500/30 bg-teal-500/5 px-3 py-2.5 text-center"
                      >
                        <p className="text-sm font-medium text-teal-400">
                          All done! Re-run the report to track your progress.
                        </p>
                      </motion.div>
                    )}
                  </div>
                )}

              </motion.div>

            ) : (
              /* ── Pre-analysis CTA ── */
              <motion.div
                key="cta"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-md border border-dashed border-border/60 px-4 py-6 text-center"
              >
                <Sparkles className="mx-auto mb-2 h-5 w-5 text-muted-foreground/40" strokeWidth={1.5} />
                <p className="text-sm text-muted-foreground">
                  Run a report to get a session mission, drill words, an interactive checklist, and AI coaching.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </CardContent>
    </Card>
  )
}

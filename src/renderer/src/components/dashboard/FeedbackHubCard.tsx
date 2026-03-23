import { ChevronDown, Sparkles } from 'lucide-react'
import type {
  AuditAnalysis,
  TyperrErrorRow,
  TyperrMistakeDetailRow,
  TyperrSuggestionRow
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
  suggestions: TyperrSuggestionRow[]
  correctionsLastHour: number
  mistakeDetails: TyperrMistakeDetailRow[]
  wpm: number
}

export function FeedbackHubCard({
  analysis,
  loading,
  error,
  onAnalyze,
  rows,
  lastError,
  suggestions,
  correctionsLastHour,
  mistakeDetails,
  wpm
}: FeedbackHubCardProps): React.JSX.Element {
  const skillScore = Math.max(1, Math.min(100, Math.round((wpm / 80) * 100)))
  const accuracyScore = Math.max(1, Math.min(100, Math.round(100 - correctionsLastHour * 2)))
  const mistakeControl = Math.max(
    1,
    Math.min(100, Math.round(100 - suggestions.length * 6 - correctionsLastHour))
  )

  const summaryCopy = analysis?.summary ??
    'Generate a report to see a focused summary of your typing patterns and improvement focus.'

  const nextActions = analysis?.nextActions ?? [
    'Pick 5 words you often mistype and drill them for 2 minutes.',
    'Slow down for 60 seconds and aim for zero corrections.',
    'Focus on accuracy on the first word of each sentence.'
  ]

  return (
    <Card className="w-full border-border/60 bg-card/70 backdrop-blur-md">
      <CardHeader className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle>Typing Feedback Hub</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Live skill signals, top fixes, and an AI plan for next steps.
          </p>
        </div>
        <Button onClick={onAnalyze} disabled={loading} size="sm" className="gap-2">
          {loading ? (
            <span className="relative inline-flex h-5 w-5 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#34d399,#2dd4bf,#38bdf8,#34d399)] animate-spin" />
              <span className="absolute inset-[2px] rounded-full bg-primary" />
              <Sparkles className="relative h-3.5 w-3.5 text-white/90" strokeWidth={2} />
            </span>
          ) : (
            <Sparkles className="h-4 w-4" strokeWidth={2} />
          )}
          {loading ? 'Generating...' : 'Generate Report'}
        </Button>
      </CardHeader>

      <CardContent className="space-y-4 pb-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: 'Typing Skill', score: skillScore },
            { label: 'Accuracy', score: accuracyScore },
            { label: 'Mistake Control', score: mistakeControl }
          ].map((item) => (
            <div key={item.label} className="rounded-md border border-border/60 bg-muted/40 px-3 py-2">
              <div className="flex items-center justify-between">
                <p className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">{item.label}</p>
                <span className="text-xs font-semibold text-foreground">{item.score}/100</span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-background/70">
                <div
                  className={`h-2 rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-sky-400 transition-all duration-700 ${
                    loading ? 'animate-pulse' : ''
                  }`}
                  style={{ width: `${item.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {error ? (
          <p className="rounded-md border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {error}
          </p>
        ) : null}

        <div className="rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-sm text-foreground/80">
          {summaryCopy}
        </div>

        <div className="rounded-md border border-border/60 bg-muted/40 px-3 py-2">
          <p className="text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground">Top mistakes + fixes</p>
          {mistakeDetails.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No consistent typo pattern detected yet.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {mistakeDetails.map((item) => (
                <div
                  key={`${item.mistyped_word}-${item.suggested_word}`}
                  className="rounded-md border border-border/60 bg-background/60 px-3 py-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold text-foreground">
                      <span className="truncate">{item.mistyped_word}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="truncate">{item.suggested_word}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{Math.round(item.score * 100)}%</span>
                      <span>x{item.count}</span>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {item.definition ?? 'Definition unavailable for this word.'}
                  </p>
                  {item.tip ? (
                    <p className="mt-1 text-xs text-muted-foreground">{item.tip}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-border/60 bg-muted/40 px-3 py-2">
            <p className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">Recent Corrections</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{rows.length}</p>
          </div>
          <div className="rounded-md border border-border/60 bg-muted/40 px-3 py-2">
            <p className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">Latest Mistype</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {lastError?.mistyped_word ?? '—'}
            </p>
          </div>
          <div className="rounded-md border border-border/60 bg-muted/40 px-3 py-2">
            <p className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">Report Source</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {analysis?.generatedBy ?? 'AI ready'}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <details className="group rounded-md border border-border/60 bg-muted/40 px-3 py-2" open>
            <summary className="flex cursor-pointer list-none items-center justify-between text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground">
              <span>Next steps</span>
              <ChevronDown className="h-4 w-4 transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <ul className="mt-3 space-y-2">
              {nextActions.map((action) => (
                <li key={action} className="rounded-md border border-border/60 bg-background/60 px-3 py-2 text-sm text-foreground/80">
                  {action}
                </li>
              ))}
            </ul>
          </details>
        </div>
      </CardContent>
    </Card>
  )
}

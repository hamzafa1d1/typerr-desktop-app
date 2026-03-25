import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type SkillSignalsCardProps = {
  wpm: number
  correctionsLastHour: number
  suggestionsCount: number
}

function scoreColor(score: number): string {
  if (score >= 70) return 'bg-teal-500'
  if (score >= 40) return 'bg-amber-500'
  return 'bg-red-400'
}

function scoreTextColor(score: number): string {
  if (score >= 70) return 'text-teal-500'
  if (score >= 40) return 'text-amber-500'
  return 'text-red-400'
}

export function SkillSignalsCard({
  wpm,
  correctionsLastHour,
  suggestionsCount
}: SkillSignalsCardProps): React.JSX.Element {
  const signals = [
    {
      label: 'Typing Skill',
      score: Math.max(1, Math.min(100, Math.round((wpm / 80) * 100)))
    },
    {
      label: 'Accuracy',
      score: Math.max(1, Math.min(100, Math.round(100 - correctionsLastHour * 2)))
    },
    {
      label: 'Mistake Control',
      score: Math.max(1, Math.min(100, Math.round(100 - suggestionsCount * 6 - correctionsLastHour)))
    }
  ]

  return (
    <Card className="border-border/60 bg-card/70 backdrop-blur-md shadow-sm shadow-black/5">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
          Skill Signals
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-3">
        {signals.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[0.65rem] uppercase tracking-[0.15em] text-muted-foreground">
                {item.label}
              </span>
              <span className={`text-xs font-semibold tabular-nums ${scoreTextColor(item.score)}`}>
                {item.score}/100
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted/60">
              <div
                className={`h-1.5 rounded-full transition-all duration-700 ${scoreColor(item.score)}`}
                style={{ width: `${item.score}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type { ImprovementFocus } from '@/lib/typing-insights'

type ImprovementFocusCardProps = {
  focus: ImprovementFocus
}

function focusAccent(title: string): { border: string; label: string } {
  const t = title.toLowerCase()
  if (t.includes('accuracy')) return { border: 'border-amber-500/30', label: 'text-amber-500' }
  if (t.includes('speed') || t.includes('baseline')) return { border: 'border-sky-500/30', label: 'text-sky-500' }
  if (t.includes('rhythm') || t.includes('stabilize')) return { border: 'border-indigo-500/30', label: 'text-indigo-400' }
  return { border: 'border-teal-500/30', label: 'text-teal-500' }
}

export function ImprovementFocusCard({ focus }: ImprovementFocusCardProps): React.JSX.Element {
  const accent = focusAccent(focus.title)

  return (
    <Card className={`w-full border ${accent.border} bg-card/70 backdrop-blur-md`}>
      <CardHeader className="pb-2">
        <p className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
          Improvement Focus
        </p>
        <h2 className={`text-lg font-bold leading-tight ${accent.label}`}>{focus.title}</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">{focus.reason}</p>
      </CardHeader>
      <CardContent className="pb-4">
        <ol className="space-y-2">
          {focus.tips.map((tip, idx) => (
            <li key={tip} className="flex items-start gap-3 text-sm text-foreground/80">
              <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[0.65rem] font-bold tabular-nums ${accent.label}`}>
                {idx + 1}
              </span>
              <span className="leading-snug">{tip}</span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}

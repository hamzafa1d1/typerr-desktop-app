import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ImprovementFocus } from '@/lib/typing-insights'

type ImprovementFocusCardProps = {
  focus: ImprovementFocus
}

export function ImprovementFocusCard({ focus }: ImprovementFocusCardProps): React.JSX.Element {
  return (
    <Card className="w-full border-border/60 bg-card/70 backdrop-blur-md">
      <CardHeader>
        <CardTitle>What To Improve Now</CardTitle>
        <p className="text-xs text-muted-foreground">{focus.title}</p>
      </CardHeader>
      <CardContent className="space-y-3 pb-4">
        <p className="text-sm leading-relaxed text-foreground/80">{focus.reason}</p>
        <ul className="space-y-2">
          {focus.tips.map((tip) => (
            <li key={tip} className="rounded-md border border-border/60 bg-muted/40 backdrop-blur-sm px-3 py-2 text-xs text-foreground/80">
              {tip}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

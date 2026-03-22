import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ImprovementFocus } from '@/lib/typing-insights'

type ImprovementFocusCardProps = {
  focus: ImprovementFocus
}

export function ImprovementFocusCard({ focus }: ImprovementFocusCardProps): React.JSX.Element {
  return (
    <Card className="w-full border-white/[0.08] bg-black/25">
      <CardHeader>
        <CardTitle>What To Improve Now</CardTitle>
        <p className="text-xs text-white/35">{focus.title}</p>
      </CardHeader>
      <CardContent className="space-y-3 pb-4">
        <p className="text-sm leading-relaxed text-white/70">{focus.reason}</p>
        <ul className="space-y-2">
          {focus.tips.map((tip) => (
            <li key={tip} className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/70">
              {tip}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

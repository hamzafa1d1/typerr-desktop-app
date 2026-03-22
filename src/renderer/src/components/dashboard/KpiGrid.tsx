import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { TypingKpi } from '@/lib/typing-insights'

type KpiGridProps = {
  items: TypingKpi[]
}

function toneClasses(tone: TypingKpi['tone']): string {
  if (tone === 'good') return 'text-emerald-300'
  if (tone === 'warn') return 'text-amber-300'
  return 'text-white/80'
}

export function KpiGrid({ items }: KpiGridProps): React.JSX.Element {
  return (
    <div className="grid w-full grid-cols-2 gap-3">
      {items.map((item) => (
        <Card key={item.label} className="h-full border-white/[0.08] bg-black/25">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-[0.72rem] uppercase tracking-[0.14em] text-white/45">
              {item.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <p className={`text-lg font-semibold tabular-nums ${toneClasses(item.tone)}`}>{item.value}</p>
            <p className="mt-1 text-[0.68rem] leading-relaxed text-white/40">{item.hint}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

import type { TyperrErrorRow } from '../../../../preload/typerr-types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatTime } from '@/lib/time'

type CorrectionsFeedCardProps = {
  rows: TyperrErrorRow[]
}

export function CorrectionsFeedCard({ rows }: CorrectionsFeedCardProps): React.JSX.Element {
  return (
    <Card className="w-full border-border/60 bg-card/70 backdrop-blur-md">
      <CardHeader>
        <CardTitle>Recent corrections</CardTitle>
        <p className="text-xs text-muted-foreground">Last 5 potential typos (backspace heuristic)</p>
      </CardHeader>
      <CardContent className="pb-4">
        <ScrollArea className="h-[260px] pr-3">
          <ul className="space-y-3">
            {rows.length === 0 ? (
              <li className="text-sm text-muted-foreground">No corrections logged yet.</li>
            ) : (
              rows.map((row: TyperrErrorRow, i: number) => (
                <li
                  key={`${row.timestamp}-${i}`}
                  className="rounded-lg border border-border/60 bg-muted/40 backdrop-blur-sm px-3 py-2.5"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium text-foreground/90">{row.mistyped_word}</span>
                    <span className="text-[0.65rem] tabular-nums text-muted-foreground">
                      {formatTime(row.timestamp)}
                    </span>
                  </div>
                  {row.corrected_word && row.corrected_word !== '—' ? (
                    <p className="mt-1 text-xs text-emerald-400/90">→ {row.corrected_word}</p>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

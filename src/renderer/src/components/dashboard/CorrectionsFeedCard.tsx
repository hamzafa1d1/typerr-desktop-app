import type { TyperrErrorRow } from '../../../../preload/typerr-types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatTime } from '@/lib/time'

type CorrectionsFeedCardProps = {
  rows: TyperrErrorRow[]
}

export function CorrectionsFeedCard({ rows }: CorrectionsFeedCardProps): React.JSX.Element {
  return (
    <Card className="w-full border-white/20 bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-md">
      <CardHeader>
        <CardTitle>Recent corrections</CardTitle>
        <p className="text-xs text-white/35">Last 5 potential typos (backspace heuristic)</p>
      </CardHeader>
      <CardContent className="pb-4">
        <ScrollArea className="h-[260px] pr-3">
          <ul className="space-y-3">
            {rows.length === 0 ? (
              <li className="text-sm text-white/35">No corrections logged yet.</li>
            ) : (
              rows.map((row: TyperrErrorRow, i: number) => (
                <li
                  key={`${row.timestamp}-${i}`}
                  className="rounded-lg border border-white/5 bg-gradient-to-r from-white/5 to-white/3 backdrop-blur-sm px-3 py-2.5"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium text-white/85">{row.mistyped_word}</span>
                    <span className="text-[0.65rem] tabular-nums text-white/35">
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

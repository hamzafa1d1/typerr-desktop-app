import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { TyperrErrorRow, TyperrStatsPayload } from '../../preload/typerr-types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export default function App(): React.JSX.Element {
  const [stats, setStats] = useState<TyperrStatsPayload>({
    wpm: 0,
    lastError: null,
    recentErrors: []
  })

  useEffect(() => {
    void window.typerr.getInitialStats().then(setStats)
    const off = window.typerr.onStats(setStats)
    return off
  }, [])

  return (
    <motion.div
      className="flex min-h-screen flex-col px-5 pb-6 pt-10"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className="mb-6 pl-1">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/40">Typerr</p>
        <h1 className="text-lg font-semibold text-white/90">Local typing audit</h1>
      </header>

      <div className="relative mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-start">
        <div
          className="pointer-events-none absolute inset-x-0 top-8 mx-auto h-48 w-48 rounded-full bg-blue-500/25 blur-[72px]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-12 mx-auto h-32 w-32 rounded-full bg-violet-500/20 blur-[56px]"
          aria-hidden
        />

        <Card className="relative z-10 w-full border-white/[0.08] bg-black/30">
          <CardHeader className="items-center text-center">
            <CardTitle>Current WPM</CardTitle>
            <p className="text-[0.65rem] text-white/35">Rolling 60s · 5 chars ≈ 1 word</p>
          </CardHeader>
          <CardContent className="flex flex-col items-center pb-8 pt-2">
            <motion.span
              key={stats.wpm}
              initial={{ opacity: 0.4, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="text-7xl font-semibold tabular-nums tracking-tight text-white drop-shadow-[0_0_40px_rgba(59,130,246,0.35)]"
            >
              {stats.wpm}
            </motion.span>
            <p className="mt-2 text-xs text-white/40">Updates every 2s from the main process</p>
          </CardContent>
        </Card>

        <Card className="relative z-10 mt-5 w-full flex-1 border-white/[0.08] bg-black/25">
          <CardHeader>
            <CardTitle>Recent corrections</CardTitle>
            <p className="text-xs text-white/35">Last 5 potential typos (backspace heuristic)</p>
          </CardHeader>
          <CardContent className="pb-4">
            <ScrollArea className="h-[200px] pr-3">
              <ul className="space-y-3">
                {stats.recentErrors.length === 0 ? (
                  <li className="text-sm text-white/35">No corrections logged yet.</li>
                ) : (
                  stats.recentErrors.map((row: TyperrErrorRow, i: number) => (
                    <li
                      key={`${row.timestamp}-${i}`}
                      className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2.5"
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

        {stats.lastError ? (
          <p className="mt-4 max-w-sm text-center text-[0.7rem] leading-relaxed text-white/45">
            Last flagged: <span className="text-white/70">{stats.lastError.mistyped_word}</span>
          </p>
        ) : null}
      </div>
    </motion.div>
  )
}

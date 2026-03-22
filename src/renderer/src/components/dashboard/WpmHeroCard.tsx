import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatTime } from '@/lib/time'

type WpmHeroCardProps = {
  wpm: number
  lastStatsAt: number | null
}

export function WpmHeroCard({ wpm, lastStatsAt }: WpmHeroCardProps): React.JSX.Element {
  return (
    <Card className="w-full border-white/[0.08] bg-black/30">
      <CardHeader className="items-center text-center">
        <CardTitle className="text-xs uppercase tracking-[0.2em] text-white/45">Current WPM</CardTitle>
        <p className="text-[0.65rem] text-white/35">Rolling 60s · 5 chars ≈ 1 word</p>
      </CardHeader>
      <CardContent className="flex flex-col items-center pb-8 pt-1 sm:pb-10">
        <motion.span
          key={wpm}
          initial={{ opacity: 0.4, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className="text-6xl font-semibold tabular-nums tracking-tight text-white drop-shadow-[0_0_40px_rgba(59,130,246,0.35)] sm:text-7xl"
        >
          {wpm}
        </motion.span>
        <p className="mt-2 text-xs text-white/40">Updates every 2s from the main process</p>
        <p className="mt-1 text-[0.65rem] text-white/35">
          Last update: {lastStatsAt ? formatTime(lastStatsAt) : 'waiting...'}
        </p>
      </CardContent>
    </Card>
  )
}

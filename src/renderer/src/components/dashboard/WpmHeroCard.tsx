import { motion } from 'framer-motion'
import { Activity, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatTime } from '@/lib/time'

type WpmHeroCardProps = {
  wpm: number
  lastStatsAt: number | null
}

export function WpmHeroCard({ wpm, lastStatsAt }: WpmHeroCardProps): React.JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="group relative w-full overflow-hidden border-white/15 bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-md shadow-2xl shadow-blue-500/10 hover:shadow-2xl hover:shadow-blue-500/20 hover:border-white/30 transition-all duration-300">
        {/* Animated gradient accent */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-transparent to-emerald-500/0 group-hover:from-blue-500/5 group-hover:to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none" />
        
        {/* Animated border glow on hover */}
        <div className="absolute inset-0 rounded-lg border border-gradient-to-r from-blue-500/0 via-white/0 to-emerald-500/0 group-hover:from-blue-500/30 group-hover:to-emerald-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        <CardHeader className="relative z-10 items-center text-center">
          <div className="flex flex-col items-center w-full space-y-1">
            <div className="flex items-center justify-center gap-3">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Activity className="w-5 h-5 text-emerald-400" strokeWidth={2.5} />
              </motion.div>
              <CardTitle className="text-xs uppercase tracking-[0.3em] text-white/50 font-semibold">Typing Speed</CardTitle>
            </div>
            <p className="text-[0.65rem] text-white/40 font-medium">60-second rolling average</p>
          </div>
        </CardHeader>

        <CardContent className="relative z-10 flex flex-col items-center pb-10 pt-2 sm:pb-12">
          <motion.span
            key={Math.floor(wpm / 10)}
            initial={{ opacity: 0.4, scale: 0.95, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="text-7xl font-bold tabular-nums tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-emerald-400 to-blue-400 drop-shadow-lg sm:text-8xl"
          >
            {Math.round(wpm)}
          </motion.span>
          
          <div className="mt-6 flex gap-6 text-center">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="space-y-1 cursor-default"
            >
              <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">Status</p>
              <div className="flex items-center justify-center gap-1.5">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-2 h-2 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-300"
                />
                <p className="text-[0.75rem] text-emerald-400 font-bold">LIVE</p>
              </div>
            </motion.div>
            <div className="w-px bg-white/10"></div>
            <div className="space-y-1 cursor-default">
              <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">Updated</p>
              <div className="flex items-center justify-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-white/50" strokeWidth={2} />
                <p className="text-[0.75rem] text-white/60 font-medium">
                  {lastStatsAt ? formatTime(lastStatsAt) : '...'}
                </p>
              </div>
            </div>
          </div>

          <p className="mt-4 text-xs text-white/35 font-medium">Every keystroke tracked in real-time</p>
        </CardContent>
      </Card>
    </motion.div>
  )
}

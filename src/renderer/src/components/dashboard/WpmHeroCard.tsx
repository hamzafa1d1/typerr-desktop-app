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
      <Card className="group relative w-full overflow-hidden border-border/60 bg-card/70 backdrop-blur-md shadow-2xl shadow-indigo-500/10 hover:shadow-2xl hover:shadow-indigo-500/15 transition-all duration-300">
        {/* Subtle hover wash */}
        <div className="absolute inset-0 bg-muted/30 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none" />
        
        {/* Animated border glow on hover */}
        <div className="absolute inset-0 rounded-lg border border-gradient-to-r from-blue-500/0 via-transparent to-emerald-500/0 group-hover:from-blue-500/30 group-hover:to-emerald-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        <CardHeader className="relative z-10 items-center text-center">
          <div className="flex flex-col items-center w-full space-y-1">
            <div className="flex items-center justify-center gap-3">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Activity className="w-5 h-5 text-teal-500" strokeWidth={2.5} />
              </motion.div>
              <CardTitle className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-semibold">Typing Speed</CardTitle>
            </div>
            <p className="text-[0.65rem] text-muted-foreground font-medium">60-second rolling average</p>
          </div>
        </CardHeader>

        <CardContent className="relative z-10 flex flex-col items-center pb-10 pt-2 sm:pb-12">
          <motion.span
            key={Math.floor(wpm / 10)}
            initial={{ opacity: 0.4, scale: 0.95, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="text-7xl font-bold tabular-nums tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-teal-500 to-sky-500 drop-shadow-lg sm:text-8xl"
          >
            {Math.round(wpm)}
          </motion.span>
          
          <div className="mt-6 flex gap-6 text-center">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="space-y-1 cursor-default"
            >
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</p>
              <div className="flex items-center justify-center gap-1.5">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-2 h-2 rounded-full bg-gradient-to-r from-teal-500 to-teal-400"
                />
                <p className="text-[0.75rem] text-teal-500 font-bold">LIVE</p>
              </div>
            </motion.div>
            <div className="w-px bg-border/60"></div>
            <div className="space-y-1 cursor-default">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Updated</p>
              <div className="flex items-center justify-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2} />
                <p className="text-[0.75rem] text-foreground/70 font-medium">
                  {lastStatsAt ? formatTime(lastStatsAt) : '...'}
                </p>
              </div>
            </div>
          </div>

          <p className="mt-4 text-xs text-muted-foreground font-medium">Every keystroke tracked in real-time</p>
        </CardContent>
      </Card>
    </motion.div>
  )
}

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, Zap, Target, Clock, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface DayMetrics {
  date: Date
  wpm?: number
  accuracy?: number
  streak?: number
  practiceMinutes?: number
}

interface DailyProgressChartProps {
  data?: DayMetrics[]
}

export function DailyProgressChart({ data = [] }: DailyProgressChartProps) {
  const days = useMemo(() => {
    const result: DayMetrics[] = []
    const now = new Date()

    for (let i = 83; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)

      const existingData = data.find((d) => d.date.toDateString() === date.toDateString())

      result.push(existingData || { date })
    }

    return result
  }, [data])

  const weeks = useMemo(() => {
    const weeksList: DayMetrics[][] = []
    for (let i = 0; i < days.length; i += 7) {
      weeksList.push(days.slice(i, i + 7))
    }
    return weeksList
  }, [days])

  const getActivityColor = (metrics: DayMetrics): string => {
    if (!metrics.wpm && !metrics.practiceMinutes) {
      return 'bg-white/5 hover:bg-white/10'
    }

    const wpm = metrics.wpm || 0
    const practiceTime = metrics.practiceMinutes || 0
    const combined = wpm * 0.6 + practiceTime * 2

    if (combined === 0) return 'bg-white/5 hover:bg-white/10'
    if (combined < 30) return 'bg-emerald-500/25 hover:bg-emerald-500/35'
    if (combined < 60) return 'bg-emerald-500/45 hover:bg-emerald-500/55'
    if (combined < 90) return 'bg-emerald-500/65 hover:bg-emerald-500/75'
    return 'bg-emerald-500/85 hover:bg-emerald-500/95'
  }

  const getTooltipText = (metrics: DayMetrics): string => {
    const parts: string[] = []
    if (metrics.wpm) parts.push(`${metrics.wpm} WPM`)
    if (metrics.accuracy) parts.push(`${metrics.accuracy}% accuracy`)
    if (metrics.practiceMinutes) parts.push(`${metrics.practiceMinutes}m practice`)
    if (metrics.streak) parts.push(`${metrics.streak}d streak`)

    if (parts.length === 0) {
      return 'No activity'
    }

    return parts.join(' • ')
  }

  const formatWeek = (_week: DayMetrics[], index: number): string => {
    if (index === 0) return 'This week'
    if (index === weeks.length - 1) return `${weeks.length}w ago`

    return ''
  }

  const activeSeconds = Math.round(days.reduce((sum, d) => sum + (d.practiceMinutes || 0), 0) * 60)
  const activeHours = Math.floor(activeSeconds / 3600)
  const activeMinutes = Math.floor((activeSeconds % 3600) / 60)

  const activeDays = days.filter((d) => d.wpm || d.practiceMinutes).length
  const peakSpeed = Math.max(0, Math.max(...days.map((d) => d.wpm || 0)))
  const bestStreak = Math.max(0, Math.max(...days.map((d) => d.streak || 0)))

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <Card className="group relative overflow-hidden bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-md border-white/15 shadow-xl shadow-white/5 hover:shadow-xl hover:shadow-white/10 hover:border-white/25 transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 via-transparent to-emerald-500/0 group-hover:from-emerald-500/5 group-hover:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        <CardHeader className="relative z-10 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 4, repeat: Infinity }}>
                <TrendingUp className="w-5 h-5 text-emerald-400" strokeWidth={2.5} />
              </motion.div>
              <CardTitle className="text-sm font-bold text-white/90">Activity Heatmap</CardTitle>
            </div>
            <motion.span
              animate={{ opacity: [0.5, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-xs font-semibold text-white/60 flex items-center gap-1"
            >
              <Calendar className="w-3 h-3" />
              12 weeks
            </motion.span>
          </div>
          <p className="text-xs text-white/45 mt-2 font-medium">Visualization of your typing consistency and practice patterns</p>
        </CardHeader>

        <CardContent className="relative z-10">
          <div className="flex flex-col gap-5">
            {/* Enhanced Metrics Legend */}
            <div className="flex gap-3 text-xs">
              <motion.div whileHover={{ x: 3 }} className="flex items-center gap-2 text-white/60 bg-gradient-to-r from-blue-500/10 to-transparent px-3 py-2 rounded-lg border border-blue-500/20">
                <Zap className="w-4 h-4 text-blue-400" strokeWidth={2} />
                <span className="font-medium">Speed metrics</span>
              </motion.div>
              <motion.div whileHover={{ x: 3 }} className="flex items-center gap-2 text-white/60 bg-gradient-to-r from-emerald-500/10 to-transparent px-3 py-2 rounded-lg border border-emerald-500/20">
                <TrendingUp className="w-4 h-4 text-emerald-400" strokeWidth={2} />
                <span className="font-medium">Activity level</span>
              </motion.div>
            </div>

            {/* Intensity Scale Legend */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-white/40 font-semibold">Intensity:</span>
              <div className="flex gap-1">
                {[5, 25, 45, 65, 85].map((intensity) => (
                  <motion.div
                    key={intensity}
                    whileHover={{ scale: 1.2 }}
                    title={`${intensity}% activity`}
                    className={`w-4 h-4 rounded-sm border border-white/20 cursor-help ${
                      intensity === 5 ? 'bg-white/5' : `bg-emerald-${intensity === 25 ? '500/25' : intensity === 45 ? '500/45' : intensity === 65 ? '500/65' : '500/85'}`
                    }`}
                  />
                ))}
              </div>
              <span className="text-white/40 ml-auto">Less ← Activity → More</span>
            </div>

            {/* Optimized Heatmap Grid */}
            <div className="overflow-x-auto pb-2 -mx-2 px-2">
              <div className="flex gap-2 min-w-fit">
                {weeks.map((week, weekIdx) => (
                  <motion.div
                    key={`week-${weekIdx}`}
                    className="flex flex-col gap-1.5"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: weekIdx * 0.012, duration: 0.3 }}
                  >
                    {formatWeek(week, weekIdx) && (
                      <div className="h-5 flex items-center">
                        <span className="text-[9px] text-white/50 font-bold uppercase tracking-wider">{formatWeek(week, weekIdx)}</span>
                      </div>
                    )}
                    {!formatWeek(week, weekIdx) && <div className="h-5" />}

                    <div className="flex flex-col gap-1.5">
                      {week.map((day, dayIdx) => (
                        <motion.div
                          key={`day-${weekIdx}-${dayIdx}`}
                          className={`group/day relative w-4 h-4 rounded-md shadow-sm ${getActivityColor(
                            day
                          )} backdrop-blur-sm border border-white/25 hover:border-emerald-400/60 hover:shadow-lg hover:shadow-emerald-500/50 transition-all duration-200 cursor-pointer`}
                          whileHover={{ scale: 1.35, y: -2 }}
                          whileTap={{ scale: 0.95 }}
                          title={getTooltipText(day)}
                        >
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 opacity-0 group-hover/day:opacity-100 transition-all pointer-events-none duration-200 z-50">
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9, y: 5 }}
                              whileHover={{ opacity: 1, scale: 1, y: 0 }}
                              className="bg-gradient-to-br from-emerald-950/95 to-slate-950 backdrop-blur-md text-white text-[11px] px-3 py-2 rounded-md whitespace-nowrap border border-emerald-500/40 font-medium shadow-lg"
                            >
                              {getTooltipText(day)}
                              {day.date && (
                                <div className="text-[9px] text-white/60 mt-0.5">
                                  {day.date.toLocaleDateString('en-US', {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </div>
                              )}
                            </motion.div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Enhanced Stats Summary */}
            <div className="grid grid-cols-4 gap-3 pt-6 border-t border-white/10">
              {/* Active Days */}
              <motion.div whileHover={{ y: -2 }} className="text-center group/stat">
                <motion.div className="flex items-center justify-center w-8 h-8 rounded-lg mb-2 mx-auto bg-gradient-to-br from-emerald-500/20 to-transparent border border-emerald-500/30 group-hover/stat:border-emerald-500/60 transition-all">
                  <Calendar className="w-4 h-4 text-emerald-400" strokeWidth={2} />
                </motion.div>
                <div className="text-lg font-bold tabular-nums text-emerald-400 group-hover/stat:text-emerald-300 transition-colors">{activeDays}</div>
                <div className="text-[10px] text-white/45 font-medium uppercase tracking-wider mt-1">Active Days</div>
              </motion.div>

              {/* Peak Speed */}
              <motion.div whileHover={{ y: -2 }} className="text-center group/stat">
                <motion.div className="flex items-center justify-center w-8 h-8 rounded-lg mb-2 mx-auto bg-gradient-to-br from-blue-500/20 to-transparent border border-blue-500/30 group-hover/stat:border-blue-500/60 transition-all">
                  <Zap className="w-4 h-4 text-blue-400" strokeWidth={2} />
                </motion.div>
                <div className="text-lg font-bold tabular-nums text-blue-400 group-hover/stat:text-blue-300 transition-colors">{peakSpeed}</div>
                <div className="text-[10px] text-white/45 font-medium uppercase tracking-wider mt-1">Peak Speed</div>
              </motion.div>

              {/* Best Streak */}
              <motion.div whileHover={{ y: -2 }} className="text-center group/stat">
                <motion.div className="flex items-center justify-center w-8 h-8 rounded-lg mb-2 mx-auto bg-gradient-to-br from-purple-500/20 to-transparent border border-purple-500/30 group-hover/stat:border-purple-500/60 transition-all">
                  <Target className="w-4 h-4 text-purple-400" strokeWidth={2} />
                </motion.div>
                <div className="text-lg font-bold tabular-nums text-purple-400 group-hover/stat:text-purple-300 transition-colors">{bestStreak}</div>
                <div className="text-[10px] text-white/45 font-medium uppercase tracking-wider mt-1">Best Streak</div>
              </motion.div>

              {/* Total Hours */}
              <motion.div whileHover={{ y: -2 }} className="text-center group/stat">
                <motion.div className="flex items-center justify-center w-8 h-8 rounded-lg mb-2 mx-auto bg-gradient-to-br from-amber-500/20 to-transparent border border-amber-500/30 group-hover/stat:border-amber-500/60 transition-all">
                  <Clock className="w-4 h-4 text-amber-400" strokeWidth={2} />
                </motion.div>
                <div className="text-lg font-bold tabular-nums text-amber-400 group-hover/stat:text-amber-300 transition-colors">{activeHours}</div>
                <div className="text-[10px] text-white/45 font-medium uppercase tracking-wider mt-1">Total Hours</div>
                <div className="text-[9px] text-white/35 mt-0.5">{activeMinutes}m</div>
              </motion.div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

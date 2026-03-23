import { motion } from 'framer-motion'
import { CheckCircle2, AlertCircle, Minus } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import type { TypingKpi } from '@/lib/typing-insights'

type KpiGridProps = {
  items: TypingKpi[]
}

function toneClasses(tone: TypingKpi['tone']): string {
  if (tone === 'good') return 'text-teal-500'
  if (tone === 'warn') return 'text-amber-500'
  return 'text-muted-foreground'
}

function toneGradient(tone: TypingKpi['tone']): string {
  if (tone === 'good') return 'from-teal-500/20 to-teal-500/5'
  if (tone === 'warn') return 'from-amber-500/20 to-amber-500/5'
  return 'from-muted/60 to-muted/30'
}

function getIconComponent(tone: TypingKpi['tone']) {
  if (tone === 'good') return CheckCircle2
  if (tone === 'warn') return AlertCircle
  return Minus
}

function parseKpiValue(item: TypingKpi): number {
  const numeric = Number(item.value.replace(/[^0-9.]/g, ''))
  if (!Number.isNaN(numeric) && numeric !== 0) return numeric

  const normalized = item.value.toLowerCase()
  if (item.label.toLowerCase().includes('tracking')) {
    return normalized === 'live' ? 1 : 0
  }

  if (item.label.toLowerCase().includes('rhythm')) {
    if (normalized.includes('steady')) return 3
    if (normalized.includes('fluctuating')) return 2
    if (normalized.includes('unstable')) return 1
    if (normalized.includes('stabilizing')) return 2
  }

  return Number.isNaN(numeric) ? 0 : numeric
}

const toneColors: Record<TypingKpi['tone'], string> = {
  good: '#14b8a6',
  warn: '#f59e0b',
  neutral: '#94a3b8'
}

export function KpiGrid({ items }: KpiGridProps): React.JSX.Element {
  const rawValues = items.map(parseKpiValue)
  const maxValue = Math.max(1, ...rawValues)
  const chartData = items.map((item, idx) => ({
    label: item.label,
    score: Math.round((rawValues[idx] / maxValue) * 100),
    raw: rawValues[idx],
    tone: item.tone
  }))

  return (
    <div className="space-y-3">
      <Card className="group relative overflow-hidden border-border/60 bg-card/70 backdrop-blur-md shadow-lg shadow-black/5 hover:shadow-lg hover:shadow-black/10 transition-all duration-300">
        <div className="absolute inset-0 bg-muted/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        <CardHeader className="relative z-10 p-4 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
              KPI Momentum
            </CardTitle>
            <span className="text-[0.65rem] text-muted-foreground">Normalized score</span>
          </div>
        </CardHeader>
        <CardContent className="relative z-10 p-4 pt-1">
          <ChartContainer
            className="h-44 w-full"
            config={{
              score: {
                label: 'Score'
              }
            }}
          >
            <BarChart data={chartData} margin={{ left: 4, right: 4, top: 4, bottom: 8 }}>
                <CartesianGrid vertical={false} stroke="rgba(148, 163, 184, 0.3)" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                interval={0}
                  tick={{ fill: 'rgba(100, 116, 139, 0.8)', fontSize: 10 }}
                tickFormatter={(value) => String(value).split(' ')[0]}
              />
              <YAxis
                domain={[0, 100]}
                tickLine={false}
                axisLine={false}
                  tick={{ fill: 'rgba(100, 116, 139, 0.6)', fontSize: 10 }}
              />
              <ChartTooltip
                  cursor={{ fill: 'rgba(148, 163, 184, 0.2)' }}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => `KPI: ${value}`}
                    valueFormatter={(value, _name, item) => {
                      const raw = item?.payload?.raw
                      return `${value} / 100 · raw ${raw ?? '0'}`
                    }}
                  />
                }
              />
              <Bar dataKey="score" radius={[6, 6, 4, 4]}>
                {chartData.map((entry) => (
                  <Cell key={entry.label} fill={toneColors[entry.tone]} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid w-full grid-cols-2 gap-3">
        {items.map((item, idx) => {
          const IconComponent = getIconComponent(item.tone)
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.4 }}
            >
              <Card
                className={`group relative h-full overflow-hidden border-border/60 bg-gradient-to-br ${toneGradient(
                  item.tone
                )} backdrop-blur-md shadow-lg shadow-black/5 hover:shadow-lg hover:shadow-black/10 transition-all duration-300`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-muted/40 via-transparent to-transparent group-hover:from-muted/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                <CardHeader className="relative z-10 p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-[0.7rem] uppercase tracking-[0.15em] text-muted-foreground font-semibold flex-1">
                      {item.label}
                    </CardTitle>
                    <motion.div
                      animate={{ rotate: [0, 10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <IconComponent className={`w-4 h-4 ${toneClasses(item.tone)}`} strokeWidth={2.5} />
                    </motion.div>
                  </div>
                </CardHeader>

                <CardContent className="relative z-10 p-4 pt-1 space-y-2">
                  <motion.p
                    key={item.value}
                    initial={{ opacity: 0.5, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className={`text-2xl font-bold tabular-nums ${toneClasses(item.tone)} drop-shadow-sm`}
                  >
                    {item.value}
                  </motion.p>
                  <p className="text-[0.65rem] leading-snug text-muted-foreground font-medium">{item.hint}</p>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

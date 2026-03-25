import { motion } from 'framer-motion'
import { CheckCircle2, AlertCircle, Minus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { TypingKpi } from '@/lib/typing-insights'

type KpiGridProps = {
  items: TypingKpi[]
}

function toneClasses(tone: TypingKpi['tone']): string {
  if (tone === 'good') return 'text-teal-500'
  if (tone === 'warn') return 'text-amber-500'
  return 'text-muted-foreground'
}

function toneBorder(tone: TypingKpi['tone']): string {
  if (tone === 'good') return 'border-teal-500/30'
  if (tone === 'warn') return 'border-amber-500/30'
  return 'border-border/60'
}

function getIconComponent(tone: TypingKpi['tone']) {
  if (tone === 'good') return CheckCircle2
  if (tone === 'warn') return AlertCircle
  return Minus
}

export function KpiGrid({ items }: KpiGridProps): React.JSX.Element {
  return (
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
              className={`h-full border ${toneBorder(item.tone)} bg-card/70 backdrop-blur-md shadow-sm shadow-black/5`}
            >
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[0.7rem] uppercase tracking-[0.15em] text-muted-foreground font-semibold flex-1">
                    {item.label}
                  </CardTitle>
                  <IconComponent className={`w-3.5 h-3.5 shrink-0 ${toneClasses(item.tone)}`} strokeWidth={2.5} />
                </div>
              </CardHeader>

              <CardContent className="p-4 pt-1 space-y-1">
                <motion.p
                  key={item.value}
                  initial={{ opacity: 0.5, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className={`text-2xl font-bold tabular-nums ${toneClasses(item.tone)}`}
                >
                  {item.value}
                </motion.p>
                <p className="text-[0.65rem] leading-snug text-muted-foreground">{item.hint}</p>
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}

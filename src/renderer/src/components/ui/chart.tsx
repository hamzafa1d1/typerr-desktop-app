import * as React from 'react'
import * as RechartsPrimitive from 'recharts'

import { cn } from '@/lib/utils'

type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode
    color?: string
  }
>

type ChartPayload = any

const ChartContext = React.createContext<ChartConfig | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)
  if (!context) {
    throw new Error('useChart must be used within a <ChartContainer />')
  }
  return context
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    config: ChartConfig
  }
>(({ className, config, children, ...props }, ref) => (
  <ChartContext.Provider value={config}>
    <div ref={ref} className={cn('flex aspect-video justify-center text-xs', className)} {...props}>
      <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
    </div>
  </ChartContext.Provider>
))
ChartContainer.displayName = 'ChartContainer'

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<'div'> & {
    active?: boolean
    payload?: ChartPayload[]
    label?: string | number
    labelFormatter?: (value: string) => React.ReactNode
    valueFormatter?: (value: number, name?: string, item?: ChartPayload) => React.ReactNode
    hideLabel?: boolean
  }
>(({ className, label, labelFormatter, valueFormatter, hideLabel, payload, active, ...props }, ref) => {
  const config = useChart()
  if (!active || !payload?.length) return null

  const labelContent = labelFormatter ? labelFormatter(String(label ?? '')) : label

  return (
    <div
      ref={ref}
      className={cn(
        'rounded-lg border border-white/15 bg-slate-950/90 px-3 py-2 text-xs text-white shadow-xl backdrop-blur-md',
        className
      )}
      {...props}
    >
      {!hideLabel ? (
        <div className="mb-1 text-[0.65rem] uppercase tracking-[0.14em] text-white/50">
          {labelContent}
        </div>
      ) : null}
      <div className="space-y-1">
        {payload.map((item) => {
          const key = String(item.dataKey)
          const itemConfig = config[key]
          const rawValue = typeof item.value === 'number' ? item.value : Number(item.value)
          return (
            <div key={key} className="flex items-center justify-between gap-3 text-white/80">
              <span className="text-white/60">{itemConfig?.label ?? key}</span>
              <span className="font-semibold">
                {valueFormatter ? valueFormatter(rawValue, key, item) : rawValue}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
})
ChartTooltipContent.displayName = 'ChartTooltipContent'

const ChartTooltip = RechartsPrimitive.Tooltip

const ChartLegend = RechartsPrimitive.Legend

export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend }

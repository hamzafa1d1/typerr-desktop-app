import { useEffect, useRef, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Keyboard } from 'lucide-react'
import type { TyperrKeyboardInsights } from '../../../../preload/typerr-types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type KeyboardMistakeMapCardProps = {
  insights: TyperrKeyboardInsights
}

const KEYBOARD_ROWS: string[][] = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'", '\\'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/'],
  ['SPACE']
]

// Row stagger: simulate physical keyboard offset
const ROW_STAGGER_CLASS = ['pl-0', 'pl-3', 'pl-5', 'pl-7', 'pl-0']
const ROW_JUSTIFY_CLASS = ['', '', '', '', 'justify-center']

// The bottom-edge shadow that makes keys look physical
const BASE_SHADOW = '0 2px 0 0 rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)'

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

/** Returns static CSS styles + derived intensity/hue for animation use */
function getKeyMeta(rate: number, mistakes: number): {
  style: React.CSSProperties
  intensity: number
  hue: number
} {
  if (mistakes <= 0 && rate <= 0) {
    return {
      style: {
        background: 'linear-gradient(160deg, rgba(63,63,70,0.40), rgba(39,39,42,0.52))',
        borderColor: 'rgba(82,82,91,0.38)',
        transition: 'background 0.7s ease, border-color 0.7s ease'
      },
      intensity: 0,
      hue: 128
    }
  }

  const intensity = Math.min(1, Math.max(rate, Math.min(mistakes, 10) / 10))
  const hue = Math.round(128 - intensity * 128)
  const alphaA = 0.32 + intensity * 0.52
  const alphaB = 0.26 + intensity * 0.62

  return {
    style: {
      background: `linear-gradient(160deg,
        hsla(${hue},80%,48%,${alphaA.toFixed(3)}),
        hsla(${hue},86%,36%,${alphaB.toFixed(3)}))`,
      borderColor: `hsla(${hue},82%,58%,${(0.42 + intensity * 0.4).toFixed(3)})`,
      transition: 'background 0.7s ease, border-color 0.7s ease'
    },
    intensity,
    hue
  }
}

function summaryLine(insights: TyperrKeyboardInsights): string {
  if (insights.totalPresses < 30) return 'Type a little more to calibrate the keyboard map.'
  if (insights.topMistakeKeys.length === 0) return 'No heavy key hotspots detected yet — looking good.'
  const top = insights.topMistakeKeys[0]
  return `Hotspot: "${top.key}" — ${top.mistakes} mistakes at a ${formatPercent(top.errorRate)} error rate.`
}

// ------- animated key -------
type AnimatedKeyProps = {
  keyChar: string
  mistakes: number
  presses: number
  errorRate: number
  entryDelay: number
  isBumping: boolean
}

function AnimatedKey({ keyChar, mistakes, presses, errorRate, entryDelay, isBumping }: AnimatedKeyProps): React.JSX.Element {
  const { style, intensity, hue } = getKeyMeta(errorRate, mistakes)
  const isSpace = keyChar === 'SPACE'

  // Build boxShadow values for the pulse animation
  const dimShadow = BASE_SHADOW
  const brightShadow = intensity > 0.3
    ? `${BASE_SHADOW}, 0 0 ${Math.round(8 + intensity * 14)}px hsla(${hue},82%,52%,${(intensity * 0.65).toFixed(3)})`
    : BASE_SHADOW
  const pulseDuration = intensity > 0.65 ? 1.3 : intensity > 0.4 ? 2.0 : 3.2
  const shouldPulse = intensity > 0.25

  return (
    <motion.div
      className={`relative flex-shrink-0 rounded-md border select-none cursor-default
        flex items-center justify-center overflow-hidden
        text-[0.62rem] font-bold tracking-wide text-foreground/80
        ${isSpace ? 'w-36 h-8' : 'w-7 h-8'}`}
      style={style}
      // --- entry: cascade drop-in ---
      initial={{ opacity: 0, y: -12, scale: 0.7, boxShadow: dimShadow }}
      animate={{
        opacity: 1,
        y: 0,
        scale: isBumping ? [1, 0.82, 1.12, 1] : 1,
        boxShadow: shouldPulse ? [dimShadow, brightShadow, dimShadow] : dimShadow
      }}
      transition={{
        opacity: { delay: entryDelay, duration: 0.22, ease: 'easeOut' },
        y: { delay: entryDelay, duration: 0.32, type: 'spring', stiffness: 380, damping: 22 },
        scale: isBumping
          ? { duration: 0.32, ease: [0.34, 1.56, 0.64, 1] }
          : { delay: entryDelay, duration: 0.32, type: 'spring', stiffness: 380, damping: 22 },
        boxShadow: shouldPulse
          ? { duration: pulseDuration, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.05 }
          : { duration: 0.3 }
      }}
      whileHover={{ scale: 1.12, transition: { duration: 0.08 } }}
      title={`${keyChar}: ${mistakes} mistakes / ${presses} presses (${formatPercent(errorRate)})`}
    >
      {/* Flash overlay when a new mistake is registered */}
      <AnimatePresence>
        {isBumping && (
          <motion.span
            key="flash"
            className="absolute inset-0 rounded-md bg-white/35 pointer-events-none"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.38, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      {/* Key label */}
      <span className={isSpace ? 'text-[0.52rem] tracking-[0.22em] text-foreground/40' : ''}>
        {isSpace ? 'SPACE' : keyChar}
      </span>

      {/* Mistake count badge */}
      <AnimatePresence>
        {mistakes > 0 && (
          <motion.span
            key={`badge-${keyChar}`}
            className="absolute top-0.5 right-0.5 text-[0.46rem] font-bold text-white/80 leading-none tabular-nums"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 520, damping: 18 }}
          >
            {mistakes}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ------- main card -------
export function KeyboardMistakeMapCard({ insights }: KeyboardMistakeMapCardProps): React.JSX.Element {
  const keyStatsMap = useMemo(() => {
    const map = new Map<string, { presses: number; mistakes: number; errorRate: number }>()
    for (const row of insights.keyStats) {
      map.set(row.key, { presses: row.presses, mistakes: row.mistakes, errorRate: row.errorRate })
    }
    return map
  }, [insights.keyStats])

  // Detect keys whose mistake count just increased → trigger bump animation
  const prevMistakesRef = useRef<Map<string, number>>(new Map())
  const [bumpKeys, setBumpKeys] = useState<Set<string>>(new Set())

  useEffect(() => {
    const bumps = new Set<string>()
    for (const stat of insights.keyStats) {
      const prev = prevMistakesRef.current.get(stat.key) ?? 0
      if (stat.mistakes > prev) bumps.add(stat.key)
      prevMistakesRef.current.set(stat.key, stat.mistakes)
    }
    if (bumps.size > 0) {
      setBumpKeys(bumps)
      const t = setTimeout(() => setBumpKeys(new Set()), 480)
      return () => clearTimeout(t)
    }
    return undefined
  }, [insights.keyStats])

  const leftRightTotal = insights.handUsage.left + insights.handUsage.right
  const leftShare = leftRightTotal > 0 ? Math.round((insights.handUsage.left / leftRightTotal) * 100) : 50
  const rightShare = 100 - leftShare
  const subtitle = useMemo(() => summaryLine(insights), [insights])
  const topKey = insights.topMistakeKeys[0]

  return (
    <Card className="border-border/60 bg-card/70 backdrop-blur-md shadow-sm shadow-black/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {/* Subtle icon rock on loop */}
            <motion.div
              animate={{ rotate: [0, -10, 10, -4, 4, 0] }}
              transition={{ duration: 5, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
            >
              <Keyboard className="h-4 w-4 text-rose-400" strokeWidth={2} />
            </motion.div>
            <CardTitle className="text-sm">Keyboard Mistake Map</CardTitle>
          </div>

          {/* Pulsing "live" dot + badge */}
          <div className="flex items-center gap-1.5">
            <motion.span
              className="inline-block h-1.5 w-1.5 rounded-full bg-rose-400"
              animate={{ opacity: [1, 0.25, 1], scale: [1, 0.7, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            />
            <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              live
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ── Keyboard layout ── */}
        <div className="space-y-1">
          {KEYBOARD_ROWS.map((row, rowIdx) => (
            <div
              key={`row-${rowIdx}`}
              className={`flex flex-row gap-1 ${ROW_STAGGER_CLASS[rowIdx]} ${ROW_JUSTIFY_CLASS[rowIdx]}`}
            >
              {row.map((key, keyIdx) => {
                const stat = keyStatsMap.get(key)
                return (
                  <AnimatedKey
                    key={key}
                    keyChar={key}
                    mistakes={stat?.mistakes ?? 0}
                    presses={stat?.presses ?? 0}
                    errorRate={stat?.errorRate ?? 0}
                    entryDelay={rowIdx * 0.055 + keyIdx * 0.014}
                    isBumping={bumpKeys.has(key)}
                  />
                )
              })}
            </div>
          ))}
        </div>

        {/* ── Color legend (slides in after keys) ── */}
        <div className="flex items-center gap-2.5">
          <span className="text-[0.58rem] text-muted-foreground/65 shrink-0">Clean</span>
          <motion.div
            className="flex-1 h-1.5 rounded-full"
            style={{
              background:
                'linear-gradient(to right, hsla(128,80%,47%,0.65), hsla(64,80%,47%,0.65), hsla(0,80%,47%,0.65))'
            }}
            initial={{ scaleX: 0, originX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ delay: 0.75, duration: 0.55, ease: 'easeOut' }}
          />
          <span className="text-[0.58rem] text-muted-foreground/65 shrink-0">Hotspot</span>
        </div>

        {/* ── Stats row ── */}
        <motion.div
          className="grid gap-2 grid-cols-3"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.38, ease: 'easeOut' }}
        >
          {/* Top mistake key */}
          <div className="rounded-lg border border-border/60 bg-muted/25 px-2.5 py-2">
            <p className="text-[0.58rem] uppercase tracking-[0.15em] text-muted-foreground">Top Mistake</p>
            <AnimatePresence mode="wait">
              <motion.p
                key={topKey?.key ?? 'none'}
                className="mt-0.5 text-base font-bold text-foreground font-mono leading-none"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.22 }}
              >
                {topKey?.key ?? '—'}
              </motion.p>
            </AnimatePresence>
            {topKey && (
              <p className="mt-0.5 text-[0.58rem] text-muted-foreground/80">
                {formatPercent(topKey.errorRate)} rate
              </p>
            )}
          </div>

          {/* Hand split — animated bar */}
          <div className="rounded-lg border border-border/60 bg-muted/25 px-2.5 py-2">
            <p className="text-[0.58rem] uppercase tracking-[0.15em] text-muted-foreground">Hand Split</p>
            <div className="mt-1.5 h-1.5 rounded-full overflow-hidden bg-muted/60 flex">
              <motion.div
                className="h-full bg-blue-500/65 rounded-l-full"
                animate={{ width: `${leftShare}%` }}
                transition={{ duration: 0.65, ease: 'easeInOut' }}
              />
              <motion.div
                className="h-full bg-violet-500/65 rounded-r-full"
                animate={{ width: `${rightShare}%` }}
                transition={{ duration: 0.65, ease: 'easeInOut' }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[0.58rem]">
              <span className="text-blue-400/80">L {leftShare}%</span>
              <span className="text-violet-400/80">R {rightShare}%</span>
            </div>
          </div>

          {/* Balance score */}
          <div className="rounded-lg border border-border/60 bg-muted/25 px-2.5 py-2">
            <p className="text-[0.58rem] uppercase tracking-[0.15em] text-muted-foreground">Balance</p>
            <AnimatePresence mode="wait">
              <motion.p
                key={insights.handBalanceScore}
                className="mt-0.5 text-base font-bold text-foreground leading-none"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                transition={{ duration: 0.22 }}
              >
                {insights.handBalanceScore}
                <span className="text-[0.6rem] font-normal text-muted-foreground">/100</span>
              </motion.p>
            </AnimatePresence>
            <p className="mt-0.5 text-[0.58rem] text-muted-foreground/80">
              {insights.handBalanceScore >= 80 ? 'great' : insights.handBalanceScore >= 55 ? 'fair' : 'uneven'}
            </p>
          </div>
        </motion.div>

        {/* ── Summary line ── */}
        <motion.div
          className="rounded-md border border-border/50 bg-background/30 px-3 py-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.4 }}
        >
          <AnimatePresence mode="wait">
            <motion.p
              key={subtitle}
              className="text-[0.7rem] text-muted-foreground"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              transition={{ duration: 0.25 }}
            >
              {subtitle}
            </motion.p>
          </AnimatePresence>
        </motion.div>
      </CardContent>
    </Card>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import type { AuditAnalysis, TyperrStatsPayload } from '../../preload/typerr-types'
import { AppHeader } from '@/components/dashboard/AppHeader'
import { AuditIntelligenceCard } from '@/components/dashboard/AuditIntelligenceCard'
import { CorrectionsFeedCard } from '@/components/dashboard/CorrectionsFeedCard'
import { ImprovementFocusCard } from '@/components/dashboard/ImprovementFocusCard'
import { KpiGrid } from '@/components/dashboard/KpiGrid'
import { TrackingTestCard } from '@/components/dashboard/TrackingTestCard'
import { WpmHeroCard } from '@/components/dashboard/WpmHeroCard'
import { motionPresets } from '@/lib/motion'
import { buildImprovementFocus, buildTypingKpis } from '@/lib/typing-insights'
import { uxFlags } from '@/lib/ux-flags'
import typerrIcon from '../typerr-icon.png'

export default function App(): React.JSX.Element {
  const reducedMotion = useReducedMotion()
  const shouldReduceMotion = Boolean(reducedMotion) || !uxFlags.smartMotion
  const pageMotion = motionPresets.page(shouldReduceMotion)
  const containerVariants = motionPresets.cardStagger(shouldReduceMotion)
  const itemVariants = motionPresets.cardItem(shouldReduceMotion)

  const [stats, setStats] = useState<TyperrStatsPayload>({
    wpm: 0,
    lastError: null,
    recentErrors: []
  })
  const [lastStatsAt, setLastStatsAt] = useState<number | null>(null)
  const [wpmHistory, setWpmHistory] = useState<number[]>([])
  const [analysis, setAnalysis] = useState<AuditAnalysis | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  const kpis = useMemo(
    () => buildTypingKpis(stats, wpmHistory, lastStatsAt),
    [lastStatsAt, stats, wpmHistory]
  )
  const focus = useMemo(() => buildImprovementFocus(stats, wpmHistory), [stats, wpmHistory])

  useEffect(() => {
    void window.typerr.getInitialStats().then((payload) => {
      setStats(payload)
      setWpmHistory([payload.wpm])
    })

    const off = window.typerr.onStats((payload) => {
      setStats(payload)
      setLastStatsAt(Date.now())
      setWpmHistory((previous) => [...previous.slice(-29), payload.wpm])
    })
    return off
  }, [])

  const runAuditAnalysis = async (): Promise<void> => {
    setAnalysisLoading(true)
    setAnalysisError(null)
    try {
      const result = await window.typerr.analyzeAudit()
      setAnalysis(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to analyze audit data.'
      setAnalysisError(message)
    } finally {
      setAnalysisLoading(false)
    }
  }

  return (
    <motion.div
      className="h-screen overflow-y-auto px-4 pb-8 pt-8 sm:px-6"
      initial={pageMotion.initial}
      animate={pageMotion.animate}
      transition={pageMotion.transition}
    >
      <div className="relative mx-auto w-full max-w-6xl">
        <AppHeader iconSrc={typerrIcon} />

        <div
          className="pointer-events-none absolute -left-16 top-10 h-64 w-64 rounded-full bg-blue-500/20 blur-[88px]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute right-0 top-40 h-52 w-52 rounded-full bg-violet-500/15 blur-[84px]"
          aria-hidden
        />

        {uxFlags.dashboardLayout === 'bento' ? (
          <motion.div
            className="relative z-10 grid items-start gap-5 xl:grid-cols-12"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            <motion.section variants={itemVariants} className="xl:col-span-7">
              <WpmHeroCard wpm={stats.wpm} lastStatsAt={lastStatsAt} />
            </motion.section>

            <motion.section variants={itemVariants} className="xl:col-span-5">
              <KpiGrid items={kpis} />
            </motion.section>

            <motion.section variants={itemVariants} className="xl:col-span-7">
              <AuditIntelligenceCard
                analysis={analysis}
                loading={analysisLoading}
                error={analysisError}
                onAnalyze={runAuditAnalysis}
              />
            </motion.section>

            <motion.section variants={itemVariants} className="xl:col-span-5">
              <CorrectionsFeedCard rows={stats.recentErrors} />
            </motion.section>

            <motion.section variants={itemVariants} className="xl:col-span-7">
              <ImprovementFocusCard focus={focus} />
            </motion.section>

            <motion.section variants={itemVariants} className="xl:col-span-5">
              <TrackingTestCard enabled={uxFlags.showTrackingTestCard} />
              {stats.lastError ? (
                <p className="mt-5 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[0.7rem] leading-relaxed text-white/55">
                  Last flagged: <span className="text-white/75">{stats.lastError.mistyped_word}</span>
                </p>
              ) : null}
            </motion.section>
          </motion.div>
        ) : (
          <motion.div
            className="relative z-10 grid items-start gap-5 xl:grid-cols-12"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            <motion.section variants={itemVariants} className="space-y-5 xl:col-span-8">
              <WpmHeroCard wpm={stats.wpm} lastStatsAt={lastStatsAt} />
              <ImprovementFocusCard focus={focus} />
              <AuditIntelligenceCard
                analysis={analysis}
                loading={analysisLoading}
                error={analysisError}
                onAnalyze={runAuditAnalysis}
              />
              <TrackingTestCard enabled={uxFlags.showTrackingTestCard} />
            </motion.section>

            <motion.aside variants={itemVariants} className="space-y-5 xl:col-span-4">
              <KpiGrid items={kpis} />
              <CorrectionsFeedCard rows={stats.recentErrors} />
              {stats.lastError ? (
                <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[0.7rem] leading-relaxed text-white/55">
                  Last flagged: <span className="text-white/75">{stats.lastError.mistyped_word}</span>
                </p>
              ) : null}
            </motion.aside>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

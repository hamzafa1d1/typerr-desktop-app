import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import type { AuditAnalysis, TyperrStatsPayload } from '../../preload/typerr-types'
import { AppHeader } from '@/components/dashboard/AppHeader'
import { AuditIntelligenceCard } from '@/components/dashboard/AuditIntelligenceCard'
import { CorrectionsFeedCard } from '@/components/dashboard/CorrectionsFeedCard'
import { DailyProgressChart } from '@/components/dashboard/DailyProgressChart'
import { ImprovementFocusCard } from '@/components/dashboard/ImprovementFocusCard'
import { KpiGrid } from '@/components/dashboard/KpiGrid'
import { Sidebar } from '@/components/dashboard/Sidebar'
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
    <div className="flex h-screen w-screen overflow-hidden bg-gradient-to-br from-background via-muted to-background text-foreground">
      <Sidebar />
      <motion.div
        className="flex-1 overflow-y-auto px-6 pb-8 pt-8 sm:px-8 scroll-smooth"
        data-scroll-container="main"
        initial={pageMotion.initial}
        animate={pageMotion.animate}
        transition={pageMotion.transition}
      >
        {/* Ambient background effects */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-20 right-1/3 w-96 h-96 rounded-full bg-blue-500/5 blur-3xl opacity-30" />
          <div className="absolute bottom-40 left-1/4 w-80 h-80 rounded-full bg-emerald-500/5 blur-3xl opacity-20" />
        </div>

        <div className="relative mx-auto w-full max-w-6xl z-10">
          <AppHeader iconSrc={typerrIcon} />

          {uxFlags.dashboardLayout === 'bento' ? (
          <motion.div
            className="relative z-10 grid items-start gap-5 xl:grid-cols-12"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            <motion.section id="overview" variants={itemVariants} className="xl:col-span-7 scroll-mt-24">
              <WpmHeroCard wpm={stats.wpm} lastStatsAt={lastStatsAt} />
            </motion.section>

            <motion.section id="kpis" variants={itemVariants} className="xl:col-span-5 scroll-mt-24">
              <KpiGrid items={kpis} />
            </motion.section>

            <motion.section id="audit" variants={itemVariants} className="xl:col-span-7 scroll-mt-24">
              <AuditIntelligenceCard
                analysis={analysis}
                loading={analysisLoading}
                error={analysisError}
                onAnalyze={runAuditAnalysis}
              />
            </motion.section>

            <motion.section id="corrections" variants={itemVariants} className="xl:col-span-5 scroll-mt-24">
              <CorrectionsFeedCard rows={stats.recentErrors} />
            </motion.section>

            <motion.section id="focus" variants={itemVariants} className="xl:col-span-7 scroll-mt-24">
              <ImprovementFocusCard focus={focus} />
            </motion.section>

            <motion.section variants={itemVariants} className="xl:col-span-5">
              {stats.lastError ? (
                <p className="mt-5 rounded-lg border border-white/10 bg-gradient-to-r from-white/5 to-white/3 px-3 py-2 text-[0.7rem] leading-relaxed text-white/55 backdrop-blur-sm">
                  Last flagged: <span className="text-white/75">{stats.lastError.mistyped_word}</span>
                </p>
              ) : null}
            </motion.section>

            <motion.section id="progress" variants={itemVariants} className="xl:col-span-12 scroll-mt-24">
              <DailyProgressChart />
            </motion.section>
          </motion.div>
        ) : (
          <motion.div
            className="relative z-10 grid items-start gap-5 xl:grid-cols-12"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            <motion.section id="overview" variants={itemVariants} className="space-y-5 xl:col-span-8 scroll-mt-24">
              <WpmHeroCard wpm={stats.wpm} lastStatsAt={lastStatsAt} />
              <ImprovementFocusCard focus={focus} />
              <AuditIntelligenceCard
                analysis={analysis}
                loading={analysisLoading}
                error={analysisError}
                onAnalyze={runAuditAnalysis}
              />
            </motion.section>

            <motion.aside id="kpis" variants={itemVariants} className="space-y-5 xl:col-span-4 scroll-mt-24">
              <KpiGrid items={kpis} />
              <CorrectionsFeedCard rows={stats.recentErrors} />
              {stats.lastError ? (
                <p className="rounded-lg border border-white/10 bg-gradient-to-r from-white/5 to-white/3 px-3 py-2 text-[0.7rem] leading-relaxed text-white/55 backdrop-blur-sm">
                  Last flagged: <span className="text-white/75">{stats.lastError.mistyped_word}</span>
                </p>
              ) : null}
            </motion.aside>

            <motion.section id="progress" variants={itemVariants} className="xl:col-span-12 scroll-mt-24">
              <DailyProgressChart />
            </motion.section>
          </motion.div>
        )}
        </div>
      </motion.div>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import type { AuditAnalysis, AuditSnapshot, TyperrStatsPayload } from '../../preload/typerr-types'
import { AppHeader } from '@/components/dashboard/AppHeader'
import { FeedbackHubCard } from '@/components/dashboard/FeedbackHubCard'
import { ImprovementFocusCard } from '@/components/dashboard/ImprovementFocusCard'
import { KeyboardMistakeMapCard } from '@/components/dashboard/KeyboardMistakeMapCard'
import { KpiGrid } from '@/components/dashboard/KpiGrid'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { SkillSignalsCard } from '@/components/dashboard/SkillSignalsCard'
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
    sessionAvgWpm: 0,
    lastError: null,
    recentErrors: [],
    suggestedCorrections: [],
    correctionsLastHour: 0,
    mistakeDetails: [],
    keyboardInsights: {
      totalPresses: 0,
      totalMistakes: 0,
      handUsage: {
        left: 0,
        right: 0,
        thumb: 0
      },
      handBalanceScore: 100,
      topMistakeKeys: [],
      keyStats: []
    }
  })
  const [lastStatsAt, setLastStatsAt] = useState<number | null>(null)
  const [wpmHistory, setWpmHistory] = useState<number[]>([])
  const [analysis, setAnalysis] = useState<AuditAnalysis | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [refreshIntervalMs, setRefreshIntervalMs] = useState(10 * 1000)

  const kpis = useMemo(
    () => buildTypingKpis(stats, wpmHistory, lastStatsAt, refreshIntervalMs),
    [lastStatsAt, refreshIntervalMs, stats, wpmHistory]
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
      if (payload.wpm > 0) {
        setWpmHistory((previous) => [...previous.slice(-29), payload.wpm])
      }
    })
    return off
  }, [])

  useEffect(() => {
    void window.typerr.setStatsRefreshInterval(refreshIntervalMs)
  }, [refreshIntervalMs])

  const runAuditAnalysis = async (): Promise<void> => {
    setAnalysisLoading(true)
    setAnalysisError(null)
    try {
      let previousSnapshot: AuditSnapshot | undefined
      try {
        const stored = window.localStorage.getItem('typerr-last-snapshot')
        if (stored) previousSnapshot = JSON.parse(stored) as AuditSnapshot
      } catch { /* ignore corrupt storage */ }

      const result = await window.typerr.analyzeAudit({ previousSnapshot })
      setAnalysis(result)

      try {
        window.localStorage.setItem('typerr-last-snapshot', JSON.stringify(result.snapshot))
      } catch { /* ignore storage errors */ }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to analyze audit data.'
      setAnalysisError(message)
    } finally {
      setAnalysisLoading(false)
    }
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <motion.div
        className="flex-1 overflow-y-auto px-6 pb-8 pt-[calc(2rem+env(safe-area-inset-top))] sm:px-8 scroll-smooth"
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
          <AppHeader
            iconSrc={typerrIcon}
            refreshIntervalMs={refreshIntervalMs}
            onRefreshIntervalChange={setRefreshIntervalMs}
          />

          {uxFlags.dashboardLayout === 'bento' ? (
          <motion.div
            className="relative z-10 grid items-start gap-5 xl:grid-cols-12"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            <motion.section id="overview" variants={itemVariants} className="xl:col-span-7 scroll-mt-24">
              <WpmHeroCard wpm={stats.wpm} lastStatsAt={lastStatsAt} wpmHistory={wpmHistory} />
            </motion.section>

            <motion.section id="kpis" variants={itemVariants} className="xl:col-span-5 scroll-mt-24 space-y-3">
              <KpiGrid items={kpis} />
              <SkillSignalsCard
                wpm={stats.wpm}
                correctionsLastHour={stats.correctionsLastHour}
                suggestionsCount={stats.suggestedCorrections.length}
              />
            </motion.section>

            <motion.section id="feedback" variants={itemVariants} className="xl:col-span-12 scroll-mt-24">
              <FeedbackHubCard
                analysis={analysis}
                loading={analysisLoading}
                error={analysisError}
                onAnalyze={runAuditAnalysis}
                rows={stats.recentErrors}
                lastError={stats.lastError}
                mistakeDetails={stats.mistakeDetails}
              />
            </motion.section>

            <motion.section id="focus" variants={itemVariants} className="xl:col-span-7 scroll-mt-24">
              <ImprovementFocusCard focus={focus} />
            </motion.section>

            <motion.section id="keyboard" variants={itemVariants} className="xl:col-span-5 scroll-mt-24">
              <KeyboardMistakeMapCard insights={stats.keyboardInsights} />
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
              <WpmHeroCard wpm={stats.wpm} lastStatsAt={lastStatsAt} wpmHistory={wpmHistory} />
              <ImprovementFocusCard focus={focus} />
              <FeedbackHubCard
                analysis={analysis}
                loading={analysisLoading}
                error={analysisError}
                onAnalyze={runAuditAnalysis}
                rows={stats.recentErrors}
                lastError={stats.lastError}
                mistakeDetails={stats.mistakeDetails}
              />
              <section id="keyboard" className="scroll-mt-24">
                <KeyboardMistakeMapCard insights={stats.keyboardInsights} />
              </section>
            </motion.section>

            <motion.aside id="kpis" variants={itemVariants} className="space-y-3 xl:col-span-4 scroll-mt-24">
              <KpiGrid items={kpis} />
              <SkillSignalsCard
                wpm={stats.wpm}
                correctionsLastHour={stats.correctionsLastHour}
                suggestionsCount={stats.suggestedCorrections.length}
              />
            </motion.aside>
          </motion.div>
        )}
        </div>
      </motion.div>
    </div>
  )
}

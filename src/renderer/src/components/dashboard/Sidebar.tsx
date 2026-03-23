import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, Activity, TrendingUp, Target, Clock, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

type NavItem = {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
}

export function Sidebar() {
  const navItems = useMemo<NavItem[]>(
    () => [
      { id: 'overview', label: 'Overview', icon: BarChart3 },
      { id: 'kpis', label: 'KPIs', icon: Activity },
      { id: 'audit', label: 'Audit', icon: Target },
      { id: 'corrections', label: 'Corrections', icon: TrendingUp },
      { id: 'focus', label: 'Focus Plan', icon: Clock },
      { id: 'progress', label: 'Progress', icon: TrendingUp }
    ],
    []
  )
  const [activeId, setActiveId] = useState(navItems[0]?.id ?? 'overview')

  useEffect(() => {
    const root = document.querySelector('[data-scroll-container="main"]')
    const sections = navItems
      .map((item) => document.getElementById(item.id))
      .filter((section): section is HTMLElement => Boolean(section))

    if (!root || sections.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible[0]?.target?.id) {
          setActiveId(visible[0].target.id)
        }
      },
      {
        root,
        rootMargin: '-20% 0px -60% 0px',
        threshold: [0, 0.2, 0.6]
      }
    )

    sections.forEach((section) => observer.observe(section))

    return () => observer.disconnect()
  }, [navItems])

  const handleNavigate = (id: string) => {
    const target = document.getElementById(id)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveId(id)
    }
  }

  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="w-64 border-r border-border/60 bg-card/70 backdrop-blur-md flex flex-col h-full shadow-2xl shadow-black/10"
    >
      {/* Header */}
      <div className="p-6 flex items-center justify-between border-b border-border/60">
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="flex items-center space-x-2"
        >
          <div className="text-xl font-bold text-foreground tracking-tight">Typerr</div>
          <motion.span 
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-[9px] bg-teal-500/10 text-teal-700 dark:text-teal-300 px-2 py-1 rounded-full font-bold uppercase tracking-wider border border-teal-500/30"
          >
            beta
          </motion.span>
        </motion.div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-6 space-y-6">
        {/* Primary Action */}
        <Button
          onClick={() => handleNavigate('audit')}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl border border-teal-500/40 bg-teal-500/10 text-teal-700 dark:text-teal-300 hover:border-teal-500/70 shadow-lg shadow-teal-500/10"
          variant="ghost"
        >
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          >
            <Sparkles className="w-5 h-5" strokeWidth={2} />
          </motion.div>
          <span className="text-sm font-bold tracking-wide">Generate AI Report</span>
        </Button>

        {/* Dashboard Section */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] px-2">Dashboard</div>
          <div className="space-y-1.5">
            {navItems.map((item, idx) => {
              const Icon = item.icon
              const isActive = item.id === activeId
              return (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ x: 3 }}
                  onClick={() => handleNavigate(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg border transition-all duration-200 group ${
                    isActive
                      ? 'bg-muted/60 border-border text-foreground'
                      : 'text-muted-foreground border-transparent hover:border-border hover:text-foreground'
                  }`}
                >
                  <Icon className={`w-4 h-4 transition-all ${isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`} strokeWidth={2} />
                  <span className="text-sm font-medium flex-1 text-left">{item.label}</span>
                  <motion.div
                    className={`h-1.5 w-1.5 rounded-full transition-colors ${isActive ? 'bg-teal-500' : 'bg-transparent group-hover:bg-teal-400/60'}`}
                  />
                </motion.button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border/60 space-y-3">
        <motion.div
          whileHover={{ borderColor: 'rgba(148, 163, 184, 0.4)' }}
          className="rounded-lg p-3.5 backdrop-blur-sm border border-border/60 transition-all duration-300 bg-muted/40"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-muted-foreground">AI Report Ready</span>
            </div>
            <motion.div
              className="w-3 h-3 rounded-full bg-teal-500"
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </motion.div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          className="w-full py-2.5 bg-teal-600 text-white text-xs font-bold rounded-lg hover:bg-teal-700 transition-all duration-300 shadow-lg shadow-teal-500/30 uppercase tracking-wider"
          onClick={() => handleNavigate('audit')}
        >
          Generate AI Report
        </motion.button>
      </div>
    </motion.div>
  )
}

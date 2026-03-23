import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Zap, Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ThemeMode = 'light' | 'dark'

const THEME_STORAGE_KEY = 'typerr-theme'

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark'
  const saved = window.localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

type AppHeaderProps = {
  iconSrc: string
  refreshIntervalMs: number
  onRefreshIntervalChange: (value: number) => void
}

const refreshOptions = [
  { label: '5s', value: 5_000 },
  { label: '10s', value: 10_000 },
  { label: '30s', value: 30_000 },
  { label: '60s', value: 60_000 },
  { label: '5m', value: 300_000 },
  { label: '15m', value: 900_000 },
  { label: '1h', value: 3_600_000 }
]

export function AppHeader({
  iconSrc,
  refreshIntervalMs,
  onRefreshIntervalChange
}: AppHeaderProps): React.JSX.Element {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative mb-8 rounded-xl border border-border/60 bg-card/70 backdrop-blur-md p-5 shadow-lg shadow-black/10 transition-all duration-300 group"
    >
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 rounded-xl bg-muted/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <motion.img
            animate={{ rotate: [0, 5, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
            src={iconSrc}
            alt="Typerr icon"
            className="h-6 w-6 rounded-md shadow-md"
          />
          <div className="space-y-1">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-muted-foreground">
              Dashboard
            </p>
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Sparkles className="h-4 w-4 text-indigo-500" strokeWidth={2} />
              Typerr
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              <span>Refresh</span>
              <select
                value={refreshIntervalMs}
                onChange={(event) => onRefreshIntervalChange(Number(event.target.value))}
                className="bg-transparent text-foreground text-[0.65rem] font-semibold uppercase tracking-[0.15em] focus:outline-none"
                aria-label="Refresh interval"
              >
                {refreshOptions.map((option) => (
                  <option key={option.value} value={option.value} className="bg-background text-foreground">
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              <span>Live</span>
              <motion.span
                animate={{ opacity: [0.4, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="h-2 w-2 rounded-full bg-teal-500"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              className="h-8 w-8 rounded-full border border-border/60 bg-background/60 text-foreground hover:bg-muted"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" strokeWidth={2.5} />
            <h1 className="text-xl font-semibold text-foreground">Real-time Typing Audit</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Live feedback, accurate tracking, continuous improvement
          </p>
        </div>
      </div>
    </motion.header>
  )
}

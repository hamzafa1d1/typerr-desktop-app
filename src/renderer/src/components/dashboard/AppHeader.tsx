import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Sun, Moon } from 'lucide-react'
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
      className="mb-8 rounded-xl border border-border/60 bg-card/70 backdrop-blur-md px-5 py-3.5 shadow-lg shadow-black/10"
    >
      <div className="flex items-center gap-3">
        {/* Brand */}
        <img
          src={iconSrc}
          alt="Typerr icon"
          className="h-5 w-5 rounded-md shrink-0"
        />
        <span className="text-sm font-semibold text-foreground">Typerr</span>

        {/* Separator + page title */}
        <span className="text-border/80 select-none">·</span>
        <h1
          className="text-sm font-medium text-muted-foreground"
          title="Live feedback, accurate tracking, continuous improvement"
        >
          Real-time Typing Audit
        </h1>

        {/* Controls */}
        <div className="ml-auto flex items-center gap-2">
          {/* Live indicator */}
          <div className="flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            <motion.span
              animate={{ opacity: [0.4, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="h-1.5 w-1.5 rounded-full bg-teal-500"
            />
            <span>Live</span>
          </div>

          {/* Refresh selector */}
          <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            <span>Refresh</span>
            <select
              value={refreshIntervalMs}
              onChange={(event) => onRefreshIntervalChange(Number(event.target.value))}
              className="bg-transparent text-foreground text-[0.65rem] font-semibold uppercase tracking-[0.15em] focus:outline-none cursor-pointer"
              aria-label="Refresh interval"
            >
              {refreshOptions.map((option) => (
                <option key={option.value} value={option.value} className="bg-background text-foreground">
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="h-7 w-7 rounded-full border border-border/60 bg-background/60 text-foreground hover:bg-muted"
          >
            {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
    </motion.header>
  )
}

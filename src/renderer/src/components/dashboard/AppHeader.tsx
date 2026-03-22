type AppHeaderProps = {
  iconSrc: string
}

export function AppHeader({ iconSrc }: AppHeaderProps): React.JSX.Element {
  return (
    <header className="mb-6 pl-1">
      <div className="mb-1 flex items-center gap-2">
        <img src={iconSrc} alt="Typerr icon" className="h-4 w-4 rounded-sm" />
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/40">Typerr</p>
      </div>
      <h1 className="text-lg font-semibold text-white/90">Local typing audit</h1>
      <p className="mt-1 text-xs text-white/45">Train with live feedback, not only after a session.</p>
    </header>
  )
}

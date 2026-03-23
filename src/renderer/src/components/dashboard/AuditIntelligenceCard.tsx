import type { AuditAnalysis } from '../../../../preload/typerr-types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type AuditIntelligenceCardProps = {
  analysis: AuditAnalysis | null
  loading: boolean
  error: string | null
  onAnalyze: () => void
}

function BulletList({ items }: { items: string[] }): React.JSX.Element {
  return (
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li key={item} className="rounded-md border border-white/10 bg-gradient-to-r from-white/5 to-white/3 backdrop-blur-sm px-2.5 py-1.5 text-xs text-white/70">
          {item}
        </li>
      ))}
    </ul>
  )
}

export function AuditIntelligenceCard({
  analysis,
  loading,
  error,
  onAnalyze
}: AuditIntelligenceCardProps): React.JSX.Element {
  return (
    <Card className="w-full border-white/20 bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-md">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Smart Audit Analysis</CardTitle>
          <p className="mt-1 text-xs text-white/35">
            Local model first, deterministic fallback when no model is configured.
          </p>
        </div>
        <Button onClick={onAnalyze} disabled={loading} size="sm">
          {loading ? 'Analyzing...' : 'Run Analysis'}
        </Button>
      </CardHeader>

      <CardContent className="space-y-3 pb-4">
        {error ? (
          <p className="rounded-md border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {error}
          </p>
        ) : null}

        {!analysis ? (
          <p className="text-sm text-white/50">No analysis yet. Click Run Analysis to generate insights.</p>
        ) : (
          <>
            <p className="rounded-md border border-white/10 bg-gradient-to-r from-white/5 to-white/3 backdrop-blur-sm px-3 py-2 text-sm leading-relaxed text-white/75">
              {analysis.summary}
            </p>

            <div className="grid gap-3 lg:grid-cols-3">
              <section>
                <p className="mb-1 text-[0.7rem] uppercase tracking-[0.15em] text-emerald-300/80">Strengths</p>
                <BulletList items={analysis.strengths} />
              </section>
              <section>
                <p className="mb-1 text-[0.7rem] uppercase tracking-[0.15em] text-amber-300/80">Risks</p>
                <BulletList items={analysis.risks} />
              </section>
              <section>
                <p className="mb-1 text-[0.7rem] uppercase tracking-[0.15em] text-blue-300/80">Next Actions</p>
                <BulletList items={analysis.nextActions} />
              </section>
            </div>

            <p className="text-[0.68rem] text-white/45">
              Engine: <span className="text-white/65">{analysis.generatedBy}</span> · Model:{' '}
              <span className="text-white/65">{analysis.model}</span>
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}

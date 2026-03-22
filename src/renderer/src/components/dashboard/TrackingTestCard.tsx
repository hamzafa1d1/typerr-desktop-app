import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type TrackingTestCardProps = {
  enabled: boolean
}

export function TrackingTestCard({ enabled }: TrackingTestCardProps): React.JSX.Element | null {
  const [testInput, setTestInput] = useState('')

  const testWords = useMemo(() => {
    return testInput.trim().length === 0 ? 0 : testInput.trim().split(/\s+/).length
  }, [testInput])

  if (!enabled) return null

  return (
    <Card className="w-full border-white/[0.08] bg-black/25">
      <CardHeader>
        <CardTitle>Real-time tracking test (temporary)</CardTitle>
        <p className="text-xs text-white/35">
          Type here and watch WPM and correction feed update every 2s.
        </p>
      </CardHeader>
      <CardContent className="space-y-3 pb-4">
        <textarea
          value={testInput}
          onChange={(e) => setTestInput(e.target.value)}
          placeholder="Type a few words, make corrections with backspace, and watch cards above..."
          className="min-h-24 w-full resize-y rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/90 outline-none transition focus:border-blue-400/70"
        />
        <div className="flex items-center justify-between text-xs text-white/45">
          <span>Local chars: {testInput.length}</span>
          <span>Local words: {testWords}</span>
        </div>
      </CardContent>
    </Card>
  )
}

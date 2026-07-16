'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FlavorWheel } from '@/components/charts/flavor-wheel'
import { TagStatsChart, type TagStat } from '@/components/charts/tag-stats-chart'

/** FR-21.2 A4 檢視切換：風味輪（預設）／長條（前 15 名，等同表格檢視）。 */
export function TagStatsView({ stats }: { stats: TagStat[] }) {
  const [view, setView] = useState<'wheel' | 'bar'>('wheel')

  return (
    <div className="space-y-2">
      <div className="flex justify-end gap-1">
        <Button
          size="sm"
          variant={view === 'wheel' ? 'secondary' : 'ghost'}
          onClick={() => setView('wheel')}
        >
          風味輪
        </Button>
        <Button
          size="sm"
          variant={view === 'bar' ? 'secondary' : 'ghost'}
          onClick={() => setView('bar')}
        >
          長條
        </Button>
      </div>
      {view === 'wheel' ? (
        <FlavorWheel stats={stats} />
      ) : (
        <TagStatsChart stats={stats} />
      )}
    </div>
  )
}

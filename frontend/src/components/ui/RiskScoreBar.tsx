import { clsx } from 'clsx'
import type { RiskLevel } from '@/types'

const BAR_COLORS: Record<RiskLevel, string> = {
  low: 'bg-green-500',
  medium: 'bg-amber-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
}

interface RiskScoreBarProps {
  score: number
  level: RiskLevel
  showLabel?: boolean
}

export function RiskScoreBar({ score, level, showLabel = true }: RiskScoreBarProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all', BAR_COLORS[level])}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-semibold tabular-nums text-gray-600 w-6 text-right">
          {score}
        </span>
      )}
    </div>
  )
}

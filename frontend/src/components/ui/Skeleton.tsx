import { clsx } from 'clsx'

interface SkeletonProps {
  className?: string
  lines?: number
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={clsx('animate-pulse bg-gray-100 rounded', className)} />
  )
}

export function SkeletonCard({ lines = 3 }: SkeletonProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
      <Skeleton className="h-4 w-2/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={clsx('h-3', i === lines - 1 ? 'w-1/2' : 'w-full')} />
      ))}
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="border-b border-gray-100 p-4 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="border-b border-gray-50 p-4 flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className={clsx('h-3 flex-1', j === 0 && 'w-1/3 flex-none')} />
          ))}
        </div>
      ))}
    </div>
  )
}

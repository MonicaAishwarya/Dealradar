import { clsx } from 'clsx'
import type { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function Card({ hoverable, padding = 'md', className, children, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-white rounded-xl border border-gray-100 shadow-sm',
        hoverable && 'hover:border-blue-200 hover:shadow-md transition-all cursor-pointer',
        {
          '': padding === 'none',
          'p-4': padding === 'sm',
          'p-5': padding === 'md',
          'p-6': padding === 'lg',
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('flex items-center justify-between mb-4', className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={clsx('text-sm font-semibold text-gray-900', className)} {...props}>
      {children}
    </h3>
  )
}

import { clsx } from 'clsx'
import type { RiskLevel, RouteType, CommitmentStatus, EvidenceCategory } from '@/types'
import {
  RISK_LABELS, RISK_COLORS,
  ROUTE_LABELS, ROUTE_COLORS,
  COMMITMENT_STATUS_LABELS, COMMITMENT_STATUS_COLORS,
  EVIDENCE_CATEGORY_LABELS, EVIDENCE_CATEGORY_COLORS,
} from '@/utils/formatters'

interface BadgeProps {
  className?: string
  children: React.ReactNode
  variant?: 'default' | 'outline'
}

export function Badge({ children, className, variant = 'outline' }: BadgeProps) {
  return (
    <span className={clsx(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border',
      variant === 'default' && 'bg-gray-100 text-gray-700 border-gray-200',
      className
    )}>
      {children}
    </span>
  )
}

export function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <Badge className={RISK_COLORS[level]}>
      <span className={clsx('w-1.5 h-1.5 rounded-full', {
        'bg-green-500': level === 'low',
        'bg-amber-500': level === 'medium',
        'bg-orange-500': level === 'high',
        'bg-red-500': level === 'critical',
      })} />
      {RISK_LABELS[level]}
    </Badge>
  )
}

export function RouteBadge({ route }: { route: RouteType }) {
  return (
    <Badge className={ROUTE_COLORS[route]}>
      {ROUTE_LABELS[route]}
    </Badge>
  )
}

export function CommitmentStatusBadge({ status }: { status: CommitmentStatus }) {
  return (
    <Badge className={COMMITMENT_STATUS_COLORS[status]}>
      {COMMITMENT_STATUS_LABELS[status]}
    </Badge>
  )
}

export function EvidenceCategoryBadge({ category }: { category: EvidenceCategory }) {
  return (
    <Badge className={EVIDENCE_CATEGORY_COLORS[category]}>
      {EVIDENCE_CATEGORY_LABELS[category]}
    </Badge>
  )
}

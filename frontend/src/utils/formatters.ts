import { format, formatDistanceToNow, isAfter, parseISO } from 'date-fns'
import type { RiskLevel, RouteType, CommitmentStatus, EvidenceCategory } from '@/types'

export const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return '—'
  try {
    return format(parseISO(iso), 'MMM d, yyyy')
  } catch {
    return iso
  }
}

export const formatDateTime = (iso: string | null | undefined): string => {
  if (!iso) return '—'
  try {
    return format(parseISO(iso), 'MMM d, yyyy HH:mm')
  } catch {
    return iso
  }
}

export const timeAgo = (iso: string | null | undefined): string => {
  if (!iso) return '—'
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true })
  } catch {
    return iso
  }
}

export const isOverdue = (iso: string | null | undefined): boolean => {
  if (!iso) return false
  try {
    return isAfter(new Date(), parseISO(iso))
  } catch {
    return false
  }
}

export const RISK_LABELS: Record<RiskLevel, string> = {
  low: 'Low Risk',
  medium: 'Medium Risk',
  high: 'High Risk',
  critical: 'Critical',
}

export const RISK_COLORS: Record<RiskLevel, string> = {
  low: 'text-green-700 bg-green-50 border-green-200',
  medium: 'text-amber-700 bg-amber-50 border-amber-200',
  high: 'text-orange-700 bg-orange-50 border-orange-200',
  critical: 'text-red-700 bg-red-50 border-red-200',
}

export const RISK_DOT_COLORS: Record<RiskLevel, string> = {
  low: 'bg-green-500',
  medium: 'bg-amber-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
}

export const RISK_CHART_COLORS: Record<RiskLevel, string> = {
  low: '#16a34a',
  medium: '#d97706',
  high: '#ea580c',
  critical: '#dc2626',
}

export const ROUTE_LABELS: Record<RouteType, string> = {
  rep_followup: 'Rep Follow-up',
  manager_escalation: 'Manager Escalation',
  pricing_deal_desk: 'Pricing / Deal Desk',
  technical_help: 'Technical Help',
  no_action: 'No Action',
}

export const ROUTE_COLORS: Record<RouteType, string> = {
  rep_followup: 'text-blue-700 bg-blue-50 border-blue-200',
  manager_escalation: 'text-red-700 bg-red-50 border-red-200',
  pricing_deal_desk: 'text-purple-700 bg-purple-50 border-purple-200',
  technical_help: 'text-cyan-700 bg-cyan-50 border-cyan-200',
  no_action: 'text-gray-600 bg-gray-50 border-gray-200',
}

export const ROUTE_CHART_COLORS: Record<RouteType, string> = {
  rep_followup: '#3b82f6',
  manager_escalation: '#ef4444',
  pricing_deal_desk: '#8b5cf6',
  technical_help: '#06b6d4',
  no_action: '#6b7280',
}

export const COMMITMENT_STATUS_LABELS: Record<CommitmentStatus, string> = {
  pending: 'Pending',
  completed: 'Completed',
  overdue: 'Overdue',
  unknown: 'Unknown',
}

export const COMMITMENT_STATUS_COLORS: Record<CommitmentStatus, string> = {
  pending: 'text-blue-700 bg-blue-50 border-blue-200',
  completed: 'text-green-700 bg-green-50 border-green-200',
  overdue: 'text-red-700 bg-red-50 border-red-200',
  unknown: 'text-gray-600 bg-gray-50 border-gray-200',
}

export const EVIDENCE_CATEGORY_LABELS: Record<EvidenceCategory, string> = {
  objection: 'Objection',
  buying_signal: 'Buying Signal',
  commitment: 'Commitment',
  deadline: 'Deadline',
  pricing_concern: 'Pricing Concern',
  technical_blocker: 'Technical Blocker',
  decision_maker: 'Decision Maker',
  next_step: 'Next Step',
}

export const EVIDENCE_CATEGORY_COLORS: Record<EvidenceCategory, string> = {
  objection: 'text-red-700 bg-red-50 border-red-200',
  buying_signal: 'text-green-700 bg-green-50 border-green-200',
  commitment: 'text-blue-700 bg-blue-50 border-blue-200',
  deadline: 'text-orange-700 bg-orange-50 border-orange-200',
  pricing_concern: 'text-purple-700 bg-purple-50 border-purple-200',
  technical_blocker: 'text-cyan-700 bg-cyan-50 border-cyan-200',
  decision_maker: 'text-indigo-700 bg-indigo-50 border-indigo-200',
  next_step: 'text-teal-700 bg-teal-50 border-teal-200',
}

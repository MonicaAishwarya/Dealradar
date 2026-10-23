import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { clsx } from 'clsx'
import {
  X, AlertTriangle, Route, ClipboardList, FileText,
  ChevronDown, ChevronUp, CheckCircle, Clock, Shield,
  Edit3, Save, XCircle, ExternalLink, Info
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getConversation, updateCommitmentStatus, overrideDealRoute } from '@/services/api'
import { RiskBadge, RouteBadge, CommitmentStatusBadge, EvidenceCategoryBadge } from '@/components/ui/Badge'
import { RiskScoreBar } from '@/components/ui/RiskScoreBar'
import { Button } from '@/components/ui/Button'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { Select, Textarea } from '@/components/ui/Input'
import { formatDate, formatDateTime, ROUTE_LABELS } from '@/utils/formatters'
import type { RouteType, CommitmentStatus, Evidence } from '@/types'

const TABS = [
  { id: 'overview', label: 'Overview', icon: FileText },
  { id: 'risk', label: 'Risk', icon: AlertTriangle },
  { id: 'evidence', label: 'Evidence', icon: Shield },
  { id: 'commitments', label: 'Commitments', icon: ClipboardList },
  { id: 'routing', label: 'Routing', icon: Route },
]

const ROUTE_OPTIONS: { label: string; value: RouteType }[] = [
  { label: 'Rep Follow-up', value: 'rep_followup' },
  { label: 'Manager Escalation', value: 'manager_escalation' },
  { label: 'Pricing / Deal Desk', value: 'pricing_deal_desk' },
  { label: 'Technical Help', value: 'technical_help' },
  { label: 'No Action', value: 'no_action' },
]

function EvidenceCard({ ev }: { ev: Evidence }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <motion.div
      layout
      className="border border-gray-100 rounded-lg overflow-hidden"
    >
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-start gap-3 p-3 hover:bg-gray-50 transition-colors text-left"
      >
        <EvidenceCategoryBadge category={ev.category} />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-700 line-clamp-2 font-medium">"{ev.quotation}"</p>
          {ev.speaker && <p className="text-[11px] text-gray-400 mt-0.5">— {ev.speaker}</p>}
        </div>
        {expanded ? <ChevronUp size={14} className="text-gray-400 flex-shrink-0 mt-0.5" /> : <ChevronDown size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2 border-t border-gray-50">
              <blockquote className="mt-2 border-l-2 border-blue-300 pl-3 text-xs text-gray-600 italic">
                "{ev.quotation}"
              </blockquote>
              {ev.context_before && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Context Before</p>
                  <p className="text-xs text-gray-500">{ev.context_before}</p>
                </div>
              )}
              {ev.context_after && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Context After</p>
                  <p className="text-xs text-gray-500">{ev.context_after}</p>
                </div>
              )}
              <div className="flex items-center gap-3 text-[10px] text-gray-400">
                <span>Method: {ev.extraction_method}</span>
                <span>Status: {ev.validation_status}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

interface DealDrawerProps {
  dealId: string
  onClose: () => void
}

export function DealDrawer({ dealId, onClose }: DealDrawerProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [overrideMode, setOverrideMode] = useState(false)
  const [selectedRoute, setSelectedRoute] = useState<RouteType>('rep_followup')
  const [overrideReason, setOverrideReason] = useState('')
  const queryClient = useQueryClient()

  const { data: conv, isLoading } = useQuery({
    queryKey: ['conversation', dealId],
    queryFn: () => getConversation(dealId),
  })

  const commitmentMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: CommitmentStatus }) =>
      updateCommitmentStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation', dealId] })
      queryClient.invalidateQueries({ queryKey: ['commitments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Commitment status updated')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const routeMutation = useMutation({
    mutationFn: () => overrideDealRoute(dealId, {
      manual_route: selectedRoute,
      override_reason: overrideReason,
      overridden_by: 'user',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation', dealId] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setOverrideMode(false)
      setOverrideReason('')
      toast.success('Route override saved')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />
      <motion.aside
        key="drawer"
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col border-l border-gray-100"
        aria-label="Deal investigation drawer"
        role="dialog"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex-1 min-w-0">
            {conv && (
              <>
                <h2 className="text-sm font-bold text-gray-900 truncate">
                  {conv.deal_name || conv.conversation_id}
                </h2>
                <p className="text-xs text-gray-400 truncate">
                  {conv.account_name} · {conv.representative} · {conv.conversation_id}
                </p>
              </>
            )}
            {isLoading && <div className="h-4 w-48 bg-gray-100 rounded animate-pulse" />}
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Close drawer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 flex-shrink-0 px-2">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-3 text-xs font-medium transition-colors border-b-2 -mb-px',
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              <tab.icon size={13} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-5 space-y-3">
              <SkeletonCard lines={4} />
              <SkeletonCard lines={3} />
            </div>
          ) : !conv ? (
            <div className="p-5 text-center text-sm text-gray-400">Deal not found.</div>
          ) : (
            <div className="p-5 space-y-4">

              {/* OVERVIEW */}
              {activeTab === 'overview' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  {conv.is_synthetic && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700 flex items-center gap-2">
                      <Info size={12} /> Synthetic sample data — not real customer information.
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Risk Level</p>
                      {conv.risk_assessment && <RiskBadge level={conv.risk_assessment.risk_level} />}
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Risk Score</p>
                      {conv.risk_assessment && (
                        <div className="mt-1">
                          <RiskScoreBar score={conv.risk_assessment.risk_score} level={conv.risk_assessment.risk_level} />
                        </div>
                      )}
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Route</p>
                      {conv.routing_decision?.manual_route ? (
                        <div className="space-y-1">
                          <RouteBadge route={conv.routing_decision.manual_route} />
                          <p className="text-[10px] text-amber-600">Manual override</p>
                        </div>
                      ) : conv.routing_decision ? (
                        <RouteBadge route={conv.routing_decision.recommended_route} />
                      ) : null}
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Conversation Date</p>
                      <p className="text-xs text-gray-700 font-medium">{formatDate(conv.conversation_date)}</p>
                    </div>
                  </div>

                  {conv.routing_decision && (
                    <div className="border border-gray-100 rounded-lg p-3">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5">Recommended Action</p>
                      <p className="text-xs text-gray-700">{conv.routing_decision.recommendation_reason}</p>
                    </div>
                  )}

                  <div className="border border-gray-100 rounded-lg p-3">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase mb-2">Transcript</p>
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto">
                      {conv.transcript}
                    </pre>
                  </div>
                </motion.div>
              )}

              {/* RISK */}
              {activeTab === 'risk' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  {conv.risk_assessment ? (
                    <>
                      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                        <div>
                          <p className="text-2xl font-bold text-gray-900 tabular-nums">
                            {conv.risk_assessment.risk_score}
                            <span className="text-base font-normal text-gray-400">/100</span>
                          </p>
                          <RiskBadge level={conv.risk_assessment.risk_level} />
                        </div>
                        <div className="flex-1">
                          <RiskScoreBar score={conv.risk_assessment.risk_score} level={conv.risk_assessment.risk_level} showLabel={false} />
                          <p className="text-[11px] text-gray-400 mt-1">
                            Rules version {conv.risk_assessment.rules_version} · computed {formatDateTime(conv.risk_assessment.computed_at)}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-gray-700 mb-2">Risk Factors</p>
                        <div className="space-y-2">
                          {conv.risk_assessment.risk_factors.map((f, i) => (
                            <div key={i} className="border border-gray-100 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-semibold text-gray-700 capitalize">
                                  {f.factor.replace(/_/g, ' ')}
                                </span>
                                <span className="text-xs text-gray-500 font-medium">+{f.weight} pts</span>
                              </div>
                              <p className="text-xs text-gray-500">{f.description}</p>
                              {f.evidence && (
                                <blockquote className="mt-2 border-l-2 border-amber-300 pl-2 text-xs text-gray-500 italic">
                                  "{f.evidence}"
                                </blockquote>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                        <p className="text-[10px] font-semibold text-blue-600 uppercase mb-1">How This Score Was Calculated</p>
                        <p className="text-xs text-blue-700">
                          This score is computed using deterministic rule-based analysis (not a probabilistic model).
                          Each detected factor contributes a fixed number of points. The score does not represent
                          the probability of losing this deal.
                        </p>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-8">No risk assessment available.</p>
                  )}
                </motion.div>
              )}

              {/* EVIDENCE */}
              {activeTab === 'evidence' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                  {conv.evidence && conv.evidence.length > 0 ? (
                    <>
                      <p className="text-xs text-gray-400 mb-3">
                        {conv.evidence.length} evidence item{conv.evidence.length !== 1 ? 's' : ''} extracted from transcript.
                        Quotations are exact source text.
                      </p>
                      {conv.evidence.map(ev => (
                        <EvidenceCard key={ev.id} ev={ev} />
                      ))}
                    </>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-8">No evidence extracted.</p>
                  )}
                </motion.div>
              )}

              {/* COMMITMENTS */}
              {activeTab === 'commitments' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                  {conv.commitments && conv.commitments.length > 0 ? (
                    conv.commitments.map(cm => (
                      <div key={cm.id} className="border border-gray-100 rounded-lg p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-medium text-gray-800 flex-1">{cm.description}</p>
                          <CommitmentStatusBadge status={cm.status} />
                        </div>
                        {cm.due_date && (
                          <p className="text-[11px] text-gray-400">
                            <Clock size={10} className="inline mr-1" />
                            Due: {formatDate(cm.due_date)}
                          </p>
                        )}
                        {cm.responsible_person && (
                          <p className="text-[11px] text-gray-400">Owner: {cm.responsible_person}</p>
                        )}
                        {cm.source_quotation && (
                          <blockquote className="border-l-2 border-gray-200 pl-2 text-[11px] text-gray-500 italic">
                            "{cm.source_quotation.slice(0, 200)}"
                          </blockquote>
                        )}
                        <div className="flex items-center gap-2 pt-1">
                          {cm.status !== 'completed' && (
                            <button
                              onClick={() => commitmentMutation.mutate({ id: cm.id, status: 'completed' })}
                              disabled={commitmentMutation.isPending}
                              className="flex items-center gap-1 text-[11px] text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded hover:bg-green-100 transition-colors"
                            >
                              <CheckCircle size={10} /> Mark Complete
                            </button>
                          )}
                          {cm.status !== 'overdue' && cm.status !== 'completed' && (
                            <button
                              onClick={() => commitmentMutation.mutate({ id: cm.id, status: 'overdue' })}
                              disabled={commitmentMutation.isPending}
                              className="flex items-center gap-1 text-[11px] text-red-700 bg-red-50 border border-red-200 px-2 py-1 rounded hover:bg-red-100 transition-colors"
                            >
                              <AlertTriangle size={10} /> Mark Overdue
                            </button>
                          )}
                          {cm.status !== 'pending' && cm.status !== 'completed' && (
                            <button
                              onClick={() => commitmentMutation.mutate({ id: cm.id, status: 'pending' })}
                              disabled={commitmentMutation.isPending}
                              className="flex items-center gap-1 text-[11px] text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
                            >
                              Reset to Pending
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-8">No commitments extracted.</p>
                  )}
                </motion.div>
              )}

              {/* ROUTING */}
              {activeTab === 'routing' && conv.routing_decision && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  {/* System recommendation */}
                  <div className="border border-gray-100 rounded-xl p-4">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase mb-2">System Recommendation</p>
                    <div className="flex items-center gap-2 mb-2">
                      <RouteBadge route={conv.routing_decision.recommended_route} />
                      <span className="text-[11px] text-gray-400">Rules v{conv.routing_decision.rules_version}</span>
                    </div>
                    <p className="text-xs text-gray-600">{conv.routing_decision.recommendation_reason}</p>
                    {conv.routing_decision.recommendation_evidence.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {conv.routing_decision.recommendation_evidence.map((ev, i) => (
                          <blockquote key={i} className="border-l-2 border-blue-200 pl-2 text-[11px] text-gray-500 italic">
                            "{ev.quote}"
                          </blockquote>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Manual override status */}
                  {conv.routing_decision.manual_route && (
                    <div className="border border-amber-200 bg-amber-50 rounded-xl p-4">
                      <p className="text-[10px] font-semibold text-amber-700 uppercase mb-2">Manual Override Active</p>
                      <div className="flex items-center gap-2 mb-1">
                        <RouteBadge route={conv.routing_decision.manual_route} />
                      </div>
                      {conv.routing_decision.override_reason && (
                        <p className="text-xs text-amber-800">{conv.routing_decision.override_reason}</p>
                      )}
                      <p className="text-[11px] text-amber-600 mt-1">
                        By {conv.routing_decision.overridden_by} · {formatDateTime(conv.routing_decision.overridden_at)}
                      </p>
                    </div>
                  )}

                  {/* Override control */}
                  {!overrideMode ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedRoute(conv.routing_decision?.manual_route || conv.routing_decision?.recommended_route || 'rep_followup')
                        setOverrideMode(true)
                      }}
                    >
                      <Edit3 size={13} />
                      {conv.routing_decision.manual_route ? 'Change Override' : 'Override Route'}
                    </Button>
                  ) : (
                    <div className="border border-blue-200 rounded-xl p-4 space-y-3 bg-blue-50/40">
                      <p className="text-xs font-semibold text-gray-700">Set Manual Override</p>
                      <Select
                        value={selectedRoute}
                        onChange={e => setSelectedRoute(e.target.value as RouteType)}
                        label="Route"
                      >
                        {ROUTE_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </Select>
                      <Textarea
                        value={overrideReason}
                        onChange={e => setOverrideReason(e.target.value)}
                        placeholder="Reason for override (optional)"
                        rows={2}
                        label="Reason"
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          loading={routeMutation.isPending}
                          onClick={() => routeMutation.mutate()}
                        >
                          <Save size={13} /> Save Override
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setOverrideMode(false); setOverrideReason('') }}
                        >
                          <XCircle size={13} /> Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

            </div>
          )}
        </div>
      </motion.aside>
    </AnimatePresence>
  )
}

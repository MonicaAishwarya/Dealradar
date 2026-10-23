import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Search, SlidersHorizontal, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { getConversations } from '@/services/api'
import { Card } from '@/components/ui/Card'
import { RiskBadge, RouteBadge } from '@/components/ui/Badge'
import { RiskScoreBar } from '@/components/ui/RiskScoreBar'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input, Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { ROUTE_LABELS } from '@/utils/formatters'
import type { RouteType, RiskLevel } from '@/types'
import { DealDrawer } from '@/components/deals/DealDrawer'

const RISK_OPTIONS: { label: string; value: RiskLevel | '' }[] = [
  { label: 'All Risk Levels', value: '' },
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Critical', value: 'critical' },
]

const ROUTE_OPTIONS: { label: string; value: RouteType | '' }[] = [
  { label: 'All Routes', value: '' },
  { label: 'Rep Follow-up', value: 'rep_followup' },
  { label: 'Manager Escalation', value: 'manager_escalation' },
  { label: 'Pricing / Deal Desk', value: 'pricing_deal_desk' },
  { label: 'Technical Help', value: 'technical_help' },
  { label: 'No Action', value: 'no_action' },
]

export function DecisionQueue() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const search = searchParams.get('search') || ''
  const risk = searchParams.get('risk') || ''
  const route = searchParams.get('route') || ''

  const [localSearch, setLocalSearch] = useState(search)

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev)
        if (localSearch) next.set('search', localSearch)
        else next.delete('search')
        return next
      })
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [localSearch])

  const { data, isLoading } = useQuery({
    queryKey: ['conversations', page, search, risk, route],
    queryFn: () => getConversations({
      page,
      page_size: 20,
      ...(search && { search }),
      ...(risk && { risk_level: risk }),
      ...(route && { route }),
    }),
  })

  function clearFilters() {
    setSearchParams({})
    setLocalSearch('')
    setPage(1)
  }

  const hasFilters = search || risk || route
  const activeFilters = [
    search && `"${search}"`,
    risk && `Risk: ${risk}`,
    route && `Route: ${ROUTE_LABELS[route as RouteType]}`,
  ].filter(Boolean)

  return (
    <div className="p-6 space-y-4">
      {/* Filters */}
      <Card padding="sm">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-48">
            <Input
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
              placeholder="Search deals, accounts, reps…"
              leftIcon={<Search size={14} />}
            />
          </div>
          <div className="w-44">
            <Select
              value={risk}
              onChange={e => { setSearchParams(p => { const n = new URLSearchParams(p); e.target.value ? n.set('risk', e.target.value) : n.delete('risk'); return n }); setPage(1) }}
            >
              {RISK_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </div>
          <div className="w-52">
            <Select
              value={route}
              onChange={e => { setSearchParams(p => { const n = new URLSearchParams(p); e.target.value ? n.set('route', e.target.value) : n.delete('route'); return n }); setPage(1) }}
            >
              {ROUTE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X size={12} /> Clear
            </Button>
          )}
        </div>
        {activeFilters.length > 0 && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-50">
            <SlidersHorizontal size={12} className="text-gray-400" />
            <span className="text-xs text-gray-400">Filtered by:</span>
            {activeFilters.map(f => (
              <span key={f} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">{f}</span>
            ))}
          </div>
        )}
      </Card>

      {/* Table */}
      {isLoading ? (
        <SkeletonTable rows={8} cols={6} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          title="No deals found"
          description={hasFilters ? "Try adjusting your filters." : "Import conversations to see them here."}
          action={hasFilters ? <Button variant="outline" size="sm" onClick={clearFilters}>Clear filters</Button> : undefined}
        />
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Deal</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Account</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Rep</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Risk</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide w-36">Score</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Route</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Commitments</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.items.map(conv => (
                  <motion.tr
                    key={conv.id}
                    whileHover={{ backgroundColor: '#f9fafb' }}
                    className={`border-b border-gray-50 cursor-pointer transition-colors ${selectedId === conv.id ? 'bg-blue-50' : ''}`}
                    onClick={() => setSelectedId(conv.id)}
                  >
                    <td className="px-5 py-3 font-medium text-gray-800 max-w-[200px]">
                      <div className="truncate">{conv.deal_name || conv.conversation_id}</div>
                      <div className="text-[11px] text-gray-400 font-normal truncate">{conv.conversation_id}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-[140px] truncate">{conv.account_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-[120px] truncate">{conv.representative || '—'}</td>
                    <td className="px-4 py-3">
                      {conv.risk_level && <RiskBadge level={conv.risk_level} />}
                    </td>
                    <td className="px-4 py-3 w-36">
                      {conv.risk_score !== null && conv.risk_score !== undefined && conv.risk_level && (
                        <RiskScoreBar score={conv.risk_score} level={conv.risk_level} />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {conv.manual_route ? (
                        <div className="flex flex-col gap-1">
                          <RouteBadge route={conv.manual_route} />
                          <span className="text-[10px] text-gray-400">Manual override</span>
                        </div>
                      ) : conv.recommended_route ? (
                        <RouteBadge route={conv.recommended_route} />
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {(conv.overdue_commitments || 0) > 0 && (
                          <span className="text-xs text-red-600 font-medium bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                            {conv.overdue_commitments} overdue
                          </span>
                        )}
                        {(conv.pending_commitments || 0) > 0 && (
                          <span className="text-xs text-blue-600 font-medium bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                            {conv.pending_commitments} pending
                          </span>
                        )}
                        {!conv.overdue_commitments && !conv.pending_commitments && (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight size={14} className="text-gray-300" />
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.total_pages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              <span className="text-xs text-gray-400">
                {data.total} deals · Page {data.page} of {data.total_pages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline" size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft size={14} />
                </Button>
                <Button
                  variant="outline" size="sm"
                  disabled={page >= data.total_pages}
                  onClick={() => setPage(p => p + 1)}
                >
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Deal Investigation Drawer */}
      {selectedId && (
        <DealDrawer
          dealId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}

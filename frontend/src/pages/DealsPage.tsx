import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Search, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { getConversations } from '@/services/api'
import { Card } from '@/components/ui/Card'
import { RiskBadge, RouteBadge } from '@/components/ui/Badge'
import { RiskScoreBar } from '@/components/ui/RiskScoreBar'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input, Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { formatDate, ROUTE_LABELS } from '@/utils/formatters'
import type { RouteType, RiskLevel } from '@/types'
import { DealDrawer } from '@/components/deals/DealDrawer'

export function DealsPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [risk, setRisk] = useState('')
  const [route, setRoute] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['conversations', page, debouncedSearch, risk, route],
    queryFn: () => getConversations({
      page,
      page_size: 25,
      ...(debouncedSearch && { search: debouncedSearch }),
      ...(risk && { risk_level: risk }),
      ...(route && { route }),
    }),
  })

  return (
    <div className="p-6 space-y-4">
      <Card padding="sm">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-48">
            <Input
              value={search}
              onChange={e => {
                setSearch(e.target.value)
                clearTimeout((window as any)._dt)
                ;(window as any)._dt = setTimeout(() => { setDebouncedSearch(e.target.value); setPage(1) }, 300)
              }}
              placeholder="Search deals, accounts, reps…"
              leftIcon={<Search size={14} />}
            />
          </div>
          <div className="w-44">
            <Select value={risk} onChange={e => { setRisk(e.target.value); setPage(1) }}>
              <option value="">All Risk Levels</option>
              {(['low','medium','high','critical'] as RiskLevel[]).map(r => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </Select>
          </div>
          <div className="w-52">
            <Select value={route} onChange={e => { setRoute(e.target.value); setPage(1) }}>
              <option value="">All Routes</option>
              {(Object.keys(ROUTE_LABELS) as RouteType[]).map(r => (
                <option key={r} value={r}>{ROUTE_LABELS[r]}</option>
              ))}
            </Select>
          </div>
          {(search || risk || route) && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setDebouncedSearch(''); setRisk(''); setRoute(''); setPage(1) }}>
              Clear
            </Button>
          )}
        </div>
      </Card>

      {isLoading ? (
        <SkeletonTable rows={8} cols={7} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No deals found" description="Import conversations to see them here." />
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {['Deal', 'Account', 'Rep', 'Date', 'Risk', 'Score', 'Route', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.map(conv => (
                  <motion.tr
                    key={conv.id}
                    whileHover={{ backgroundColor: '#f9fafb' }}
                    className="border-b border-gray-50 cursor-pointer"
                    onClick={() => setSelectedId(conv.id)}
                  >
                    <td className="px-4 py-3 font-medium text-gray-800 max-w-[200px]">
                      <div className="truncate">{conv.deal_name || conv.conversation_id}</div>
                      <div className="text-[11px] text-gray-400">{conv.conversation_id}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-[140px] truncate">{conv.account_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-[120px] truncate">{conv.representative || '—'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDate(conv.conversation_date)}</td>
                    <td className="px-4 py-3">{conv.risk_level && <RiskBadge level={conv.risk_level} />}</td>
                    <td className="px-4 py-3 w-32">
                      {conv.risk_score != null && conv.risk_level && (
                        <RiskScoreBar score={conv.risk_score} level={conv.risk_level} />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {conv.manual_route ? (
                        <div>
                          <RouteBadge route={conv.manual_route} />
                          <p className="text-[10px] text-amber-600 mt-0.5">Manual</p>
                        </div>
                      ) : conv.recommended_route ? (
                        <RouteBadge route={conv.recommended_route} />
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={e => { e.stopPropagation(); navigate(`/deals/${conv.id}`) }}
                        className="p-1 text-gray-300 hover:text-blue-500 transition-colors"
                        title="Open detail page"
                      >
                        <ExternalLink size={14} />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.total_pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <span className="text-xs text-gray-400">{data.total} deals · Page {page} of {data.total_pages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft size={14} />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= data.total_pages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {selectedId && <DealDrawer dealId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  )
}

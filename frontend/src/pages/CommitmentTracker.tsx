import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Search, Clock, CheckCircle, AlertTriangle, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import { getCommitments, updateCommitmentStatus } from '@/services/api'
import { Card } from '@/components/ui/Card'
import { CommitmentStatusBadge } from '@/components/ui/Badge'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input, Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { formatDate, timeAgo, COMMITMENT_STATUS_LABELS } from '@/utils/formatters'
import type { CommitmentStatus } from '@/types'

export function CommitmentTracker() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [status, setStatus] = useState(searchParams.get('status') || '')

  const { data, isLoading } = useQuery({
    queryKey: ['commitments', page, debouncedSearch, status],
    queryFn: () => getCommitments({
      page,
      page_size: 30,
      ...(debouncedSearch && { search: debouncedSearch }),
      ...(status && { status }),
    }),
  })

  const mutation = useMutation({
    mutationFn: ({ id, s }: { id: string; s: CommitmentStatus }) =>
      updateCommitmentStatus(id, s),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commitments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Status updated')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const statusCounts = data ? {
    all: data.total,
  } : {}

  return (
    <div className="p-6 space-y-4">
      <Card padding="sm">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-48">
            <Input
              value={search}
              onChange={e => {
                setSearch(e.target.value)
                clearTimeout((window as any)._cmdt)
                ;(window as any)._cmdt = setTimeout(() => { setDebouncedSearch(e.target.value); setPage(1) }, 300)
              }}
              placeholder="Search commitments…"
              leftIcon={<Search size={14} />}
            />
          </div>
          <div className="w-44">
            <Select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}>
              <option value="">All Statuses</option>
              {(Object.keys(COMMITMENT_STATUS_LABELS) as CommitmentStatus[]).map(s => (
                <option key={s} value={s}>{COMMITMENT_STATUS_LABELS[s]}</option>
              ))}
            </Select>
          </div>
          {(search || status) && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setDebouncedSearch(''); setStatus(''); setPage(1) }}>
              Clear
            </Button>
          )}
        </div>
      </Card>

      {isLoading ? (
        <SkeletonTable rows={8} cols={6} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No commitments found" description="Import conversations to track commitments." />
      ) : (
        <Card padding="none">
          <div className="px-5 py-3 border-b border-gray-100">
            <p className="text-xs text-gray-500 font-medium">{data.total} commitment{data.total !== 1 ? 's' : ''}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {['Description', 'Deal', 'Rep', 'Due Date', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.map(cm => (
                  <motion.tr
                    key={cm.id}
                    whileHover={{ backgroundColor: '#f9fafb' }}
                    className="border-b border-gray-50"
                  >
                    <td className="px-4 py-3 max-w-[280px]">
                      <p className="text-xs font-medium text-gray-800 line-clamp-2">{cm.description}</p>
                      {cm.source_quotation && (
                        <p className="text-[11px] text-gray-400 mt-0.5 italic truncate">"{cm.source_quotation.slice(0, 80)}"</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/deals/${cm.conversation_id}`)}
                        className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        {cm.deal_name || cm.conversation_id}
                        <ExternalLink size={10} />
                      </button>
                      {cm.account_name && <p className="text-[11px] text-gray-400">{cm.account_name}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{cm.representative || cm.responsible_person || '—'}</td>
                    <td className="px-4 py-3">
                      {cm.due_date ? (
                        <div>
                          <p className="text-xs font-medium text-gray-700">{formatDate(cm.due_date)}</p>
                          <p className="text-[11px] text-gray-400">{timeAgo(cm.due_date)}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">No deadline</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <CommitmentStatusBadge status={cm.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {cm.status !== 'completed' && (
                          <button
                            onClick={() => mutation.mutate({ id: cm.id, s: 'completed' })}
                            disabled={mutation.isPending}
                            className="flex items-center gap-1 text-[11px] text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded hover:bg-green-100"
                          >
                            <CheckCircle size={10} /> Done
                          </button>
                        )}
                        {cm.status !== 'overdue' && cm.status !== 'completed' && (
                          <button
                            onClick={() => mutation.mutate({ id: cm.id, s: 'overdue' })}
                            disabled={mutation.isPending}
                            className="flex items-center gap-1 text-[11px] text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded hover:bg-red-100"
                          >
                            <AlertTriangle size={10} /> Overdue
                          </button>
                        )}
                        {cm.status !== 'pending' && (
                          <button
                            onClick={() => mutation.mutate({ id: cm.id, s: 'pending' })}
                            disabled={mutation.isPending}
                            className="flex items-center gap-1 text-[11px] text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded hover:bg-blue-100"
                          >
                            <Clock size={10} /> Pending
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.total_pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <span className="text-xs text-gray-400">Page {page} of {data.total_pages}</span>
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
    </div>
  )
}

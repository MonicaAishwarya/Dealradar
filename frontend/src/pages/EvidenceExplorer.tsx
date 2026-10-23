import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { getEvidence } from '@/services/api'
import { Card } from '@/components/ui/Card'
import { EvidenceCategoryBadge } from '@/components/ui/Badge'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input, Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { formatDateTime, EVIDENCE_CATEGORY_LABELS } from '@/utils/formatters'
import type { EvidenceCategory, Evidence } from '@/types'

function EvidenceRow({ ev }: { ev: Evidence }) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="border-b border-gray-50 last:border-0">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-start gap-3 px-5 py-3 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex-shrink-0 mt-0.5">
          <EvidenceCategoryBadge category={ev.category} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-800 line-clamp-2">"{ev.quotation}"</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {ev.deal_name || ev.conversation_id} · {ev.representative || 'Unknown rep'}
            {ev.speaker && ` · ${ev.speaker}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[11px] text-gray-400">{formatDateTime(ev.created_at)}</span>
          {expanded ? <ChevronUp size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />}
        </div>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 space-y-3 bg-gray-50/50">
              <blockquote className="border-l-2 border-blue-300 pl-3 text-sm text-gray-700 italic">
                "{ev.quotation}"
              </blockquote>
              <div className="grid grid-cols-2 gap-3">
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
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-[11px] text-gray-400">
                  <span>Extraction: {ev.extraction_method}</span>
                  <span>Validation: {ev.validation_status}</span>
                  {ev.speaker && <span>Speaker: {ev.speaker}</span>}
                </div>
                <button
                  onClick={() => navigate(`/deals/${ev.conversation_id}`)}
                  className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700"
                >
                  <ExternalLink size={11} /> View Deal
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function EvidenceExplorer() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [category, setCategory] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['evidence', page, debouncedSearch, category],
    queryFn: () => getEvidence({
      page,
      page_size: 30,
      ...(debouncedSearch && { search: debouncedSearch }),
      ...(category && { category }),
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
                clearTimeout((window as any)._evdt)
                ;(window as any)._evdt = setTimeout(() => { setDebouncedSearch(e.target.value); setPage(1) }, 300)
              }}
              placeholder="Search evidence quotations…"
              leftIcon={<Search size={14} />}
            />
          </div>
          <div className="w-52">
            <Select value={category} onChange={e => { setCategory(e.target.value); setPage(1) }}>
              <option value="">All Categories</option>
              {(Object.keys(EVIDENCE_CATEGORY_LABELS) as EvidenceCategory[]).map(c => (
                <option key={c} value={c}>{EVIDENCE_CATEGORY_LABELS[c]}</option>
              ))}
            </Select>
          </div>
          {(search || category) && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setDebouncedSearch(''); setCategory(''); setPage(1) }}>
              Clear
            </Button>
          )}
        </div>
      </Card>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} lines={2} />)}</div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No evidence found" description="Import conversations to extract evidence." />
      ) : (
        <Card padding="none">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-500 font-medium">{data.total} evidence item{data.total !== 1 ? 's' : ''}</p>
          </div>
          {data.items.map(ev => <EvidenceRow key={ev.id} ev={ev} />)}
          {data.total_pages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
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

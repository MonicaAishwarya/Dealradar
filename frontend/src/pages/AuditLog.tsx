import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Search, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { getAuditEvents } from '@/services/api'
import { Card } from '@/components/ui/Card'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input, Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { formatDateTime } from '@/utils/formatters'

const EVENT_TYPE_LABELS: Record<string, string> = {
  import_started: 'Import Started',
  import_completed: 'Import Completed',
  import_failed: 'Import Failed',
  conversation_created: 'Conversation Created',
  conversation_updated: 'Conversation Updated',
  route_override_created: 'Route Override',
  route_override_updated: 'Route Override Updated',
  commitment_status_changed: 'Commitment Changed',
  export_generated: 'Export Generated',
  config_changed: 'Config Changed',
}

const EVENT_COLORS: Record<string, string> = {
  import_started: 'bg-blue-100 text-blue-700',
  import_completed: 'bg-green-100 text-green-700',
  import_failed: 'bg-red-100 text-red-700',
  conversation_created: 'bg-teal-100 text-teal-700',
  conversation_updated: 'bg-indigo-100 text-indigo-700',
  route_override_created: 'bg-amber-100 text-amber-700',
  route_override_updated: 'bg-amber-100 text-amber-700',
  commitment_status_changed: 'bg-purple-100 text-purple-700',
  export_generated: 'bg-cyan-100 text-cyan-700',
  config_changed: 'bg-gray-100 text-gray-700',
}

const EVENT_TYPE_OPTIONS = Object.keys(EVENT_TYPE_LABELS)

export function AuditLog() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [eventType, setEventType] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['audit', page, eventType],
    queryFn: () => getAuditEvents({
      page,
      page_size: 30,
      ...(eventType && { event_type: eventType }),
    }),
  })

  return (
    <div className="p-6 space-y-4">
      <Card padding="sm">
        <div className="flex flex-wrap gap-3">
          <div className="w-64">
            <Select value={eventType} onChange={e => { setEventType(e.target.value); setPage(1) }}>
              <option value="">All Event Types</option>
              {EVENT_TYPE_OPTIONS.map(t => (
                <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>
              ))}
            </Select>
          </div>
          {eventType && (
            <Button variant="ghost" size="sm" onClick={() => { setEventType(''); setPage(1) }}>
              Clear
            </Button>
          )}
        </div>
      </Card>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} lines={1} />)}</div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No audit events" description="Events are recorded automatically as you use the platform." />
      ) : (
        <Card padding="none">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-500 font-medium">{data.total} event{data.total !== 1 ? 's' : ''}</p>
          </div>
          <div className="divide-y divide-gray-50">
            {data.items.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
              >
                {/* Timeline dot */}
                <div className="flex flex-col items-center flex-shrink-0 mt-1">
                  <div className="w-2 h-2 rounded-full bg-gray-300" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${EVENT_COLORS[event.event_type] || 'bg-gray-100 text-gray-600'}`}>
                      {EVENT_TYPE_LABELS[event.event_type] || event.event_type}
                    </span>
                    {event.entity_type && (
                      <span className="text-[10px] text-gray-400">{event.entity_type}</span>
                    )}
                    <span className="text-[11px] text-gray-400 ml-auto">{formatDateTime(event.created_at)}</span>
                  </div>
                  <p className="text-xs text-gray-700">{event.summary}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[11px] text-gray-400">Actor: {event.actor}</span>
                    {event.conversation_id && (
                      <button
                        onClick={() => navigate(`/deals/${event.conversation_id}`)}
                        className="text-[11px] text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
                      >
                        View deal <ExternalLink size={10} />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

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
